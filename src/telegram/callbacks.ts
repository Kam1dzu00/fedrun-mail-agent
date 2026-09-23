import type { AppConfig } from "../config/env.js";
import { ApprovalStore } from "../storage/approvalStore.js";
import type { TelegramCallback } from "../types/approval.js";

export async function handleTelegramCallback(config: AppConfig, callback: TelegramCallback) {
  if (!config.telegram.chatId) throw new Error("TELEGRAM_CHAT_ID is required for approval callbacks.");
  const approvals = new ApprovalStore(config.dataDir);
  return approvals.applyCallback(callback, config.telegram.chatId);
}
