
import type Anthropic from "@anthropic-ai/sdk";

type Usage = Anthropic.Messages.Message["usage"];

export function formatUsage(usage: Usage): string {
    return `[tokens: ${usage.input_tokens} in / ${usage.output_tokens} out]`
}