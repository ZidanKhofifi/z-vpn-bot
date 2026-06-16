const axios = require("axios");

function baseUrl(url) {
  return url.replace(/\/$/, "");
}

function headers(server) {
  return {
    headers: {
      "x-api-key": server.api_key,
      "Content-Type": "application/json"
    },
    timeout: 90000
  };
}

async function createAccount(server, protocol, payload) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/${protocol}/create`,
    payload,
    headers(server)
  );

  return res.data;
}

async function renewAccount(server, protocol, payload) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/${protocol}/renew`,
    payload,
    headers(server)
  );

  return res.data;
}

async function deleteVpnAccount(server, protocol, payload) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/${protocol}/delete`,
    payload,
    headers(server)
  );

  return res.data;
}

async function trialAccount(server, protocol) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/${protocol}/trial`,
    {
      minutes: 60
    },
    headers(server)
  );

  return res.data;
}

async function lockAccount(server, username) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/ssh/lock`,
    {
      username
    },
    headers(server)
  );

  return res.data;
}

async function unlockAccount(server, username) {
  const res = await axios.post(
    `${baseUrl(server.api_url)}/ssh/unlock`,
    {
      username
    },
    headers(server)
  );

  return res.data;
}

async function getSshMember(server) {
  const res = await axios.get(
    `${baseUrl(server.api_url)}/ssh/member`,
    headers(server)
  );

  return res.data;
}

async function getSshOnline(server) {
  const res = await axios.get(
    `${baseUrl(server.api_url)}/ssh/online`,
    headers(server)
  );

  return res.data;
}

async function getSshLimit(server) {
  const res = await axios.get(
    `${baseUrl(server.api_url)}/ssh/limit`,
    headers(server)
  );

  return res.data;
}

async function getXrayMember(server) {
  const res = await axios.get(
    `${baseUrl(server.api_url)}/xray/member`,
    headers(server)
  );

  return res.data;
}

async function getXrayOnline(server) {
  const res = await axios.get(
    `${baseUrl(server.api_url)}/xray/online`,
    headers(server)
  );

  return res.data;
}

module.exports = {
  createAccount,
  renewAccount,
  deleteVpnAccount,
  trialAccount,
  lockAccount,
  unlockAccount,

  getSshMember,
  getSshOnline,
  getSshLimit,
  getXrayMember,
  getXrayOnline
};