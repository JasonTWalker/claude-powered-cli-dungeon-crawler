import * as readline from "node:readline";
import { loadWorld, WorldError, type World } from "./game/world.js";
import { createInitialState } from "./game/state.js";
import { parseCommand } from "./cli/parser.js";
import { runCommand } from "./cli/runCommand.js";
import { describeRoom } from "./cli/describeRoom.js";

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

const world = loadOrExit();
const state = createInitialState(world);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

console.log(describeRoom(world, state));
console.log('(type "help" for commands)\n');
rl.prompt();

for await (const line of rl) {
  const command = parseCommand(line);

  if (!command) {
    if (line.trim()) console.log(`I don't understand "${line.trim()}". Type "help".`);
  } else if (command.verb === "quit") {
    break;
  } else {
    console.log(runCommand(world, state, command));
  }

  console.log();
  rl.prompt();
}

rl.close();
console.log("You climb back into the daylight. Farewell.");