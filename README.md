# claude-powered-cli-dungeon-crawler
A small in scope dungeon crawler CLI game with the aim of developing a deeper understanding of how to work alongside Claude Code. Will have features that use the Claude SDK/Messages API to produce dynamic responses to user actions - exploring prompt injection negation approaches and rigidly defined tool schemas. 

Full disclosure, this game has been heavily vibe-coded, with architectural decisions made through my consideration of edge cases and repeated prompting. 

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

## Game Architecture

### World Schema Definitions

The template from which the game will be generated out of. This is how rooms and their pass conditions are defined, using Zod to ensure rigid schema definitions.

<details><summary> <b>- Show Schema Definitions for World, Rooms, and Items </b></summary>

#### 'World' Object

an interface containing a record of 'items' and 'rooms', using records to match the string of their respective ID's to their JSON object. Also contains the ID of the starting room that the player will initially be placed in. Provides fast lookup for rooms and corresponding items. 

#### "Rooms" Example JSON:

Fixtures in this case defines items that are a part of the room that can be interacted with but not picked up. 
```
{
  "start": "entrance",
  "rooms": [
    {
      "id": "entrance",
      "name": "Crumbling Entrance",
      "description": "Moss-covered steps lead down into the dark.",
      "drk": false,
      "exits": {},
      "items": ["torch", "lighter", "bread"],
      "fixtures": [
        {
          "id": "iron_gate",
          "name": "Iron Gate",
          "description": "Rusted shut, with a heavy padlock.",
          "affordances": ["locked"]
        }
      ]
    }
  ]
}
```

#### "Items" Example JSON:

```
{
  "items": [
    {
      "id": "torch",
      "name": "Wooden Torch",
      "description": "A stick wrapped in oil-soaked rags.",
      "tags": ["light_source", "flammable"],
      "state": { "lit": false }
    },
    {
      "id": "lighter",
      "name": "Brass Lighter",
      "description": "Dented, but it still sparks.",
      "tags": ["ignition_source"]
    },
    {
      "id": "bread",
      "name": "Stale Bread",
      "description": "Hard enough to knock on.",
      "tags": ["food"]
    }
  ]
}
```

#### "World" Structure from Above:
```
{
  items: {
    torch: {
      id: 'torch',
      name: 'Wooden Torch',
      description: 'A stick wrapped in oil-soaked rags.',
      tags: [Array],
      state: [Object]
    },
    lighter: {
      id: 'lighter',
      name: 'Brass Lighter',
      description: 'Dented, but it still sparks.',
      tags: [Array]
    },
    bread: {
      id: 'bread',
      name: 'Stale Bread',
      description: 'Hard enough to knock on.',
      tags: [Array]
    }
  },
  rooms: {
    entrance: {
      id: 'entrance',
      name: 'Crumbling Entrance',
      description: 'Moss-covered steps lead down into the dark.',
      dark: false,
      exits: {},
      items: [Array],
      fixtures: [Array]
    }
  },
  startRoomId: 'entrance'
}
```

#### Schema Enforcement

Enforcing a rigid schema to ensure errors don't creep into the game is done using the Zod module. This allows you to define the schema that each Room, Fixture, and Item should follow - and pass these through the validator before building the world. If an invalid schema is found, then the world doesn't build and a suitable error message is shown. ID validation is also done to ensure any item to be added to the "items" array of a room object is actually defined and exists. 

##### Error Message when Changing Room "Entrance" to Contain "stale_bread":
```
World data error:
Room "entrance" contains unknown item "stale_bread"
```

##### Error Message when JSON Tag Typo'd:
Changing "description" to "desc":
```
World data error:
rooms.json is invalid:
✖ Unrecognized key: "desc"
  → at rooms[0]
✖ Invalid input: expected string, received undefined
  → at rooms[0].description
```

Test cases defined in 'world.test.ts' are used to ensure this rigid schema validation holds.

</details>

<hr>


### Game State Definitions

Now that we have defined our 'World' as an immutable object, we need something that copies it into a mutable storage state 'GameState' that our agent can interact with. At game start, this state is generated using the 'World' object.

<details><summary><b>- Show GameState Definitions </b></summary>

#### RoomState Struct

Contains the parts of the room that can change, consider the array-string of items - when a room loads it can have items on the floor - the player may pick them up removing the item from this list. The player may then put an item down in a different room - adding it to that room's array. Fixture ID's are mapped to their affordances such as "iron_gates" -> "locked" or "wooden_crate" -> ["flammable", "breakable"]

