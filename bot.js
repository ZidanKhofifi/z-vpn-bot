require("dotenv").config();

const { Telegraf, session, Scenes } = require("telegraf");
const { initDB } = require("./database/db");
const express = require("express");
const crypto = require("crypto");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { restoreDatabase } = require("./services/restore");
const { syncExpiredAccounts } = require("./services/expired");
const { markDepositPaid } = require("./services/deposit");
const { addBalance } = require("./services/balance");
const {
  checkExpiringAccounts
} = require("./services/expiredNotifier");
const { sendDatabaseBackup } = require("./services/backup");
const setResellerScene = require("./scenes/setReseller");
const editServerScene = require("./scenes/editServer");

const addServerScene = require("./scenes/addServer");
const broadcastScene = require("./scenes/broadcast");
const createAccountScene = require("./scenes/createAccount");
const addBalanceScene = require("./scenes/addBalance");
const depositScene = require("./scenes/deposit");
const renewAccountScene = require("./scenes/renewAccount");

const registerStart = require("./handlers/start");
const registerMenu = require("./handlers/menu");
const registerAdmin = require("./handlers/admin");
const registerCallback = require("./handlers/callback");
const registerUserServer = require("./handlers/user/server");
const registerAccount = require("./handlers/user/account");
const registerMyAccounts = require("./handlers/user/myAccounts");
const registerHistory =
require("./handlers/user/history");
const registerTrial = require("./handlers/user/trial");


if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN belum diisi di .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

 bot.telegram.setMyCommands([
  {
    command: "start",
    description: "Mulai bot"
  }
]);

 bot.telegram.setMyCommands(
  [
    {
      command: "start",
      description: "Mulai bot"
    },
    {
      command: "backupdb",
      description: "Backup database"
    },
    {
      command: "restoredb",
      description: "Restore database"
    },
    {
      command: "cancelrestore",
      description: "Batal restore database"
    }
  ],
  {
    scope: {
      type: "chat",
      chat_id: Number(process.env.ADMIN_ID)
    }
  }
);

const stage = new Scenes.Stage([
  addServerScene,
  createAccountScene,
  addBalanceScene,
  renewAccountScene,
  depositScene,
  setResellerScene,
  editServerScene,
  broadcastScene
]);

bot.use(session());
bot.use(stage.middleware());



registerStart(bot);
registerMenu(bot);
registerAdmin(bot);
registerCallback(bot);
registerUserServer(bot);
registerAccount(bot);
registerMyAccounts(bot);
registerHistory(bot);
registerTrial(bot);

function startWebhookServer(bot) {
  const app = express();

  app.post(
    "/webhook/autogopay",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const signature = req.headers["x-signature"];
        const rawBody = req.body.toString();

        const expected = crypto
          .createHmac("sha256", process.env.PAYMENT_API_KEY)
          .update(rawBody)
          .digest("hex");

        if (signature !== expected) {
          return res.status(401).json({
            success: false,
            message: "Invalid signature"
          });
        }

        const body = JSON.parse(rawBody);

console.log("=== AUTOGOPAY WEBHOOK MASUK ===");
console.log("BODY:", body);

if (body.event !== "transaction.received") {
  console.log("EVENT DILEWATI:", body.event);
  return res.json({ success: true });
}

const tx = body.transaction;

const transactionId =
  tx.id ||
  tx.transaction_id;

const status = String(tx.status || "").toLowerCase();

console.log("TX ID:", transactionId);
console.log("STATUS:", tx.status);
console.log("AMOUNT:", tx.amount);

if (!["settlement", "paid"].includes(status)) {
  return res.json({ success: true });
}

const paid = markDepositPaid(transactionId);

        if (paid.success && paid.deposit.qris_message_id) {
  await bot.telegram.deleteMessage(
    paid.deposit.telegram_id,
    paid.deposit.qris_message_id
  ).catch(() => {});
        }

        console.log("MARK RESULT:", paid);

        if (!paid.success) {
          return res.json({
            success: true,
            message: paid.message
          });
        }

        console.log("Menambah saldo ke:", paid.deposit.telegram_id);

        addBalance(
          paid.deposit.telegram_id,
          Number(paid.deposit.amount),
          `Deposit QRIS ${transactionId}`
        );

        await bot.telegram.sendMessage(
          paid.deposit.telegram_id,
`✅ DEPOSIT BERHASIL

Nominal : Rp${Number(paid.deposit.amount).toLocaleString("id-ID")}

Saldo sudah masuk.`
        ).catch(() => {});

        return res.json({ success: true });
      } catch (err) {
        console.error("WEBHOOK ERROR:", err);
        return res.status(500).json({
          success: false,
          message: "Webhook error"
        });
      }
    }
  );

  const port = Number(process.env.WEBHOOK_PORT || 3000);

  app.listen(port, () => {
    console.log(`Webhook server running on port ${port}`);
  });
}

let waitingRestore = false;

(async () => {
  await initDB();

  bot.command("backupdb", async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_ID)) {
    return;
  }

  await ctx.reply("⏳ Mengirim backup database...");
  await sendDatabaseBackup(bot);
});

  bot.command("restoredb", async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_ID)) {
    return;
  }

  waitingRestore = true;

  await ctx.reply(
`📦 Kirim file backup .sqlite untuk restore database.

Ketik /cancelrestore untuk membatalkan.`
);
});

  bot.command("cancelrestore", async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_ID)) {
    return;
  }

  waitingRestore = false;

  await ctx.reply(
    "❌ Restore database dibatalkan."
  );
});



  bot.on("document", async (ctx) => {

  if (!waitingRestore) return;

  if (
    String(ctx.from.id) !==
    String(process.env.ADMIN_ID)
  ) {
    return;
  }

  try {

    const fileId =
      ctx.message.document.file_id;

    const link =
      await ctx.telegram.getFileLink(fileId);

    const tempFile =
      path.join(
        __dirname,
        "restore.sqlite"
      );

    const response =
      await fetch(link.href);

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    fs.writeFileSync(
      tempFile,
      buffer
    );

    restoreDatabase(tempFile);

    waitingRestore = false;

    await ctx.reply(
`✅ Database berhasil direstore.

♻️ Bot akan restart otomatis...`
);

setTimeout(() => {
  exec("pm2 restart all");
}, 2000);

  } catch (err) {

    waitingRestore = false;

    await ctx.reply(
      `❌ Restore gagal\n\n${err.message}`
    );
  }

});

  const syncResult = syncExpiredAccounts();
  console.log(
    `Expired sync awal: checked ${syncResult.checked}, updated ${syncResult.updated}`
  );

  cron.schedule("*/30 * * * *", () => {
    const result = syncExpiredAccounts();

    console.log(
      `Expired sync: checked ${result.checked}, updated ${result.updated}`
    );
  });

  cron.schedule("0 */6 * * *", async () => {
  await checkExpiringAccounts(bot);
});

  cron.schedule("0 0 * * *", async () => {
  await sendDatabaseBackup(bot);
});

  bot.catch((err, ctx) => {
    console.error("BOT ERROR:", err);
  });

  startWebhookServer(bot);

  await bot.launch();

  console.log("Bot Online");
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));