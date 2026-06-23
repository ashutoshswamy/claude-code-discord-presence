import * as vscode from "vscode";
import { CliToolDefinition } from "./cliTools";

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );
    this.item.command = "claudePresence.showStatus";
    this.showIdle();
    this.item.show();
  }

  showConnecting(): void {
    this.item.text = "$(loading~spin) Discord...";
    this.item.tooltip = "Claude Presence: Connecting to Discord";
    this.item.color = undefined;
  }

  showIdle(): void {
    this.item.text = "$(radio-tower) Claude Presence";
    this.item.tooltip = "Claude Presence: Watching for Claude Code";
    this.item.color = new vscode.ThemeColor("statusBarItem.foreground");
  }

  showActiveTool(tool: CliToolDefinition, connected: boolean): void {
    const icon = connected ? "$(pass-filled)" : "$(warning)";
    this.item.text = `${icon} ${tool.emoji} ${tool.name}`;
    this.item.tooltip = connected
      ? `Claude Presence: Showing "${tool.name}" on Discord`
      : `Claude Presence: ${tool.name} active (Discord disconnected)`;
    this.item.color = connected
      ? new vscode.ThemeColor("terminal.ansiGreen")
      : new vscode.ThemeColor("terminal.ansiYellow");
  }

  showDisconnected(): void {
    this.item.text = "$(circle-slash) Claude Presence";
    this.item.tooltip =
      "Claude Presence: Discord not running. Will reconnect automatically.";
    this.item.color = new vscode.ThemeColor("terminal.ansiRed");
  }

  showDisabled(): void {
    this.item.text = "$(debug-pause) Claude Presence";
    this.item.tooltip = "Claude Presence: Disabled";
    this.item.color = undefined;
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}
