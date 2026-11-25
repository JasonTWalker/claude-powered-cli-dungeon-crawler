import type { World } from "../../game/world.js";
import type { GameState } from "../../game/state.js";
import { defineTool, ok, type ToolOutcome } from "../types.js";
import { z } from "zod";

export const CheckInventoryInputSchema = z.object({}).strict();
export type CheckInventoryInput = z.infer<typeof CheckInventoryInputSchema>;


// return string of items in the player's inventory
export function checkInventory(world: World, state: GameState, _input: CheckInventoryInput): ToolOutcome {      // '_' prefix: "deliberately unused"
  const items = state.player.inventory.map((id) => ({ id, name: world.items[id]!.name }));
  return ok({
    items,
    slots_used: items.length,
    max_slots: state.player.maxSlots,
  });
}

export const checkInventoryTool = defineTool({
  definition: {
    name: "check_inventory",
    description:
      "List exactly what the player is carrying and how many inventory slots are used. " +
      "Use this when the player asks what they have, checks their pack, or asks how much more they can carry.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  inputSchema: CheckInventoryInputSchema,
  handler: checkInventory,
});