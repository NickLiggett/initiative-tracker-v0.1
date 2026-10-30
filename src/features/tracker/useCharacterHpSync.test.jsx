import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useCharacterHpSync, { hpChanges, LOOK_MS, remoteChanges, SYNC_DELAY_MS } from "./useCharacterHpSync";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const thorin = { id: 1, playerId: 7, name: "Thorin", hp: 40, maxHp: 52 };
const goblin = { id: 2, name: "Goblin", hp: 7, maxHp: 7 };

/**
 * The hook with a backend that keeps the characters' vitals (`characters`, by player id), and a list of rows that
 * `setCombatants` changes the way the tracker's state does.
 */
function setup(initial, loadKey = 1, characters = { 7: { currentHp: 40, tempHp: 0 } }) {
  const send = vi.fn(async (id, changes) => {
    characters[id] = { ...characters[id], ...changes };
    return {};
  });
  const fetchPlayer = vi.fn(async (id) => ({ id, vitals: { ...characters[id] } }));
  let rows = initial;
  const view = renderHook(
    ({ combatants, key }) => {
      useCharacterHpSync(combatants, key, {
        setCombatants: (next) => {
          rows = typeof next === "function" ? next(rows) : next;
          view.rerender({ combatants: rows, key });
        },
        send,
        fetchPlayer,
      });
    },
    { initialProps: { combatants: initial, key: loadKey } },
  );
  const update = (combatants, key = loadKey) => {
    rows = combatants;
    view.rerender({ combatants, key });
  };
  const wait = () => act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS));
  const lookAgain = () => act(() => vi.advanceTimersByTimeAsync(LOOK_MS));
  return { send, fetchPlayer, update, wait, lookAgain, characters, rows: () => rows };
}

describe("hpChanges", () => {
  it("is what moved, kept between 0 and the maximum", () => {
    expect(hpChanges({ hp: 30, maxHp: 52 }, { hp: 40, tempHp: 0 })).toEqual({ currentHp: 30 });
    expect(hpChanges({ hp: -4, maxHp: 52 }, { hp: 40, tempHp: 0 })).toEqual({ currentHp: 0 });
    expect(hpChanges({ hp: 60, maxHp: 52 }, { hp: 40, tempHp: 0 })).toEqual({ currentHp: 52 });
    expect(hpChanges({ hp: 40, maxHp: 52, tempHp: 5 }, { hp: 40, tempHp: 0 })).toEqual({ tempHp: 5 });
    expect(hpChanges({ hp: 40, maxHp: 52 }, { hp: 40, tempHp: 0 })).toBeNull();
  });
});

describe("remoteChanges", () => {
  const known = { hp: 40, tempHp: 0 };

  it("is the character's figures when they differ from the ones agreed and the row still has those", () => {
    expect(remoteChanges({ hp: 40 }, known, { vitals: { currentHp: 25, tempHp: 0 } })).toEqual({ hp: 25 });
    expect(remoteChanges({ hp: 40 }, known, { vitals: { currentHp: 40, tempHp: 6 } })).toEqual({ tempHp: 6 });
    expect(remoteChanges({ hp: 40, tempHp: 5 }, { hp: 40, tempHp: 5 }, { vitals: { currentHp: 40, tempHp: 0 } })).toEqual({ tempHp: 0 });
  });

  it("is nothing when the character is as agreed, or has no vitals", () => {
    expect(remoteChanges({ hp: 40 }, known, { vitals: { currentHp: 40, tempHp: 0 } })).toBeNull();
    expect(remoteChanges({ hp: 40 }, known, {})).toBeNull();
    expect(remoteChanges({ hp: 40 }, known, null)).toBeNull();
  });

  it("leaves a row that was changed here to be written, rather than take the character's figures", () => {
    expect(remoteChanges({ hp: 33 }, known, { vitals: { currentHp: 25, tempHp: 0 } })).toBeNull();
  });
});

