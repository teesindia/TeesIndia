import { sendServerError } from '../lib/server-error';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth.middleware';

// ─── On-demand ISR revalidation ──────────────────────────────────────────────
async function revalidateFrontend(scope: 'blog' | 'all' = 'blog'): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;
  try {
    await fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ scope }),
    });
  } catch (err) {
    console.warn('[Revalidation] Failed to ping frontend:', (err as Error).message);
  }
}

const router = Router();

// GET /api/blog — published posts
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '9', category } = req.query;
    const where: any = { isPublished: true };
    if (category) where.category = category;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { publishedAt: 'desc' },
        include: { author: { select: { name: true } } },
      }),
      prisma.blogPost.count({ where }),
    ]);
    res.json({ posts, total });
  } catch (err) {
    sendServerError(res, 'blog.routes', err, 'Failed to fetch posts');
  }
});

// GET /api/blog/:slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: String(req.params.slug) },
      include: { author: { select: { name: true } } },
    });
    if (!post || (!post.isPublished)) { res.status(404).json({ message: 'Post not found' }); return; }
    res.json({ post });
  } catch (err) {
    sendServerError(res, 'blog.routes', err, 'Failed to fetch post');
  }
});

// POST /api/blog (admin)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, slug, excerpt, content, coverImage, isPublished, category, tags } = req.body;
    const post = await prisma.blogPost.create({
      data: {
        title, slug, excerpt, content, coverImage,
        isPublished: isPublished === true || isPublished === 'true',
        publishedAt: isPublished ? new Date() : null,
        category, tags,
        authorId: req.user!.id,
      },
    });
    res.status(201).json({ post });
    revalidateFrontend('blog').catch(() => {});
  } catch (err) {
    sendServerError(res, 'blog.routes', err, 'Failed to create post');
  }
});

// PUT /api/blog/:id (admin)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, slug, excerpt, content, coverImage, isPublished, category, tags } = req.body;
    const current = await prisma.blogPost.findUnique({ where: { id: String(req.params.id) } });
    const post = await prisma.blogPost.update({
      where: { id: String(req.params.id) },
      data: {
        title, slug, excerpt, content, coverImage,
        isPublished: isPublished === true || isPublished === 'true',
        publishedAt: isPublished && !current?.publishedAt ? new Date() : current?.publishedAt,
        category, tags,
      },
    });
    res.json({ post });
    revalidateFrontend('blog').catch(() => {});
  } catch (err) {
    sendServerError(res, 'blog.routes', err, 'Failed to update post');
  }
});

// DELETE /api/blog/:id (admin)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.blogPost.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Post deleted' });
    revalidateFrontend('blog').catch(() => {});
  } catch (err) {
    sendServerError(res, 'blog.routes', err, 'Failed to delete post');
  }
});

export default router;
