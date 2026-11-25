import type Anthropic from "@anthropic-ai/sdk";
import type { World } from "../game/world.js";
import type { GameState } from "../game/state.js";
import type { Registry } from "../tools/registry.js";
import type { ToolOutcome } from "../tools/types.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { buildSnapshot } from "./snapshot.js";
import { wrapPlayerInput } from "./input.js";


// Loop never creates a client, CallModel takes params and returns Claude's response
// the real game uses the API here - but tests don't have to
// DEPENDENCY INJECTION
export type CallModel = (
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Messages.Message>;

// single object containing everything a single turn needs
// state and history are mutated - registry, world are immutable and hold a static reference
export interface TurnContext {
  callModel: CallModel;
  model: string;
  world: World;
  state: GameState;
  registry: Registry;
  history: Anthropic.Messages.MessageParam[];
  debug?: (line: string) => void;
}


// what a turn gives back, narration and usage
export interface TurnResult {
  text: string;
  rounds: number;
  usage: { input: number; output: number };
}

// bound the max number of API calls per turn - to prevent infinite model looping and cap potential token cost
export const MAX_TOOL_ROUNDS = 5;
export const FALLBACK_TEXT = "The dungeon falls strangely silent...";


// create an API request and await a response for the turn
export async function runTurn(ctx: TurnContext, playerText: string): Promise<TurnResult> {
  const { callModel, model, world, state, registry, history } = ctx;
  
  // if no logger passed - use one that does nothing - null object pattern
  const debug = ctx.debug ?? (() => {});

  // how long history was before this turn - allows try/catch to rety a failure from this point if needed
  const startLength = history.length;
  const usage = { input: 0, output: 0 };        // running cost total


  // turn begins:
  state.turn += 1;
  history.push({
    role: "user",
    content: `${buildSnapshot(world, state)}\n\n${wrapPlayerInput(playerText)}`,        // fresh snapshot of current game state + user input
  });


  // the loop
  try {
    // each round pass is one API call - the loop ends early once Claude stops asking for tools
    for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
      const lastRound = round === MAX_TOOL_ROUNDS;


      // api request
      const response = await callModel({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: registry.definitions,        // all tools in registry sent on every call
        ...(lastRound ? { tool_choice: { type: "none" as const } } : {}),           // forbid tools on the final round so it ends with narration
        messages: history,                  // stateless API so history is the entire conversation 
      });


      // tally usage
      usage.input += response.usage.input_tokens;
      usage.output += response.usage.output_tokens;

      // show stop reason if debug
      debug(`[round ${round}] stop_reason=${response.stop_reason}`);

      // ── Claude is finished (or stopped for another reason) ──
      if (response.stop_reason !== "tool_use") {
        if (response.stop_reason === "max_tokens") debug("[warn] reply was cut off by max_tokens");
        const text = extractText(response.content) || FALLBACK_TEXT;
        // Store only the text, so no unanswered tool_use block can be left in history
        history.push({ role: "assistant", content: [{ type: "text", text }] });
        return { text, rounds: round, usage };
      }

      // ── Claude wants tools: run ALL of them, answer in ONE message ──

      // add tool_use block to history unchanged
      history.push({ role: "assistant", content: response.content });

      // tool results 
      const results: Anthropic.Messages.ToolResultBlockParam[] = [];
      // for each tool_use block, use the tool
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        // call the handler from the registry using the currently evaluated tool - recording ToolOutcome
        const outcome = registry.dispatch(world, state, block.name, block.input);
        debug(`  → ${block.name} ${JSON.stringify(block.input)}`);
        debug(`  ← ${outcome.ok ? "OK " + JSON.stringify(outcome.data) : `${outcome.code}: ${outcome.message}`}`);

        // add ToolOutcome to results block
        results.push(toToolResult(block.id, outcome));
      }

      // add all tool_results to the history
      history.push({ role: "user", content: results });

      // on next loop, the model now sees the tool results as the last message, and likely responds with narrative text - so it exits early at the top of the next loop
    }

    // Only reachable if the last round somehow still asked for tools
    // should be unreachable due to the lastRound variable - but closes with assistant message to keep alternative conversation valid.
    history.push({ role: "assistant", content: [{ type: "text", text: FALLBACK_TEXT }] });
    return { text: FALLBACK_TEXT, rounds: MAX_TOOL_ROUNDS, usage };
  } catch (err) {
    //  reduce turn to rollback turn alongside history
    state.turn -= 1;
    history.length = startLength; // roll back, so history is still valid for the next turn. Removes everything added this turn
    throw err;                     // game controller or Index decides how to report or log the error
  }
}

// extract just the text from claude's reply (array of blocks)
function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}


// convert ToolOutcome from Registry ( tool_use => handler/codeChange) to a Claude-readable tool_result block
function toToolResult(toolUseId: string, outcome: ToolOutcome): Anthropic.Messages.ToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: JSON.stringify(
      outcome.ok ? outcome.data : { code: outcome.code, category: outcome.category, message: outcome.message },
    ),
    is_error: !outcome.ok,
  };
}