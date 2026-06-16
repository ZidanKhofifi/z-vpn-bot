const { getDB, saveDB } = require("../database/db");

function createUser(telegramId, username) {
  const db = getDB();

  const role =
    String(telegramId) === process.env.ADMIN_ID
      ? "admin"
      : "user";

  db.run(
    `
    INSERT OR IGNORE INTO users
    (telegram_id, username, role)
    VALUES (?, ?, ?)
  `,
    [telegramId, username, role]
  );

  saveDB();
}

function getUser(telegramId) {
  const db = getDB();

  const result = db.exec(
    `
    SELECT * FROM users
    WHERE telegram_id='${telegramId}'
  `
  );

  if (!result.length) return null;

  const row = result[0];

  return Object.fromEntries(
    row.columns.map((c, i) => [c, row.values[0][i]])
  );
}

function updateUserRole(telegramId, role) {
  const db = getDB();

  db.run(
    `
    UPDATE users
    SET role = ?
    WHERE telegram_id = ?
  `,
    [role, String(telegramId)]
  );

  saveDB();
}

function getAllUsers() {
  const db = getDB();

  const result = db.exec(`
    SELECT *
    FROM users
  `);

  if (!result.length) return [];

  const rows = result[0];

  return rows.values.map(row =>
    Object.fromEntries(
      rows.columns.map((col, i) => [col, row[i]])
    )
  );
}

module.exports = {
  createUser,
  getUser,
  updateUserRole,
  getAllUsers
};