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

function parseExpenseWithRules(text: string): ParsedExpense | null {
  const amountMatch = text.replace(/\s/g, "").match(/\d{3,}/);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[0]);
  const category = text.replace(amountMatch[0], "").trim().replace(/^[-,:.\s]+/, "") || "Boshqa";

  return { amount, category, date: new Date() };
}
