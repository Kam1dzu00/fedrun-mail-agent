import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export class Logger {
  constructor(private readonly logDir: string) {}

  async info(event: string, data: Record<string, unknown> = {}): Promise<void> {
    await this.write("info", event, data);
  }

  async error(event: string, error: unknown, data: Record<string, unknown> = {}): Promise<void> {
    await this.write("error", event, { ...data, error: error instanceof Error ? error.message : String(error) });
  }

  private async write(level: "info" | "error", event: string, data: Record<string, unknown>): Promise<void> {
    await mkdir(this.logDir, { recursive: true });
    const row = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data }) + "\n";
    await appendFile(join(this.logDir, "agent.jsonl"), row, "utf8");
  }
}
