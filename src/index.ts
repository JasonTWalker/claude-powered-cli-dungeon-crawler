import { loadWorld, WorldError } from "./game/world.js";
import { createInitialState } from "./game/state.js";

try {
  const world = loadWorld();
  const state = createInitialState(world);
  const room = world.rooms[state.player.roomId]!;

  console.log(`You begin in: ${room.name}`);
  console.log(`On the floor: ${state.rooms[room.id]!.items.map((id) => world.items[id]!.name).join(", ")}`);
  console.log(`Inventory: ${state.player.inventory.length}/${state.player.maxSlots} slots used`);
} catch (err) {
  if (err instanceof WorldError) {
    console.error(`World data error:\n${err.message}`);
    process.exit(1);
  }
  throw err;
}