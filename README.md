# Fedrun Mail Agent

Compact TypeScript mail agent for Gmail triage, local classification, Telegram alerts, and cautious auto-replies.

This repository is intentionally small: Node.js + TypeScript, no Docker, no heavy framework, and no automatic LLM download. It ships with a fully offline synthetic demo, so the safety flow can be tested without connecting a real mailbox.

## What It Does

- Ingests unread Gmail messages through OAuth refresh tokens.
- Classifies spam, urgency, and common categories.
- Uses a local-first classifier and can optionally call a local LLM endpoint such as Ollama.
- Detects common prompt-injection attempts inside email bodies.
- Sends Telegram review notifications when configured.
- Suggests contextual replies.
- Requires human review for risky financial, urgent, spammy, or prompt-injection messages.
- Allows limited safe auto-reply in dry-run by default.
- Stores local memory for deduplication.
- Writes JSONL logs.
- Includes an offline demo and Node test suite.

## Quick Start

```bash
npm install
npm test
npm run demo
```

The demo uses synthetic messages only. It does not need Gmail, Telegram, or a local LLM.

## Configuration

Copy `.env.example` to `.env` and fill only the integrations you need.

```bash
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_USER_EMAIL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
LOCAL_LLM_URL=
LOCAL_LLM_MODEL=
MAIL_AGENT_DRY_RUN=true
MAIL_AGENT_MAX_AUTO_REPLIES_PER_RUN=3
```

`MAIL_AGENT_DRY_RUN=true` is the default. Set it to `false` only after reviewing the behavior with a real mailbox.

## Local LLM

No model is downloaded by this project. If `LOCAL_LLM_URL` and `LOCAL_LLM_MODEL` are set, the agent sends a compact classification prompt to that endpoint. If the endpoint fails or is not configured, the built-in local classifier is used.

Example Ollama-compatible URL:

```bash
LOCAL_LLM_URL=http://127.0.0.1:11434/api/generate
LOCAL_LLM_MODEL=llama3.2
```

## Safety Model

The agent blocks or routes to review when it sees:

- prompt-injection phrases such as requests to ignore instructions or reveal secrets;
- spam-like commercial scams;
- urgent operational messages;
- billing, refunds, payments, and chargebacks.

Safe auto-reply is limited to low-risk support, sales, and scheduling messages. Auto-reply count is capped per run.

## Attribution

This project was inspired by [`realtuku/ai-customer-support`](https://github.com/realtuku/ai-customer-support), which is licensed under the MIT License:

> Copyright (c) 2026 Ximanta Bhuyan

No source files from that project are copied here. The implementation in this repository is a fresh TypeScript implementation with separate architecture and safety behavior.

## Test Results

Current local validation:

```text
npm test
npm run demo
```

The offline demo processes four synthetic messages:

- one sales message eligible for safe auto-reply;
- one billing/refund message requiring human approval;
- one prompt-injection attempt that is blocked;
- one urgent support login issue requiring human approval.

## Limits

This is a compact MVP. Gmail OAuth setup is external. The classifier is conservative and should be checked on real traffic before disabling dry-run mode.
