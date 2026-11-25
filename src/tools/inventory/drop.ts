import type { World } from "../../game/world.js";
import type { GameState } from "../../game/state.js";
import { defineTool, fail, ok, type ToolOutcome } from "../types.js";
import { z } from "zod";

export const DropInputSchema = z.object({ item_id: z.string() }).strict()
export type DropInput = z.infer<typeof DropInputSchema>

export function drop(world: World, state: GameState, { item_id }: DropInput): ToolOutcome {
  const item = world.items[item_id];
  if (!item) {
    return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
  }
  if (!state.player.inventory.includes(item_id)) {
    return fail("NOT_CARRIED", `${item.name} is not in the inventory.`);
  }

  state.player.inventory = state.player.inventory.filter((id) => id !== item_id);   // remove item from inventory
  state.rooms[state.player.roomId]!.items.push(item_id);                            // add item to floor of room

  return ok({
    dropped: { id: item.id, name: item.name },
    room: world.rooms[state.player.roomId]!.name,
  });
}


export const dropTool = defineTool({
  definition: {
    name: "drop",
    description:
      "Drop an item from the player's inventory onto the floor of the current room. " +
      "Use this when the player wants to drop, put down, leave or discard something they are carrying. " +
      "Only items listed as carried in the game state can be dropped.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description: 'The id of ta carried item, as shown in the game state, e.g. "torch".',
        },
      },
      required: ["item_id"],
      additionalProperties: false,
    },
  },
  inputSchema: DropInputSchema,
  handler: drop,
});