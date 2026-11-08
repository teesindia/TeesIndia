import { sendServerError } from '../lib/server-error';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth.middleware';
import { OutOfStockError, reserveInventory, restoreInventory } from '../lib/inventory';
import { paiseToRupees } from '../lib/money';

const router = Router();

// POST /api/orders — create order
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { addressId, paymentMethod, items, notes } = req.body;

    if (paymentMethod !== 'COD') {
      res.status(400).json({ message: 'Use /api/payment/checkout for online payments' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0 || items.some((item: any) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      res.status(400).json({ message: 'Provide items with positive whole-number quantities' });
      return;
    }
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: req.user!.id } });
    if (!address) {
      res.status(400).json({ message: 'Choose a valid shipping address' });
      return;
    }

    // Calculate total
    let totalAmountPaise = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        res.status(400).json({ message: `Product "${product?.name || item.productId}" is no longer available` });
        return;
      }
      const pricePaise = product.pricePaise;
      const price = paiseToRupees(pricePaise);
      totalAmountPaise += pricePaise * item.quantity;
      orderItems.push({ productId: item.productId, variantId: item.variantId || null, quantity: item.quantity, price, pricePaise, size: item.size });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        addressId,
        totalAmount: paiseToRupees(totalAmountPaise),
        totalAmountPaise,
        paymentMethod,
        status: 'CONFIRMED',
        notes,
        items: { create: orderItems },
      },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } }, address: true },
    });

    try {
      await reserveInventory(order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })));
    } catch (error) {
      await prisma.order.delete({ where: { id: order.id } });
      if (error instanceof OutOfStockError) {
        res.status(409).json({ message: error.message });
        return;
      }
      throw error;
    }

    // Clear cart after order
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.id } });

    res.status(201).json({ order });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to create order');
  }
});

// GET /api/orders — user's orders
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } }, address: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to fetch orders');
  }
});

// GET /api/orders/:id/public — no auth, used by order-success page
router.get('/:id/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' } } },
            },
            variant: true,
          },
        },
        address: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    res.json({ order });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to fetch order');
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const where: any = { id: String(req.params.id) };
    if (!isAdmin) {
      where.userId = req.user!.id;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } },
            variant: true,
          },
        },
        address: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    res.json({ order });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to fetch order');
  }
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (typeof status !== 'string' || !status.trim()) {
      res.status(400).json({ message: 'A valid order status is required' });
      return;
    }
    const id = String(req.params.id);
    const current = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!current) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    const updated = await prisma.order.updateMany({
      where: { id, status: current.status },
      data: {
        status,
        ...(status === 'CANCELLED' && current.paymentMethod === 'RAZORPAY' && current.paymentStatus === 'PENDING'
          ? { paymentStatus: 'FAILED' }
          : {}),
      },
    });
    if (updated.count === 0) {
      res.status(409).json({ message: 'Order changed while you were updating it. Refresh and try again.' });
      return;
    }
    if (status === 'CANCELLED' && current.status !== 'CANCELLED' && current.paymentStatus === 'PENDING') {
      await restoreInventory(current.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })));
    }
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    res.json({ order });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to update order status');
  }
});

// GET /api/orders/admin/all (admin - list all orders)
router.get('/admin/all', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: { user: { select: { name: true, email: true } }, address: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total });
  } catch (err) {
    sendServerError(res, 'order.routes', err, 'Failed to fetch orders');
  }
});

export default router;
