import { redis } from "@/lib/redis";

export const SLOT_LOCK_TTL_SECONDS = 60;

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

function toIsoSlotStart(slotStart: Date | string): string {
  const date = typeof slotStart === "string" ? new Date(slotStart) : slotStart;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("slotStart must be a valid date");
  }

  return date.toISOString();
}

export function getSlotLockKey(
  courtId: string,
  slotStart: Date | string,
): string {
  if (!courtId) {
    throw new Error("courtId is required to build a slot lock key");
  }

  return `slot:${courtId}:${toIsoSlotStart(slotStart)}`;
}

/**
 * Atomically claims a slot for 1 minute (60 seconds).
 *
 * Redis SET with NX only succeeds if no lock exists, so concurrent requests
 * can never both acquire the same court/slot pair.
 */
export async function acquireSlotLock(
  courtId: string,
  slotStart: Date | string,
  userId: string,
): Promise<boolean> {
  if (!userId) {
    throw new Error("userId is required to acquire a slot lock");
  }

  const result = await redis.set(
    getSlotLockKey(courtId, slotStart),
    userId,
    { ex: SLOT_LOCK_TTL_SECONDS, nx: true },
  );

  return result === "OK";
}

/**
 * Releases a slot lock. When userId is provided, the lock is deleted only if
 * it is still owned by that user, preventing one player from releasing another
 * player's hold after an expiry/re-acquire race.
 */
export async function releaseSlotLock(
  courtId: string,
  slotStart: Date | string,
  userId?: string,
): Promise<boolean> {
  const key = getSlotLockKey(courtId, slotStart);

  if (!userId) {
    return (await redis.del(key)) === 1;
  }

  const released = await redis.eval(RELEASE_LOCK_SCRIPT, [key], [userId]);
  return Number(released) === 1;
}
