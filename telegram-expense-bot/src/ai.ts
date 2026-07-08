import Anthropic from "@anthropic-ai/sdk";
import { ParsedExpense } from "./types";

const MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

const SYSTEM_PROMPT = `Sen distribyutsiya (ulgurji savdo) kompaniyasi uchun xarajatlarni yozib boruvchi yordamchisan.
Foydalanuvchi o'zbek yoki rus tilida erkin matn shaklida xarajat haqida yozadi.
Matndan quyidagilarni ajratib ol:
- amount: xarajat summasi so'mda, faqat butun son (masalan 50000)
- category: xarajat turi, qisqa va aniq (masalan: "Yoqilg'i", "Ta'mirlash", "Ijara", "Maosh", "Ofis xarajatlari", "Boshqa")
- date: agar matnda aniq sana ko'rsatilgan bo'lsa "YYYY-MM-DD" formatida, aks holda null

Faqat quyidagi JSON formatida javob ber, boshqa hech narsa yozma:
{"amount": <son>, "category": "<matn>", "date": "<YYYY-MM-DD yoki null>"}

Agar matnda summa umuman topilmasa, {"amount": null} qaytar.`;

export async function parseExpenseWithAI(text: string): Promise<ParsedExpense | null> {
  const anthropic = getClient();
  if (!anthropic) return parseExpenseWithRules(text);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return parseExpenseWithRules(text);

    const parsed = JSON.parse(extractJson(block.text));
    if (!parsed.amount || Number(parsed.amount) <= 0) return null;

    return {
      amount: Number(parsed.amount),
      category: String(parsed.category ?? "Boshqa").trim() || "Boshqa",
      date: parsed.date ? new Date(parsed.date) : new Date(),
    };
  } catch (err) {
    console.error("AI parsing xatosi, oddiy usulga o'tildi:", err);
    return parseExpenseWithRules(text);
  }
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
