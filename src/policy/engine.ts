import type { AppConfig } from "../config/env.js";
import type { EmailMessage, MailDecision, PlannedAction, PolicyDecision } from "../types/mail.js";

const SAFE_AUTO_REPLY_CATEGORIES = new Set(["sales", "scheduling"]);

export function assessPolicy(message: EmailMessage, decision: MailDecision, config: AppConfig, sentThisRun: number): PolicyDecision {
  const hardBlockReasons: string[] = [];
  const reviewReasons: string[] = [];

  if (decision.spam) hardBlockReasons.push("spam signal");
  if (decision.risk === "blocked") hardBlockReasons.push("blocked classifier risk");
  if (decision.promptInjectionSignals.length > 0) hardBlockReasons.push("prompt-injection signal");
  if (decision.category === "billing") reviewReasons.push("financial or refund topic");
  if (decision.urgency === "high") reviewReasons.push("urgent message");
  if (decision.category === "unknown") reviewReasons.push("unknown category");
  if (decision.risk !== "safe") reviewReasons.push(`model/local risk is ${decision.risk}`);
  if (sentThisRun >= config.maxAutoRepliesPerRun) reviewReasons.push("per-run send limit reached");

  if (hardBlockReasons.length > 0) {
    return blocked(`Blocked by independent policy: ${hardBlockReasons.join(", ")}.`);
  }

  if (reviewReasons.length > 0 || decision.needsHumanApproval) {
    return {
      finalAction: { type: "request_approval", reply: decision.suggestedReply, reason: reviewReasons.join(", ") || decision.reason },
      allowedToSend: false,
      preventedByPolicy: true,
      approvalRequired: true,
      reason: reviewReasons.join(", ") || "Human approval required."
    };
  }

  if (!decision.shouldAutoReply || !SAFE_AUTO_REPLY_CATEGORIES.has(decision.category)) {
    return {
      finalAction: { type: "notify", reason: "No safe automatic reply scenario matched." },
      allowedToSend: false,
      preventedByPolicy: false,
      approvalRequired: false,
      reason: "Notify only."
    };
  }

  if (looksDangerous(message.text) || looksDangerous(decision.suggestedReply)) {
    return blocked("Blocked because the request or reply appears to involve credentials, payments, or destructive actions.");
  }

  return {
    finalAction: { type: "auto_reply", reply: decision.suggestedReply, reason: "Safe low-risk category with bounded auto-reply." },
    allowedToSend: true,
    preventedByPolicy: false,
    approvalRequired: false,
    reason: "Safe auto-reply allowed by policy."
  };
}

function blocked(reason: string): PolicyDecision {
  return {
    finalAction: { type: "none", reason },
    allowedToSend: false,
    preventedByPolicy: true,
    approvalRequired: false,
    reason
  };
}

function looksDangerous(text: string): boolean {
  return /(password|token|credential|wire transfer|bank account|delete account|refund now|chargeback|ssn|passport)/i.test(text);
}
