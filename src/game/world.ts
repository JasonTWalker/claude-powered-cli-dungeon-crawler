import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ItemsFileSchema, RoomsFileSchema, type Item, type Room } from "./schemas.js";


// EVERY ID MUST BE UNIQUE: any item, room or fixture CANNOT share an ID - as this is how interaction is determined
function checkGlobalIds(items: Item[], rooms: Room[]): void {
  const owners = new Map<string, string>(); // id → description of what uses it

  // construct a hashmap
  const claim = (id: string, owner: string) => {
    const existing = owners.get(id);
    if (existing) throw new WorldError(`Id "${id}" is used by ${existing} and by ${owner}`);
    owners.set(id, owner);
  };

  for (const item of items) claim(item.id, "an item");
  for (const room of rooms) {
    claim(room.id, "a room");
    for (const fixture of room.fixtures) claim(fixture.id, `a fixture in room "${room.id}"`);
  }
}






export interface World {
    items: Record<string, Item>;
    rooms: Record<string, Room>;
    startRoomId: string;
}

export class WorldError extends Error { }


// Uses Zod to determine if input schemas, rooms/items matches the strict definitions in schemas.ts
// If no, throw an error and the game refuses to start.
function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
    const result = schema.safeParse(raw);
    if (!result.success) {
        throw new WorldError(`${label} is invalid:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
}

// Ensures all indexes have a unique identifier. 
function indexById<T extends { id: string }>(list: T[], label: string): Record<string, T> {
    const byId: Record<string, T> = {};
    for (const entry of list) {
        if (byId[entry.id]) throw new WorldError(`Duplicate ${label} id: "${entry.id}"`);
        byId[entry.id] = entry;
    }
    return byId;
}

export function buildWorld(rawItems: unknown, rawRooms: unknown): World {
    // 1. Shape: does each file match its schema?
    const itemsFile = parseOrThrow(ItemsFileSchema, rawItems, "items.json");
    const roomsFile = parseOrThrow(RoomsFileSchema, rawRooms, "rooms.json");

    // 2. Uniqueness: no two things share an id
    checkGlobalIds(itemsFile.items, roomsFile.rooms);
    const items = indexById(itemsFile.items, "item");
    const rooms = indexById(roomsFile.rooms, "room");

    // 3. References: every id that points somewhere points at something real
    if (!rooms[roomsFile.start]) {
        throw new WorldError(`Start room "${roomsFile.start}" does not exist`);
    }

    // Enforce that each item can only exist in one room.
    // E.g. item with id "cellar_key" can't be both in the cellar and the hall.
    const placedIn: Record<string, string> = {};
    for (const room of roomsFile.rooms) {
        for (const itemId of room.items) {
            if (!items[itemId]) {
                throw new WorldError(`Room "${room.id}" contains unknown item "${itemId}"`);
            }
            if (placedIn[itemId]) {
                throw new WorldError(`Item "${itemId}" is in both "${placedIn[itemId]}" and "${room.id}"`);
            }
            placedIn[itemId] = room.id;
        }

        for (const [direction, exit] of Object.entries(room.exits)) {
            if (exit && !rooms[exit.to]) {
                throw new WorldError(`Room "${room.id}" exit ${direction} leads to unknown room "${exit.to}"`);
            }
        }
    }

    return { items, rooms, startRoomId: roomsFile.start };
}


// Uses the defined json in ./data/ directory to build a world of rooms and items.
export function loadWorld(dataDir = "data"): World {
    const read = (file: string): unknown =>
        JSON.parse(readFileSync(join(dataDir, file), "utf8"));
    return buildWorld(read("items.json"), read("rooms.json"));
}