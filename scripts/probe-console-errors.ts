#!/usr/bin/env bun
/**
 * Boots Playwright headless against http://localhost:3002 (the
 * default dev port the user lands on once 3000 / 3001 are taken)
 * and prints every console message + page error. Run after
 * `bun run dev` is up.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3002";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      const t = msg.type();
      if (t === "error" || t === "warning") {
        process.stdout.write(`[${t}] ${msg.text()}\n`);
      }
    });
    page.on("pageerror", (err) => {
      process.stdout.write(`[pageerror] ${err.message}\n${err.stack ?? ""}\n`);
    });
    page.on("requestfailed", (req) => {
      process.stdout.write(
        `[requestfailed] ${req.method()} ${req.url()} -> ${req.failure()?.errorText}\n`,
      );
    });
    process.stdout.write(`Probing ${BASE}...\n`);
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(8_000);
    process.stdout.write(`Probe complete.\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  process.stderr.write(`probe failed: ${err}\n`);
  process.exit(1);
});
