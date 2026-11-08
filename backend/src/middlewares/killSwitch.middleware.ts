import { Request, Response, NextFunction } from 'express';

let lastStatus: string | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds cache to avoid latency spikes

/**
 * checkKillSwitch — Remote kill-switch middleware (Fail-Closed)
 *
 * Rules:
 *   1. KILL_SWITCH_URL not defined or empty  → disabled; allow request
 *   2. Status is "ACTIVE"                    → Allow request (next())
 *   3. Status is "KILL" or anything else     → SHUTDOWN (503)
 *   4. Fetch fails, times out, or errors     → SHUTDOWN (503)
 */
export async function checkKillSwitch(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const killSwitchUrl = process.env.KILL_SWITCH_URL?.trim();

  // An unset URL disables the optional kill switch.
  if (!killSwitchUrl) {
    next();
    return;
  }

  // Use short-lived cache if valid
  const now = Date.now();
  if (lastStatus && now - lastCheckTime < CACHE_TTL_MS) {
    if (lastStatus === 'ACTIVE') {
      next();
      return;
    } else {
      res.status(503).json({
        suspended: true,
        error: 'Service Temporarily Unavailable',
        message: 'This application has been suspended. Please contact NotfoundAi team',
      });
      return;
    }
  }

  try {
    const response = await fetch(killSwitchUrl, {
      signal: AbortSignal.timeout(2500),
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (!response.ok) throw new Error(`Kill-switch returned HTTP ${response.status}`);
    const status = (await response.text()).trim();
    lastStatus = status;
    lastCheckTime = Date.now();

    if (status === 'ACTIVE') {
      next();
      return;
    }

    console.warn(`[KillSwitch] Remote status is "${status}" (not "ACTIVE") — shutting down with 503.`);
    res.status(503).json({
      suspended: true,
      error: 'Service Temporarily Unavailable',
      message: 'This application has been suspended. Please contact NotfoundAi team',
    });
  } catch (err: any) {
    lastStatus = 'ERROR';
    lastCheckTime = Date.now();
    console.warn('[KillSwitch] Failed to verify kill-switch status — failing closed, shutting down with 503.', err?.message ?? err);
    res.status(503).json({
      suspended: true,
      error: 'Service Temporarily Unavailable',
      message: 'This application has been suspended. Please contact NotfoundAi team',
    });
  }
}
