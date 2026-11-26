// Remove angled brackets from the player input, to prevent against a form of prompt injection where the player may try to invent their own <game_state>
// or otherwise
export const MAX_INPUT_LENGTH = 400;            // cap message length to reduce token cost and also those comically long "DAN" jailbreak scripts from 2023

export function wrapPlayerInput(text: string): string {
    const cleaned_input = text.slice(0, MAX_INPUT_LENGTH).replace(/[<>]/g, "");
    return `<player_input>${cleaned_input}</player_input>`;
}