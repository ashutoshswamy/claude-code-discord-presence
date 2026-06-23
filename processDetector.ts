import { exec } from "child_process";
import { promisify } from "util";
import { CLI_TOOLS, CliToolDefinition } from "./cliTools";

const execAsync = promisify(exec);

export class ProcessDetector {
  /**
   * Scans the OS process list for Claude Code.
   * Returns the first matching tool definition, or null if none found.
   */
  async detect(): Promise<CliToolDefinition | null> {
    try {
      const processes = await this.getRunningProcesses();
      return this.matchTool(processes);
    } catch {
      return null;
    }
  }

  private async getRunningProcesses(): Promise<string[]> {
    const platform = process.platform;

    try {
      if (platform === "win32") {
        // Windows: use WMIC or tasklist
        const { stdout } = await execAsync("tasklist /fo csv /nh");
        return stdout
          .split("\n")
          .map((line) => line.split(",")[0].replace(/"/g, "").toLowerCase());
      } else if (platform === "darwin") {
        // macOS: use ps
        const { stdout } = await execAsync("ps -eo comm=");
        return stdout.split("\n").map((p) => p.trim().toLowerCase());
      } else {
        // Linux: use ps
        const { stdout } = await execAsync("ps -eo comm=");
        return stdout.split("\n").map((p) => p.trim().toLowerCase());
      }
    } catch {
      return [];
    }
  }

  private matchTool(processes: string[]): CliToolDefinition | null {
    for (const tool of CLI_TOOLS) {
      for (const procName of tool.processNames) {
        const lower = procName.toLowerCase();
        if (processes.some((p) => p === lower || p.startsWith(lower))) {
          return tool;
        }
      }
    }
    return null;
  }
}
