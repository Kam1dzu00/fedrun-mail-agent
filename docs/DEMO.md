# Demo Guide

Run:

```bash
npm ci
npm run demo
npm run evaluate
```

The demo is fully offline. It uses synthetic emails covering sales, support, delivery, billing, spam, phishing, prompt injection, duplicates, ambiguous messages, and destructive actions.

What to show in an interview:

1. The terminal demo table and stage trace.
2. The policy engine in `src/policy/engine.ts`.
3. The orchestrator in `src/agent.ts`.
4. The LLM merge guard in `src/llm/localClient.ts`.
5. The tests for LLM downgrade, Telegram callback replay, dry-run stats, and send limits.

Current synthetic evaluation:

```text
dataset: synthetic-offline-v1
evaluated: 11
skippedDuplicates: 1
categoryAccuracy: 1
actionAccuracy: 0.909
```

These numbers are deterministic synthetic checks. They should not be presented as real email accuracy.
