// Define valid world generation for testing suites
import { buildWorld, type World } from "../src/game/world.js";
import { createInitialState, type GameState } from "../src/game/state.js";

// Raw JSON is untyped in real life, so fixtures are `any` to let tests break them freely.
export function validItems(): any {
  return {
    items: [
      { id: "torch", name: "Torch", description: "A torch.", tags: ["light_source"], state: { lit: false } },
      { id: "lighter", name: "Lighter", description: "A lighter.", tags: ["ignition_source"] },
    ],
  };
}

export function validRooms(): any {
  return {
    start: "entrance",
    rooms: [
      {
        id: "entrance", name: "Entrance", description: "Steps.", dark: false,
        exits: { east: { to: "store" } }, items: ["torch"],
        fixtures: [{ id: "gate", name: "Gate", description: "A gate.", affordances: ["locked"] }],
      },
      {
        id: "store", name: "Store", description: "Shelves.", dark: true,
        exits: { west: { to: "entrance" } }, items: ["lighter"], fixtures: [],
      },
    ],
  };
}

export function testWorld(): World {
  return buildWorld(validItems(), validRooms());
}

export function newGame(maxSlots?: number): { world: World; state: GameState } {
  const world = testWorld();
  return { world, state: createInitialState(world, maxSlots) };
}

export function carrying(...ids: string[]) {
  const game = newGame();
  for (const room of Object.values(game.state.rooms)) {
    room.items = room.items.filter((id) => !ids.includes(id));
  }
  game.state.player.inventory.push(...ids);
  return game;
}