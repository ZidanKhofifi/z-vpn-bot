const { getDB } = require("../database/db");

function rowsToObjects(result) {
  if (!result.length) return [];

  const rows = result[0];

  return rows.values.map((row) =>
    Object.fromEntries(
      rows.columns.map((col, i) => [col, row[i]])
    )
  );
}

function getTransactionsByUser(telegramId, limit = 20) {
  const db = getDB();

  const result = db.exec(`
    SELECT *
    FROM transactions
    WHERE telegram_id = '${telegramId}'
    ORDER BY id DESC
    LIMIT ${limit}
  `);

  return rowsToObjects(result);
}

function getTransactionStats() {
  const db = getDB();

  const result = db.exec(`
    SELECT
      type,
      SUM(amount) as total
    FROM transactions
    GROUP BY type
  `);

  const rows = rowsToObjects(result);

  let credit = 0;
  let debit = 0;

  for (const row of rows) {
    if (row.type === "credit") {
      credit = Number(row.total || 0);
    }

    if (row.type === "debit") {
      debit = Number(row.total || 0);
    }
  }

  return {
    credit,
    debit
  };
}

module.exports = {
  getTransactionsByUser,
  getTransactionStats
};