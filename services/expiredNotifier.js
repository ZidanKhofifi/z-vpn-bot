const { getAllAccounts } = require("./account");
const {
  hasNotification,
  saveNotification
} = require("./notification");

function getRemainingDays(expiredAt) {
  const today = new Date();
  const expired = new Date(`${expiredAt}T23:59:59`);

  return Math.ceil(
    (expired - today) /
    (1000 * 60 * 60 * 24)
  );
}

async function checkExpiringAccounts(bot) {

  const accounts = getAllAccounts();

  for (const account of accounts) {

    if (
      account.status !== "active" &&
      account.status !== "locked"
    ) {
      continue;
    }

    const remaining = getRemainingDays(
      account.expired_at
    );

    let notifType = null;

    if (remaining <= 1) {
      notifType = "H1";
    } else if (remaining <= 3) {
      notifType = "H3";
    }

    if (!notifType) {
      continue;
    }

    if (
      hasNotification(
        account.telegram_id,
        account.username,
        notifType
      )
    ) {
      continue;
    }

    await bot.telegram.sendMessage(
      account.telegram_id,
`⚠️ AKUN AKAN EXPIRED

👤 Username : ${account.username}
📡 Protocol : ${account.protocol.toUpperCase()}
📅 Expired  : ${account.expired_text || account.expired_at}

Sisa masa aktif ${remaining} hari.

Silakan lakukan renew sebelum akun expired.`
    ).catch(() => {});

    saveNotification(
      account.telegram_id,
      account.username,
      notifType
    );
  }
}

module.exports = {
  checkExpiringAccounts
};