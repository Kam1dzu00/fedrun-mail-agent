import type { AppConfig } from "../config/env.js";
import type { EmailMessage } from "../types/mail.js";

type GmailListResponse = { messages?: { id: string; threadId: string }[] };
type GmailMessageResponse = {
  id: string;
  threadId?: string;
  payload?: { headers?: { name: string; value: string }[]; body?: { data?: string }; parts?: GmailMessageResponse["payload"][] };
  snippet?: string;
  internalDate?: string;
};

export class GmailClient {
  constructor(private readonly config: AppConfig["gmail"]) {}

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret && this.config.refreshToken);
  }

  async fetchUnread(limit = 10): Promise<EmailMessage[]> {
    if (!this.isConfigured()) {
      throw new Error("Gmail is not configured. Use the offline demo or set Gmail OAuth environment variables.");
    }
    const token = await this.accessToken();
    const list = (await gmailFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=" + limit, token)) as GmailListResponse;
    const messages = await Promise.all((list.messages ?? []).map((item) => this.fetchMessage(item.id, token)));
    return messages;
  }

  async sendReply(original: EmailMessage, text: string): Promise<void> {
    if (!this.config.userEmail) throw new Error("GMAIL_USER_EMAIL is required to send replies.");
    const raw = [
      `To: ${original.from}`,
      `From: ${this.config.userEmail}`,
      `Subject: Re: ${original.subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      text
    ].join("\r\n");
    const encoded = Buffer.from(raw).toString("base64url");
    const token = await this.accessToken();
    await gmailFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", token, {
      method: "POST",
      body: JSON.stringify({ raw: encoded, threadId: original.threadId })
    });
  }

  private async fetchMessage(id: string, token: string): Promise<EmailMessage> {
    const message = (await gmailFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, token)) as GmailMessageResponse;
    const headers = new Map((message.payload?.headers ?? []).map((item) => [item.name.toLowerCase(), item.value]));
    return {
      id: message.id,
      threadId: message.threadId,
      from: headers.get("from") ?? "unknown",
      to: headers.get("to"),
      subject: headers.get("subject") ?? "(no subject)",
      text: extractBody(message.payload) || message.snippet || "",
      receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString()
    };
  }

  private async accessToken(): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId ?? "",
      client_secret: this.config.clientSecret ?? "",
      refresh_token: this.config.refreshToken ?? "",
      grant_type: "refresh_token"
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Gmail token refresh failed: ${response.status}`);
    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) throw new Error("Gmail token response did not include access_token.");
    return payload.access_token;
  }
}

async function gmailFetch(url: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    signal: init.signal ?? AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail request failed: ${response.status}`);
  return response.json();
}

function extractBody(payload: GmailMessageResponse["payload"]): string {
  if (!payload) return "";
  if (payload.body?.data) return Buffer.from(payload.body.data, "base64url").toString("utf8");
  for (const part of payload.parts ?? []) {
    const text = extractBody(part);
    if (text) return text;
  }
  return "";
}
