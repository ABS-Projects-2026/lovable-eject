import { exec } from "node:child_process";

export interface VerifyStepResult {
  success: boolean;
  output: string;
  errors: string[];
}

export interface VerificationResult {
  install: VerifyStepResult;
  build: VerifyStepResult | null;
}

function execAsync(
  command: string,
  cwd: string,
  timeoutMs = 60_000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject({ stdout: stdout ?? "", stderr: stderr ?? "", error });
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}

/**
 * Run npm install in the project directory.
 */
export async function verifyInstall(
  projectPath: string
): Promise<VerifyStepResult> {
  try {
    const { stdout, stderr } = await execAsync("npm install", projectPath);
    return {
      success: true,
      output: stdout + (stderr ? `\n${stderr}` : ""),
      errors: [],
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; error?: Error };
    const output = (e.stdout ?? "") + (e.stderr ? `\n${e.stderr}` : "");
    const errorLines = (e.stderr ?? "")
      .split("\n")
      .filter((l) => l.includes("ERR!") || l.includes("error"));
    return {
      success: false,
      output,
      errors: errorLines.length > 0 ? errorLines : ["npm install failed"],
    };
  }
}

/**
 * Run npm run build in the project directory.
 */
export async function verifyBuild(
  projectPath: string
): Promise<VerifyStepResult> {
  try {
    const { stdout, stderr } = await execAsync("npm run build", projectPath);
    return {
      success: true,
      output: stdout + (stderr ? `\n${stderr}` : ""),
      errors: [],
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; error?: Error };
    const output = (e.stdout ?? "") + (e.stderr ? `\n${e.stderr}` : "");
    const errorLines = (e.stderr ?? "")
      .split("\n")
      .filter(
        (l) =>
          l.includes("error") ||
          l.includes("Error") ||
          l.includes("TS") ||
          l.includes("FAIL")
      );
    return {
      success: false,
      output,
      errors: errorLines.length > 0 ? errorLines : ["npm run build failed"],
    };
  }
}

/**
 * Run install then build sequentially.
 */
export async function runVerification(
  projectPath: string
): Promise<VerificationResult> {
  const install = await verifyInstall(projectPath);

  if (!install.success) {
    return { install, build: null };
  }

  const build = await verifyBuild(projectPath);
  return { install, build };
}
