import { z } from "zod";    // zod used to define rigid json schemas, game wont compile with failing schema

export const DirectionSchema = z.enum(["north", "south", "east", "west"]);

export const ItemSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string()),
    state: z.record(z.string(), z.boolean()).optional(),    // not all items require a state, e.g bread can just be eaten
}).strict();        //  rejects unknown keys, names must be typed accuractly - no typos

export const ItemsFileSchema = z.object({   // so invenotry will contain an array of Item objects
    items: z.array(ItemSchema) 
}).strict();

const ExitSchema = z.object({
    to: z.string().min(1),      // direction the exit leads to
    requiresFlag: z.string().min(1).optional()  // not all exits require a condition change, some are just exits
}).strict();

const FixturesSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    affordances: z.array(z.string()),
}).strict();

export const RoomSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    dark: z.boolean(),
    exits: z.partialRecord(DirectionSchema, ExitSchema),    // every key must be a valid direction, but not all rooms have omnidirectional exits
    items: z.array(z.string()),
    fixtures: z.array(FixturesSchema),
}).strict();

export const RoomsFileSchema = z.object({
    start: z.string().min(1),
    rooms: z.array(RoomSchema).min(1),
  }).strict();


export type Direction = z.infer<typeof DirectionSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Room = z.infer<typeof RoomSchema>;

