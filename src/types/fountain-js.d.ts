declare module "fountain-js" {
  // Definición mínima para TS (suficiente para nuestro uso)
  export interface FountainElement {
    type:
      | "title"
      | "scene_heading"
      | "action"
      | "dialogue"
      | "dual_dialogue"
      | "character"
      | "parenthetical"
      | "transition"
      | "lyrics"
      | "centered"
      | "section"
      | "synopsis"
      | "note";
    text?: string;
    scene_number?: string;        // a veces generado por el parser
    dual?: boolean;
    // dialogue block
    character?: string;
    dialog?: string;
    parenthetical?: string;
    // dual dialogue
    left?: any;
    right?: any;
  }

  export interface FountainParseResult {
    tokens: FountainElement[];
    title?: string;
  }

  export class Fountain {
    parse(src: string, getTokens?: boolean): FountainParseResult;
  }
}
