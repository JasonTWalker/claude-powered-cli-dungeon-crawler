// Generates a snapshot of the game state to provide to Claude in <game_state> xml tags
// Update here if new fields on room/item/other schema are defined that we want Claude to know about
// e.g room.state or item.shown_state 
// rebuilt from the GameState every turn - so it should always be current
import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";


// returns a string denoting item name and any optional flags given an item_id
function describeItem(world: World, state: GameState, id: string): string {
  const flags = Object.entries(state.itemStates[id] ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  return `${id} (${world.items[id]!.name}${flags ? `, ${flags}` : ""})`;
}


// uses the world and gamestate to build the snapshot, returning a string text block for the user input to be appended to
export function buildSnapshot(world: World, state: GameState): string {
  const room = world.rooms[state.player.roomId]!;
  const roomState = state.rooms[room.id]!;
  const list = (ids: string[]) => ids.map((id) => describeItem(world, state, id)).join(", ") || "nothing";

  return [
    "<game_state>",
    `Room: ${room.name}. ${room.description}`,
    `Fixtures: ${room.fixtures.map((f) => f.name).join(", ") || "none"}`,
    `On the floor: ${list(roomState.items)}`,
    `Carrying: ${list(state.player.inventory)}`,
    "</game_state>",
  ].join("\n");
}