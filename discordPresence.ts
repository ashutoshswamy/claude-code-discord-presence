import { CliToolDefinition } from "./cliTools";

// discord-rpc is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DiscordRpc = require("discord-rpc");

export class DiscordPresenceManager {
  private client: any = null;
  private connected = false;
  private connecting = false;
  private currentTool: CliToolDefinition | null = null;
  private sessionStart: Date = new Date();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectDelay = 15_000; // 15s

  constructor(private readonly clientId: string) {}

  async connect(): Promise<boolean> {
    if (this.connected || this.connecting) return this.connected;
    this.connecting = true;

    try {
      DiscordRpc.register(this.clientId);
      this.client = new DiscordRpc.Client({ transport: "ipc" });

      this.client.on("ready", () => {
        this.connected = true;
        this.connecting = false;
        this.sessionStart = new Date();
        console.log("[Claude Presence] Connected to Discord");
      });

      this.client.on("disconnected", () => {
        this.connected = false;
        this.connecting = false;
        console.log("[Claude Presence] Disconnected from Discord, will retry...");
        this.scheduleReconnect();
      });

      await this.client.login({ clientId: this.clientId });
      return true;
    } catch (err) {
      this.connected = false;
      this.connecting = false;
      // Discord might not be running — schedule a quiet retry
      this.scheduleReconnect();
      return false;
    }
  }

  async setActivity(tool: CliToolDefinition | null): Promise<void> {
    this.currentTool = tool;
    if (!this.connected || !this.client) return;

    try {
      if (tool) {
        await this.client.setActivity({
          details: tool.name,
          state: tool.detail,
          startTimestamp: this.sessionStart,
          largeImageKey: tool.largeImageKey,
          largeImageText: tool.largeImageText,
          instance: false,
          buttons: [
            {
              label: "View on GitHub",
              url: "https://github.com/ashutoshswamy/claude-code-discord-presence",
            },
          ],
        });
      } else {
        await this.client.clearActivity();
      }
    } catch (err) {
      console.error("[Claude Presence] Failed to set activity:", err);
    }
  }

  async clearActivity(): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      await this.client.clearActivity();
    } catch {}
  }

  isConnected(): boolean {
    return this.connected;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      const ok = await this.connect();
      if (ok) {
        await this.setActivity(this.currentTool);
      }
    }, this.reconnectDelay);
  }

  dispose(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      if (this.client) {
        this.client.clearActivity();
        this.client.destroy();
      }
    } catch {}
    this.client = null;
    this.connected = false;
  }
}
