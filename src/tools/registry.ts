import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";
import { fail, type AnyGameTool, type ToolOutcome } from "./types.js";
import { pickUpTool } from "./inventory/pickUp.js";
import { dropTool } from "./inventory/drop.js";
import { checkInventoryTool } from "./inventory/checkInventory.js";
import { examineItemTool } from "./inventory/examineItem.js";


// map tool definitions to their dispatch
export interface Registry {
  definitions: Anthropic.Messages.Tool[];
  dispatch: (world: World, state: GameState, name: string, input: unknown) => ToolOutcome;
}

// map each passed tool to a toolRegistry
export function createRegistry(tools: AnyGameTool[]): Registry {
  const byName = new Map<string, AnyGameTool>();
  for (const tool of tools) {
    const name = tool.definition.name;
    if (byName.has(name)) throw new Error(`Duplicate tool name: ${name}`);
    byName.set(name, tool);
  }

  // never throws an error that would interrupt the game - only ToolOutcomes that let Claude handle the error case
  function dispatch(world: World, state: GameState, name: string, input: unknown): ToolOutcome {
    const tool = byName.get(name);
    if (!tool) return fail("UNKNOWN_TOOL", `No tool named "${name}" exists.`);

    // turn 'unknown' parameter into the type of input expected by the tool
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return fail("INVALID_INPUT", `Invalid input for ${name}: ${z.prettifyError(parsed.error)}`);
    }

    // if handler crashes it becomes an INTERNAL_ERROR bug - shows up in terminal so you know where to fix
    try {
      return tool.handler(world, state, parsed.data);
    } catch (err) {
      console.error(`[bug] ${name} threw:`, err);
      return fail("INTERNAL_ERROR", "Something went wrong in the game itself. The action did not happen.");
    }
  }

  // map definitions to dispatch
  return { definitions: tools.map((t) => t.definition), dispatch };
}

// export the registry for the game
export const registry = createRegistry([checkInventoryTool, examineItemTool, pickUpTool, dropTool]);