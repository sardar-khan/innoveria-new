#!/usr/bin/env node
// SEO guardrails for the static site.
// Hard fail (exit 1): any publish/modified/lastmod date in the future.
// Warnings (exit 0): <title> over 60 chars, meta description over 155 chars.
// Run: npm run seo-check
// TODO(owner): wire this into CI (or vercel.json buildCommand) once you are happy it is green.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const IGNORE = new Set(["node_modules", ".git", "scripts"]);

const errors = [];
const warnings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith(".html")) checkHtml(p);
  }
}

function checkHtml(path) {
  const rel = relative(ROOT, path).split(sep).join("/");
  const html = readFileSync(path, "utf8");

  // Future dates: ISO datetimes, JSON-LD date fields
  const dateMatches = [
    ...html.matchAll(/content="(\d{4}-\d{2}-\d{2})T[^"]*"/g),
    ...html.matchAll(/"date(?:Published|Modified)":\s*"(\d{4}-\d{2}-\d{2})"/g),
  ];
  for (const m of dateMatches) {
    if (m[1] > TODAY) errors.push(`${rel}: future date ${m[1]}`);
  }

  // Title length (text before any " | " suffix is the meaningful part, but check full)
  const title = html.match(/<title>([^<]*)<\/title>/);
  if (title) {
    const t = title[1].trim();
    if (t.length > 60) warnings.push(`${rel}: <title> ${t.length} chars (>60): ${t}`);
  }

  // Meta description length
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (desc && desc[1].length > 155) {
    warnings.push(`${rel}: meta description ${desc[1].length} chars (>155)`);
  }
}

function checkSitemap() {
  const p = join(ROOT, "sitemap.xml");
  let xml;
  try { xml = readFileSync(p, "utf8"); } catch { return; }
  for (const m of xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)) {
    if (m[1] > TODAY) errors.push(`sitemap.xml: future lastmod ${m[1]}`);
  }
}

walk(ROOT);
checkSitemap();

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log("  WARN " + w);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log("  FAIL " + e);
  console.error(`\nseo-check failed: ${errors.length} future date(s). Today is ${TODAY}.`);
  process.exit(1);
}
console.log(`\nseo-check passed. No future dates. ${warnings.length} warning(s). Today is ${TODAY}.`);
