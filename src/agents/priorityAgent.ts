import type { MailDecision } from "../types/mail.js";

export function priorityAgent(decision: MailDecision): { notify: boolean; reason: string } {
  if (decision.risk === "blocked") return { notify: true, reason: "Blocked messages are always surfaced for audit." };
  if (decision.urgency === "high") return { notify: true, reason: "High urgency message." };
  if (decision.needsHumanApproval) return { notify: true, reason: "Human approval is required." };
  return { notify: decision.shouldAutoReply, reason: decision.shouldAutoReply ? "Auto-reply action planned." : "No immediate notification required." };
}
