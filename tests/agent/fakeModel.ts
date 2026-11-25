import type Anthropic from "@anthropic-ai/sdk";
import type { CallModel } from "../../src/agent/loop.js";

type Params = Anthropic.Messages.MessageCreateParamsNonStreaming;

// Builds a response shaped like the real API's. Typed loosely: tests only need these fields.
export function reply(stop_reason: string, ...content: object[]): Anthropic.Messages.Message {
  return {
    id: "msg_test", type: "message", role: "assistant", model: "fake",
    content, stop_reason, stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  } as unknown as Anthropic.Messages.Message;
}

export const text = (t: string) => ({ type: "text", text: t });
export const toolUse = (id: string, name: string, input: object) => ({ type: "tool_use", id, name, input });

// Returns scripted responses in order, and records every request it receives.
export function scripted(...responses: Anthropic.Messages.Message[]): { callModel: CallModel; calls: Params[] } {
  const calls: Params[] = [];
  let i = 0;
  const callModel: CallModel = async (params) => {
    calls.push(structuredClone(params));
    const next = responses[i++];
    if (!next) throw new Error("Fake model ran out of scripted responses");
    return next;
  };
  return { callModel, calls };
}