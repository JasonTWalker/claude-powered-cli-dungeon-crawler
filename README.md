# claude-powered-cli-dungeon-crawler
A small in scope dungeon crawler CLI game with the aim of developing a deeper understanding of how to work alongside Claude Code. Will have features that use the Claude SDK/Messages API to produce dynamic responses to user actions - exploring prompt injection negation approaches and rigidly defined tool schemas. 



<hr>

## Mapping Course Contents to Game Mechanics

### Tool Usage, Results and Input/Output Schema 

Can define actions as tools that are used, this provides the Dungeon Manager (Claude) the ability to strictly define requirements, I think this is best handled through an example.

The player states they want to ignite their torch, this would match the description of such a tool as 'light_torch'. This tool schema could have a rigid schema requirement as:

```
ToolDefinition: 
   {
      name: "light_torch",
      description: "Ignite the user's torch to provide illumination of the room",
      input_schema: {
        type: "object",
        properties: {
          player_inventory: {
            type: "array[string]",
            description: "The contents of the player's inventory."
          },
        },
        required: [player_inventory["torch"], player_inventory["lighter"]]
      },
```
Look, I'm not sure that the input_schema can possibly be this strict, but it will be interesting to explore - if you can use tools within tools to say, get the contents of player's inventory that will be stored in a JSON then parse it to see if the required items are present. Though I know from using a divide tool it is quite often populated by the model's understanding of the message/tool.

But the response could be used to determine useful information about the attempted action. Let's say the tool gets called - but the response is invalid because a required property - "torch" or "lighter" is missing. This can be used in the error code with an is_error? true flag. Then, hopefully at least, the model could use this error as a response to the user. For example:

```
>>> You do not have a torch present in your inventory, yada yada, yada yads
```

<hr>

### Managed SubAgents & Hooks(?)

Managed sub agents could be used to control NPCs such as enemies, with hooks used to force actions to take place in-line with gameplay rules.
For example, if the combat is to be turn-based, and a model wants to call a tool say damage_player - then a BeforeToolUse hook could be used to ensure that the subagent is acting within their turn. Exploring this will give a deeper understanding of managed context - what happens if the sub-agent knows the player's health? 


<hr>

### Logging

To manage token usage (this will be hosted on my personal API key) logging will be used. This will aid in testing, such as logging user turns that return an error outside of a define error code for "item not available". 
Candidates for logging include:

- Conversational turn
- Round
- Type of action - tool_call, tool_result, state_change (tool action modifies in-code game state)
- API response, stop reason, tokens used, model used - to measure how "expensive" the game is during runtime, find where token costs are exceeding expectations.
- Narrative text, what is shown to the player - check that it remains in character with flavour
- Errors

<hr>

### Game Architecture