```
export interface RoomState {
  items: string[];                     // item ids on the floor
  visited: boolean;
  fixtures: Record<string, string[]>;  // fixture id → current affordances
}
```

#### GameState Object
Contains the actual status of the game as it currently is, with an object containing information pertaining to the player, their inventory, the maximum number of items they can carry and the room they're currently in. Holds reference to item states and flags for room clear requirements. 

```
// structure of the object holding mutable game state
export interface GameState {
  player: {
    roomId: string;                     // id of the room the player is currently in
    inventory: string[];               // item ids in inventory
    maxSlots: number;                  // how many items the player can hold
  };
  rooms: Record<string, RoomState>;     // maps room ID's to their actual state
  itemStates: Record<string, Record<string, boolean>>; // item id → e.g. { torch: { lit: false } }
  flags: Record<string, boolean>;      // e.g. { gate_open: true }, as exits don't change - only the flag determining if they're open
  turn: number;
}
```
#### findItems Function
Used to determine if an item is present, will be used within tool calls to see if the player has access to the item they want to use/pick up.

```
// items can either be in the inventory or on the floor in a specified room
// allows for players to pick up an item 
export type ItemLocation =
  | { where: "inventory" }
  | { where: "room"; roomId: string };


// determines where the item is, if in inventory it returns "inventory", if in current room then it's in "room", otherwise it's 
// not found "null"
export function findItem(state: GameState, itemId: string): ItemLocation | null {
  if (state.player.inventory.includes(itemId)) return { where: "inventory" };
  for (const [roomId, room] of Object.entries(state.rooms)) {
    if (room.items.includes(itemId)) return { where: "room", roomId };
  }
  return null;
}
```

</details>

<hr>

### Tool Handler Definitions
This section will cover how we define tool handlers that interact with the GameState and provide useful information to Claude for narration.
<b>NOTE: always validate action BEFORE updating state.</b>



<details><summary><b>- Show Tool Handler Definitions & Custom Responses </b></summary>

#### Custom Tool Responses
Custom error codes and error categories have been define. These will help Claude understand why a tool has failed - enabling it to dynamically produce an appropriate response to the player. 


- Error Types:
```
// response from the handler - tells claude what went wrong when calling a tool
export type ErrorCategory = 
    | "invalid_input" // request itself was wrong - fix input and maybe retry
    | "rule";         // request was valid, but game says no - narrate the failure

// types of error codes to provide
export type ErrorCode =
    | "UNKNOWN_ITEM"
    | "NOT_HERE"        // item/fixture is in a different room
    | "NOT_CARRIED"     // item isn't on person
    | "ALREADY_CARRIED" // pickup an item that exists in inventory
    | "INVENTORY_FULL"
  ```

- Response Types:
```
// outcome of a toolcall
export type ToolOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: ErrorCode; category: ErrorCategory; message: string };

// successful tool call containing data
export function ok(data: Record<string, unknown>): ToolOutcome {
  return { ok: true, data };
}

// failing tool call with error code and custom message
export function fail(code: ErrorCode, message: string): ToolOutcome {
  return { ok: false, code, category: CATEGORY[code], message };
}
```

#### Tool Definitions
Tools relating to inventory management have been defined, these take an input of the immutable 'World' object, the mutable 'GameState' object and an input (in most cases), providing a response based on the input and state.


- checkInventory
  
Doesn't take an input, doesn't have a custom error case. Should always return the contents of the player's inventory as an array of items.

```
export type CheckInventoryInput = Record<string, never>;

// return string of items in the player's inventory
export function checkInventory(world: World, state: GameState, _input: CheckInventoryInput): ToolOutcome {      // '_' prefix: "deliberately unused"
  const items = state.player.inventory.map((id) => ({ id, name: world.items[id]!.name }));
  return ok({
    items,
    slots_used: items.length,
    max_slots: state.player.maxSlots,
  });
}
```

- pickUp
  
Takes an input string of the item_id to pick up.
As you can see each of the cases where our handler may fail have been given a custom error message to give claude context for the failing response.

