import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../config/env.js";
import { processMessages } from "../agent.js";
import { syntheticEmails } from "./syntheticEmails.js";

const temp = await mkdtemp(join(tmpdir(), "fedrun-mail-agent-"));
const config = loadConfig({
  ...process.env,
  MAIL_AGENT_DRY_RUN: "true",
  MAIL_AGENT_DATA_DIR: join(temp, "data"),
  MAIL_AGENT_LOG_DIR: join(temp, "logs")
});

const report = await processMessages(syntheticEmails, config);
console.log(JSON.stringify(report, null, 2));
