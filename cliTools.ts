// Claude Code tool definition for Discord Rich Presence

export interface CliToolDefinition {
  /** Unique key for this tool */
  id: string;
  /** Human-readable name shown in Discord */
  name: string;
  /** Process names to look for (cross-platform) */
  processNames: string[];
  /** Terminal command patterns to detect (regex strings) */
  terminalPatterns: string[];
  /** Short status detail shown under the tool name */
  detail: string;
  /** Discord large image key (upload to your Discord app assets) */
  largeImageKey: string;
  /** Tooltip for the large image */
  largeImageText: string;
  /** Emoji used in VSCode status bar */
  emoji: string;
}

export const CLI_TOOLS: CliToolDefinition[] = [
  {
    id: "claude",
    name: "Claude Code",
    processNames: ["claude", "claude-code"],
    terminalPatterns: [
      "claude\\s",
      "claude$",
      "@anthropic-ai/claude-code",
    ],
    detail: "Coding with Claude Code",
    largeImageKey: "claude_code",
    largeImageText: "Claude Code by Anthropic",
    emoji: "🤖",
  },
];

