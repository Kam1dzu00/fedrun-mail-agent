# Technical Audit

Date: 2026-09-23

## Scope

This audit reviewed orchestration, Gmail ingestion, local LLM classification, Telegram notifications, JSON storage, logging, tests, and README claims.

## Findings And Fixes

### 1. Local blocks could be weakened by the LLM

The first implementation merged model output over the local fallback decision. A model response could downgrade `blocked` to `safe` or disable `needsHumanApproval`.

Fix: `src/llm/localClient.ts` now uses `mergeWithoutWeakening`. The model may improve category/reply text, but it cannot lower urgency, lower risk, clear prompt-injection signals, or enable auto-reply after a local block.

### 2. Dry-run counted replies as if they were sent

The old `autoReplies` counter increased even when `MAIL_AGENT_DRY_RUN=true`.

Fix: the report now separates `autoRepliesPlanned` and `autoRepliesSent`.

### 3. Telegram approval was only a notification

The initial notifier sent review messages but had no approval state or callback protection.

Fix: `ApprovalStore` and `handleTelegramCallback` add APPROVE/REJECT state, allowed chat ID checking, and callback replay protection. EDIT is intentionally not implemented in the MVP because safe conversational editing needs more state handling.

### 4. Prompt-injection matching is useful but not sufficient

Regex detection catches common attacks, but it cannot prove that an email is safe.

Fix: prompt-injection detection remains a signal, while the independent policy engine makes final send decisions.

### 5. JSON writes were not atomic

The first `JsonStore` wrote directly to the final path, which could corrupt data if the process exited during write.

Fix: writes now go to a temporary file and are atomically renamed into place.

### 6. Orchestration was too flat

The initial `processMessages` combined classification, policy, notification, sending, and audit bookkeeping in one loop.

Fix: the pipeline now records explicit stages: INGEST, CLASSIFY, ASSESS_RISK, PLAN_ACTION, APPROVE, EXECUTE, AUDIT.

## Remaining Limits

- Gmail OAuth setup is external.
- Telegram APPROVE/REJECT callback handling is implemented as a callable module, not a long-running webhook server.
- The offline evaluation is synthetic and deterministic. It validates behavior, not real-world accuracy.
