/**
 * Writes the sheet source into index.html at deploy time, so the id never has
 * to be committed to this repository.
 *
 * Reads SHEET_URL from the environment (a GitHub Actions secret). If it is not
 * set, the page is left alone and the board deploys showing demo data.
 *
 * The value is never printed: Actions masks secrets in logs, but there is no
 * reason to push our luck.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "index.html";
const TAG = /(<meta name="crimewathch:sheet" content=")[^"]*(">)/;

const url = (process.env.SHEET_URL ?? "").trim();
if (!url) {
  console.log("SHEET_URL is not set — deploying in demo mode.");
  console.log("Set it under Settings > Secrets and variables > Actions,");
  console.log("or open the deployed board once with ?sheet=<sheet id>.");
  process.exit(0);
}

const html = readFileSync(FILE, "utf8");
if (!TAG.test(html)) {
  console.error(`Could not find the crimewathch:sheet meta tag in ${FILE}.`);
  process.exit(1);
}

// Attribute-escape, and use a replacer function so a '$' in the value can't be
// read as a backreference.
const safe = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
writeFileSync(FILE, html.replace(TAG, (_m, open, close) => open + safe + close));

console.log("Sheet source injected into index.html.");
