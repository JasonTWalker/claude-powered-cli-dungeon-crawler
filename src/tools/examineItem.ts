import type { World } from "../game/world.js";
import { findItem, type GameState } from "../game/state.js";
import { defineTool, fail, ok, type ToolOutcome } from "./types.js";
import { z } from "zod";

export const ExamineItemInputSchema = z.object({ item_id: z.string() }).strict();
export type ExamineItemInput = z.infer<typeof ExamineItemInputSchema>;

export function examineItem(world: World, state: GameState, { item_id }: ExamineItemInput): ToolOutcome {
    const item = world.items[item_id];
    if (!item) {
        return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
    }
    
    const location = findItem(state, item_id);
    const carried = location?.where === "inventory";
    const onFloorHere = location?.where === "room" && location.roomId === state.player.roomId;
    if (!carried && !onFloorHere) {
        return fail("NOT_HERE", `${item.name} is not in the inventory or the current room.`);
    }
    
// note that the outcome only includes the item's description - this prevents potential puzzle solutions being leaked due to tags
  return ok({
    id: item.id,
    name: item.name,
    description: item.description,
    state: state.itemStates[item_id],
    carried,
  });
}


export const examineItemTool = defineTool({
  definition: {
    name: "examine_item",
    description:
      "Look closely at one item the player is carrying or that is on the floor here, " +
      "to get its full description and current condition. " +
      "Use this when the player examines, inspects, studies or looks closely at a specific item.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The id of the item, as shown in the game state." },
      },
      required: ["item_id"],
      additionalProperties: false,
    },
  },
  inputSchema: ExamineItemInputSchema,
  handler: examineItem,
});