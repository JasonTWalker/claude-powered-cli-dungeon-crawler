import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createRegistry, registry } from "../src/tools/registry.js";
import { defineTool } from "../src/tools/types.js";
import { newGame } from "./fixtures.js";

describe("registry definitions", () => {
  it("every tool is strict with no extra properties", () => {
    for (const def of registry.definitions) {
      expect(def.strict, def.name).toBe(true);
      expect(def.input_schema.additionalProperties, def.name).toBe(false);
    }
  });

  it("every tool has a description long enough to be useful", () => {
    for (const def of registry.definitions) {
      expect(def.description?.length ?? 0, def.name).toBeGreaterThan(50);
    }
  });
});

describe("dispatch", () => {
  it("routes to the right handler", () => {
    const { world, state } = newGame();
    const outcome = registry.dispatch(world, state, "pick_up", { item_id: "torch" });
    expect(outcome).toMatchObject({ ok: true });
    expect(state.player.inventory).toEqual(["torch"]);
  });

  it("rejects an unknown tool", () => {
    const { world, state } = newGame();
    expect(registry.dispatch(world, state, "teleport", {})).toMatchObject({
      ok: false, code: "UNKNOWN_TOOL", category: "invalid_input",
    });
  });

  it("rejects input of the wrong type without touching state", () => {
    const { world, state } = newGame();
    const before = structuredClone(state);
    expect(registry.dispatch(world, state, "pick_up", { item_id: 42 })).toMatchObject({ code: "INVALID_INPUT" });
    expect(state).toEqual(before);
  });

  it("rejects extra fields", () => {
    const { world, state } = newGame();
    expect(registry.dispatch(world, state, "pick_up", { item_id: "torch", force: true })).toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("turns a crashing handler into INTERNAL_ERROR", () => {
    const broken = defineTool({
      definition: { name: "broken", description: "x", input_schema: { type: "object", properties: {} } },
      inputSchema: z.object({}),
      handler: () => { throw new Error("boom"); },
    });
    const { world, state } = newGame();
    const outcome = createRegistry([broken]).dispatch(world, state, "broken", {});
    expect(outcome).toMatchObject({ ok: false, code: "INTERNAL_ERROR", category: "system" });
  });

  it("refuses duplicate tool names", () => {
    const tool = registry.definitions[0]!;
    const fake = defineTool({ definition: tool, inputSchema: z.object({}), handler: () => ({ ok: true, data: {} }) });
    expect(() => createRegistry([fake, fake])).toThrow(/Duplicate tool name/);
  });
});