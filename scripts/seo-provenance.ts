import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

export interface Violation {
  variable: string;
  line: number;
}

export interface ScanResult {
  ok: boolean;
  violations: Violation[];
}

const PROVENANCE_RE = /^\s*\/\/\s*SOURCE:/;
const DECL_RE = /^\s*const\s+(\w+)\s*=\s*\{/;
const SCHEMA_CONTEXT_RE = /"@context"\s*:\s*"https:\/\/schema\.org"/;

export function scanForProvenance(source: string): ScanResult {
  const lines = source.split("\n");
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const declMatch = lines[i].match(DECL_RE);
    if (!declMatch) continue;

    let blockText = lines[i];
    let depth =
      (blockText.match(/\{/g) ?? []).length -
      (blockText.match(/\}/g) ?? []).length;
    let j = i + 1;
    while (depth > 0 && j < lines.length) {
      blockText += "\n" + lines[j];
      depth +=
        (lines[j].match(/\{/g) ?? []).length -
        (lines[j].match(/\}/g) ?? []).length;
      j++;
    }

    if (!SCHEMA_CONTEXT_RE.test(blockText)) continue;

    const variable = declMatch[1] ?? "(unnamed)";
    const prevLine = i > 0 ? lines[i - 1] : "";
    if (!PROVENANCE_RE.test(prevLine ?? "")) {
      violations.push({ variable, line: i + 1 });
    }
  }

  return { ok: violations.length === 0, violations };
}

const isMain =
  // Bun
  (typeof import.meta !== "undefined" &&
    (import.meta as { main?: boolean }).main === true) ||
  // Node ESM
  (typeof process !== "undefined" &&
    process.argv[1] !== undefined &&
    import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`);

if (isMain) {
  const target = process.argv[2] ?? "src/app/layout.tsx";
  const absolute = resolve(process.cwd(), target);
  const source = readFileSync(absolute, "utf8");
  const result = scanForProvenance(source);

  if (result.ok) {
    console.log(
      `OK ${target}: all JSON-LD objects have // SOURCE: provenance comments`,
    );
    process.exit(0);
  }

  console.error(
    `FAIL ${target}: ${result.violations.length} JSON-LD objects without // SOURCE: comment`,
  );
  for (const v of result.violations) {
    console.error(`  line ${v.line}: ${v.variable}`);
  }
  process.exit(1);
}
