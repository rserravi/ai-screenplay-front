// src/utils/fountain.ts
import type { Screenplay } from "../models/screenplay";
import type { Scene } from "../models/scenes";

export function makeSlugline(heading?: string, location?: string, tod?: string) {
  const H = (heading ?? "INT").toUpperCase();
  const L = (location && location.trim().length ? location.toUpperCase() : "LOCATION");
  const T = (tod ?? "DAY").toUpperCase();
  return `${H}. ${L} - ${T}`;
}

export function compileFountain(sp: Screenplay, scenes: Scene[]) {
  const title = sp.title || "Untitled Screenplay";
  const byline = "Written by";
  const author = "Author"; // opcional: añade tu campo si lo tienes

  const header = `Title: ${title}
Credit: ${byline}
Author: ${author}

`;

  const body = scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const slug = makeSlugline(s.heading, s.location, s.time_of_day);
      if (s.formatted_text && s.formatted_text.trim().length > 0) {
        // Asegura que empiece con slugline
        const text = s.formatted_text.trim();
        return text.toUpperCase().startsWith(`${(s.heading ?? "INT")}.`)
          ? `${text}\n`
          : `${slug}\n\n${text}\n`;
      }
      // Fallback skeleton from metadata
      const lines = [
        slug,
        "",
        (s.synopsis ?? "").trim(),
        "",
        s.goal ? `> GOAL: ${s.goal}` : "",
        s.conflict ? `> CONFLICT: ${s.conflict}` : "",
        s.outcome ? `> OUTCOME: ${s.outcome}` : "",
        ""
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n");

  return header + body;
}

export function downloadFountain(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".fountain") ? filename : `${filename}.fountain`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
