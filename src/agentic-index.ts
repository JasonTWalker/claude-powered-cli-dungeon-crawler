import * as readline from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { loadWorld, WorldError, type World } from "./game/world.js";
import { createInitialState } from "./game/state.js";
import { registry } from "./tools/registry.js";
import { runTurn, type CallModel } from "./agent/loop.js";
import { parseCommand } from "./cli/parser.js";
import { runCommand } from "./cli/runCommand.js";

function loadOrExit(): World {
  try {
    return loadWorld();
  } catch (err) {
    if (err instanceof WorldError) {
      console.error(`World data error:\n${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

// lighten text styling of debug text
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;

const world = loadOrExit();
const state = createInitialState(world);
const history: Anthropic.Messages.MessageParam[] = [];

// if script executed with --offline and/or --debug flag 
const offline = process.argv.includes("--offline");
let debugOn = process.argv.includes("--debug");

const client = new Anthropic();
const callModel: CallModel = (params) => client.messages.create(params);
const ctx = {
  callModel,
  model: "claude-haiku-5-5",
  world,
  state,
  registry,
  history,
  debug: (line: string) => { if (debugOn) console.log(dim(line)); },
};


// asynchronous function - waits until the turn is fully resolved before the next command is executed once this is called
async function play(text: string): Promise<void> {
  try {
    const result = await runTurn(ctx, text);
    console.log(result.text);
    if (debugOn) console.log(dim(`[${result.rounds} round(s), ${result.usage.input} in / ${result.usage.output} out]`));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.log(`(The dungeon's voice falters: API error ${err.status}. Try again.)`);
    } else {
      throw err;
    }
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
console.log(dim(offline ? "[offline mode: crude parser, no API]" : "[type /quit to leave, /debug to toggle tool logs]"));

if (!offline) await play("I look around.");
rl.prompt();


for await (const line of rl) {
  const input = line.trim();

  if (input === "/quit") break;
  if (input === "/debug") {
    debugOn = !debugOn;
    console.log(dim(`[debug ${debugOn ? "on" : "off"}]`));
  } else if (input) {
    if (offline) {
      const command = parseCommand(input);
      console.log(command ? runCommand(world, state, command) : `I don't understand "${input}".`);
    } else {
      await play(input);
    }
  }

  console.log();
  rl.prompt();
}

rl.close();
console.log("You climb back into the daylight. Farewell.");