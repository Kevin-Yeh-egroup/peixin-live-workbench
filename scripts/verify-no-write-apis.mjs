import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src", import.meta.url));
const banned = [
  ".setValue(",
  ".setValues(",
  ".appendRow(",
  ".deleteRow(",
  ".deleteRows(",
  ".clear(",
  "MailApp",
  "GmailApp",
  "CalendarApp",
  "UrlFetchApp",
];

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

const findings = [];
for (const file of files(root).filter((name) => /\.(ts|tsx)$/.test(name))) {
  const text = readFileSync(file, "utf8");
  for (const pattern of banned) {
    if (text.includes(pattern)) findings.push(`${file}: ${pattern}`);
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("No banned write/send APIs found in src.");
