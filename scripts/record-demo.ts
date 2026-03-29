import { chromium } from "playwright";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { readdir, copyFile, mkdir, rm, stat } from "node:fs/promises";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const TEST_PROJECT = "/Users/amish/Desktop/lovable-fresh-app";
const VIDEOS_DIR = resolve(PROJECT_ROOT, "videos");
const LANDING_PUBLIC = resolve(PROJECT_ROOT, "landing/public");

const WIDTH = 1280;
const HEIGHT = 800;

const children: ChildProcess[] = [];

function killChildren(): void {
  for (const child of children) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
    } catch { /* already exited */ }
  }
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} not ready within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  // ── 0. Reset test project before anything else ──────────────────────
  console.log("Resetting test project...");
  execSync("cd /Users/amish/Desktop/lovable-fresh-app && git checkout . && git clean -fd", {
    stdio: "pipe",
  });
  console.log("Test project clean.");

  // ── 1. Start servers ────────────────────────────────────────────────
  console.log("Starting API server (port 5174)...");
  const apiServer = spawn("npx", ["tsx", "web/server.ts"], {
    cwd: PROJECT_ROOT,
    stdio: "pipe",
    detached: true,
    env: { ...process.env, NODE_ENV: "development" },
  });
  children.push(apiServer);
  apiServer.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString();
    if (/error/i.test(msg)) console.error("[api]", msg.trim());
  });

  console.log("Starting Vite dev server (port 5175)...");
  const viteServer = spawn("npx", ["vite", "--port", "5175"], {
    cwd: resolve(PROJECT_ROOT, "web"),
    stdio: "pipe",
    detached: true,
    env: { ...process.env, NODE_ENV: "development" },
  });
  children.push(viteServer);
  viteServer.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString();
    if (/error/i.test(msg)) console.error("[vite]", msg.trim());
  });

  console.log("Waiting for servers...");
  await Promise.all([
    waitForServer("http://localhost:5174", 30_000),
    waitForServer("http://localhost:5175", 30_000),
  ]);
  console.log("Both servers ready.");

  // ── 2. Clean old video artefacts ────────────────────────────────────
  const oldFiles = await readdir(VIDEOS_DIR).catch(() => []);
  for (const f of oldFiles) {
    if (f.endsWith(".webm") || f.endsWith(".mp4")) {
      await rm(resolve(VIDEOS_DIR, f));
    }
  }
  await rm(resolve(LANDING_PUBLIC, "demo.mp4")).catch(() => {});
  await mkdir(VIDEOS_DIR, { recursive: true });

  // ── 3. Launch browser (headed for debugging) ────────────────────────
  console.log("Launching Chromium (headed)...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: VIDEOS_DIR, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();

  try {
    // ── a) Navigate ───────────────────────────────────────────────────
    console.log("Step: navigate");
    await page.goto("http://localhost:5175", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="text"]', { timeout: 10_000 });
    await page.waitForTimeout(4000);

    // ── b) Type project path ──────────────────────────────────────────
    console.log("Step: type path");
    await page.click('input[type="text"]');
    await page.type('input[type="text"]', "/Users/amish/Desktop/lovable-fresh-app", { delay: 30 });
    await page.waitForTimeout(1500);

    // ── c) Click Analyse ──────────────────────────────────────────────
    console.log("Step: click Analyse");
    await page.click('button:has-text("Analyse")');
    await page.waitForTimeout(1000);

    // ── d) Wait for dashboard (risk banner or Transform button) ──────
    console.log("Step: wait for dashboard");
    // Guide mode shows descriptive text instead of SIMPLE/MODERATE/COMPLEX,
    // so wait for the Transform button or "Re-analyse" which only appear on dashboard
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Transform") &&
        document.body.innerText.includes("Re-analyse"),
      { timeout: 30_000 },
    );
    await page.waitForTimeout(6000);

    // ── e) Scroll dashboard ───────────────────────────────────────────
    console.log("Step: scroll dashboard");
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(1500);

    // ── f) Scroll back to top ─────────────────────────────────────────
    console.log("Step: scroll to top");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(1000);

    // ── g) Click Transform → ──────────────────────────────────────────
    console.log("Step: click Transform");
    await page.click('button:has-text("Transform")');
    await page.waitForTimeout(1500);

    // ── h) Click Preview changes ──────────────────────────────────────
    console.log("Step: click Preview changes");
    await page.click('button:has-text("Preview changes")');
    await page.waitForTimeout(1000);

    // ── i) Wait for preview to finish ─────────────────────────────────
    console.log("Step: wait for preview complete");
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Preview complete") ||
        document.body.innerText.includes("All done") ||
        document.body.innerText.includes("100%"),
      { timeout: 60_000 },
    );
    await page.waitForTimeout(5000);

    // ── j) Scroll down completed steps ────────────────────────────────
    console.log("Step: scroll transform steps");
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(2000);

    // ── k) Scroll back up ─────────────────────────────────────────────
    console.log("Step: scroll to top");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(1000);

    // ── l) Click "Run for real" ───────────────────────────────────────
    console.log("Step: click Run for real");
    await page.click('button:has-text("Run for real")');
    await page.waitForTimeout(1000);

    // "Run for real" resets state to show pre-start buttons again.
    // Click "Apply changes" to actually run the transforms.
    console.log("Step: click Apply changes");
    await page.click('button:has-text("Apply changes")');
    await page.waitForTimeout(1000);

    // ── m) Wait for Migration complete ────────────────────────────────
    console.log("Step: wait for Migration complete");
    await page.waitForFunction(
      () => document.body.innerText.includes("Migration complete"),
      { timeout: 60_000 },
    );
    await page.waitForTimeout(5000);

    // ── n) Scroll down to checklist ───────────────────────────────────
    console.log("Step: scroll checklist");
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(3000);

    // ── o) Click Continue to Deploy → ─────────────────────────────────
    console.log("Step: click Deploy");
    await page.click('button:has-text("Deploy")');
    await page.waitForTimeout(1000);

    // ── p) Wait for deploy view content ───────────────────────────────
    console.log("Step: wait for deploy view");
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Supabase Setup") ||
        document.body.innerText.includes("almost there"),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(4000);

    // ── q) Scroll through deploy cards ────────────────────────────────
    console.log("Step: scroll deploy cards");
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(5000);

    console.log("Recording complete.");
  } finally {
    // ── 4. Close browser & save video ─────────────────────────────────
    await page.close();
    await context.close();
    await browser.close();
  }

  // ── 5. Find the .webm, convert to mp4, copy to landing ─────────────
  const files = await readdir(VIDEOS_DIR);
  const webmFile = files.find((f) => f.endsWith(".webm"));
  if (!webmFile) {
    console.error("No .webm video found in videos/");
    killChildren();
    process.exit(1);
  }

  const webmPath = resolve(VIDEOS_DIR, webmFile);
  const mp4Path = resolve(VIDEOS_DIR, "demo.mp4");
  console.log(`Raw video: ${webmPath}`);

  try {
    console.log("Converting to mp4 with ffmpeg...");
    execSync(
      `ffmpeg -y -i "${webmPath}" -c:v libx264 -crf 23 -preset medium -c:a aac "${mp4Path}"`,
      { stdio: "pipe" },
    );
    console.log(`Converted: ${mp4Path}`);
  } catch (err) {
    console.warn("ffmpeg failed, keeping .webm:", err);
  }

  // Copy to landing/public
  const landingDest = resolve(LANDING_PUBLIC, "demo.mp4");
  try {
    await mkdir(LANDING_PUBLIC, { recursive: true });
    await copyFile(mp4Path, landingDest);
    console.log(`Copied to: ${landingDest}`);
  } catch {
    const webmDest = resolve(LANDING_PUBLIC, "demo.webm");
    await copyFile(webmPath, webmDest);
    console.log(`Copied .webm to: ${webmDest}`);
  }

  // Report
  const info = await stat(mp4Path).catch(() => stat(webmPath));
  const sizeMB = (info.size / (1024 * 1024)).toFixed(2);
  console.log(`\nFinal video: ${mp4Path}`);
  console.log(`Size: ${sizeMB} MB`);

  try {
    const duration = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp4Path}"`,
      { encoding: "utf-8" },
    ).trim();
    console.log(`Duration: ${parseFloat(duration).toFixed(1)}s`);
  } catch {
    console.log("(ffprobe unavailable)");
  }

  // ── 6. Reset test project ──────────────────────────────────────────
  console.log("\nResetting test project...");
  execSync("cd /Users/amish/Desktop/lovable-fresh-app && git checkout . && git clean -fd", {
    stdio: "pipe",
  });
  console.log("Test project clean.");

  killChildren();
  console.log("Done!");
}

process.on("SIGINT", () => { killChildren(); process.exit(1); });
process.on("SIGTERM", () => { killChildren(); process.exit(1); });
process.on("uncaughtException", (err) => { console.error(err); killChildren(); process.exit(1); });

main().then(() => {
  killChildren();
  process.exit(0);
}).catch((err) => {
  console.error("Fatal error:", err);
  killChildren();
  process.exit(1);
});
