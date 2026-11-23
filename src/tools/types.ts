// response from the handler - tells claude what went wrong when calling a tool
export type ErrorCategory = 
    | "invalid_input" // request itself was wrong - fix input and maybe retry
    | "rule";         // request was valid, but game says no - narrate the failure

// types of error codes to provide
export type ErrorCode =
    | "UNKNOWN_ITEM"
    | "NOT_HERE"        // item/fixture is in a different room
    | "NOT_CARRIED"     // item isn't on person
    | "ALREADY_CARRIED" // pickup an item that exists in inventory
    | "INVENTORY_FULL"


// map error codes to error categories
// compiler enforces completeness - every code has a category
const CATEGORY: Record<ErrorCode, ErrorCategory> = {
  UNKNOWN_ITEM: "invalid_input",
  NOT_HERE: "rule",
  NOT_CARRIED: "rule",
  ALREADY_CARRIED: "rule",
  INVENTORY_FULL: "rule",
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