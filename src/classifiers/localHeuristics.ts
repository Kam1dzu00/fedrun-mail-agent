import type { EmailMessage, MailDecision } from "../types/mail.js";
import { detectPromptInjection } from "../security/promptInjection.js";

const spamTerms = ["crypto giveaway", "wire transfer", "lottery", "urgent prize", "seo backlinks", "casino"];
const urgentTerms = ["urgent", "asap", "today", "deadline", "immediately", "broken", "can't login", "chargeback"];
const billingTerms = ["invoice", "refund", "payment", "billing", "charge", "receipt"];
const supportTerms = ["bug", "error", "issue", "can't", "cannot", "failed", "login"];
const salesTerms = ["pricing", "quote", "demo", "plan", "subscription"];
const schedulingTerms = ["meeting", "schedule", "calendar", "call", "appointment"];

function containsAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function classifyWithHeuristics(message: EmailMessage): MailDecision {
  const combined = `${message.subject}\n${message.text}`.toLowerCase();
  const injection = detectPromptInjection(message.text);
  const spam = containsAny(combined, spamTerms);
  const urgency = containsAny(combined, urgentTerms) ? "high" : containsAny(combined, ["when you can", "minor"]) ? "low" : "normal";
  const category = containsAny(combined, billingTerms)
    ? "billing"
    : containsAny(combined, supportTerms)
      ? "support"
      : containsAny(combined, salesTerms)
        ? "sales"
        : containsAny(combined, schedulingTerms)
          ? "scheduling"
          : message.from.endsWith("@gmail.com")
            ? "personal"
            : "unknown";

  const risky = spam || injection.length > 0 || urgency === "high" || category === "billing";
  const blocked = spam || injection.length > 0;

  return {
    messageId: message.id,
    spam,
    urgency,
    category,
    risk: blocked ? "blocked" : risky ? "review" : "safe",
    needsHumanApproval: risky,
    shouldAutoReply: !risky && ["support", "sales", "scheduling"].includes(category),
    reason: blocked
      ? "Blocked by spam or prompt-injection signals."
      : risky
        ? "Requires human review because the message is urgent, financial, or sensitive."
        : "Safe low-risk operational reply.",
    suggestedReply: draftReply(message, category),
    promptInjectionSignals: injection
  };
}

function draftReply(message: EmailMessage, category: MailDecision["category"]): string {
  const name = message.from.split("@")[0].replace(/[._-].*/, "");
  if (category === "sales") {
    return `Hi ${name}, thanks for reaching out. I can help with pricing and options. Could you share your use case and expected volume?`;
  }
  if (category === "scheduling") {
    return `Hi ${name}, thanks for the note. Please send two or three time windows that work for you, and I will confirm the best slot.`;
  }
  if (category === "support") {
    return `Hi ${name}, thanks for reporting this. I received your message and will check the details. If possible, please share the exact steps and any error text.`;
  }
  return `Hi ${name}, thanks for your message. I received it and will follow up soon.`;
}
