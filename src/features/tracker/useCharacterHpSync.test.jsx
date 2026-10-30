import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useCharacterHpSync, { hpChanges, SYNC_DELAY_MS } from "./useCharacterHpSync";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const thorin = { id: 1, playerId: 7, name: "Thorin", hp: 40, maxHp: 52 };
const goblin = { id: 2, name: "Goblin", hp: 7, maxHp: 7 };

function setup(initial, loadKey = 1) {
  const send = vi.fn().mockResolvedValue({});
  const view = renderHook(({ combatants, key }) => useCharacterHpSync(combatants, key, { send }), {
    initialProps: { combatants: initial, key: loadKey },
  });
  const update = (combatants, key = loadKey) => view.rerender({ combatants, key });
  const wait = () => act(() => vi.advanceTimersByTime(SYNC_DELAY_MS));
  return { send, update, wait };
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

describe("keeping a character's hit points in step with the tracker", () => {
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