```
export interface PickUpInput {
  item_id: string;
}

export function pickUp(world: World, state: GameState, { item_id }: PickUpInput): ToolOutcome {
  // Check everything before updating state.
  const item = world.items[item_id];        // fastest way to check if an item exists in the game NOTE may have to change if we want dynamic item creation
  if (!item) {
    return fail("UNKNOWN_ITEM", `No item with id "${item_id}" exists.`);
  }

  // cannot pickup an item already in inventory
  const location = findItem(state, item_id);
  if (location?.where === "inventory") {
    return fail("ALREADY_CARRIED", `${item.name} is already in the inventory.`);    // error messages are written for Claude to understand
  }
  // cannot pick up an item in a different room
  if (location?.where !== "room" || location.roomId !== state.player.roomId) {
    return fail("NOT_HERE", `${item.name} is not in the current room.`);
  }
  // cannot pick up an item if inventory is full
  if (state.player.inventory.length >= state.player.maxSlots) {
    return fail("INVENTORY_FULL", `Inventory is full (${state.player.maxSlots} slots).`);
  }

  // if passes all checks - update state
  const room = state.rooms[state.player.roomId]!;
  room.items = room.items.filter((id) => id !== item_id);   // remove all picked up item from room
  state.player.inventory.push(item_id);                     // add item to player inventory

  // pickUp action was successful 
  return ok({                           
    picked_up: { id: item.id, name: item.name },
    slots_used: state.player.inventory.length,
    max_slots: state.player.maxSlots,
  });
}
```


</details>

<hr> 

### CLI 'Offline' Paser

This defined CLI parser will be the basic implementation of verb, noun typical of these kinds of games. It will be rigidly typed, with some flexibility - e.g. typing "inventory" functions the same as typing "inv", or "take" = "get", "grab", "pick up", etc. This wont be conducive to a good gameplay experience though, and after the SDK Agent has been implemented to parse commands this legacy parser will serve as a way to test gameplay actions and the rules table. 


<details><summary><b>- Show CLI Parser Implementation </b></summary>

#### Parser
The parser.ts maps verbs to commands as follows:

```
export type Command =
  | { verb: "take"; noun: string }
  | { verb: "drop"; noun: string }
  | { verb: "examine"; noun: string }
  | { verb: "inventory" }
  | { verb: "look" }
  | { verb: "help" }
  | { verb: "quit" };

type Verb = Command["verb"];

const VERBS = new Map<string, Verb>([
  ["take", "take"], ["get", "take"], ["grab", "take"], ["pick", "take"],
  ["drop", "drop"],
  ["examine", "examine"], ["x", "examine"], ["inspect", "examine"],
  ["inventory", "inventory"], ["inv", "inventory"], ["i", "inventory"],
  ["look", "look"], ["l", "look"],
  ["help", "help"],
  ["quit", "quit"], ["exit", "quit"],
]);

```
Filler words are defined "the", "a", etc. and are stripped from the input - this parser only really cares about the first and last input words, treating them as [command, noun] pairs. A helper function resolveItemId is used to determine if the input noun corresponds to an item within the world - if it does then the handler commands defined previously are executed. The ToolResponse codes are shown for now:

```
> pick up torch
OK {"picked_up":{"id":"torch","name":"Wooden Torch"},"slots_used":1,"max_slots":4}

> 
```

```
> pick up torch
ALREADY_CARRIED (rule): Wooden Torch is already in the inventory.

> 
```
```
> drop item that doesn't exist
UNKNOWN_ITEM (invalid_input): No item with id "item that doesn't exist" exists.

> 
```

and a help command has been provided to show available actions:

```
> help
Commands:
  look / l                 describe the room
  take <item>  (get, grab) pick something up
  drop <item>              put something down
  examine <item>  (x)      look closely at something
  inventory  (i)           what you're carrying
  quit                     leave the dungeon

> 
```

describeRoom has also been provided to retrieve the items, fixtures and description present within a room, called when using the "look" command.

```
== Crumbling Entrance ==
Moss-covered steps lead down into the dark.
You see: Iron Gate
On the floor: Wooden Torch, Brass Lighter, Stale Bread
```


</details>

<hr>

#### System Prompt

"You may add sensory atmosphere (sounds, smells, light, temperature). Only name objects the player could interact with if they appear in a tool result. Never mention exits, items or fixtures that weren’t returned."
This should ideally prevent Claude from inventing features that don't exist, pulling from the atmosphere and items field in the 'rooms' schema above. However this isn't guaranteed - safeguards will be provided by strict requirements on tool usage - however flavour text could be impacted and derail the user's experience. For example, they keep trying to pull a lever that Claude invented in the description, but the tool_result is returning an error flagged response that such a lever doesn't exist. 



