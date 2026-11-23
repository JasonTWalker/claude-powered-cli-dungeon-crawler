import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { formatUsage } from "../agent/usage.js";

const client = new Anthropic();
const SYSTEM = "You are the narrator of a grim, atmospheric text dungeon crawler. Reply in 1-3 sentences. Do not invent tools or items that are interactive. Do not invent features of a room that could be interacted with";
const history: MessageParam[] = [];

async function say(playerText: string): Promise<void> {
  history.push({ role: "user", content: playerText });

  // send history to Claude and await a response
  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 200,
    system: SYSTEM,
    messages: history,
  });

  // add Claude response to message history
  history.push({ role: "assistant", content: response.content });

  // Extract text from Claude assistant response
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  console.log(`> ${playerText}`);
  console.log(text);
  console.log(formatUsage(response.usage), `stop: ${response.stop_reason}\n`);
}

await say("The player arrives at the entrance: moss-covered steps leading down into the dark.");
await say("I listen carefully. What can I hear?");
await say("Remind me, where am I standing?");


// example of handling API errors, SDK retries rate limits (429), server errors (5xx) and dropped connections.
// twice by default
// third error category alongside custom "invalid_input" and "rule"
try {
  await say("...");
} catch (err) {
  if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
  } else {
    throw err;
  }
}