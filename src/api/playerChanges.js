// Tells the other tabs of this browser that a character was changed, so a sheet left open in one shows what was done in
// another at once. (A change made on another device is found by the sheet's own regular look instead.)

const CHANNEL = "initiative-tracker.players";

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);

/** Says that the character with this id was changed here. Other tabs hear it; this one does not. */
export function announcePlayerChanged(id) {
  channel?.postMessage({ id: Number(id) });
}

/**
 * Calls `listener(id)` when another tab changes a character.
 * @returns {() => void} stops listening
 */
export function onPlayerChanged(listener) {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const mine = new BroadcastChannel(CHANNEL);
  mine.onmessage = (event) => listener(event.data?.id);
  return () => mine.close();
}
