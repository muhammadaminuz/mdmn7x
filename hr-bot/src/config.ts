import "dotenv/config";
import fs from "fs";
import path from "path";

export interface Vacancy {
  id: string;
  title: string;
  requirements: string;
}

export interface VacanciesFile {
  company: string;
  about: string;
  vacancies: Vacancy[];
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ ${name} muhit o'zgaruvchisi o'rnatilmagan (.env faylini tekshiring)`);
    process.exit(1);
  }
  return value;
}

const ROOT = path.resolve(__dirname, "..");

export const config = {
  botToken: required("BOT_TOKEN"),
  adminChatIds: required("ADMIN_CHAT_IDS")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !Number.isNaN(id)),
  oauthToken: required("CLAUDE_CODE_OAUTH_TOKEN"),
  minScore: Number(process.env.MIN_SCORE ?? 70),
  model: process.env.CLAUDE_MODEL || "sonnet",
  concurrency: Math.max(1, Number(process.env.ANALYSIS_CONCURRENCY ?? 1)),
  notifyRejected: process.env.NOTIFY_REJECTED === "true",
  claudeBin: process.env.CLAUDE_BIN || "claude",
  dataDir: process.env.DATA_DIR || path.join(ROOT, "data"),
  vacanciesFile: process.env.VACANCIES_FILE || path.join(ROOT, "vacancies.json"),
};

export function loadVacancies(): VacanciesFile {
  return JSON.parse(fs.readFileSync(config.vacanciesFile, "utf8"));
}
