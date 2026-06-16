const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(
  __dirname,
  "../data/database.sqlite"
);

async function sendDatabaseBackup(bot) {
  if (!process.env.ADMIN_ID) {
    console.log("ADMIN_ID belum diisi.");
    return;
  }

  if (!fs.existsSync(DB_FILE)) {
    console.log("Database tidak ditemukan.");
    return;
  }

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  await bot.telegram.sendDocument(
    process.env.ADMIN_ID,
    {
      source: DB_FILE,
      filename: `backup-${date}.sqlite`
    },
    {
      caption:
`📦 BACKUP DATABASE

File: database.sqlite
Waktu: ${new Date().toLocaleString("id-ID")}`
    }
  );
}

module.exports = {
  sendDatabaseBackup
};