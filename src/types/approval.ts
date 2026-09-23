export type ApprovalStatus = "pending" | "approved" | "rejected" | "executed";

export type ApprovalRequest = {
  id: string;
  messageId: string;
  threadId?: string;
  chatId?: string;
  reply: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
};

export type TelegramCallback = {
  callbackQueryId?: string;
  fromChatId: string;
  action: "APPROVE" | "REJECT";
  approvalId: string;
};
