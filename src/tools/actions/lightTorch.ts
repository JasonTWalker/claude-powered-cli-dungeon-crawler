import { z } from "zod";
import type { World } from "../../game/world.js";
import type { GameState } from "../../game/state.js";
import { checkRequirements, type Requirement } from "../../game/requirements.js";
import { defineTool, ok, type ToolOutcome } from "../types.js";

export const LightTorchInputSchema = z.object({}).strict();
export type LightTorchInput = z.infer<typeof LightTorchInputSchema>;


// define requirements for the light torch action
const REQUIREMENTS: Requirement[] = [
  { type: "has_item", itemId: "torch", failMessage: "The player is not holding the torch." },
  { type: "item_state", itemId: "torch", key: "lit", value: false, failMessage: "The torch is already lit." },
  { type: "has_tag", tag: "ignition_source", failMessage: "The player has nothing to light the torch with." },
];


// define the light torch function
export function lightTorch(world: World, state: GameState, _input: LightTorchInput) {
  // ── Check everything first ──
  const failed = checkRequirements(world, state, REQUIREMENTS);
  if (failed) return failed;

  // ── Then change state ──
  state.itemStates.torch!.lit = true;

  const sourceId = state.player.inventory.find((id) => world.items[id]!.tags.includes("ignition_source"))!;

  // define the successful tool outcome
  return ok({
    lit: { id: "torch", name: world.items.torch!.name },
    using: { id: sourceId, name: world.items[sourceId]!.name },
  });
}

// define the tool, description for claude, input schema ( empty ) and the handler function.
export const lightTorchTool = defineTool({
  definition: {
    name: "light_torch",
    description:
      "Light the torch the player is carrying, using an ignition source they are also carrying, such as a lighter. " +
      "Use this when the player wants to light, ignite or set fire to their torch. " +
      "The torch must be in the player's inventory, not on the floor.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  inputSchema: LightTorchInputSchema,
  handler: lightTorch,
});