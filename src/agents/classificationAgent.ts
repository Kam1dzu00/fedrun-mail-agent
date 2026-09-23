import type { AppConfig } from "../config/env.js";
import type { EmailMessage, MailDecision } from "../types/mail.js";
import { classifyEmail } from "../llm/localClient.js";

export async function classificationAgent(message: EmailMessage, config: AppConfig): Promise<MailDecision> {
  return classifyEmail(message, config.llm);
}
