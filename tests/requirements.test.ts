import { describe, it, expect } from "vitest";
import { checkRequirements, type Requirement } from "../src/game/requirements.js";
import { newGame, carrying } from "./fixtures.js";


describe("checkRequirements", () => {
  it("passes an empty list", () => {
    const { world, state } = newGame();
    expect(checkRequirements(world, state, [])).toBeNull();
  });

  it("has_item: passes when carried, fails when not", () => {
    const req: Requirement = { type: "has_item", itemId: "torch", failMessage: "No torch." };
    expect(checkRequirements(carrying("torch").world, carrying("torch").state, [req])).toBeNull();

    const { world, state } = newGame(); // torch is on the floor, not carried
    expect(checkRequirements(world, state, [req])).toMatchObject({
      ok: false, code: "REQUIREMENT_UNMET", category: "rule", message: "No torch.",
    });
  });

  it("has_tag: matches any carried item with the tag", () => {
    const req: Requirement = { type: "has_tag", tag: "ignition_source", failMessage: "Nothing to light it with." };
    const { world, state } = carrying("lighter");
    expect(checkRequirements(world, state, [req])).toBeNull();
  });

  it("has_tag: ignores items on the floor", () => {
    const req: Requirement = { type: "has_tag", tag: "light_source", failMessage: "No light." };
    const { world, state } = newGame(); // torch is here, but not carried
    expect(checkRequirements(world, state, [req])).toMatchObject({ message: "No light." });
  });

  it("item_state: compares the current state", () => {
    const unlit: Requirement = { type: "item_state", itemId: "torch", key: "lit", value: false, failMessage: "Already lit." };
    const { world, state } = newGame();
    expect(checkRequirements(world, state, [unlit])).toBeNull();

    state.itemStates.torch!.lit = true;
    expect(checkRequirements(world, state, [unlit])).toMatchObject({ message: "Already lit." });
  });

  it("item_state: treats a missing key as false", () => {
    const req: Requirement = { type: "item_state", itemId: "lighter", key: "lit", value: false, failMessage: "x" };
    const { world, state } = newGame();
    expect(checkRequirements(world, state, [req])).toBeNull();
  });

  it("reports the first unmet requirement, in order", () => {
    const reqs: Requirement[] = [
      { type: "has_item", itemId: "torch", failMessage: "first" },
      { type: "has_tag", tag: "ignition_source", failMessage: "second" },
    ];
    const { world, state } = newGame(); // both unmet
    expect(checkRequirements(world, state, reqs)).toMatchObject({ message: "first" });
  });
});