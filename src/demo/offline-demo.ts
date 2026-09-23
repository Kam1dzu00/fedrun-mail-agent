import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../config/env.js";
import { processMessages } from "../agent.js";
import { syntheticEmails } from "./syntheticEmails.js";

const color = {
  green: (text: string) => `\u001b[32m${text}\u001b[0m`,
  yellow: (text: string) => `\u001b[33m${text}\u001b[0m`,
  red: (text: string) => `\u001b[31m${text}\u001b[0m`,
  cyan: (text: string) => `\u001b[36m${text}\u001b[0m`,
  bold: (text: string) => `\u001b[1m${text}\u001b[0m`
};

const temp = await mkdtemp(join(tmpdir(), "fedrun-mail-agent-"));
const config = loadConfig({
  ...process.env,
  MAIL_AGENT_DRY_RUN: "true",
  MAIL_AGENT_DATA_DIR: join(temp, "data"),
  MAIL_AGENT_LOG_DIR: join(temp, "logs"),
  MAIL_AGENT_MAX_AUTO_REPLIES_PER_RUN: "3"
});

const report = await processMessages(syntheticEmails, config);

console.log(color.bold("\nFedrun Mail Agent offline demo"));
console.log("No Gmail, Telegram, internet, or LLM required.\n");
console.log(["ID".padEnd(10), "Category".padEnd(12), "Risk".padEnd(9), "Action".padEnd(18), "Reason"].join(" | "));
console.log("-".repeat(100));

for (const audit of report.audits) {
  const action = audit.policy.finalAction.type;
  const actionText = action === "none" ? color.red(action) : action === "request_approval" ? color.yellow(action) : color.green(action);
  console.log([
    audit.message.id.padEnd(10),
    audit.classification.category.padEnd(12),
    audit.classification.risk.padEnd(9),
    actionText.padEnd(27),
    audit.policy.reason.slice(0, 55)
  ].join(" | "));
  console.log(`  ${color.cyan("stages")} ${audit.stages.map((stage) => `${stage.stage}:${stage.status}`).join(" -> ")}`);
  console.log(`  ${color.cyan("reply")} ${audit.classification.suggestedReply.slice(0, 110)}\n`);
}

console.log(color.bold("Summary"));
console.log(JSON.stringify({
  seen: report.seen,
  processed: report.processed,
  skippedDuplicates: report.skippedDuplicates,
  autoRepliesPlanned: report.autoRepliesPlanned,
  autoRepliesSent: report.autoRepliesSent,
  approvalsRequired: report.approvalsRequired,
  preventedByPolicy: report.preventedByPolicy,
  categories: report.categories,
  averageProcessingMs: report.averageProcessingMs,
  errors: report.errors
}, null, 2));
