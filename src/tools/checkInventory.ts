import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";
import { ok, type ToolOutcome } from "./types.js";

export type CheckInventoryInput = Record<string, never>;

// return string of items in the player's inventory
export function checkInventory(world: World, state: GameState, _input: CheckInventoryInput): ToolOutcome {      // '_' prefix: "deliberately unused"
  const items = state.player.inventory.map((id) => ({ id, name: world.items[id]!.name }));
  return ok({
    items,
    slots_used: items.length,
    max_slots: state.player.maxSlots,
  });
}