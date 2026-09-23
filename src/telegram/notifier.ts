import type { AppConfig } from "../config/env.js";
import type { ApprovalRequest } from "../types/approval.js";
import type { EmailMessage, MailDecision, PolicyDecision } from "../types/mail.js";

export class TelegramNotifier {
  constructor(private readonly config: AppConfig["telegram"]) {}

  isConfigured(): boolean {
    return Boolean(this.config.botToken && this.config.chatId);
  }

  async notify(message: EmailMessage, decision: MailDecision, policy?: PolicyDecision): Promise<void> {
    if (!this.isConfigured()) return;
    const text = [
      `Mail agent: ${decision.risk.toUpperCase()} / ${decision.urgency}`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      `Category: ${decision.category}`,
      `Reason: ${decision.reason}`,
      policy ? `Policy: ${policy.reason}` : undefined,
      "",
      decision.suggestedReply
    ].filter(Boolean).join("\n");
    await this.sendMessage({ text: text.slice(0, 3900) });
  }

  async requestApproval(message: EmailMessage, decision: MailDecision, approval: ApprovalRequest): Promise<void> {
    if (!this.isConfigured()) return;
    const text = [
      "Mail agent approval required",
      `Approval ID: ${approval.id}`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      `Category: ${decision.category}`,
      `Risk: ${decision.risk}`,
      `Reason: ${decision.reason}`,
      "",
      "Suggested reply:",
      approval.reply
    ].join("\n").slice(0, 3900);
    await this.sendMessage({
      text,
      reply_markup: {
        inline_keyboard: [[
          { text: "APPROVE", callback_data: `APPROVE:${approval.id}` },
          { text: "REJECT", callback_data: `REJECT:${approval.id}` }
        ]]
      }
    });
  }

  private async sendMessage(body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: this.config.chatId, ...body }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Telegram notification failed: ${response.status}`);
  }
}
