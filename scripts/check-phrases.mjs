#!/usr/bin/env node
/**
 * Honesty check: the product and its documentation must not claim things the
 * system does not do. Scans source and docs for banned phrases and fails when
 * one is found. A line may opt out with the marker `phrase-check:allow`
 * (used where a document explains the rule itself).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = ["README.md", "frontend/src", "frontend/index.html", "backend/src", "ml/app", "ml/training", "docs"];
const skipDirs = new Set(["node_modules", "dist", "artifacts", ".venv", "design", "coverage"]);
const extensions = new Set([".md", ".ts", ".tsx", ".js", ".jsx", ".py", ".html", ".json", ".css"]);
const banned = [
  { pattern: /\bAI[- ]powered\b/i, why: "the system estimates risk from historical data; it is not marketed as AI-powered" },
  { pattern: /\breal[- ]?time\b/i, why: "no live feed exists; say 'current' or 'latest' instead" },
  { pattern: /\bpredicts? (an )?accidents?\b/i, why: "the model estimates a risk level; it does not predict accidents" },
];

const problems = [];

function scanFile(file) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("phrase-check:allow")) return;
    for (const { pattern, why } of banned) {
      if (pattern.test(line)) problems.push(`${rel}:${i + 1}: "${line.trim().slice(0, 100)}" (${why})`);
    }
  });
}

function walk(target) {
  const abs = path.join(root, target);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return;
  }
  if (st.isFile()) return scanFile(abs);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path.join(target, entry.name));
    } else if (extensions.has(path.extname(entry.name))) {
      scanFile(path.join(abs, entry.name));
    }
  }
}

for (const t of targets) walk(t);

if (problems.length) {
  console.error(`Found ${problems.length} banned phrase(s):\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("Phrase check passed: no banned claims found.");
