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

function createDeposit(data) {
  const db = getDB();

  db.run(
    `
    INSERT INTO deposits (
      telegram_id,
      transaction_id,
      order_id,
      amount,
      status,
      checkout_url,
      qr_url
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [
      data.telegram_id,
      data.transaction_id,
      data.order_id,
      data.amount,
      data.status || "pending",
      data.checkout_url,
      data.qr_url
    ]
  );

  saveDB();
}

function getDepositByTransactionId(transactionId) {
  const db = getDB();

  const result = db.exec(`
    SELECT *
    FROM deposits
    WHERE transaction_id = '${transactionId}'
    LIMIT 1
  `);

  const rows = rowsToObjects(result);

  return rows[0] || null;
}

function updateDepositStatus(
  transactionId,
  status
) {
  const db = getDB();

  db.run(
    `
    UPDATE deposits
    SET status = ?
    WHERE transaction_id = ?
  `,
    [
      status,
      transactionId
    ]
  );

  saveDB();
}

function updateDepositMessageId(transactionId, messageId) {
  const db = getDB();

  db.run(
    `
    UPDATE deposits
    SET qris_message_id = ?
    WHERE transaction_id = ?
  `,
    [
      Number(messageId),
      transactionId
    ]
  );

  saveDB();
}

function markDepositPaid(transactionId) {
  const db = getDB();

  const deposit = getDepositByTransactionId(transactionId);

  if (!deposit) {
    return {
      success: false,
      message: "Deposit tidak ditemukan"
    };
  }

  if (deposit.status === "settlement") {
    return {
      success: false,
      message: "Deposit sudah diproses",
      deposit
    };
  }

  db.run(
    `
    UPDATE deposits
    SET status = ?
    WHERE transaction_id = ?
  `,
    [
      "settlement",
      transactionId
    ]
  );

  saveDB();

  return {
    success: true,
    deposit
  };
}

module.exports = {
  createDeposit,
  getDepositByTransactionId,
  updateDepositStatus,
  updateDepositMessageId,
  markDepositPaid
};