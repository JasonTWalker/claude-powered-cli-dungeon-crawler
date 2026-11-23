import { describe, it, expect } from "vitest";
import { buildWorld, loadWorld, WorldError } from "../src/game/world.js";

// Raw JSON is untyped in real life (JSON.parse returns any), so the
// fixtures are typed `any` too. That lets each test break them freely.
function validItems(): any {
  return {
    items: [
      { id: "torch", name: "Torch", description: "A torch.", tags: ["light_source"] },
      { id: "lighter", name: "Lighter", description: "A lighter.", tags: ["ignition_source"] },
    ],
  };
}

function validRooms(): any {
  return {
    start: "entrance",
    rooms: [
      {
        id: "entrance", name: "Entrance", description: "Steps.", dark: false,
        exits: { east: { to: "store" } }, items: ["torch"], fixtures: [],
      },
      {
        id: "store", name: "Store", description: "Shelves.", dark: true,
        exits: { west: { to: "entrance" } }, items: ["lighter"], fixtures: [],
      },
    ],
  };
}

describe("buildWorld", () => {
  it("builds a valid world keyed by id", () => {
    const world = buildWorld(validItems(), validRooms());
    expect(world.startRoomId).toBe("entrance");
    expect(world.rooms.store?.items).toEqual(["lighter"]);
    expect(world.items.torch?.name).toBe("Torch");

    console.log("World JSON Structure: ");
    console.log(world);
  });

  it("rejects a room missing a required field", () => {
    const rooms = validRooms();
    delete rooms.rooms[0].dark;
    expect(() => buildWorld(validItems(), rooms)).toThrow(WorldError);
  });

  it("rejects a typo'd field name", () => {
    const rooms = validRooms();
    rooms.rooms[0].descripton = "typo";
    expect(() => buildWorld(validItems(), rooms)).toThrow(/descripton/);
  });

  it("rejects an invalid direction", () => {
    const rooms = validRooms();
    rooms.rooms[0].exits = { northwest: { to: "store" } };
    expect(() => buildWorld(validItems(), rooms)).toThrow(WorldError);
  });

  it("rejects duplicate room ids", () => {
    const rooms = validRooms();
    rooms.rooms[1].id = "entrance";
    expect(() => buildWorld(validItems(), rooms)).toThrow(/Duplicate room id/);
  });

  it("rejects an exit to an unknown room", () => {
    const rooms = validRooms();
    rooms.rooms[0].exits.east.to = "nowhere";
    expect(() => buildWorld(validItems(), rooms)).toThrow(/unknown room "nowhere"/);
  });

  it("rejects an unknown item in a room", () => {
    const rooms = validRooms();
    rooms.rooms[0].items.push("sword");
    expect(() => buildWorld(validItems(), rooms)).toThrow(/unknown item "sword"/);
  });

  it("rejects the same item in two rooms", () => {
    const rooms = validRooms();
    rooms.rooms[1].items.push("torch");
    expect(() => buildWorld(validItems(), rooms)).toThrow(/is in both/);
  });

  it("rejects a missing start room", () => {
    const rooms = validRooms();
    rooms.start = "attic";
    expect(() => buildWorld(validItems(), rooms)).toThrow(/Start room "attic"/);
  });
});

describe("loadWorld", () => {
  it("loads the real data files", () => {
    // Catches typos in data/*.json every time you run the tests
    expect(() => loadWorld()).not.toThrow();
  });
});