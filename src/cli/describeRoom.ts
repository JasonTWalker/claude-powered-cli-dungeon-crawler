import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";

// Temporary: replaced by the `look` tool in Milestone 3 (which will handle darkness)
export function describeRoom(world: World, state: GameState): string {
  const room = world.rooms[state.player.roomId]!;
  const roomState = state.rooms[room.id]!;
  const items = roomState.items.map((id) => world.items[id]!.name);
  const fixtures = room.fixtures.map((f) => f.name);

  return [
    `== ${room.name} ==`,
    room.description,
    fixtures.length ? `You see: ${fixtures.join(", ")}` : "",
    items.length ? `On the floor: ${items.join(", ")}` : "Nothing on the floor.",
  ]
    .filter(Boolean)
    .join("\n");
}