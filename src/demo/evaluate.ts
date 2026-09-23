import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../config/env.js";
import { processMessages } from "../agent.js";
import { syntheticEmails } from "./syntheticEmails.js";

const temp = await mkdtemp(join(tmpdir(), "fedrun-mail-agent-eval-"));
const config = loadConfig({
  MAIL_AGENT_DRY_RUN: "true",
  MAIL_AGENT_DATA_DIR: join(temp, "data"),
  MAIL_AGENT_LOG_DIR: join(temp, "logs"),
  MAIL_AGENT_MAX_AUTO_REPLIES_PER_RUN: "3"
});

const report = await processMessages(syntheticEmails, config);
let categoryHits = 0;
let actionHits = 0;
const evaluated = report.audits.length;

for (const audit of report.audits) {
  const expected = syntheticEmails.find((item) => item.id === audit.message.id);
  if (!expected) continue;
  if (audit.classification.category === expected.expectedCategory) categoryHits += 1;
  if (audit.policy.finalAction.type === expected.expectedFinalAction) actionHits += 1;
}

console.log(JSON.stringify({
  dataset: "synthetic-offline-v1",
  evaluated,
  skippedDuplicates: report.skippedDuplicates,
  categoryAccuracy: round(categoryHits / Math.max(1, evaluated)),
  actionAccuracy: round(actionHits / Math.max(1, evaluated)),
  note: "Synthetic results validate deterministic demo behavior. They do not prove accuracy on real mail."
}, null, 2));

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
