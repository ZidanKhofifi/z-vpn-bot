const { getDB, saveDB } = require("../database/db");

function rowsToObjects(result) {
  if (!result.length) return [];

  const rows = result[0];

  return rows.values.map((row) =>
    Object.fromEntries(
      rows.columns.map((col, i) => [col, row[i]])
    )
  );
}

function getAccountsByUser(telegramId) {
  const db = getDB();

  const result = db.exec(`
    SELECT
      accounts.*,
      servers.name AS server_name
    FROM accounts
    LEFT JOIN servers
      ON servers.code = accounts.server_code
    WHERE accounts.telegram_id = '${telegramId}'
    ORDER BY accounts.id DESC
  `);

  return rowsToObjects(result);
}

function getAccountById(id) {
  const db = getDB();

  const result = db.exec(`
    SELECT
      accounts.*,
      servers.name AS server_name,
      servers.domain AS server_domain
    FROM accounts
    LEFT JOIN servers
      ON servers.code = accounts.server_code
    WHERE accounts.id = ${Number(id)}
    LIMIT 1
  `);

  const rows = rowsToObjects(result);
  return rows[0] || null;
}

function getAccountByUsername(username) {
  const db = getDB();

  const result = db.exec(`
    SELECT *
    FROM accounts
    WHERE username = '${username}'
    LIMIT 1
  `);

  const rows = rowsToObjects(result);
  return rows[0] || null;
}

function saveAccount(data) {
  const db = getDB();

  db.run(
    `
    INSERT INTO accounts (
      telegram_id,
      server_code,
      protocol,
      username,
      password,
      uuid,
      expired_at,
      expired_text,
      config_json,
      status,
      price,
      days
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      data.telegram_id,
      data.server_code,
      data.protocol,
      data.username,
      data.password || "",
      data.uuid || "",
      data.expired_at || "",
      data.expired_text || "",
      JSON.stringify(data.config || {}),
      "active",
      Number(data.price || 0),
      Number(data.days || 0)
    ]
  );

  saveDB();
}

function updateAccountExpiry(username, expiredAt, expiredText) {
  const db = getDB();

  db.run(
    `
    UPDATE accounts
    SET
      expired_at = ?,
      expired_text = ?
    WHERE username = ?
  `,
    [
      expiredAt,
      expiredText,
      username
    ]
  );

  saveDB();
}

function updateAccountStatus(username, status) {
  const db = getDB();

  db.run(
    `
    UPDATE accounts
    SET status = ?
    WHERE username = ?
  `,
    [
      status,
      username
    ]
  );

  saveDB();
}

function deleteAccount(username) {
  const db = getDB();

  db.run(
    `
    DELETE FROM accounts
    WHERE username = ?
  `,
    [username]
  );

  saveDB();
}

function getAllAccounts() {
  const db = getDB();

  const result = db.exec(`
    SELECT
      accounts.*,
      servers.name AS server_name
    FROM accounts
    LEFT JOIN servers
      ON servers.code = accounts.server_code
    ORDER BY accounts.id DESC
  `);

  return rowsToObjects(result);
}

function deleteExpiredAccountsOlderThan(days = 7) {
  const db = getDB();

  db.run(
    `
    DELETE FROM accounts
    WHERE status = 'expired'
      AND expired_at <= date('now', ?)
  `,
    [`-${Number(days)} days`]
  );

  saveDB();
}

module.exports = {
  getAccountsByUser,
  getAccountById,
  getAccountByUsername,
  saveAccount,
  updateAccountExpiry,
  updateAccountStatus,
  deleteAccount,
  getAllAccounts,
  deleteExpiredAccountsOlderThan
};