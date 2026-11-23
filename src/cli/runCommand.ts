import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";
import type { ToolOutcome } from "../tools/types.js";
import { pickUp } from "../tools/pickUp.js";
import { drop } from "../tools/drop.js";
import { checkInventory } from "../tools/checkInventory.js";
import { resolveItemId, type Command } from "./parser.js";
import { examineItem } from "../tools/examineItem.js";
import { describeRoom } from "./describeRoom.js";

const HELP = [
  "Commands:",
  "  look / l                 describe the room",
  "  take <item>  (get, grab) pick something up",
  "  drop <item>              put something down",
  "  examine <item>  (x)      look closely at something",
  "  inventory  (i)           what you're carrying",
  "  quit                     leave the dungeon",
].join("\n");

function show(outcome: ToolOutcome): string {
  return outcome.ok
    ? `OK ${JSON.stringify(outcome.data)}`
    : `${outcome.code} (${outcome.category}): ${outcome.message}`;
}

export function runCommand(world: World, state: GameState, command: Command): string {
  switch (command.verb) {
    case "look":
      return describeRoom(world, state);
    case "help":
      return HELP;
    case "inventory":
      return show(checkInventory(world, state, {}));
    case "take":
      return show(pickUp(world, state, { item_id: resolveItemId(world, command.noun) }));
    case "drop":
      return show(drop(world, state, { item_id: resolveItemId(world, command.noun) }));
    case "examine":
      return show(examineItem(world, state, { item_id: resolveItemId(world, command.noun) }));
    case "quit":
      return "";
  }
}