describe("keeping a character's hit points in step with the tracker: row to character", () => {
  it("writes nothing for rows as they load", async () => {
    const { send, wait } = setup([thorin]);

    await wait();

    expect(send).not.toHaveBeenCalled();
  });

  it("tells the character a moment after its row's hit points change, once for a burst", async () => {
    const { send, update, wait } = setup([thorin, goblin]);

    update([{ ...thorin, hp: 35 }, goblin]);
    update([{ ...thorin, hp: 30 }, goblin]);
    await wait();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(7, { currentHp: 30 });
  });

  it("sends the temporary hit points too, and nothing for a row that isn't a character", async () => {
    const { send, update, wait } = setup([thorin, goblin]);

    update([{ ...thorin, tempHp: 6 }, { ...goblin, hp: 1 }]);
    await wait();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(7, { tempHp: 6 });
  });

  it("does not write again for a change it has already sent", async () => {
    const { send, update, wait } = setup([thorin]);

    update([{ ...thorin, hp: 30 }]);
    await wait();
    update([{ ...thorin, hp: 30, reaction: true }]);
    await wait();

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("writes nothing for a change that was put back before the moment passed", async () => {
    const { send, update, wait } = setup([thorin]);

    update([{ ...thorin, hp: 30 }]);
    update([thorin]);
    await wait();

    expect(send).not.toHaveBeenCalled();
  });

  it("starts afresh when another tracker is loaded", async () => {
    const { send, update, wait } = setup([thorin]);

    update([{ ...thorin, hp: 10 }], 2); // the other tracker has him hurt already: that is not a change
    await wait();

    expect(send).not.toHaveBeenCalled();
  });

  it("ignores a write that fails", async () => {
    const { send, update, wait } = setup([thorin]);
    send.mockRejectedValue(new Error("gone"));

    update([{ ...thorin, hp: 30 }]);
    await wait();

    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("keeping a character's hit points in step with the tracker: character to row", () => {
  it("takes the figures of a character that was changed on its sheet, at the next look", async () => {
    const { characters, lookAgain, rows, send } = setup([thorin]);

    characters[7] = { currentHp: 22, tempHp: 4 }; // the sheet tab
    await lookAgain();

    expect(rows()[0]).toMatchObject({ hp: 22, tempHp: 4 });
    expect(send).not.toHaveBeenCalled(); // and does not send it straight back
  });

  it("leaves rows that aren't characters alone, and does not look when there are none", async () => {
    const { fetchPlayer, lookAgain, rows } = setup([goblin]);

    await lookAgain();

    expect(fetchPlayer).not.toHaveBeenCalled();
    expect(rows()[0]).toEqual(goblin);
  });

  it("keeps a change made at the table, and writes it, over the sheet's", async () => {
    const { characters, update, lookAgain, rows, send } = setup([thorin]);

    update([{ ...thorin, hp: 30 }]); // the table says 30 ...
    characters[7] = { currentHp: 22, tempHp: 0 }; // ... and the sheet says 22, before the table has written
    await lookAgain();

    expect(send).toHaveBeenCalledWith(7, { currentHp: 30 });
    expect(rows()[0].hp).toBe(30);
    expect(characters[7].currentHp).toBe(30);
  });

  it("does not take back a figure it has just written because a look that began earlier found the old one", async () => {
    const { characters, fetchPlayer, update, wait, rows } = setup([thorin]);
    let release;
    fetchPlayer.mockImplementationOnce(
      (id) =>
        new Promise((resolve) => {
          const before = { id, vitals: { ...characters[id] } }; // as it was when the look began
          release = () => resolve(before);
        }),
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
    }); // a look begins, and waits
    update([{ ...thorin, hp: 30 }]);
    await wait(); // the table writes 30
    await act(async () => release()); // the old answer (40) arrives

    expect(rows()[0].hp).toBe(30);
  });

  it("looks again when the page comes back into view", async () => {
    const { characters, rows } = setup([thorin]);

    characters[7] = { currentHp: 12, tempHp: 0 };
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(rows()[0].hp).toBe(12);
  });

  it("ignores a look that fails", async () => {
    const { fetchPlayer, lookAgain, rows } = setup([thorin]);
    fetchPlayer.mockRejectedValue(new Error("offline"));

    await lookAgain();

    expect(rows()[0].hp).toBe(40);
  });
});
