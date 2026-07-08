import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedExpense } from "./types";

const ANTHROPIC_MODEL = "claude-haiku-4-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SYSTEM_PROMPT = `Sen distribyutsiya (ulgurji savdo) kompaniyasi uchun xarajatlarni yozib boruvchi yordamchisan.
Foydalanuvchi o'zbek yoki rus tilida erkin matn shaklida xarajat haqida yozadi.
Matndan quyidagilarni ajratib ol:
- amount: xarajat summasi so'mda, faqat butun son (masalan 50000)
- category: xarajat turi, qisqa va aniq (masalan: "Yoqilg'i", "Ta'mirlash", "Ijara", "Maosh", "Ofis xarajatlari", "Boshqa")
- date: agar matnda aniq sana ko'rsatilgan bo'lsa "YYYY-MM-DD" formatida, aks holda null

Faqat quyidagi JSON formatida javob ber, boshqa hech narsa yozma:
{"amount": <son>, "category": "<matn>", "date": "<YYYY-MM-DD yoki null>"}

Agar matnda summa umuman topilmasa, {"amount": null} qaytar.`;

// Provider priority: Gemini (free tier) first, then Anthropic, then a rule-based fallback.
// Switching later just means setting ANTHROPIC_API_KEY (and optionally clearing GEMINI_API_KEY).
export async function parseExpenseWithAI(text: string): Promise<ParsedExpense | null> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await parseWithGemini(text);
    } catch (err) {
      console.error("Gemini xatosi, oddiy usulga o'tildi:", err);
    }
  } else if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await parseWithAnthropic(text);
    } catch (err) {
      console.error("Anthropic xatosi, oddiy usulga o'tildi:", err);
    }
  }
  return parseExpenseWithRules(text);
}

let geminiClient: GoogleGenerativeAI | null = null;

async function parseWithGemini(text: string): Promise<ParsedExpense | null> {
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: SYSTEM_PROMPT });

  const result = await model.generateContent(text);
  const responseText = result.response.text();
  return toParsedExpense(extractJson(responseText));
}

let anthropicClient: Anthropic | null = null;

async function parseWithAnthropic(text: string): Promise<ParsedExpense | null> {
  if (!anthropicClient) anthropicClient = new Anthropic();

  const response = await anthropicClient.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  return toParsedExpense(extractJson(block.text));
}

function toParsedExpense(jsonText: string): ParsedExpense | null {
  const parsed = JSON.parse(jsonText);
  if (!parsed.amount || Number(parsed.amount) <= 0) return null;

  return {
    amount: Number(parsed.amount),
    category: String(parsed.category ?? "Boshqa").trim() || "Boshqa",
    date: parsed.date ? new Date(parsed.date) : new Date(),
  };
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

const UZ_MONTHS: Record<string, number> = {
  yanvar: 0, fevral: 1, mart: 2, aprel: 3, may: 4, iyun: 5,
  iyul: 6, avgust: 7, sentyabr: 8, oktyabr: 9, noyabr: 10, dekabr: 11,
};

function normalizeYear(y: string): number {
  const n = Number(y);
  return n < 100 ? 2000 + n : n;
}

// Pulls an explicit date out of the message (numeric "02.06.2026" or Uzbek "5-iyun"),
// returning the remaining text so the amount search below isn't confused by date digits.
function extractDate(text: string): { date: Date | null; rest: string } {
  const numeric = text.match(/\b(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const year = numeric[3] ? normalizeYear(numeric[3]) : new Date().getFullYear();
      return { date: new Date(Date.UTC(year, month, day)), rest: text.replace(numeric[0], " ") };
    }
  }

  const monthNames = Object.keys(UZ_MONTHS).join("|");
  const dayThenMonth = text.match(new RegExp(`\\b(\\d{1,2})[-\\s]+(${monthNames})\\b`, "i"));
  if (dayThenMonth) {
    const day = Number(dayThenMonth[1]);
    const month = UZ_MONTHS[dayThenMonth[2].toLowerCase()];
    return { date: new Date(Date.UTC(new Date().getFullYear(), month, day)), rest: text.replace(dayThenMonth[0], " ") };
  }

  const monthThenDay = text.match(new RegExp(`\\b(${monthNames})[-\\s]+(\\d{1,2})\\b`, "i"));
  if (monthThenDay) {
    const day = Number(monthThenDay[2]);
    const month = UZ_MONTHS[monthThenDay[1].toLowerCase()];
    return { date: new Date(Date.UTC(new Date().getFullYear(), month, day)), rest: text.replace(monthThenDay[0], " ") };
  }

  return { date: null, rest: text };
}

// Collapses space-grouped thousands ("50 000" -> "50000") without touching unrelated
// digit runs elsewhere in the message.
function mergeThousandGroups(text: string): string {
  return text.replace(/\b\d{1,3}(?:[ ]\d{3})+\b/g, (m) => m.replace(/\s/g, ""));
}

function parseExpenseWithRules(text: string): ParsedExpense | null {
  const { date, rest } = extractDate(text);
  const merged = mergeThousandGroups(rest);

  const amountMatch = merged.match(/\b\d{3,}\b/);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[0]);
  const category =
    merged.replace(amountMatch[0], "").trim().replace(/^[-,:.\s]+|[-,:.\s]+$/g, "") || "Boshqa";

  return { amount, category, date: date ?? new Date() };
}
