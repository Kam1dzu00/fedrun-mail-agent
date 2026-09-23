import type { EmailMessage, MailDecision } from "../types/mail.js";

export function responseAgent(message: EmailMessage, decision: MailDecision): string {
  const trimmed = decision.suggestedReply.trim();
  if (trimmed.length > 0) return trimmed.slice(0, 1200);
  const localName = message.from.split("@")[0].replace(/[._-].*/, "") || "there";
  return `Hi ${localName}, thanks for your message. I received it and will follow up soon.`;
}
