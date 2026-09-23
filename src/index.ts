import { loadConfig } from "./config/env.js";
import { GmailClient } from "./gmail/client.js";
import { processMessages } from "./agent.js";

const config = loadConfig();
const gmail = new GmailClient(config.gmail);

if (!gmail.isConfigured()) {
  console.error("Gmail is not configured. Run `npm run demo` for the offline synthetic demo.");
  process.exitCode = 1;
} else {
  const messages = await gmail.fetchUnread(10);
  const report = await processMessages(messages, config, {
    sendReply: (message, text) => gmail.sendReply(message, text)
  });
  console.log(JSON.stringify(report, null, 2));
}
