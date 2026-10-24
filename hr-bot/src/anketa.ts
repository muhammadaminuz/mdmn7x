import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { Question, VacanciesFile, Vacancy, questionsFor } from "./config";

/**
 * Лавозим учун ариза-анкета (DOCX) яратади.
 * answers берилмаса — тўлдириш учун бўш бланка, берилса — номзод маълумотлари билан тўлдирилган анкета.
 */
export async function buildAnketa(
  file: VacanciesFile,
  vacancy: Vacancy,
  answers?: Record<string, string>,
  meta?: { score?: number; date?: string },
): Promise<Buffer> {
  const filled = !!answers;
  const questions = questionsFor(file, vacancy);

  // Бўлимлар бўйича гуруҳлаш ("1. ...", "2. ..." тартибида)
  const sections = new Map<string, Question[]>();
  for (const q of [...questions].sort((a, b) => a.section.localeCompare(b.section, "ru", { numeric: true }))) {
    if (!sections.has(q.section)) sections.set(q.section, []);
    sections.get(q.section)!.push(q);
  }

  const universal = vacancy.id === "other";
  const title = universal
    ? "ИШГА ҚАБУЛ ҚИЛИШ УЧУН АРИЗА-АНКЕТА"
    : `${vacancy.title.toUpperCase()} ЛАВОЗИМИ УЧУН АРИЗА-АНКЕТА`;

  const children: (Paragraph | Table)[] = [
    center(`«${file.company}»`, 32, true),
    center(file.about, 20),
    new Paragraph({ text: "" }),
    center(title, 26, true),
    new Paragraph({ text: "" }),
  ];

  if (filled && meta?.score !== undefined) {
    children.push(center(`AI баҳоси: ${meta.score}/100   •   Сана: ${meta.date ?? ""}`, 18, false, "666666"));
    children.push(new Paragraph({ text: "" }));
  }

  for (const [section, qs] of sections) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        shading: { type: ShadingType.CLEAR, fill: "1F4E79", color: "auto" },
        children: [new TextRun({ text: `  ${section}`, bold: true, color: "FFFFFF", size: 22 })],
      }),
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: qs.map(
          (q) =>
            new TableRow({
              children: [
                cell(q.label + (q.show_if && !filled ? " *" : ""), 35, true),
                cell(filled ? answerText(q, answers![q.id]) : blankText(q), 65),
              ],
            }),
        ),
      }),
    );
  }

  if (!filled && questions.some((q) => q.show_if)) {
    children.push(small("* — фақат тегишли бўлса тўлдирилади"));
  }

  children.push(
    new Paragraph({ text: "", spacing: { before: 300 } }),
    new Paragraph({ children: [new TextRun({ text: "Юқорида кўрсатилган маълумотларнинг тўғрилигини тасдиқлайман.", size: 20 })] }),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `Сана: ${filled ? meta?.date ?? "" : "______________________"}        Имзо: ______________________`, size: 20 })] }),
    new Paragraph({ text: "", spacing: { before: 300 } }),
    small("Қуйидаги қисм ташкилот ходими томонидан тўлдирилади"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Суҳбат натижаси", 35, true), cell("☐ Маъқулланди     ☐ Рад этилди", 65)] }),
        new TableRow({ children: [cell("Масъул ходим", 35, true), cell("", 65)] }),
        new TableRow({ children: [cell("Сана", 35, true), cell("", 65)] }),
        new TableRow({ children: [cell("Изоҳ", 35, true), cell("\n\n", 65)] }),
      ],
    }),
  );

  const doc = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 800, bottom: 800, left: 900, right: 900 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

function blankText(q: Question): string {
  if (q.type === "choice" && q.options) return q.options.map((o) => `☐ ${o}`).join("     ");
  return "\n";
}

function answerText(q: Question, value?: string): string {
  if (!value) return "—";
  if (q.type === "choice" && q.options?.includes(value)) {
    return q.options.map((o) => `${o === value ? "☑" : "☐"} ${o}`).join("     ");
  }
  return value;
}

function center(text: string, size: number, bold = false, color?: string) {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size, bold, color })] });
}

function small(text: string) {
  return new Paragraph({ children: [new TextRun({ text, size: 18, italics: true, color: "666666" })] });
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" };

function cell(text: string, widthPct: number, bold = false) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    shading: bold ? { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: text.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, bold, size: 20 })] })),
  });
}
