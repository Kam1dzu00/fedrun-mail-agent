import { performance } from "node:perf_hooks";
import type { AppConfig } from "./config/env.js";
import { classificationAgent } from "./agents/classificationAgent.js";
import { priorityAgent } from "./agents/priorityAgent.js";
import { responseAgent } from "./agents/responseAgent.js";
import { assessPolicy } from "./policy/engine.js";
import { MailMemory } from "./storage/memory.js";
import { ApprovalStore } from "./storage/approvalStore.js";
import { TelegramNotifier } from "./telegram/notifier.js";
import { Logger } from "./logger.js";
import type { AgentReport, AgentStage, AgentStageResult, EmailMessage, MessageAudit } from "./types/mail.js";

export type MailProvider = {
  sendReply?(message: EmailMessage, text: string): Promise<void>;
};

export async function processMessages(messages: EmailMessage[], config: AppConfig, provider: MailProvider = {}): Promise<AgentReport> {
  const memory = new MailMemory(config.dataDir);
  const approvals = new ApprovalStore(config.dataDir);
  const telegram = new TelegramNotifier(config.telegram);
  const logger = new Logger(config.logDir);
  const startedAt = performance.now();
  const report: AgentReport = {
    seen: messages.length,
    processed: 0,
    skippedDuplicates: 0,
    autoRepliesPlanned: 0,
    autoRepliesSent: 0,
    approvalsRequired: 0,
    preventedByPolicy: 0,
    categories: {},
    averageProcessingMs: 0,
    audits: [],
    errors: []
  };

  for (const message of messages) {
    const itemStartedAt = performance.now();
    const stages: AgentStageResult[] = [];
    const stage = async <T>(name: AgentStage, fn: () => Promise<T> | T): Promise<T> => {
      const stageStartedAt = performance.now();
      try {
        const result = await fn();
        stages.push({ stage: name, status: "ok", reason: "completed", durationMs: elapsed(stageStartedAt) });
        return result;
      } catch (error) {
        stages.push({ stage: name, status: "error", reason: error instanceof Error ? error.message : String(error), durationMs: elapsed(stageStartedAt) });
        throw error;
      }
    };

    try {
      const duplicate = await stage("INGEST", () => memory.hasSeen(message));
      if (duplicate) {
        report.skippedDuplicates += 1;
        stages.push({ stage: "AUDIT", status: "skipped", reason: "duplicate message or fingerprint", durationMs: 0 });
        continue;
      }

      const classification = await stage("CLASSIFY", () => classificationAgent(message, config));
      classification.suggestedReply = responseAgent(message, classification);
      const priority = await stage("ASSESS_RISK", () => priorityAgent(classification));
      const policy = await stage("PLAN_ACTION", () => assessPolicy(message, classification, config, report.autoRepliesSent));

      if (policy.approvalRequired) {
        report.approvalsRequired += 1;
        await stage("APPROVE", async () => {
          const approval = await approvals.create(message, classification.suggestedReply, config.telegram.chatId);
          await telegram.requestApproval(message, classification, approval);
          return approval;
        });
      } else if (priority.notify || policy.preventedByPolicy) {
        await stage("APPROVE", () => telegram.notify(message, classification, policy));
      } else {
        stages.push({ stage: "APPROVE", status: "skipped", reason: "no approval required", durationMs: 0 });
      }

      let executed = false;
      await stage("EXECUTE", async () => {
        if (policy.finalAction.type !== "auto_reply") return;
        report.autoRepliesPlanned += 1;
        if (!policy.allowedToSend) return;
        if (config.dryRun) return;
        if (!provider.sendReply) throw new Error("sendReply provider is not configured.");
        await provider.sendReply(message, policy.finalAction.reply);
        report.autoRepliesSent += 1;
        executed = true;
      });

      if (policy.preventedByPolicy) report.preventedByPolicy += 1;
      report.categories[classification.category] = (report.categories[classification.category] ?? 0) + 1;
      await memory.add({
        messageId: message.id,
        threadId: message.threadId,
        fingerprint: memory.fingerprint(message),
        processedAt: new Date().toISOString(),
        decision: classification,
        finalAction: policy.finalAction,
        sent: executed
      });

      const audit: MessageAudit = { message, classification, policy, stages, executed, dryRun: config.dryRun };
      report.audits.push(audit);
      await logger.info("message_processed", {
        messageId: message.id,
        category: classification.category,
        risk: classification.risk,
        finalAction: policy.finalAction.type,
        executed,
        dryRun: config.dryRun
      });
      stages.push({ stage: "AUDIT", status: "ok", reason: "recorded structured audit event", durationMs: 0 });
      report.processed += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      report.errors.push(`${message.id}: ${msg}`);
      await logger.error("message_failed", error, { messageId: message.id });
    }

    report.averageProcessingMs = Math.round((elapsed(startedAt) / Math.max(1, report.processed + report.skippedDuplicates)) * 100) / 100;
    await logger.info("message_timing", { messageId: message.id, durationMs: elapsed(itemStartedAt) });
  }

  return report;
}

function elapsed(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}
