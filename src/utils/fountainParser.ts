// src/utils/fountainParser.ts
import fountain from "fountain-js";

export type ParaType =
  | "Scene Heading"
  | "Action"
  | "Character"
  | "Parenthetical"
  | "Dialogue"
  | "Transition"
  | "DualDialogue";

export interface Para {
  type: ParaType;
  text?: string;           // general text
  sceneNumber?: string;    // para scene headings
  character?: string;      // para Character / Dialogue
  parenthetical?: string;  // para Parenthetical (inline)
  dialogue?: string;       // para Dialogue
  left?: Para[];           // para DualDialogue
  right?: Para[];          // para DualDialogue
}

export function parseFountainToParas(src: string): Para[] {
  const res = fountain.parse(src || "");
  const out: Para[] = [];

  const addDialogueBlock = (el: any) => {
    // El parser puede dar bloques 'dialogue' con fields
    if (el.character) out.push({ type: "Character", character: el.character.toUpperCase() });
    if (el.parenthetical) out.push({ type: "Parenthetical", text: el.parenthetical });
    if (el.dialog) out.push({ type: "Dialogue", dialogue: el.dialog });
  };

  for (const el of res.tokens) {
    switch (el.type) {
      case "scene_heading": {
        out.push({
          type: "Scene Heading",
          text: (el.text || "").toUpperCase(),
          sceneNumber: el.scene_number // puede venir vacío; lo sobreescribimos nosotros más tarde
        });
        break;
      }
      case "action": {
        out.push({ type: "Action", text: el.text || "" });
        break;
      }
      case "transition": {
        out.push({ type: "Transition", text: (el.text || "").toUpperCase() });
        break;
      }
      case "dialogue": {
        addDialogueBlock(el);
        break;
      }
      case "dual_dialogue": {
        const left: Para[] = [];
        const right: Para[] = [];
        if (el.left) {
          if (el.left.character) left.push({ type: "Character", character: el.left.character.toUpperCase() });
          if (el.left.parenthetical) left.push({ type: "Parenthetical", text: el.left.parenthetical });
          if (el.left.dialog) left.push({ type: "Dialogue", dialogue: el.left.dialog });
        }
        if (el.right) {
          if (el.right.character) right.push({ type: "Character", character: el.right.character.toUpperCase() });
          if (el.right.parenthetical) right.push({ type: "Parenthetical", text: el.right.parenthetical });
          if (el.right.dialog) right.push({ type: "Dialogue", dialogue: el.right.dialog });
        }
        out.push({ type: "DualDialogue", left, right });
        break;
      }
      case "character": {
        out.push({ type: "Character", character: (el.text || "").toUpperCase() });
        break;
      }
      case "parenthetical": {
        out.push({ type: "Parenthetical", text: el.text || "" });
        break;
      }
      case "lyrics": // tratamos como Action centrada/normal por ahora
      case "centered":
      case "synopsis":
      case "section":
      case "note":
      case "title":
      default: {
        // los ignoramos o los mapeamos como acción simple
        if (el.text) out.push({ type: "Action", text: el.text });
        break;
      }
    }
  }

  return out;
}
