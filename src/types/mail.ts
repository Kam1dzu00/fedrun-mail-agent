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

export type AgentStage =
  | "INGEST"
  | "CLASSIFY"
  | "ASSESS_RISK"
  | "PLAN_ACTION"
  | "APPROVE"
  | "EXECUTE"
  | "AUDIT";

export type AgentStageResult = {
  stage: AgentStage;
  status: "ok" | "skipped" | "blocked" | "error";
  reason: string;
  durationMs: number;
};

export type PlannedAction =
  | { type: "none"; reason: string }
  | { type: "notify"; reason: string }
  | { type: "auto_reply"; reply: string; reason: string }
  | { type: "request_approval"; reply: string; reason: string };

export type PolicyDecision = {
  finalAction: PlannedAction;
  allowedToSend: boolean;
  preventedByPolicy: boolean;
  approvalRequired: boolean;
  reason: string;
};

export type MessageAudit = {
  message: EmailMessage;
  classification: MailDecision;
  policy: PolicyDecision;
  stages: AgentStageResult[];
  executed: boolean;
  dryRun: boolean;
};

export type ProcessedRecord = {
  messageId: string;
  threadId?: string;
  fingerprint: string;
  processedAt: string;
  decision: MailDecision;
  finalAction?: PlannedAction;
  sent?: boolean;
};

export type AgentReport = {
  seen: number;
  processed: number;
  skippedDuplicates: number;
  autoRepliesPlanned: number;
  autoRepliesSent: number;
  approvalsRequired: number;
  preventedByPolicy: number;
  categories: Record<string, number>;
  averageProcessingMs: number;
  audits: MessageAudit[];
  errors: string[];
};
