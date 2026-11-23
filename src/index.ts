import { loadWorld, WorldError } from "./game/world.js";

try {
  const world = loadWorld();
  const start = world.rooms[world.startRoomId]!;
  console.log(`Loaded ${Object.keys(world.rooms).length} room(s), ${Object.keys(world.items).length} item(s)`);
  console.log(`You begin in: ${start.name}`);
  console.log(world)
} catch (err) {
  if (err instanceof WorldError) {
    console.error(`World data error:\n${err.message}`);
    process.exit(1);
  }
  throw err;
}