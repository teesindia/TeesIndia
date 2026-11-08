import prisma from './prisma';
import { env } from 'cloudflare:workers';

export class OutOfStockError extends Error {
  constructor(message = 'One or more items are out of stock') {
    super(message);
    this.name = 'OutOfStockError';
  }
}

export type InventoryItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

/** Atomically decrements each stock row with a compare-and-decrement condition.
 * If any item cannot be reserved, restore rows already changed in this attempt.
 */
export async function reserveInventory(items: InventoryItem[]): Promise<void> {
  const statements: D1PreparedStatement[] = [];
  const statementItems: InventoryItem[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OutOfStockError('Item quantity must be a positive whole number');
    }
    statements.push(env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').bind(item.quantity, item.productId));
    statementItems.push({ ...item, variantId: null });
    if (item.variantId) {
      statements.push(env.DB.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ? AND productId = ?').bind(item.quantity, item.variantId, item.productId));
      statementItems.push(item);
    }
  }

  if (!statements.length) return;
  let results: D1Result[];
  try {
    results = await env.DB.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('INSUFFICIENT_PRODUCT_STOCK') || message.includes('INSUFFICIENT_VARIANT_STOCK')) {
      throw new OutOfStockError();
    }
    throw error;
  }
  const changed = results.flatMap((result, index) => result.meta.changes === 1 ? [statementItems[index]] : []);
  if (changed.length !== statements.length) {
    await restoreInventory(changed);
    throw new OutOfStockError();
  }
}

export async function restoreInventory(items: InventoryItem[]): Promise<void> {
  const statements = items.map(item => {
    if (item.variantId) {
      return env.DB.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ? AND productId = ?').bind(item.quantity, item.variantId, item.productId);
    }
    return env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(item.quantity, item.productId);
  });
  if (statements.length) await env.DB.batch(statements);
}

/** Release inventory for unpaid Razorpay checkouts older than 15 minutes. */
export async function expirePendingCheckouts(): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const expired = await prisma.order.findMany({
    where: {
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    include: { items: true },
  });

  for (const order of expired) {
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'PENDING', status: 'PENDING' },
      data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
    });
    if (claimed.count > 0) {
      await restoreInventory(order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })));
    }
  }
}
