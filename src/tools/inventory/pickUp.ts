import type { World } from "../../game/world.js";
import { findItem, type GameState } from "../../game/state.js";
import { defineTool, fail, ok, type ToolOutcome } from "../types.js";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// What the handler accepts, checked at runtime
export const PickUpInputSchema = z.object({ item_id: z.string() }).strict();
export type PickUpInput = z.infer<typeof PickUpInputSchema>;

// What Claude is told about the tool
export const pickUpDefinition: Anthropic.Messages.Tool = {
  name: "pick_up",
  description:
    "Pick up an item from the floor of the player's current room and put it in their inventory. " +
    "Use this when the player wants to take, grab, collect or pick up something. " +
    "Only items listed as on the floor in the game state can be picked up.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      item_id: {
        type: "string",
        description: 'The id of the item to pick up, as shown in the game state, e.g. "torch".',
      },
    },
    required: ["item_id"],
    additionalProperties: false,
  },
};

export function pickUp(world: World, state: GameState, { item_id }: PickUpInput): ToolOutcome {
  // Check everything before updating state.
  const item = world.items[item_id];        // fastest way to check if an item exists in the game NOTE may have to change if we want dynamic item creation
  if (!item) {
    return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
  }

  // cannot pickup an item already in inventory
  const location = findItem(state, item_id);
  if (location?.where === "inventory") {
    return fail("ALREADY_CARRIED", `${item.name} is already in the inventory.`);    // error messages are written for Claude to understand
  }
  // cannot pick up an item in a different room
  if (location?.where !== "room" || location.roomId !== state.player.roomId) {
    return fail("NOT_HERE", `${item.name} is not in the current room.`);
  }
  // cannot pick up an item if inventory is full
  if (state.player.inventory.length >= state.player.maxSlots) {
    return fail("INVENTORY_FULL", `Inventory is full (${state.player.maxSlots} slots).`);
  }

  // if passes all checks - update state
  const room = state.rooms[state.player.roomId]!;
  room.items = room.items.filter((id) => id !== item_id);   // remove all picked up item from room
  state.player.inventory.push(item_id);                     // add item to player inventory

  // pickUp action was successful 
  return ok({                           
    picked_up: { id: item.id, name: item.name },
    slots_used: state.player.inventory.length,
    max_slots: state.player.maxSlots,
  });
}


export const pickUpTool = defineTool({
  definition: pickUpDefinition,
  inputSchema: PickUpInputSchema,
  handler: pickUp
})