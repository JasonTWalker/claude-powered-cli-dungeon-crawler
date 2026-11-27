import { describe, it, expect } from "vitest";
import { lightTorch } from "../../src/tools/actions/lightTorch.js";
import { newGame, carrying } from "../fixtures.js";


describe("lightTorch", () => {
  it("lights a carried torch with a carried lighter", () => {
    const { world, state } = carrying("torch", "lighter");
    const outcome = lightTorch(world, state, {});

    expect(outcome).toMatchObject({ ok: true, data: { lit: { id: "torch" }, using: { id: "lighter" } } });
    expect(state.itemStates.torch).toEqual({ lit: true });
  });

  it("does not use up the lighter", () => {
    const { world, state } = carrying("torch", "lighter");
    lightTorch(world, state, {});
    expect(state.player.inventory).toContain("lighter");
  });

  it("fails without the torch", () => {
    const { world, state } = carrying("lighter");
    const before = structuredClone(state);
    expect(lightTorch(world, state, {})).toMatchObject({ ok: false, code: "REQUIREMENT_UNMET", message: /not holding the torch/ });
    expect(state).toEqual(before);
  });

  it("fails if the torch is only on the floor", () => {
    const { world, state } = carrying("lighter");
    state.rooms.entrance!.items.push("torch"); // put it back down
    expect(lightTorch(world, state, {})).toMatchObject({ ok: false, message: /not holding the torch/ });
  });

  it("fails without an ignition source", () => {
    const { world, state } = carrying("torch");
    const before = structuredClone(state);
    expect(lightTorch(world, state, {})).toMatchObject({ ok: false, message: /nothing to light/ });
    expect(state).toEqual(before);
  });

  it("fails if already lit", () => {
    const { world, state } = carrying("torch", "lighter");
    lightTorch(world, state, {});
    expect(lightTorch(world, state, {})).toMatchObject({ ok: false, message: /already lit/ });
  });
});