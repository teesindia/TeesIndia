import type { Response } from 'express';

/** Log diagnostic details on the server and keep production error responses generic. */
export function sendServerError(
  res: Response,
  context: string,
  error: unknown,
  developmentMessage: string,
): void {
  console.error(`[${context}]`, error);

  if (process.env.NODE_ENV === 'development') {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: developmentMessage, error: detail });
    return;
  }

  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
