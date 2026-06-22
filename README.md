# OpenClaw User Cards

Lightweight per-speaker user cards for OpenClaw.

This plugin keeps a small bounded card per sender identity and injects the current
speaker's card during `before_prompt_build`. It is intentionally dumber than
semantic memory: lookup is keyed from the message envelope, not vector search.

SQLite is the source of truth. The legacy JSON store is imported on first use
when the SQLite database is empty.

Privacy defaults:

- Channel-scoped stable user ids may be injected so the model can distinguish
  speakers with the same display name.
- Discord cards also store a bounded speaker type: `human`, `agent`, or
  `unknown`. The value comes from first-order channel envelope/API metadata and
  is rendered with the visible name and internal id for disambiguation.
- Email addresses, local paths, tokens, private keys, and shell/XML/tool-control syntax are redacted.
- Notes, captured message snippets, and card output are capped per speaker.
- Passive message snippets are stored locally for inspection and future
  summarization, but they are not injected into the prompt.
- LLM summaries are parsed as JSON, sanitized, and stored only as bounded event
  packets.
- Cross-channel identity linking is not exposed by default.

## Storage

Default paths are plugin-relative:

- `databasePath`: `./data/user-cards.sqlite`
- `storePath`: `./data/user-cards.json` legacy import only

The database stores normalized cards, aliases, event notes, event causal links,
and optional captured passive-message snippets. `user_cards.speaker_kind`
records whether the observed Discord speaker is a human, an agent/app, or still
unknown.

Notes use a packet shape:

```json
{
  "event_uuid": "uuid",
  "event_signal_strength": 32,
  "event_what": "short summary of the observed preference/fact/activity",
  "event_when": 1770000000000,
  "event_why": ["earlier-event-uuid"],
  "event_how": "pattern:preference"
}
```

`event_what` is the only event payload text rendered into the prompt today.
`event_signal_strength` is a bounded `0..100` ranking hint used only for recall
selection. Existing notes without the field are assigned a conservative default
from `event_how`: pattern notes are stronger than LLM/daemon summaries, legacy
notes are weaker, and weak fallback signals are weakest. The other fields keep
enough structure for later summarization without turning user cards into a full
semantic-memory system.

Direct memory queries also get a tiny event-recall section. When a prompt asks
about who/what/when/where, the plugin scores stored event packets against visible
names, user ids, channel ids, event text, and coarse time words such as
`recently` or `yesterday`. Recall is hard-capped at five events. For the common
five-event case, the injected set is the two most recent matching events plus the
three strongest matching signals, de-duplicated by `event_uuid`. Smaller
`maxRecallEvents` values keep the same recency-first shape and then fill from
stronger signals when there is remaining room. Each matched event may include
one-hop `event_why` causes, up to five causes per event and 25 causes per query.

## Note Summarization

User-card note generation is background work. It should not make the foreground
agent feel slower.

When `daemonSummarization.enabled` is true, the plugin asks the local LibraVDB
daemon for an extractive summary first. Daemon summaries are sanitized, checked
against the source message for grounding, and stored as `daemon:extractive`
events when useful. If the daemon is unavailable or returns an ungrounded/empty
summary, the plugin can fall back to `llmSummarization` and finally to the
bounded pattern extractors when `fallbackToPatterns` is enabled.

The daemon path currently expects the LibraVDB `SummarizeMessages` RPC. Use an
explicit Unix socket endpoint when the daemon is installed somewhere nonstandard.

## LibraVDB Projection

User-card can also project passive captured messages into LibraVDB so they are
available to semantic memory. This is a projection, not the source of truth:
SQLite is written first, then a durable local queue retries LibraVDB ingestion in
the background. Capture continues to work if LibraVDB is offline.

Only passive captures are projected. Messages addressed to the OpenClaw agent are
excluded because `libravdb-memory` ingests active agent turns on its own. The
passive Discord gateway skips bot DMs, messages that mention the gateway bot, and
messages that reply to the gateway bot. The iMessage watch path skips direct
messages and events explicitly marked as agent-directed by the watcher.

Enable it with an explicit tenant key:

```json
{
  "libravdbProjection": {
    "enabled": true,
    "endpoint": "auto",
    "tenantKey": "your-libravdb-tenant-key",
    "pushCapturedMessages": true
  }
}
```

## Build

```bash
npm install
npm run build
npm test
```

## OpenClaw Config

External prompt hooks require conversation access:

```json
{
  "plugins": {
    "entries": {
      "user-cards": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true,
          "allowPromptInjection": true
        },
        "config": {
          "autoLearn": true,
          "inject": true,
          "databasePath": "./data/user-cards.sqlite",
          "maxRecallEvents": 5,
          "passiveDiscordGateway": {
            "enabled": true,
            "captureMessages": true
          },
          "daemonSummarization": {
            "enabled": true,
            "endpoint": "auto",
            "timeoutMs": 30000,
            "maxOutputTokens": 96
          },
          "libravdbProjection": {
            "enabled": true,
            "endpoint": "auto",
            "tenantKey": "your-libravdb-tenant-key",
            "pushCapturedMessages": true
          },
          "llmSummarization": {
            "enabled": true,
            "endpoint": "http://127.0.0.1:11434",
            "model": "qwen3.6:35b-a3b-mtp-q8_0"
          }
        }
      }
    }
  }
}
```

When `llmSummarization.enabled` is true, the plugin sends one bounded message at
a time to the configured local Ollama-compatible endpoint only after daemon
summarization does not produce a usable note. It asks for JSON event notes only.
If that call fails, `fallbackToPatterns` keeps the regex extractor available by
default.

The LLM fallback does not send `options.num_ctx` or `keep_alive` by default, so
background note extraction does not resize or pin the active chat model in
Ollama. Set `llmSummarization.numCtx` or `llmSummarization.keepAlive` only when
the summarizer uses a deliberately separate model or residency policy.

## Inspect Local Data

```bash
node --input-type=module - <<'NODE'
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/user-cards.sqlite');
for (const table of ['user_cards', 'user_aliases', 'user_events', 'captured_messages']) {
  const row = db.prepare(`select count(*) as count from ${table}`).get();
  console.log(table, row.count);
}
NODE
```

Captured snippets are private local data. Inspect them directly only when
debugging:

```sql
select card_key, at, text
from captured_messages
order by at desc
limit 10;
```
