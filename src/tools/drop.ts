import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";
import { fail, ok, type ToolOutcome } from "./types.js";

export interface DropInput {
  item_id: string;
}

export function drop(world: World, state: GameState, { item_id }: DropInput): ToolOutcome {
  const item = world.items[item_id];
  if (!item) {
    return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
  }
  if (!state.player.inventory.includes(item_id)) {
    return fail("NOT_CARRIED", `${item.name} is not in the inventory.`);
  }

  state.player.inventory = state.player.inventory.filter((id) => id !== item_id);   // remove item from inventory
  state.rooms[state.player.roomId]!.items.push(item_id);                            // add item to floor of room

  return ok({
    dropped: { id: item.id, name: item.name },
    room: world.rooms[state.player.roomId]!.name,
  });
}