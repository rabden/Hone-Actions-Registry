#!/usr/bin/env node
/**
 * Deletion guard for the Hone Actions Registry.
 *
 * Compares the base (pre-PR) registry.json against the head (PR) registry.json
 * and rejects any PR that removes an action it does not own.
 *
 * A removal is ALLOWED only when:
 *   - the PR author is a maintainer (MAINTAINERS list), OR
 *   - the removed action's `author` matches the PR author (deleting your own).
 * Otherwise the PR fails: you cannot delete other people's actions.
 */
const fs = require("fs");

const [basePath, headPath] = process.argv.slice(2);
if (!basePath || !headPath) {
  console.error("usage: check-deletions.js <base-registry.json> <head-registry.json>");
  process.exit(2);
}

const PR_AUTHOR = (process.env.PR_AUTHOR || "").trim().toLowerCase();
const MAINTAINERS = (process.env.MAINTAINERS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function load(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`cannot read ${p}: ${e.message}`);
    process.exit(2);
  }
}

const base = (load(basePath).actions || []).reduce((m, a) => (m.set(a.id, a), m), new Map());
const head = load(headPath).actions || [];
const headIds = new Set(head.map((a) => a.id));

const isMaintainer = MAINTAINERS.includes(PR_AUTHOR);
const removed = [...base.keys()].filter((id) => !headIds.has(id));

const errors = [];
for (const id of removed) {
  const action = base.get(id);
  const owner = (action.author || "").trim().toLowerCase();
  const ownsIt = owner === PR_AUTHOR;
  if (isMaintainer || ownsIt) {
    const reason = isMaintainer ? "maintainer" : `author match (${action.author})`;
    console.log(`  allowed: "${PR_AUTHOR}" removed "${id}" (${reason})`);
    continue;
  }
  errors.push(
    `PR author "${PR_AUTHOR}" cannot delete action "${id}" authored by "${action.author || "unknown"}". Deleting other people's actions is not allowed.`,
  );
}

if (errors.length) {
  console.error(`\nDeletion check FAILED (${errors.length}):\n`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(
  removed.length === 0
    ? "Deletion check passed: no actions removed."
    : `Deletion check passed: ${removed.length} action(s) removed by an allowed author.`,
);
