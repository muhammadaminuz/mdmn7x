import "dotenv/config";
import fs from "fs";
import path from "path";

export interface Question {
  id: string;
  section: string;
  label: string; // анкета ва хулосадаги қисқа номи
  text: string; // ботда бериладиган савол
  type: "text" | "number" | "phone" | "choice";
  options?: string[];
  optional?: boolean;
  show_if?: Record<string, string[]>; // фақат олдинги жавоб шу қийматлардан бири бўлса сўралади
}

export interface Vacancy {
  id: string;
  title: string;
  requirements: string;
  questions: Question[];
}

export interface VacanciesFile {
  company: string;
  about: string;
  common_questions: Question[];
  final_questions: Question[];
  file_mode_questions: string[];
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
  notifyRejected: process.env.NOTIFY_REJECTED !== "false",
  retryMinutes: Math.max(5, Number(process.env.RETRY_MINUTES ?? 60)),
  claudeTimeoutSec: Math.max(30, Number(process.env.CLAUDE_TIMEOUT_SEC ?? 180)),
  claudeBin: process.env.CLAUDE_BIN || "claude",
  dataDir: process.env.DATA_DIR || path.join(ROOT, "data"),
  vacanciesFile: process.env.VACANCIES_FILE || path.join(ROOT, "vacancies.json"),
};

export function loadVacancies(): VacanciesFile {
  return JSON.parse(fs.readFileSync(config.vacanciesFile, "utf8"));
}

/** Лавозим учун барча саволлар тартиб билан: умумий → лавозимга хос → якуний. */
export function questionsFor(file: VacanciesFile, vacancy: Vacancy): Question[] {
  return [...file.common_questions, ...vacancy.questions, ...file.final_questions];
}

export function isVisible(q: Question, answers: Record<string, string>): boolean {
  if (!q.show_if) return true;
  return Object.entries(q.show_if).every(([id, values]) => values.includes(answers[id]));
}
