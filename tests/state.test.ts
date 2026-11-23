import { describe, it, expect } from "vitest";
import { createInitialState, findItem } from "../src/game/state.js";
import { testWorld } from "./fixtures.js";

describe("createInitialState", () => {
  it("puts the player in the start room with an empty inventory", () => {
    const state = createInitialState(testWorld());
    expect(state.player.roomId).toBe("entrance");
    expect(state.player.inventory).toEqual([]);
    expect(state.turn).toBe(0);
  });


  it("copies room items and fixture affordances", () => {
    const state = createInitialState(testWorld());
    expect(state.rooms.entrance?.items).toEqual(["torch"]);
    expect(state.rooms.store?.items).toEqual(["lighter"]);
    expect(state.rooms.entrance?.fixtures).toEqual({ gate: ["locked"] });
  });

  it("marks only the start room as visited", () => {
    const state = createInitialState(testWorld());
    expect(state.rooms.entrance?.visited).toBe(true);
    expect(state.rooms.store?.visited).toBe(false);
  });

  it("gives every item a state object, even items without one", () => {
    const state = createInitialState(testWorld());
    expect(state.itemStates.torch).toEqual({ lit: false });
    expect(state.itemStates.lighter).toEqual({});
  });

  it("respects a custom slot limit", () => {
    const state = createInitialState(testWorld(), 1);
    expect(state.player.maxSlots).toBe(1);
  });
});

describe("state is independent of the world", () => {
  it("changing room items does not change the world", () => {
    const world = testWorld();
    const state = createInitialState(world);
    state.rooms.entrance!.items.pop();
    expect(world.rooms.entrance?.items).toEqual(["torch"]);
  });

  it("changing fixture affordances does not change the world", () => {
    const world = testWorld();
    const state = createInitialState(world);
    state.rooms.entrance!.fixtures.gate = [];
    state.rooms.entrance!.fixtures.gate!.push("open");
    expect(world.rooms.entrance?.fixtures[0]?.affordances).toEqual(["locked"]);
  });

  it("changing item state does not change the world", () => {
    const world = testWorld();
    const state = createInitialState(world);
    state.itemStates.torch!.lit = true;
    expect(world.items.torch?.state).toEqual({ lit: false });
  });

  it("two games from the same world do not share state", () => {
    const world = testWorld();
    const game1 = createInitialState(world);
    const game2 = createInitialState(world);
    game1.rooms.entrance!.items.pop();
    expect(game2.rooms.entrance?.items).toEqual(["torch"]);
  });
});

describe("state is plain data", () => {
  it("survives a JSON round trip unchanged", () => {
    const state = createInitialState(testWorld());
    const roundTripped = JSON.parse(JSON.stringify(state));
    expect(roundTripped).toEqual(state);
  });
});

describe("findItem", () => {
  it("finds an item in a room", () => {
    const state = createInitialState(testWorld());
    expect(findItem(state, "lighter")).toEqual({ where: "room", roomId: "store" });
  });

  it("finds an item in the inventory", () => {
    const state = createInitialState(testWorld());
    state.rooms.entrance!.items = [];
    state.player.inventory.push("torch");
    expect(findItem(state, "torch")).toEqual({ where: "inventory" });
  });

  it("returns null for an unknown item", () => {
    const state = createInitialState(testWorld());
    expect(findItem(state, "sword")).toBeNull();
  });
});