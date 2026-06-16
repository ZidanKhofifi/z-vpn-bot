const {
  getAllAccounts,
  updateAccountStatus,
  deleteExpiredAccountsOlderThan
} = require("./account");

function isExpired(expiredAt) {
  if (!expiredAt) return false;

  const expired = new Date(`${expiredAt}T23:59:59`);
  const now = new Date();

  return expired < now;
}

function syncExpiredAccounts() {
  const accounts = getAllAccounts();

  let updated = 0;

  for (const account of accounts) {

    if (
      account.status !== "expired" &&
      isExpired(account.expired_at)
    ) {

      updateAccountStatus(
        account.username,
        "expired"
      );

      updated++;
    }

  }

  deleteExpiredAccountsOlderThan(7);

  return {
    checked: accounts.length,
    updated
  };
}

module.exports = {
  syncExpiredAccounts
};
