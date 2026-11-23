import type { World } from "../game/world.js";

export type Command =
  | { verb: "take"; noun: string }
  | { verb: "drop"; noun: string }
  | { verb: "examine"; noun: string }
  | { verb: "inventory" }
  | { verb: "look" }
  | { verb: "help" }
  | { verb: "quit" };

type Verb = Command["verb"];

const VERBS = new Map<string, Verb>([
  ["take", "take"], ["get", "take"], ["grab", "take"], ["pick", "take"],
  ["drop", "drop"],
  ["examine", "examine"], ["x", "examine"], ["inspect", "examine"],
  ["inventory", "inventory"], ["inv", "inventory"], ["i", "inventory"],
  ["look", "look"], ["l", "look"],
  ["help", "help"],
  ["quit", "quit"], ["exit", "quit"],
]);

const FILLER = new Set(["the", "a", "an", "up", "at"]);

export function parseCommand(input: string): Command | null {
  const words = input
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((w) => w !== "" && !FILLER.has(w));

  const [first, ...rest] = words;
  if (!first) return null;

  const verb = VERBS.get(first);
  if (!verb) return null;

  const noun = rest.join(" ");

  // "look at torch" means examine
  if (verb === "look" && noun) return { verb: "examine", noun };

  switch (verb) {
    case "take":
    case "drop":
    case "examine":
      return noun ? { verb, noun } : null;
    default:
      return { verb };
  }
}

export function resolveItemId(world: World, noun: string): string {
  for (const item of Object.values(world.items)) {
    const name = item.name.toLowerCase();
    if (noun === item.id || noun === name || name.split(" ").includes(noun)) {
      return item.id;
    }
  }
  return noun; // no match: pass it through, and the handler will say UNKNOWN_ITEM
}