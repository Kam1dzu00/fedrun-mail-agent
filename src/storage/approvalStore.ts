import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import type { ApprovalRequest, TelegramCallback } from "../types/approval.js";
import type { EmailMessage } from "../types/mail.js";
import { JsonStore } from "./jsonStore.js";

type ApprovalFile = {
  approvals: ApprovalRequest[];
  callbacks: string[];
};

export class ApprovalStore {
  private readonly store: JsonStore<ApprovalFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore(join(dataDir, "approvals.json"), { approvals: [], callbacks: [] });
  }

  async create(message: EmailMessage, reply: string, chatId?: string): Promise<ApprovalRequest> {
    const now = new Date().toISOString();
    const file = await this.store.read();
    const existing = file.approvals.find((item) => item.messageId === message.id && item.status === "pending");
    if (existing) return existing;
    const approval: ApprovalRequest = {
      id: randomUUID(),
      messageId: message.id,
      threadId: message.threadId,
      chatId,
      reply,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    file.approvals.unshift(approval);
    file.approvals = file.approvals.slice(0, 1000);
    await this.store.write(file);
    return approval;
  }

  async applyCallback(callback: TelegramCallback, allowedChatId: string): Promise<ApprovalRequest> {
    if (callback.fromChatId !== allowedChatId) throw new Error("Unauthorized Telegram chat.");
    const file = await this.store.read();
    const callbackKey = callback.callbackQueryId ?? createHash("sha256").update(`${callback.fromChatId}:${callback.action}:${callback.approvalId}`).digest("hex");
    if (file.callbacks.includes(callbackKey)) throw new Error("Duplicate Telegram callback.");
    const approval = file.approvals.find((item) => item.id === callback.approvalId);
    if (!approval) throw new Error("Approval request not found.");
    if (approval.status !== "pending") throw new Error(`Approval is already ${approval.status}.`);
    approval.status = callback.action === "APPROVE" ? "approved" : "rejected";
    approval.updatedAt = new Date().toISOString();
    file.callbacks.unshift(callbackKey);
    file.callbacks = file.callbacks.slice(0, 2000);
    await this.store.write(file);
    return approval;
  }
}
