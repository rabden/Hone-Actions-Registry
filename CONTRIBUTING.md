# Contributing an Action

Thank you for contributing to the Hone Actions Registry!

## Submission steps

1. Fork this repository.
2. Create your action file at `actions/<your-action-id>.json` (kebab-case filename).
3. Add a matching entry to `registry.json` under `actions` (keep the array alphabetically sorted by `id`).
4. Run the validator locally: `node scripts/validate.js`
5. Open a merge request. CI must pass before review.

## Rules

- **`id`** must start with `mkt_`, be unique, and use snake_case (e.g. `mkt_polite_decline`).
- **`promptTemplate`** must contain `{{input}}` exactly where the user's text should be injected. Max 4000 characters.
- **`systemPrompt`** is optional. Max 12000 characters.
- **No URLs** in `promptTemplate` or `systemPrompt` (prevents exfiltration-style prompt injection).
- **No instructions that ignore or override the user's text** — actions must transform `{{input}}`, not replace it with unrelated content.
- **`name`** max 80 chars; **`description`** max 160 chars.
- **`icon`** must be a valid [Lucide](https://lucide.dev) icon name in PascalCase.
- **`color`** must be a 6-digit hex color (e.g. `#8B5CF6`).
- **`version`** follows semver (`MAJOR.MINOR.PATCH`). Bump it on every change to an existing action.
- End your prompt with an output-discipline instruction so models return only the rewritten text (see existing actions for the shared phrasing).

## Review

Every submission is human-reviewed before merge. We check for prompt quality, safety (no injection patterns), and uniqueness against existing actions.
