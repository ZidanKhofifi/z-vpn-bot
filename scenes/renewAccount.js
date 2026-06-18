const { Scenes, Markup } = require("telegraf");

const { getUser } = require("../services/user");

const {
  getAccountById,
  updateAccountExpiry
} = require("../services/account");

const {
  getServerByCode
} = require("../services/server");

const {
  renewAccount
} = require("../services/vpn");

const {
  getBalance,
  reduceBalance,
  addBalance
} = require("../services/balance");

const {
  sendTopicNotification
} = require("../services/notification");

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

module.exports = new Scenes.WizardScene(
  "renew-account",

  async (ctx) => {
    const accountId = ctx.scene.state.accountId;

    const account = getAccountById(accountId);

    if (!account) {
      await ctx.reply("❌ Akun tidak ditemukan.");
      return ctx.scene.leave();
    }

    ctx.wizard.state.account = account;

    await ctx.reply(
`♻️ RENEW AKUN

Protocol : ${account.protocol.toUpperCase()}
Username : ${account.username}
Expired  : ${account.expired_text || account.expired_at}

Masukkan jumlah hari renew:

Contoh:
30`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message?.text;

    if (!text) return;

    const days = Number(text);

    if (!days || days < 1) {
      return ctx.reply("❌ Durasi harus angka minimal 1.");
    }

    const account = ctx.wizard.state.account;

    const server = getServerByCode(
      account.server_code
    );

    if (!server) {
      await ctx.reply("❌ Server tidak ditemukan.");
      return ctx.scene.leave();
    }

    const user = getUser(String(ctx.from.id));

const normalPrice = Math.ceil(
  Number(server.price) / 30 * days
);

const price =
  user.role === "reseller"
    ? Math.ceil(normalPrice / 2)
    : normalPrice;

ctx.wizard.state.days = days;
ctx.wizard.state.price = price;
ctx.wizard.state.normalPrice = normalPrice;
ctx.wizard.state.userRole = user.role;

    await ctx.reply(
`🧾 KONFIRMASI RENEW

Protocol : ${account.protocol.toUpperCase()}
Username : ${account.username}

Tambah   : ${days} hari

Saldo    : Rp${formatRupiah(
        getBalance(String(ctx.from.id))
      )}

${user.role === "reseller" ? `Harga Normal : Rp${formatRupiah(normalPrice)}
Diskon Reseller : 50%
` : ""}Harga    : Rp${formatRupiah(price)}

Lanjut renew?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Renew Sekarang",
            "confirm_renew"
          )
        ],
        [
          Markup.button.callback(
            "❌ Batal",
            "home"
          )
        ]
      ])
    );

    return ctx.wizard.next();
  },

  async (ctx) => {

    if (!ctx.callbackQuery) {
      return;
    }

    if (ctx.callbackQuery.data === "home") {
      await ctx.answerCbQuery();
      await ctx.scene.leave();

      return ctx.editMessageText(
        "❌ Renew dibatalkan."
      );
    }

    if (
      ctx.callbackQuery.data !==
      "confirm_renew"
    ) {
      return;
    }

    await ctx.answerCbQuery();

    const account =
      ctx.wizard.state.account;

    const days =
      ctx.wizard.state.days;

    const price =
      ctx.wizard.state.price;

    const server =
      getServerByCode(
        account.server_code
      );

    const pay = reduceBalance(
      String(ctx.from.id),
      price,
      `Renew ${account.protocol.toUpperCase()} ${account.username}`
    );

    if (!pay.success) {
      await ctx.editMessageText(
`❌ Saldo tidak cukup

Saldo : Rp${formatRupiah(pay.balance)}
Harga : Rp${formatRupiah(price)}`
      );

      return ctx.scene.leave();
    }

    try {

      await ctx.editMessageText(
        "⏳ Memproses renew akun..."
      );

      let payload;

      if (
        account.protocol === "ssh"
      ) {

        payload = {
          username: account.username,
          days
        };

      } else {

        payload = {
          username: account.username,
          days,
          quota_gb: Number(
            server.quota
          ),
          ip_limit: Number(
            server.ip_limit
          )
        };

      }

      const response =
        await renewAccount(
          server,
          account.protocol,
          payload
        );

      if (
        response.status !== "success"
      ) {
        throw new Error(
          response.message ||
          response.raw ||
          "Renew gagal"
        );
      }

      updateAccountExpiry(
        account.username,
        response.expired_date || "",
        response.expired_text || ""
      );

      await sendTopicNotification(
  ctx,
`🔄 <b>RENEW ACCOUNT</b>

<blockquote>
👤 User       : ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}
📡 Protocol   : ${account.protocol.toUpperCase()}
👤 Username   : ${account.username}
📅 Tambah     : ${days} Hari
📆 Expired    : ${response.expired_text || response.expired_date}
🌐 Server     : ${server.name}
💰 Harga      : Rp${formatRupiah(price)}
</blockquote>

🎉 Akun berhasil diperpanjang.`
);

      await ctx.editMessageText(
`✅ RENEW BERHASIL

👤 Username : ${account.username}
📡 Protocol : ${account.protocol.toUpperCase()}
📅 Expired  : ${
          response.expired_text ||
          response.expired_date
        }`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "📦 Akun Saya",
              "akun_saya"
            )
          ],
          [
            Markup.button.callback(
              "🏠 Home",
              "home"
            )
          ]
        ])
      );

    } catch (err) {

      addBalance(
        String(ctx.from.id),
        price,
        `Refund renew ${account.username}`
      );

      await ctx.editMessageText(
`❌ Renew gagal

${err.message}`
      );

    }

    return ctx.scene.leave();
  }
);