import type { Prisma } from "@prisma/client";
import prisma from "../../src/prismaClient";

/**
 * Waits until at least the requested number of database sessions are blocked behind a lock.
 * blockerPid identifies the PostgreSQL session holding the test's barrier lock. The recursive
 * query also counts sessions waiting behind other blocked sessions, covering the whole queue.
 * Checking actual database activity lets the test know requests reached the intended waiting
 * point instead of guessing with a fixed delay. Polls every 10 ms and fails after eight seconds
 * if the expected waiters never appear, so a broken scenario cannot wait indefinitely.
 */
async function waitForBlockedTransactions(blockerPid: number, count: number) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const [row] = await prisma.$queryRaw<Array<{ count: number }>>`
      WITH RECURSIVE blocked(pid) AS (
        SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT activity.pid FROM pg_stat_activity activity JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
      ) SELECT count(*)::int AS count FROM blocked
    `;
    if (row && row.count >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Expected ${count} PostgreSQL lock waiters before releasing the test barrier.`);
}

type WaitForBlocked = (count: number) => Promise<void>;
type StartRequest<T> = (request: PromiseLike<T>) => void;

/**
 * Coordinates competing HTTP requests so a test can reproduce a particular database race.
 * Opens a transaction and calls acquireLock to hold the row or other lock chosen by the test.
 * Then calls schedule with two controls: start launches and tracks a request without waiting
 * for its response, and waitForBlocked waits for requests to queue behind the held lock.
 * When schedule finishes, the transaction ends and releases the lock so requests can complete.
 * The barrier transaction has a 15-second timeout. Started requests are awaited even if setup
 * or scheduling fails, preventing them from leaking into the next test's database cleanup.
 * Returns responses in start order; transaction, scheduling, or request failures are rethrown.
 */
export async function runWithDatabaseBarrier<T>(
  acquireLock: (tx: Prisma.TransactionClient) => Promise<unknown>,
  schedule: (start: StartRequest<T>, waitForBlocked: WaitForBlocked) => Promise<void>,
): Promise<T[]> {
  const pending: Promise<T>[] = [];
  let schedulingError: unknown;
  try {
    await prisma.$transaction(
      async (tx) => {
        await acquireLock(tx);
        const [session] = await tx.$queryRaw<
          Array<{ pid: number }>
        >`SELECT pg_backend_pid() AS pid`;
        if (!session) throw new Error("No PostgreSQL session for concurrency barrier.");
        await schedule(
          (request) => {
            pending.push(Promise.resolve(request));
          },
          (count) => waitForBlockedTransactions(session.pid, count),
        );
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    schedulingError = error;
  }
  // Wait for every started request to settle after the barrier transaction has ended.
  // Promise.allSettled keeps waiting even when one request fails; only then do we report errors.
  const results = await Promise.allSettled(pending);
  if (schedulingError) throw schedulingError;
  return results.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  });
}
