// src/utils/pdf.ts
import type { Screenplay } from "../models/screenplay";
import type { Scene } from "../models/scenes";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { makeSlugline } from "./fountain";
import { parseFountainToParas, type Para } from "./fountainParser";

const PAGE = { width: 612, height: 792 };
const MARGIN = { L: 108, R: 72, T: 72, B: 72 };
const FONT_SIZE = 12;
const LEADING = 14;
const COLS_BODY = 65;
const COLS_DIALOG = 36;

function colToX(col: number, width = PAGE.width) {
  const colW = (width - MARGIN.L - MARGIN.R) / COLS_BODY;
  return MARGIN.L + col * colW;
}

const INDENTS = {
  action: 0,
  slug: 0,
  character: 22,
  parenthetical: 20,
  dialogue: 16,
  transitionRightPad: 0
};

function wrapMono(text: string, cols = COLS_BODY) {
  const out: string[] = [];
  for (const raw of (text || "").split("\n")) {
    let line = raw;
    while (line.length > cols) {
      let cut = line.lastIndexOf(" ", cols);
      if (cut < cols - 15) cut = cols;
      out.push(line.slice(0, cut));
      line = line.slice(cut).replace(/^\s+/, "");
    }
    out.push(line);
  }
  return out;
}

async function loadFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit);
  try {
    const [reg, bold, italic] = await Promise.all([
      fetch("/fonts/CourierPrime-Regular.ttf").then(r => r.arrayBuffer()),
      fetch("/fonts/CourierPrime-Bold.ttf").then(r => r.arrayBuffer()),
      fetch("/fonts/CourierPrime-Italic.ttf").then(r => r.arrayBuffer()).catch(() => null)
    ]);
    const regular = await doc.embedFont(reg, { subset: true });
    const boldF = await doc.embedFont(bold, { subset: true });
    const italicF = italic ? await doc.embedFont(italic, { subset: true }) : regular;
    return { regular, bold: boldF, italic: italicF, fallback: regular };
  } catch {
    const regular = await doc.embedFont(StandardFonts.Courier);
    return { regular, bold: regular, italic: regular, fallback: regular };
  }
}

export async function exportPdf(sp: Screenplay, scenesIn: Scene[]) {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN.T;
  let pageNum = 1;

  const scenes = scenesIn.slice().sort((a, b) => a.order - b.order);

  const drawHeader = () => {
    const num = String(pageNum);
    page.drawText(num, {
      x: PAGE.width - MARGIN.R - fonts.regular.widthOfTextAtSize(num, FONT_SIZE),
      y: PAGE.height - MARGIN.T + 6,
      size: FONT_SIZE,
      font: fonts.regular
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN.T;
    pageNum += 1;
    drawHeader();
  };

  drawHeader();

  const drawLine = (txt = "", x = MARGIN.L, font = fonts.regular) => {
    if (y <= MARGIN.B + LEADING) newPage();
    page.drawText(txt, { x, y, size: FONT_SIZE, font });
    y -= LEADING;
  };

  // título
  if (sp.title) {
    const t = sp.title.toUpperCase();
    const tw = fonts.bold.widthOfTextAtSize(t, FONT_SIZE);
    page.drawText(t, { x: (PAGE.width - tw) / 2, y, size: FONT_SIZE, font: fonts.bold });
    y -= LEADING * 2;
  }

  let sceneNumber = 0;

  for (const s of scenes) {
    sceneNumber++;

    const sceneText =
      (s.formatted_text && s.formatted_text.trim().length)
        ? s.formatted_text!
        : `${makeSlugline(s.heading, s.location, s.time_of_day)}\n\n${s.synopsis ?? ""}`;

    const paras = parseFountainToParas(sceneText);

    // Inserta número de escena en el slug
    const first = paras.find(p => p.type === "Scene Heading");
    const slugText = (first?.text ?? makeSlugline(s.heading, s.location, s.time_of_day)).toUpperCase();
    drawLine(`${slugText} [#${sceneNumber}]`, colToX(INDENTS.slug), fonts.bold);
    y -= LEADING / 2;

    for (const p of paras) {
      switch (p.type) {
        case "Scene Heading": {
          // ya dibujado
          break;
        }
        case "Action": {
          const lines = wrapMono(p.text ?? "", COLS_BODY);
          for (const ln of lines) drawLine(ln, colToX(INDENTS.action), fonts.regular);
          break;
        }
        case "Transition": {
          const line = (p.text ?? "").toUpperCase();
          const tw = fonts.bold.widthOfTextAtSize(line, FONT_SIZE);
          const x = PAGE.width - MARGIN.R - tw;
          drawLine(line, x, fonts.bold);
          break;
        }
        case "Character": {
          drawLine((p.character ?? "").toUpperCase(), colToX(INDENTS.character), fonts.regular);
          break;
        }
        case "Parenthetical": {
          const lines = wrapMono(p.text ?? "", Math.min(COLS_DIALOG, 24));
          for (const ln of lines) drawLine(ln, colToX(INDENTS.parenthetical), fonts.regular);
          break;
        }
        case "Dialogue": {
          const lines = wrapMono(p.dialogue ?? "", COLS_DIALOG);
          for (const ln of lines) drawLine(ln, colToX(INDENTS.dialogue), fonts.regular);
          y -= LEADING / 2;
          break;
        }
        case "DualDialogue": {
          // Render simple: indica [DUAL], luego lado izquierdo y derecho secuencialmente
          drawLine("[DUAL DIALOGUE]", colToX(INDENTS.action), fonts.italic);
          for (const side of p.left ?? []) {
            if (side.type === "Character") drawLine((side.character ?? "").toUpperCase(), colToX(INDENTS.character), fonts.regular);
            if (side.type === "Parenthetical") {
              for (const ln of wrapMono(side.text ?? "", Math.min(COLS_DIALOG, 24))) {
                drawLine(ln, colToX(INDENTS.parenthetical), fonts.regular);
              }
            }
            if (side.type === "Dialogue") {
              for (const ln of wrapMono(side.dialogue ?? "", COLS_DIALOG)) {
                drawLine(ln, colToX(INDENTS.dialogue), fonts.regular);
              }
              y -= LEADING / 2;
            }
          }
          drawLine("[—]", colToX(INDENTS.action), fonts.italic);
          for (const side of p.right ?? []) {
            if (side.type === "Character") drawLine((side.character ?? "").toUpperCase(), colToX(INDENTS.character), fonts.regular);
            if (side.type === "Parenthetical") {
              for (const ln of wrapMono(side.text ?? "", Math.min(COLS_DIALOG, 24))) {
                drawLine(ln, colToX(INDENTS.parenthetical), fonts.regular);
              }
            }
            if (side.type === "Dialogue") {
              for (const ln of wrapMono(side.dialogue ?? "", COLS_DIALOG)) {
                drawLine(ln, colToX(INDENTS.dialogue), fonts.regular);
              }
              y -= LEADING / 2;
            }
          }
          break;
        }
      }
    }

    y -= LEADING; // separación entre escenas
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sp.title || "screenplay"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
