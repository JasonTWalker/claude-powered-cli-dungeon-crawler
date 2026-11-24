import type Anthropic from "@anthropic-ai/sdk"
import type { z } from "zod";
import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";


// response from the handler - tells claude what went wrong when calling a tool
export type ErrorCategory = 
    | "invalid_input" // request itself was wrong - fix input and maybe retry
    | "rule"          // request was valid, but game says no - narrate the failure
    | "system";       // handler thrown expection, bug to fix 

// types of error codes to provide
export type ErrorCode =
    | "UNKNOWN_ITEM"
    | "NOT_HERE"        // item/fixture is in a different room
    | "NOT_CARRIED"     // item isn't on person
    | "ALREADY_CARRIED" // pickup an item that exists in inventory
    | "INVENTORY_FULL"
    | "UNKNOWN_TOOL"
    | "INVALID_INPUT"
    | "INTERNAL_ERROR"

// map error codes to error categories
// compiler enforces completeness - every code has a category
const CATEGORY: Record<ErrorCode, ErrorCategory> = {
  UNKNOWN_ITEM: "invalid_input",
  NOT_HERE: "rule",
  NOT_CARRIED: "rule",
  ALREADY_CARRIED: "rule",
  INVENTORY_FULL: "rule",
  INVALID_INPUT: "invalid_input",
  INTERNAL_ERROR: "system",
  UNKNOWN_TOOL: "invalid_input",
};

// outcome of a toolcall
export type ToolOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: ErrorCode; category: ErrorCategory; message: string };

// successful tool call containing data
export function ok(data: Record<string, unknown>): ToolOutcome {
  return { ok: true, data };
}

// failing tool call with error code and custom message
export function fail(code: ErrorCode, message: string): ToolOutcome {
  return { ok: false, code, category: CATEGORY[code], message };
}

// Generic value 'S' is the Zod schema, z.infer<S> makes handler's input type follow that schema. 
// a handler can't accept a different shape than the one its schema validates
export interface GameTool<S extends z.ZodType> {
  definition: Anthropic.Messages.Tool;   // tool definition
  inputSchema: S;
  handler: (world: World, state: GameState, input: z.infer<S>) => ToolOutcome;
}

// any used as tools have different input types, this allows for validation of all different types of input schema. 
export type AnyGameTool = GameTool<any>;


// returns what you pass in - does nothing but force TypeScript to infer S and validate schema and handler agree
// allows for a container of definition, inputSchema and handler - one point of reference
export function defineTool<S extends z.ZodType>(tool: GameTool<S>): GameTool<S> {
  return tool;
}