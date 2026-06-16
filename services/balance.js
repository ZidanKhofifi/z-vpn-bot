const { getDB, saveDB } = require("../database/db");

function getBalance(telegramId) {
  const db = getDB();

  const result = db.exec(`
    SELECT balance FROM users
    WHERE telegram_id = '${telegramId}'
    LIMIT 1
  `);

  if (!result.length) return 0;

  return Number(result[0].values[0][0] || 0);
}

function addBalance(telegramId, amount, note = "") {
  const db = getDB();

  db.run(
    `
    UPDATE users
    SET balance = balance + ?
    WHERE telegram_id = ?
  `,
    [Number(amount), String(telegramId)]
  );

  db.run(
    `
    INSERT INTO transactions
    (telegram_id, type, amount, status, note)
    VALUES (?, ?, ?, ?, ?)
  `,
    [String(telegramId), "credit", Number(amount), "success", note]
  );

  saveDB();
}

function reduceBalance(telegramId, amount, note = "") {
  const current = getBalance(telegramId);

  if (current < Number(amount)) {
    return {
      success: false,
      message: "Saldo tidak cukup",
      balance: current
    };
  }

  const db = getDB();

  db.run(
    `
    UPDATE users
    SET balance = balance - ?
    WHERE telegram_id = ?
  `,
    [Number(amount), String(telegramId)]
  );

  db.run(
    `
    INSERT INTO transactions
    (telegram_id, type, amount, status, note)
    VALUES (?, ?, ?, ?, ?)
  `,
    [String(telegramId), "debit", Number(amount), "success", note]
  );

  saveDB();

  return {
    success: true,
    balance: current - Number(amount)
  };
}

module.exports = {
  getBalance,
  addBalance,
  reduceBalance
};