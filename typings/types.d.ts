import { ColorResolvable } from 'discord.js';

interface EmbedCreatorParameters {
  description: string;
  color: Color;
}

interface LogCreatorParameters {
  prefix: string;
  message: string;
  color: Color;
  important?: boolean;
}

type Color =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'Purple'
  | 'White';
export type { EmbedCreatorParameters, LogCreatorParameters, Color };
