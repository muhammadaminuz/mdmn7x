import fs from "fs";
import path from "path";
import { config } from "./config";
import type { Analysis } from "./claude";

export interface CandidateRecord {
  id: string;
  telegramId: number;
  username?: string;
  name: string;
  phone: string;
  vacancyId: string;
  vacancyTitle: string;
  resumeFile?: string;
  createdAt: string;
  status: "pending" | "analyzed" | "error";
  analysis?: Analysis;
  error?: string;
}

const DB_FILE = path.join(config.dataDir, "candidates.json");

fs.mkdirSync(config.dataDir, { recursive: true });

function readAll(): CandidateRecord[] {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeAll(records: CandidateRecord[]) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function saveCandidate(record: CandidateRecord) {
  const all = readAll();
  const i = all.findIndex((r) => r.id === record.id);
  if (i >= 0) all[i] = record;
  else all.push(record);
  writeAll(all);
}

export function listCandidates(): CandidateRecord[] {
  return readAll();
}

export function getCandidate(id: string): CandidateRecord | undefined {
  return readAll().find((r) => r.id === id);
}

export function candidateDir(id: string): string {
  const dir = path.join(config.dataDir, "resumes", id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
