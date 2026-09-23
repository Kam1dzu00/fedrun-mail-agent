export type AppConfig = {
  dryRun: boolean;
  dataDir: string;
  logDir: string;
  gmail: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    userEmail?: string;
  };
  telegram: {
    botToken?: string;
    chatId?: string;
  };
  llm: {
    url?: string;
    model?: string;
  };
  maxAutoRepliesPerRun: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    dryRun: env.MAIL_AGENT_DRY_RUN !== "false",
    dataDir: env.MAIL_AGENT_DATA_DIR ?? "data",
    logDir: env.MAIL_AGENT_LOG_DIR ?? "logs",
    gmail: {
      clientId: env.GMAIL_CLIENT_ID,
      clientSecret: env.GMAIL_CLIENT_SECRET,
      refreshToken: env.GMAIL_REFRESH_TOKEN,
      userEmail: env.GMAIL_USER_EMAIL
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID
    },
    llm: {
      url: env.LOCAL_LLM_URL,
      model: env.LOCAL_LLM_MODEL
    },
    maxAutoRepliesPerRun: Number(env.MAIL_AGENT_MAX_AUTO_REPLIES_PER_RUN ?? 3)
  };
}
