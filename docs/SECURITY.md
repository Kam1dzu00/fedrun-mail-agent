# Security Model

## Threats

- Prompt injection inside email bodies.
- Spam and phishing that ask for secrets or financial actions.
- Model output that tries to downgrade a risky message.
- Duplicate processing after restart.
- Replayed Telegram callbacks.
- Accidental publication of secrets or personal emails.

## Controls

- Incoming email text is treated as untrusted data.
- Secrets are read only from environment variables.
- Email content is sanitized before being included in model prompts.
- The model cannot authorize sends.
- The policy engine blocks spam, prompt-injection, blocked risk, credentials, financial topics, urgent issues, unknown categories, and destructive actions from automatic sending.
- Telegram callbacks require the configured chat ID and reject duplicate callback IDs.
- Local memory deduplicates by message ID and fingerprint.
- JSON writes use temporary files and atomic rename.
- `.env`, logs, local data, and build outputs are ignored by git.

## Human Approval

For review cases, Telegram receives the message summary, reason, and proposed reply with APPROVE/REJECT buttons. EDIT is documented as a future enhancement because safe editing requires a more complete conversation state machine.

## Limits

Regex prompt-injection detection is a defense-in-depth signal, not a formal guarantee. Real deployments should review dry-run logs on representative traffic before enabling sending.
