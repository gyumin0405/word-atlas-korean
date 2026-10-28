#!/usr/bin/env node
/**
 * Retake the README app screenshots for the Korean edition.
 *   node scripts/ko/screenshots.mjs [http://localhost:5174/]
 * Same sizes as scripts/render-cards.mjs, but with a learner a few weeks in
 * (as in scripts/record-demo.mjs) so Today and the galaxy are not empty.
 * The brand cover and social cards are left alone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const app = process.argv[2] || "http://localhost:5174/";
const index = JSON.parse(fs.readFileSync(path.join(root, "public/atlas/index.json"), "utf8"));
const seeded = index.words.filter((w, i) => w[4] <= 2 && i % 3 === 0).slice(0, 640).map((w) => w[0]);
const word = "harbour";

const views = [
  ["today-desktop", "#/", 1440, 900],
  ["atlas-desktop", "#/atlas", 1440, 900],
  ["word-desktop", `#/atlas?w=${word}`, 1440, 900],
  ["today-mobile", "#/", 390, 844],
  ["atlas-mobile", "#/atlas", 390, 844],
  ["word-mobile", `#/atlas?w=${word}`, 390, 844],
  ["galaxy", "#/atlas?view=galaxy", 1440, 900],
];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
for (const [name, hash, w, h] of views) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: name === "galaxy" ? "dark" : "light" });
  await ctx.addInitScript((ids) => {
    localStorage.clear();
    localStorage.setItem("word-atlas:settings", JSON.stringify({ onboarded: true, startLevel: 2, dailyNew: 10, autoplay: false, splash: false }));
    const now = Date.now();
    const cards = Object.fromEntries(
      ids.map((id, i) => [id, { due: now + (1 + (i % 9)) * 86400000, s: i % 3 ? 8 : 40, d: 5, el: 3, sd: 6, ls: 0, reps: 4, lapses: 0, st: 2, seen: i < 18 ? now - 3600000 : now - (10 + (i % 20)) * 86400000 }]),
    );
    localStorage.setItem("word-atlas:v2:word-atlas-open", JSON.stringify({ version: 2, datasetId: "word-atlas-open", cards, bookmarks: [], days: {}, typing: [], session: null, mistakes: [] }));
  }, seeded);
  const page = await ctx.newPage();
  await page.goto(new URL(hash, app).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(name === "galaxy" ? 4000 : 1800);
  const out = { path: path.join(root, `docs/assets/${name}.jpg`), type: "jpeg", quality: 86 };
  // The galaxy shot is the star map itself, not the page around it.
  if (name === "galaxy") await page.locator(".galaxy-full").screenshot(out);
  else await page.screenshot(out);
  await ctx.close();
  console.log("wrote", `docs/assets/${name}.jpg`);
}
await browser.close();
