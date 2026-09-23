export type EmailMessage = {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  text: string;
  receivedAt: string;
  labels?: string[];
};

export type MailDecision = {
  messageId: string;
  spam: boolean;
  urgency: "low" | "normal" | "high";
  category: "billing" | "support" | "sales" | "scheduling" | "personal" | "unknown";
  risk: "safe" | "review" | "blocked";
  needsHumanApproval: boolean;
  shouldAutoReply: boolean;
  reason: string;
  suggestedReply: string;
  promptInjectionSignals: string[];
};

export type ProcessedRecord = {
  messageId: string;
  threadId?: string;
  fingerprint: string;
  processedAt: string;
  decision: MailDecision;
};

export type AgentReport = {
  seen: number;
  processed: number;
  skippedDuplicates: number;
  autoReplies: number;
  approvalsRequired: number;
  errors: string[];
};
