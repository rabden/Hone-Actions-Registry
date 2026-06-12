#!/usr/bin/env node
/**
 * Dependency-free validator for the Hone Actions Registry.
 * Validates every file in actions/ against the rules in schema.json
 * and checks registry.json consistency.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ACTIONS_DIR = path.join(ROOT, "actions");
const errors = [];

function err(file, msg) {
  errors.push(`${file}: ${msg}`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    err(path.relative(ROOT, file), `invalid JSON (${e.message})`);
    return null;
  }
}

const RULES = {
  id: (v) => typeof v === "string" && /^mkt_[a-z0-9_]+$/.test(v) && v.length <= 64,
  name: (v) => typeof v === "string" && v.length >= 3 && v.length <= 80,
  description: (v) => typeof v === "string" && v.length >= 10 && v.length <= 160,
  icon: (v) => typeof v === "string" && /^[A-Z][A-Za-z0-9]+$/.test(v),
  color: (v) => typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v),
  promptTemplate: (v) => typeof v === "string" && v.length >= 20 && v.length <= 4000,
  category: (v) => v === "marketplace",
  version: (v) => typeof v === "string" && /^\d+\.\d+\.\d+$/.test(v),
  author: (v) => typeof v === "string" && v.length >= 2 && v.length <= 60,
  tags: (v) =>
    Array.isArray(v) &&
    v.length >= 1 &&
    v.length <= 6 &&
    v.every((t) => typeof t === "string" && /^[a-z0-9-]+$/.test(t) && t.length <= 24),
};
const REQUIRED = Object.keys(RULES);
const OPTIONAL = ["systemPrompt"];
const URL_RE = /(https?:\/\/|www\.)/i;

function validateAction(file, data) {
  const rel = path.relative(ROOT, file);
  for (const key of REQUIRED) {
    if (!(key in data)) {
      err(rel, `missing required field "${key}"`);
    } else if (!RULES[key](data[key])) {
      err(rel, `field "${key}" fails validation`);
    }
  }
  for (const key of Object.keys(data)) {
    if (!REQUIRED.includes(key) && !OPTIONAL.includes(key)) {
      err(rel, `unknown field "${key}" is not allowed`);
    }
  }
  if ("systemPrompt" in data) {
    if (typeof data.systemPrompt !== "string" || data.systemPrompt.length > 2000) {
      err(rel, `field "systemPrompt" fails validation`);
    }
  }
  if (typeof data.promptTemplate === "string") {
    if (!data.promptTemplate.includes("{{input}}")) {
      err(rel, "promptTemplate must contain the {{input}} placeholder");
    }
    if (URL_RE.test(data.promptTemplate)) {
      err(rel, "promptTemplate must not contain URLs");
    }
  }
  if (typeof data.systemPrompt === "string" && URL_RE.test(data.systemPrompt)) {
    err(rel, "systemPrompt must not contain URLs");
  }
  const expectedFile = data.id ? data.id.replace(/^mkt_/, "").replace(/_/g, "-") + ".json" : null;
  if (expectedFile && path.basename(file) !== expectedFile) {
    err(rel, `filename should be "${expectedFile}" to match id "${data.id}"`);
  }
}

// 1. Validate all action files
const files = fs.existsSync(ACTIONS_DIR)
  ? fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".json"))
  : [];
if (files.length === 0) {
  err("actions/", "no action files found");
}
const actionsById = new Map();
for (const f of files) {
  const full = path.join(ACTIONS_DIR, f);
  const data = readJson(full);
  if (!data) continue;
  validateAction(full, data);
  if (data.id) {
    if (actionsById.has(data.id)) err(`actions/${f}`, `duplicate id "${data.id}"`);
    actionsById.set(data.id, { file: `actions/${f}`, data });
  }
}

// 2. Validate registry.json consistency
const registry = readJson(path.join(ROOT, "registry.json"));
if (registry) {
  if (!Array.isArray(registry.actions)) {
    err("registry.json", '"actions" must be an array');
  } else {
    const listedIds = new Set();
    for (const entry of registry.actions) {
      const label = `registry.json (entry ${entry.id || "?"})`;
      if (!entry.id || !actionsById.has(entry.id)) {
        err(label, "id has no matching file in actions/");
        continue;
      }
      listedIds.add(entry.id);
      const { file, data } = actionsById.get(entry.id);
      if (entry.path !== file) err(label, `path should be "${file}"`);
      for (const k of ["name", "description", "icon", "color", "version", "author"]) {
        if (entry[k] !== data[k]) err(label, `"${k}" out of sync with ${file}`);
      }
      if (JSON.stringify(entry.tags) !== JSON.stringify(data.tags)) {
        err(label, `"tags" out of sync with ${file}`);
      }
    }
    for (const id of actionsById.keys()) {
      if (!listedIds.has(id)) err("registry.json", `missing entry for "${id}"`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\nValidation FAILED with ${errors.length} error(s):\n`);
  for (const e of errors) console.error("  \u2717 " + e);
  process.exit(1);
}
console.log(`Validation passed: ${files.length} action(s) OK, registry.json in sync.`);
