import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

export function isObjectStorageConfigured(): boolean {
  return Boolean(env.ASSETS && publicUrl);
}

export async function uploadObject(buffer: Buffer, filename: string, contentType: string): Promise<{ key: string; url: string }> {
  if (!publicUrl) throw new Error('Set R2_PUBLIC_URL to the public bucket domain before uploading files.');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'upload';
  const key = `uploads/${randomUUID()}-${safeName}`;
  await env.ASSETS.put(key, buffer, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  return { key, url: `${publicUrl}/${key}` };
}

export async function deleteObjectByUrl(url: string): Promise<void> {
  if (!publicUrl || !url.startsWith(`${publicUrl}/`)) return;
  const key = decodeURIComponent(url.slice(publicUrl.length + 1));
  await env.ASSETS.delete(key);
}
