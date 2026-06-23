import * as vscode from "vscode";
import { DiscordPresenceManager } from "./discordPresence";
import { TerminalDetector } from "./terminalDetector";
import { ProcessDetector } from "./processDetector";
import { StatusBarManager } from "./statusBar";
import { CliToolDefinition } from "./cliTools";

let discord: DiscordPresenceManager | null = null;
let terminalDetector: TerminalDetector | null = null;
let processDetector: ProcessDetector | null = null;
let statusBar: StatusBarManager | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let enabled = true;
let currentActiveTool: CliToolDefinition | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log("[Claude Presence] Extension activating...");

  const config = vscode.workspace.getConfiguration("claudePresence");
  enabled = config.get<boolean>("enabled", true);

  // Set up status bar
  statusBar = new StatusBarManager();
  context.subscriptions.push(statusBar);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("claudePresence.enable", () => {
      enabled = true;
      vscode.workspace
        .getConfiguration("claudePresence")
        .update("enabled", true, vscode.ConfigurationTarget.Global);
      startPresence(context);
      vscode.window.showInformationMessage("Claude Code Discord Presence enabled.");
    }),

    vscode.commands.registerCommand("claudePresence.disable", () => {
      enabled = false;
      vscode.workspace
        .getConfiguration("claudePresence")
        .update("enabled", false, vscode.ConfigurationTarget.Global);
      stopPresence();
      statusBar?.showDisabled();
      vscode.window.showInformationMessage("Claude Code Discord Presence disabled.");
    }),

    vscode.commands.registerCommand("claudePresence.showStatus", async () => {
      const discordStatus = discord?.isConnected()
        ? "✅ Connected to Discord"
        : "❌ Discord not found (is it running?)";
      const toolStatus = currentActiveTool
        ? `Active: ${currentActiveTool.emoji} ${currentActiveTool.name}`
        : "Claude Code not detected";

      const action = await vscode.window.showInformationMessage(
        `Claude Presence — ${discordStatus}\n${toolStatus}`,
        "Open Settings",
        "Disable",
        "OK"
      );

      if (action === "Open Settings") {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "claudePresence"
        );
      } else if (action === "Disable") {
        vscode.commands.executeCommand("claudePresence.disable");
      }
    })
  );

  // Watch config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("claudePresence")) {
        const newConfig = vscode.workspace.getConfiguration("claudePresence");
        const newEnabled = newConfig.get<boolean>("enabled", true);

        if (newEnabled !== enabled) {
          enabled = newEnabled;
          if (enabled) {
            startPresence(context);
          } else {
            stopPresence();
            statusBar?.showDisabled();
          }
        }

        // Restart if poll interval changed
        if (e.affectsConfiguration("claudePresence.pollInterval") && enabled) {
          stopPolling();
          startPolling();
        }
      }
    })
  );

  if (enabled) {
    await startPresence(context);
  } else {
    statusBar?.showDisabled();
  }
}

async function startPresence(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("claudePresence");
  const clientId = config.get<string>(
    "discordClientId",
    "1519037985092272288"
  );

  statusBar?.showConnecting();

  // Init Discord
  if (!discord) {
    discord = new DiscordPresenceManager(clientId);
    context.subscriptions.push({ dispose: () => discord?.dispose() });
  }
  await discord.connect();

  // Init terminal detector
  if (!terminalDetector) {
    terminalDetector = new TerminalDetector();
    context.subscriptions.push({
      dispose: () => terminalDetector?.dispose(),
    });
  }

  // Init process detector
  if (!processDetector) {
    processDetector = new ProcessDetector();
  }
  terminalDetector.onChange((tool) => {
    handleToolChange(tool).catch(console.error);
  });

  // Start polling (stop first in case of re-enable)
  stopPolling();
  startPolling();

  // Initial check
  await tick().catch(console.error);
}

function startPolling(): void {
  const config = vscode.workspace.getConfiguration("claudePresence");
  const intervalSeconds = Math.max(1, config.get<number>("pollInterval", 5));
  pollTimer = setInterval(() => { tick().catch(console.error); }, intervalSeconds * 1000);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function tick(): Promise<void> {
  if (!enabled) return;

  const detected =
    terminalDetector?.getActiveTool() ?? (await processDetector?.detect()) ?? null;

  if (detected?.id !== currentActiveTool?.id) {
    await handleToolChange(detected);
  }

  // Update status bar connectivity indicator
  if (currentActiveTool && discord) {
    statusBar?.showActiveTool(currentActiveTool, discord.isConnected());
  } else if (!discord?.isConnected()) {
    statusBar?.showDisconnected();
  } else {
    statusBar?.showIdle();
  }
}

async function handleToolChange(
  tool: CliToolDefinition | null
): Promise<void> {
  currentActiveTool = tool;

  if (!discord) return;

  if (!discord.isConnected()) {
    // Try reconnecting — discord might have opened since last check
    await discord.connect();
  }

  await discord.setActivity(tool);

  if (tool) {
    statusBar?.showActiveTool(tool, discord.isConnected());
  } else {
    if (discord.isConnected()) {
      statusBar?.showIdle();
    } else {
      statusBar?.showDisconnected();
    }
  }
}

function stopPresence(): void {
  stopPolling();
  discord?.clearActivity();
  currentActiveTool = null;
}

export function deactivate(): void {
  stopPresence();
  discord?.dispose();
  terminalDetector?.dispose();
  statusBar?.dispose();
}
