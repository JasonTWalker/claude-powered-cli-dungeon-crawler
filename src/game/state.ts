import type { World } from "./world.js";


// contains the parts of the room that can change
// such as fixtures being a closed gate, that could become open if a certain condition is met
export interface RoomState {
  items: string[];                     // item ids on the floor
  visited: boolean;
  fixtures: Record<string, string[]>;  // fixture id → current affordances
}

// structure of the object holding mutable game state
export interface GameState {
  player: {
    roomId: string;                     // id of the room the player is currently in
    inventory: string[];               // item ids in inventory
    maxSlots: number;                  // how many items the player can hold
  };
  rooms: Record<string, RoomState>;     // maps room ID's to their actual state
  itemStates: Record<string, Record<string, boolean>>; // item id → e.g. { torch: { lit: false } }
  flags: Record<string, boolean>;      // e.g. { gate_open: true }, as exits don't change - only the flag determining if they're open
  turn: number;
}

export const DEFAULT_MAX_SLOTS = 4;

export function createInitialState(world: World, maxSlots = DEFAULT_MAX_SLOTS): GameState {
  const rooms: Record<string, RoomState> = {};
  for (const room of Object.values(world.rooms)) {
    const fixtures: Record<string, string[]> = {};
    for (const fixture of room.fixtures) {
      fixtures[fixture.id] = [...fixture.affordances];      // maps fixture affordances to the fixtures in the room
    }
    rooms[room.id] = {
      items: [...room.items],                               // maps items in the room world to the room in state, note copies spread - doesn't copy reference
      visited: room.id === world.startRoomId,               // only visited room at start is the initial room
      fixtures,                                             // loads fixtures into room state
    };
  }

  const itemStates: Record<string, Record<string, boolean>> = {};
  for (const item of Object.values(world.items)) {  
    itemStates[item.id] = { ...item.state };                // load item state into state, if it has one (optional tag)
  }


  // return state object
  return {
    player: { roomId: world.startRoomId, inventory: [], maxSlots },     // puts player in world start location e.g. exit, no items in inventory to start
    rooms,
    itemStates,
    flags: {},          // starts empty, flags that aren't set count as false. false will always be true is the good-case, e.g. exit open
    turn: 0,            // counter for each player turn for logging purposes and token tracking
  };
}

// items can either be in the inventory or on the floor in a specified room
// allows for players to pick up an item 
export type ItemLocation =
  | { where: "inventory" }
  | { where: "room"; roomId: string };


// determines where the item is, if in inventory it returns "inventory", if in current room then it's in "room", otherwise it's 
// not found "null"
export function findItem(state: GameState, itemId: string): ItemLocation | null {
  if (state.player.inventory.includes(itemId)) return { where: "inventory" };
  for (const [roomId, room] of Object.entries(state.rooms)) {
    if (room.items.includes(itemId)) return { where: "room", roomId };
  }
  return null;
}