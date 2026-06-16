const { getDB, saveDB } = require("../database/db");

const moment = require("moment-timezone");

function getTodayDate() {
  return moment()
    .tz("Asia/Jakarta")
    .format("YYYY-MM-DD");
}

function hasTrialToday(telegramId) {
  const db = getDB();
  const today = getTodayDate();

  const result = db.exec(`
    SELECT id
    FROM trial_logs
    WHERE telegram_id = '${telegramId}'
      AND created_date = '${today}'
    LIMIT 1
  `);

  return result.length > 0;
}

function saveTrialLog(data) {
  const db = getDB();

  db.run(
    `
    INSERT INTO trial_logs (
      telegram_id,
      protocol,
      server_code,
      username,
      created_date
    )
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      String(data.telegram_id),
      data.protocol,
      data.server_code,
      data.username,
      getTodayDate()
    ]
  );

  saveDB();
}

module.exports = {
  hasTrialToday,
  saveTrialLog
};