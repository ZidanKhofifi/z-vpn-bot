const axios = require("axios");
const { getDB, saveDB } = require("../database/db");

async function getServerInfo(apiUrl, apiKey) {
  const url = `${apiUrl.replace(/\/$/, "")}/server/info`;

  const res = await axios.get(url, {
    headers: {
      "x-api-key": apiKey
    },
    timeout: 15000
  });

  return res.data;
}

function saveServer(data) {
  const db = getDB();

  db.run(
    `
    INSERT INTO servers (
      code,
      name,
      api_url,
      api_key,
      domain,
      ip,
      isp,
      city,
      quota,
      ip_limit,
      price,
      max_accounts
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      data.code,
      data.name,
      data.api_url,
      data.api_key,
      data.domain,
      data.ip,
      data.isp,
      data.city,
      data.quota,
      data.ip_limit,
      data.price,
      data.max_accounts
    ]
  );

  saveDB();
}

function getServers() {
  const db = getDB();

  const result = db.exec(`
    SELECT * FROM servers
    ORDER BY name ASC
  `);

  if (!result.length) return [];

  const rows = result[0];

  return rows.values.map(row =>
    Object.fromEntries(
      rows.columns.map((col, i) => [col, row[i]])
    )
  );
}

function getServerByCode(code) {
  const db = getDB();

  const result = db.exec(
    `SELECT * FROM servers WHERE code = '${code}' LIMIT 1`
  );

  if (!result.length) return null;

  const row = result[0];

  return Object.fromEntries(
    row.columns.map((col, i) => [col, row.values[0][i]])
  );
}

async function getServerStatus(apiUrl, apiKey) {
  const url = `${apiUrl.replace(/\/$/, "")}/server/status`;

  const res = await axios.get(url, {
    headers: {
      "x-api-key": apiKey
    },
    timeout: 15000
  });

  return res.data;
}

function deleteServer(code) {
  const db = getDB();

  db.run(
    `
    DELETE FROM servers
    WHERE code = ?
  `,
    [code]
  );

  saveDB();
}

function updateServerField(code, field, value) {
  const allowedFields = [
    "name",
    "api_url",
    "api_key",
    "domain",
    "ip",
    "isp",
    "city",
    "quota",
    "ip_limit",
    "price",
    "max_accounts"
  ];

  if (!allowedFields.includes(field)) {
    throw new Error("Field tidak valid");
  }

  const db = getDB();

  db.run(
    `
    UPDATE servers
    SET ${field} = ?
    WHERE code = ?
  `,
    [value, code]
  );

  saveDB();
}

module.exports = {
  getServerInfo,
  saveServer,
  getServers,
  getServerByCode,
  getServerStatus,
  deleteServer,
  updateServerField
};