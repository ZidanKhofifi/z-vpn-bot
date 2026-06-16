const { getDB, saveDB } = require("../database/db");

function hasNotification(
  telegramId,
  username,
  type
) {
  const db = getDB();

  const result = db.exec(`
    SELECT *
    FROM notifications
    WHERE telegram_id='${telegramId}'
      AND username='${username}'
      AND type='${type}'
    LIMIT 1
  `);

  return result.length > 0;
}

function saveNotification(
  telegramId,
  username,
  type
) {
  const db = getDB();

  db.run(
    `
    INSERT INTO notifications
    (telegram_id, username, type)
    VALUES (?, ?, ?)
  `,
    [telegramId, username, type]
  );

  saveDB();
}

module.exports = {
  hasNotification,
  saveNotification
};