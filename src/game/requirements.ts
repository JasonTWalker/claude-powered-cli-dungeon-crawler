import type { World } from "./world.js";
import type { GameState } from "./state.js";
import { fail, type ToolOutcome } from "../tools/types.js";




// type of requirement for the action - e.g. light torch would require
// has_item: torch - the player has the torch in their inventory
// has_tag: ignition_source - the player has an ignition source in their inventory
// item_state: { torch, state: unlit} - the torch must be unlit, can't light an already lit torch
export type Requirement =
  | { type: "has_item"; itemId: string; failMessage: string }
  | { type: "has_tag"; tag: string; failMessage: string }
  | { type: "item_state"; itemId: string; key: string; value: boolean; failMessage: string };



function isMet(world: World, state: GameState, req: Requirement): boolean {
  switch (req.type) {
    case "has_item":
      return state.player.inventory.includes(req.itemId);
    case "has_tag":
      return state.player.inventory.some((id) => world.items[id]?.tags.includes(req.tag));      // only check carried items
    case "item_state": 
      return (state.itemStates[req.itemId]?.[req.key] ?? false) === req.value;      // unset keys default to false 
  }
}

// Returns the first unmet requirement as a failure, or null if all are met.
// e.g. "You have no torch" -> "You have nothing to light it with" -> "the torch is already lit"
// returns failures as a ToolOutcome with fail(errorcode, message)
export function checkRequirements(world: World, state: GameState, reqs: Requirement[]): ToolOutcome | null {
  for (const req of reqs) {
    if (!isMet(world, state, req)) return fail("REQUIREMENT_UNMET", req.failMessage);
  }
  return null;
}