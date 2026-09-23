import type { AppConfig } from "./config/env.js";
import type { AgentReport, EmailMessage } from "./types/mail.js";
import { classifyEmail } from "./llm/localClient.js";
import { MailMemory } from "./storage/memory.js";
import { TelegramNotifier } from "./telegram/notifier.js";
import { Logger } from "./logger.js";

export type MailProvider = {
  sendReply?(message: EmailMessage, text: string): Promise<void>;
};

export async function processMessages(messages: EmailMessage[], config: AppConfig, provider: MailProvider = {}): Promise<AgentReport> {
  const memory = new MailMemory(config.dataDir);
  const telegram = new TelegramNotifier(config.telegram);
  const logger = new Logger(config.logDir);
  const report: AgentReport = { seen: messages.length, processed: 0, skippedDuplicates: 0, autoReplies: 0, approvalsRequired: 0, errors: [] };

  for (const message of messages) {
    try {
      if (await memory.hasSeen(message)) {
        report.skippedDuplicates += 1;
        continue;
      }

      const decision = await classifyEmail(message, config.llm);
      const autoReplyAllowed = decision.shouldAutoReply && !decision.needsHumanApproval && decision.risk === "safe";

      if (decision.needsHumanApproval) report.approvalsRequired += 1;
      await telegram.notify(message, decision);

      if (autoReplyAllowed && report.autoReplies < config.maxAutoRepliesPerRun) {
        if (!config.dryRun && provider.sendReply) {
          await provider.sendReply(message, decision.suggestedReply);
        }
        report.autoReplies += 1;
      }

      await memory.add({
        messageId: message.id,
        threadId: message.threadId,
        fingerprint: memory.fingerprint(message),
        processedAt: new Date().toISOString(),
        decision
      });
      await logger.info("message_processed", {
        messageId: message.id,
        category: decision.category,
        risk: decision.risk,
        autoReplyAllowed
      });
      report.processed += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      report.errors.push(`${message.id}: ${msg}`);
      await logger.error("message_failed", error, { messageId: message.id });
    }
  }

  return report;
}
