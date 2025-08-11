// src/utils/fdx.ts
import type { Screenplay } from "../models/screenplay";
import type { Scene } from "../models/scenes";
import { makeSlugline } from "./fountain";
import { parseFountainToParas, type Para } from "./fountainParser";

/** XML escape */
function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paraToFdx(p: Para): string[] {
  const lines: string[] = [];
  switch (p.type) {
    case "Scene Heading": {
      lines.push(`<Paragraph Type="Scene Heading"><Text>${esc(p.text ?? "")}</Text></Paragraph>`);
      break;
    }
    case "Action": {
      lines.push(`<Paragraph Type="Action"><Text>${esc(p.text ?? "")}</Text></Paragraph>`);
      break;
    }
    case "Transition": {
      lines.push(`<Paragraph Type="Transition"><Text>${esc(p.text ?? "")}</Text></Paragraph>`);
      break;
    }
    case "Character": {
      lines.push(`<Paragraph Type="Character"><Text>${esc(p.character ?? "")}</Text></Paragraph>`);
      break;
    }
    case "Parenthetical": {
      lines.push(`<Paragraph Type="Parenthetical"><Text>${esc(p.text ?? "")}</Text></Paragraph>`);
      break;
    }
    case "Dialogue": {
      lines.push(`<Paragraph Type="Dialogue"><Text>${esc(p.dialogue ?? "")}</Text></Paragraph>`);
      break;
    }
    case "DualDialogue": {
      // FDX real soporta dual, pero para compatibilidad mínima exportamos como bloques secuenciales y marcamos
      lines.push(`<Paragraph Type="Action"><Text>[DUAL DIALOGUE]</Text></Paragraph>`);
      for (const side of p.left ?? []) lines.push(...paraToFdx(side));
      lines.push(`<Paragraph Type="Action"><Text>[—]</Text></Paragraph>`);
      for (const side of p.right ?? []) lines.push(...paraToFdx(side));
      break;
    }
  }
  return lines;
}

export function buildFdx(sp: Screenplay, scenes: Scene[]) {
  const title = sp.title || "Untitled Screenplay";
  const paragraphs: string[] = [];

  const sorted = scenes.slice().sort((a, b) => a.order - b.order);
  let num = 0;

  for (const s of sorted) {
    num += 1;
    const sceneText =
      (s.formatted_text && s.formatted_text.trim().length)
        ? s.formatted_text!
        : `${makeSlugline(s.heading, s.location, s.time_of_day)}\n\n${s.synopsis ?? ""}`;

    const paras = parseFountainToParas(sceneText);

    // Inserta número de escena en la misma línea del slug (entre corchetes)
    const first = paras.find(p => p.type === "Scene Heading");
    if (first) {
      first.text = `${first.text ?? ""} [#${num}]`;
    } else {
      // si no hay slug, añadimos uno
      paragraphs.push(`<Paragraph Type="Scene Heading"><Text>${esc(makeSlugline(s.heading, s.location, s.time_of_day).toUpperCase())} [#${num}]</Text></Paragraph>`);
    }

    for (const p of paras) paragraphs.push(...paraToFdx(p));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<FinalDraft DocumentType="Script" Version="1">
  <Content>
    ${paragraphs.join("\n    ")}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title"><Text>${esc(title)}</Text></Paragraph>
      <Paragraph Type="Credit"><Text>Written by</Text></Paragraph>
      <Paragraph Type="Author"><Text>Author</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
  return xml;
}

export function downloadFdx(filename: string, xml: string) {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".fdx") ? filename : `${filename}.fdx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
