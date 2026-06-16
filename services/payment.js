const axios = require("axios");

const BASE_URL = process.env.PAYMENT_BASE_URL;
const API_KEY = process.env.PAYMENT_API_KEY;

function api() {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    timeout: 30000
  });
}

async function generateQris(amount) {
  const res = await api().post("/qris/generate", {
    amount: Number(amount)
  });

  return res.data;
}

async function checkQrisStatus(transactionId) {
  const res = await api().post("/qris/status", {
    transaction_id: transactionId
  });

  return res.data;
}

async function cancelQris(transactionId) {
  const res = await api().post("/qris/cancel", {
    transaction_id: transactionId
  });

  return res.data;
}

module.exports = {
  generateQris,
  checkQrisStatus,
  cancelQris
};

