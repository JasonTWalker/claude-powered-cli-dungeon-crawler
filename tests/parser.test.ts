import { describe, it, expect } from "vitest";
import { parseCommand, resolveItemId } from "../src/cli/parser.js";
import { testWorld } from "./fixtures.js";

describe("parseCommand", () => {
  it("parses a verb and noun", () => {
    expect(parseCommand("take torch")).toEqual({ verb: "take", noun: "torch" });
  });

  it("handles aliases", () => {
    expect(parseCommand("grab torch")).toEqual({ verb: "take", noun: "torch" });
    expect(parseCommand("i")).toEqual({ verb: "inventory" });
    expect(parseCommand("x torch")).toEqual({ verb: "examine", noun: "torch" });
  });

  it("ignores case, extra spaces and filler words", () => {
    expect(parseCommand("  Pick UP the   Torch ")).toEqual({ verb: "take", noun: "torch" });
  });

  it("treats 'look at X' as examine", () => {
    expect(parseCommand("look at torch")).toEqual({ verb: "examine", noun: "torch" });
  });

  it("keeps multi-word nouns", () => {
    expect(parseCommand("take wooden torch")).toEqual({ verb: "take", noun: "wooden torch" });
  });

  it("rejects a verb that needs a noun but has none", () => {
    expect(parseCommand("take")).toBeNull();
  });

  it("rejects unknown verbs and empty input", () => {
    expect(parseCommand("dance")).toBeNull();
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
  });

  it("rejects object prototype names", () => {
    expect(parseCommand("constructor")).toBeNull();
    expect(parseCommand("toString")).toBeNull();
  });
});

describe("resolveItemId", () => {
  const world = testWorld();

  it("matches by id", () => {
    expect(resolveItemId(world, "torch")).toBe("torch");
  });

  it("matches by name, ignoring case", () => {
    expect(resolveItemId(world, "lighter")).toBe("lighter");
  });

  it("passes unknown nouns through unchanged", () => {
    expect(resolveItemId(world, "stick")).toBe("stick");
  });
});