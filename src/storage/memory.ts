import { createHash } from "node:crypto";
import { join } from "node:path";
import type { EmailMessage, ProcessedRecord } from "../types/mail.js";
import { JsonStore } from "./jsonStore.js";

type MemoryFile = {
  processed: ProcessedRecord[];
};

export class MailMemory {
  private readonly store: JsonStore<MemoryFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore(join(dataDir, "memory.json"), { processed: [] });
  }

  fingerprint(message: EmailMessage): string {
    return createHash("sha256")
      .update([message.from, message.subject, message.text.slice(0, 2000)].join("\n"))
      .digest("hex");
  }

  async hasSeen(message: EmailMessage): Promise<boolean> {
    const memory = await this.store.read();
    const fp = this.fingerprint(message);
    return memory.processed.some((item) => item.messageId === message.id || item.fingerprint === fp);
  }

  async add(record: ProcessedRecord): Promise<void> {
    const memory = await this.store.read();
    memory.processed.unshift(record);
    memory.processed = memory.processed.slice(0, 5000);
    await this.store.write(memory);
  }
}
