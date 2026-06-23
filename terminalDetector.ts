import * as vscode from "vscode";
import { CLI_TOOLS, CliToolDefinition } from "./cliTools";

export class TerminalDetector {
  private activeToolId: string | null = null;
  private disposables: vscode.Disposable[] = [];
  private onChangeCallback: ((tool: CliToolDefinition | null) => void) | null = null;

  constructor() {
    this.setupListeners();
  }

  /**
   * Register a callback that fires when the active tool changes.
   */
  onChange(cb: (tool: CliToolDefinition | null) => void): void {
    this.onChangeCallback = cb;
  }

  /**
   * Returns the currently detected tool based on terminal activity.
   */
  getActiveTool(): CliToolDefinition | null {
    if (!this.activeToolId) return null;
    return CLI_TOOLS.find((t) => t.id === this.activeToolId) ?? null;
  }

  private setupListeners(): void {
    // Watch terminal creation — check the name of new terminals
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.checkTerminal(terminal);
      })
    );

    // Watch terminal close — clear if it was the active one
    this.disposables.push(
      vscode.window.onDidCloseTerminal(() => {
        this.recheckAllTerminals();
      })
    );

    // Watch active terminal change
    this.disposables.push(
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        if (terminal) {
          this.checkTerminal(terminal);
        } else {
          this.recheckAllTerminals();
        }
      })
    );

    // Check already-open terminals on startup
    vscode.window.terminals.forEach((t) => this.checkTerminal(t));
  }

  private checkTerminal(terminal: vscode.Terminal): void {
    const name = terminal.name.toLowerCase();
    const matched = this.matchToolFromString(name);
    if (matched) {
      this.setActiveTool(matched.id);
    }
  }

  private recheckAllTerminals(): void {
    const terminals = vscode.window.terminals;
    if (terminals.length === 0) {
      this.setActiveTool(null);
      return;
    }

    for (const terminal of terminals) {
      const name = terminal.name.toLowerCase();
      const matched = this.matchToolFromString(name);
      if (matched) {
        this.setActiveTool(matched.id);
        return;
      }
    }

    this.setActiveTool(null);
  }

  private matchToolFromString(text: string): CliToolDefinition | null {
    for (const tool of CLI_TOOLS) {
      // Check terminal name patterns
      for (const pattern of tool.terminalPatterns) {
        try {
          if (new RegExp(pattern, "i").test(text)) {
            return tool;
          }
        } catch {
          // Bad regex, skip
        }
      }

      // Check process names in terminal name
      for (const procName of tool.processNames) {
        if (text.includes(procName.toLowerCase())) {
          return tool;
        }
      }
    }
    return null;
  }

  private setActiveTool(toolId: string | null): void {
    if (this.activeToolId === toolId) return;
    this.activeToolId = toolId;

    if (this.onChangeCallback) {
      const tool = toolId
        ? CLI_TOOLS.find((t) => t.id === toolId) ?? null
        : null;
      this.onChangeCallback(tool);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
