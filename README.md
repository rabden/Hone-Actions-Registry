# Hone Actions Registry

Community registry of prebuilt actions for the [Hone Compose](https://gitlab.com/rabden-group/hone-compose) AI writing assistant browser extension.

Actions are pure data: a prompt template plus display metadata. The extension fetches `registry.json` to let users browse the catalog, and individual files under `actions/` when a user installs an action. Installed actions behave like built-in actions (enable/disable/delete, not editable).

## How it works

1. The extension fetches the index:
   `https://gitlab.com/rabden-group/hone-actions-registry/-/raw/main/registry.json`
2. When a user installs an action, the extension fetches the file referenced by `path` (e.g. `actions/summarize-bullets.json`), validates it, and stores it locally.

## Action format

See [schema.json](schema.json). Minimal example:

```json
{
  "id": "mkt_summarize_bullets",
  "name": "Summarize to bullets",
  "description": "Condense text into 3 concise bullet points",
  "icon": "List",
  "color": "#8B5CF6",
  "promptTemplate": "Summarize the following into 3 bullets:\n\n{{input}}",
  "category": "marketplace",
  "version": "1.0.0",
  "author": "hone-team",
  "tags": ["summarization", "productivity"]
}
```

Key rules:
- `promptTemplate` must contain the `{{input}}` placeholder (the user's selected text).
- `icon` is a [Lucide](https://lucide.dev) icon name.
- No URLs allowed inside prompts.

## Contributing

Submit a merge request adding your action file under `actions/` and an entry in `registry.json`. CI validates every submission. See [CONTRIBUTING.md](CONTRIBUTING.md).
