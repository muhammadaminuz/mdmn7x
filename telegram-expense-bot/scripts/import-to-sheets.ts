import "dotenv/config";
import * as fs from "fs";
import { google } from "googleapis";

async function main() {
  const filePath = process.argv[2];
  const shareEmail = process.argv[3];

  if (!filePath) {
    console.error("Ishlatish: npm run import-sheet -- /path/to/fayl.xlsx [ulashish-uchun-email]");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Fayl topilmadi: ${filePath}`);
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });

  const name = filePath.split("/").pop()!.replace(/\.xlsx$/i, "");

  console.log(`Yuklanmoqda: ${filePath} → Google Sheets ("${name}")...`);
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.spreadsheet" },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: fs.createReadStream(filePath),
    },
    fields: "id,webViewLink",
  });

  const spreadsheetId = created.data.id!;
  console.log(`\n✅ Google Sheets yaratildi (formulalar avtomatik saqlanadi).`);
  console.log(`SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`Havola: ${created.data.webViewLink}`);

  if (shareEmail) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: true,
      requestBody: { type: "user", role: "writer", emailAddress: shareEmail },
    });
    console.log(`\n📧 "${shareEmail}" bilan (Writer huquqi bilan) ulashildi.`);
  } else {
    console.log("\nEslatma: hech kim bilan ulashilmadi. Qo'lda ulashish uchun: npm run import-sheet -- fayl.xlsx sizning@email.com");
  }

  console.log(`\nKeyingi qadam: .env faylida SPREADSHEET_ID=${spreadsheetId} deb yozing.`);
}

main().catch((err) => {
  console.error("Xatolik:", err);
  process.exit(1);
});
