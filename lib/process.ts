import { spawn } from "node:child_process";

export type SpawnResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export async function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
  cwd?: string
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: process.platform !== "win32"
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error("PROCESS_TIMEOUT"));
      }

      resolve({
        stdout,
        stderr,
        code: code ?? 1
      });
    });
  });
}

function killProcessTree(pid?: number): void {
  if (!pid) {
    return;
  }

  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"]);
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // best effort
    }
  }
}
