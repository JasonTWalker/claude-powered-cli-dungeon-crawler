import { describe, it, expect } from "vitest";
import { buildWorld, loadWorld, WorldError } from "../src/game/world.js";
import { validItems, validRooms } from "./fixtures.js";

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
    expect(() => buildWorld(validItems(), rooms)).toThrow(/Id "entrance" is used by a room and by a room/);
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


describe("global ids", () => {
  it("rejects an item and a fixture sharing an id", () => {
    const rooms = validRooms();
    rooms.rooms[0].fixtures[0].id = "torch";
    expect(() => buildWorld(validItems(), rooms)).toThrow(
      /Id "torch" is used by an item and by a fixture in room "entrance"/,
    );
  });

  it("rejects the same fixture id in two different rooms", () => {
    const rooms = validRooms();
    rooms.rooms[1].fixtures.push({ id: "gate", name: "Gate", description: "Another gate.", affordances: [] });
    expect(() => buildWorld(validItems(), rooms)).toThrow(/Id "gate" is used by a fixture in room "entrance"/);
  });

  it("rejects a room and an item sharing an id", () => {
    const items = validItems();
    items.items[0].id = "store";
    const rooms = validRooms();
    rooms.rooms[0].items = []; // remove reference to changed item
    expect(() => buildWorld(items, rooms)).toThrow(/Id "store" is used by an item and by a room/);
  });
});

describe("id and tag format", () => {
  it.each(["Torch", "iron-gate", "iron gate", "2nd_key", ""])("rejects the id %j", (badId) => {
    const items = validItems();
    items.items[0].id = badId;
    expect(() => buildWorld(items, validRooms())).toThrow(WorldError);
  });

  it("rejects a reference in the wrong format", () => {
    const rooms = validRooms();
    rooms.rooms[0].items = ["Torch"];
    expect(() => buildWorld(validItems(), rooms)).toThrow(/lower snake_case/);
  });

  it("rejects a tag in the wrong format", () => {
    const items = validItems();
    items.items[1].tags = ["ignition source"];
    expect(() => buildWorld(items, validRooms())).toThrow(/tags must be lower snake_case/);
  });

  it("rejects a state key in the wrong format", () => {
    const items = validItems();
    items.items[0].state = { isLit: false };
    expect(() => buildWorld(items, validRooms())).toThrow(WorldError);
  });
});