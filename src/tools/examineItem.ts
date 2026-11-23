import type { World } from "../game/world.js";
import { findItem, type GameState } from "../game/state.js";
import { fail, ok, type ToolOutcome } from "./types.js";

export interface ExamineItemInput {
  item_id: string;
}

export function examineItem(world: World, state: GameState, { item_id }: ExamineItemInput): ToolOutcome {
    const item = world.items[item_id];
    if (!item) {
        return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
    }
    
    const location = findItem(state, item_id);
    const carried = location?.where === "inventory";
    const onFloorHere = location?.where === "room" && location.roomId === state.player.roomId;
    if (!carried && !onFloorHere) {
        return fail("NOT_HERE", `${item.name} is not in the inventory or the current room.`);
    }
    
// note that the outcome only includes the item's description - this prevents potential puzzle solutions being leaked due to tags
  return ok({
    id: item.id,
    name: item.name,
    description: item.description,
    state: state.itemStates[item_id],
    carried,
  });
}