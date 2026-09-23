import type { AppConfig } from "../config/env.js";
import type { EmailMessage, MailDecision } from "../types/mail.js";

export class TelegramNotifier {
  constructor(private readonly config: AppConfig["telegram"]) {}

  isConfigured(): boolean {
    return Boolean(this.config.botToken && this.config.chatId);
  }

  async notify(message: EmailMessage, decision: MailDecision): Promise<void> {
    if (!this.isConfigured()) return;
    const text = [
      `Mail agent: ${decision.risk.toUpperCase()} / ${decision.urgency}`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      `Category: ${decision.category}`,
      `Reason: ${decision.reason}`,
      "",
      decision.suggestedReply
    ].join("\n");
    const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: this.config.chatId, text: text.slice(0, 3900) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Telegram notification failed: ${response.status}`);
  }
}
