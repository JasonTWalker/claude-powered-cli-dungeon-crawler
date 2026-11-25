import { describe, it, expect } from "vitest";
import { pickUp } from "../src/tools/inventory/pickUp.js";
import { drop } from "../src/tools/inventory/drop.js";
import { examineItem } from "../src/tools/inventory/examineItem.js";
import { checkInventory } from "../src/tools/inventory/checkInventory.js"
import { newGame } from "./fixtures.js";

describe("pickUp", () => {
  it("moves an item from the current room to the inventory", () => {
    const { world, state } = newGame();
    const outcome = pickUp(world, state, { item_id: "torch" });

    expect(outcome).toMatchObject({ ok: true, data: { picked_up: { id: "torch", name: "Torch" } } });
    expect(state.player.inventory).toEqual(["torch"]);
    expect(state.rooms.entrance?.items).toEqual([]);
  });

  it("rejects an item that doesn't exist", () => {
    const { world, state } = newGame();
    const before = structuredClone(state);
    const outcome = pickUp(world, state, { item_id: "sword" });

    expect(outcome).toMatchObject({ ok: false, code: "UNKNOWN_ITEM", category: "invalid_input" });
    expect(state).toEqual(before);
  });

  it("rejects an item in a different room", () => {
    const { world, state } = newGame();
    const before = structuredClone(state);      // complete full copy to ensure state hasn't changed with a failed action
    const outcome = pickUp(world, state, { item_id: "lighter" });

    expect(outcome).toMatchObject({ ok: false, code: "NOT_HERE", category: "rule" });
    expect(state).toEqual(before);
  });

  it("rejects an item already carried", () => {
    const { world, state } = newGame();
    pickUp(world, state, { item_id: "torch" });
    const outcome = pickUp(world, state, { item_id: "torch" });

    expect(outcome).toMatchObject({ ok: false, code: "ALREADY_CARRIED" });
  });

  it("rejects when the inventory is full, leaving the item on the floor", () => {
    const { world, state } = newGame(0);            // set inventory size to 0
    const before = structuredClone(state);
    const outcome = pickUp(world, state, { item_id: "torch" });

    expect(outcome).toMatchObject({ ok: false, code: "INVENTORY_FULL" });
    expect(state).toEqual(before);
  });
});

describe("drop", () => {
  it("moves a carried item into the current room", () => {
    const { world, state } = newGame();
    pickUp(world, state, { item_id: "torch" });
    const outcome = drop(world, state, { item_id: "torch" });

    expect(outcome).toMatchObject({ ok: true, data: { dropped: { id: "torch" }, room: "Entrance" } });
    expect(state.player.inventory).toEqual([]);
    expect(state.rooms.entrance?.items).toEqual(["torch"]);
  });

  it("drops into whichever room the player is in", () => {
    const { world, state } = newGame();
    pickUp(world, state, { item_id: "torch" });
    state.player.roomId = "store"; // no move tool yet, so teleport
    drop(world, state, { item_id: "torch" });

    expect(state.rooms.store?.items).toContain("torch");
    expect(state.rooms.entrance?.items).not.toContain("torch");
  });

  it("rejects an item not carried", () => {
    const { world, state } = newGame();
    const before = structuredClone(state);
    const outcome = drop(world, state, { item_id: "torch" });

    expect(outcome).toMatchObject({ ok: false, code: "NOT_CARRIED", category: "rule" });
    expect(state).toEqual(before);
  });

  it("rejects an item that doesn't exist", () => {
    const { world, state } = newGame();
    const outcome = drop(world, state, { item_id: "sword" });
    expect(outcome).toMatchObject({ ok: false, code: "UNKNOWN_ITEM" });
  });
});

describe("checkInventory", () => {
  it("reports an empty inventory", () => {
    const { world, state } = newGame();
    const outcome = checkInventory(world, state, {});
    expect(outcome).toEqual({ ok: true, data: { items: [], slots_used: 0, max_slots: 4 } });
  });

  it("lists carried items by id and name", () => {
    const { world, state } = newGame();
    pickUp(world, state, { item_id: "torch" });
    const outcome = checkInventory(world, state, {});
    expect(outcome).toMatchObject({ ok: true, data: { items: [{ id: "torch", name: "Torch" }], slots_used: 1 } });
  });
});

describe("examineItem", () => {
  it("examines an item on the floor here", () => {
    const { world, state } = newGame();
    const outcome = examineItem(world, state, { item_id: "torch" });
    expect(outcome).toMatchObject({
      ok: true,
      data: { id: "torch", description: "A torch.", state: { lit: false }, carried: false },
    });
  });

  it("examines a carried item", () => {
    const { world, state } = newGame();
    pickUp(world, state, { item_id: "torch" });
    const outcome = examineItem(world, state, { item_id: "torch" });
    expect(outcome).toMatchObject({ ok: true, data: { carried: true } });
  });

  it("reflects current item state, not the starting state", () => {
    const { world, state } = newGame();
    state.itemStates.torch!.lit = true;
    const outcome = examineItem(world, state, { item_id: "torch" });
    expect(outcome).toMatchObject({ ok: true, data: { state: { lit: true } } });
  });

  it("rejects an item in another room", () => {
    const { world, state } = newGame();
    const outcome = examineItem(world, state, { item_id: "lighter" });
    expect(outcome).toMatchObject({ ok: false, code: "NOT_HERE" });
  });
});