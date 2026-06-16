const { Markup } = require("telegraf");
const { getUser } = require("../services/user");
const mainMenu = require("../keyboards/main");
const { checkQrisStatus } = require("../services/payment");
const {
  getDepositByTransactionId,
  updateDepositStatus,
  markDepositPaid
} = require("../services/deposit");
const { cancelQris } = require("../services/payment");
const {
  addBalance,
  getBalance,
  reduceBalance
} = require("../services/balance");
const { updateUserRole } = require("../services/user");

module.exports = (bot) => {

  bot.action("home", async (ctx) => {
  const user = getUser(String(ctx.from.id));

  await ctx.answerCbQuery().catch(() => {});

  const role =
  user.role === "admin"
    ? "🛡️ ADMIN"
    : user.role === "reseller"
      ? "👑 RESELLER"
      : "👤 USER";

const text =
`╭━━━━〔 🚀 Z VPN STORE 〕━━━━╮
┃         Premium VPN Auto Order
╰━━━━━━━━━━━━━━━━━━━━━━╯

👋 Halo, ${ctx.from.first_name || "User"}

╭─〔 ACCOUNT INFO 〕
│ 🆔 ID       : ${ctx.from.id}
│ 🏷️ Role     : ${role}
│ 💰 Saldo    : Rp${Number(user.balance).toLocaleString("id-ID")}
╰────────────────────

╭─〔 LAYANAN 〕
│ 🔐 SSH / OpenVPN
│ 📡 VMESS / VLESS
│ 🧪 Trial 1 Jam
│ ♻️ Renew Otomatis
╰────────────────────

╭─〔 STATUS SISTEM 〕
│ 🟢 Bot Online
│ ⚡ Auto Create Aktif
│ 💳 QRIS Payment Ready
╰────────────────────

Silakan pilih menu di bawah 👇`;

  try {
    await ctx.editMessageText(text, mainMenu(user.role));
  } catch (err) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, mainMenu(user.role));
  }
});

  bot.action("saldo", async (ctx) => {
  const user = getUser(String(ctx.from.id));

  await ctx.answerCbQuery();

  await ctx.editMessageText(
`💰 SALDO ANDA

Rp${Number(user.balance).toLocaleString("id-ID")}

Pilih menu:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➕ Isi Saldo", callback_data: "deposit" }
          ],
          [
            { text: "📜 Riwayat", callback_data: "riwayat" }
          ],
          [
            { text: "🏠 Home", callback_data: "home" }
          ]
        ]
      }
    }
  );
});

  bot.action("deposit", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("deposit");
});

  bot.action(/^deposit_check_(.+)$/, async (ctx) => {
  

  const transactionId = ctx.match[1];

  try {
    const response = await checkQrisStatus(transactionId);

    let status =
      response?.data?.transaction_status ||
      response?.data?.status ||
      "pending";

    status = String(status).toUpperCase();

    // =========================
    // MASIH MENUNGGU PEMBAYARAN
    // =========================
    if (status === "PENDING") {
      return ctx.answerCbQuery(
        "⏳ Pembayaran belum diterima.",
        {
          show_alert: true
        }
      );
    }


    // =========================
    // PEMBAYARAN BERHASIL
    // =========================
    if (
      status === "PAID" ||
      status === "SETTLEMENT"
    ) {

      const paid = markDepositPaid(transactionId);

      if (!paid.success) {
        return ctx.answerCbQuery(
          paid.message,
          {
            show_alert: true
          }
        );
      }

      addBalance(
        paid.deposit.telegram_id,
        Number(paid.deposit.amount),
        `Deposit QRIS ${transactionId}`
      );


      // Hapus QRIS lama
      await ctx.deleteMessage().catch(() => {});


      return ctx.reply(
`✅ DEPOSIT BERHASIL

Nominal : Rp${Number(paid.deposit.amount)
.toLocaleString("id-ID")}

Saldo sudah masuk.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "💰 Cek Saldo",
              "saldo"
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
    }


    // =========================
    // QRIS KADALUWARSA / BATAL
    // =========================
    if (
      status === "CANCEL" ||
      status === "EXPIRED"
    ) {

      updateDepositStatus(
        transactionId,
        "cancel"
      );

      await ctx.deleteMessage().catch(() => {});

      return ctx.reply(
`❌ QRIS SUDAH TIDAK BERLAKU

Status:
${status}

Silakan buat deposit baru.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "➕ Buat Deposit Baru",
              "deposit"
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
    }


    // =========================
    // STATUS TIDAK DIKENAL
    // =========================
    return ctx.answerCbQuery(
      `Status: ${status}`,
      {
        show_alert: true
      }
    );


  } catch (err) {

    return ctx.reply(
`❌ Gagal cek deposit

${err.message}`
    );

  }
});

  bot.action(/^deposit_cancel_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const transactionId = ctx.match[1];

  try {
    const response = await cancelQris(transactionId);

    if (!response.success) {
      throw new Error(response.message || "Gagal membatalkan deposit.");
    }

    updateDepositStatus(transactionId, "cancel");

    await ctx.deleteMessage().catch(() => {});

return ctx.reply(
`❌ DEPOSIT DIBATALKAN

Transaksi:
${transactionId}`,
  Markup.inlineKeyboard([
    [Markup.button.callback("🏠 Home", "home")]
  ])
);
  } catch (err) {
    await ctx.answerCbQuery(err.message, {
      show_alert: true
    });
  }
});

  bot.action("jadi_reseller", async (ctx) => {
  await ctx.answerCbQuery();

  const user = getUser(String(ctx.from.id));

  if (user.role === "reseller" || user.role === "admin") {
    return ctx.editMessageText(
`👑 PANEL RESELLER

Status kamu: ${user.role.toUpperCase()}

Benefit aktif:
✅ Harga akun 50%
✅ Trial unlimited 1 jam
✅ Fitur Lock/Unlock SSH aktif

Silakan buat akun seperti biasa dari menu 🛒 Buat Akun.
Harga akan otomatis dipotong 50%.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Buat Akun", "buat_akun")],
        [Markup.button.callback("🧪 Trial", "trial_akun")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  }

  return ctx.editMessageText(
`👑 PROGRAM RESELLER

Biaya daftar: Rp50.000

Keuntungan:
✅ Harga akun 50%
✅ Trial unlimited 1 jam
✅ Fitur Lock/Unlock SSH
✅ Cocok untuk jualan akun VPN

Status kamu: USER BIASA
Saldo kamu : Rp${Number(user.balance).toLocaleString("id-ID")}

Daftar sekarang?`,
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Daftar Reseller Rp50.000",
        "confirm_reseller"
      )
    ],
    [
      Markup.button.url(
        "📞 Hubungi Admin",
        "https://t.me/iyaabebassdah"
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
});

  bot.action("confirm_reseller", async (ctx) => {
  await ctx.answerCbQuery();

  const telegramId = String(ctx.from.id);
  const user = getUser(telegramId);

  if (
    user.role === "reseller" ||
    user.role === "admin"
  ) {
    return ctx.editMessageText(
      "✅ Kamu sudah reseller.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🏠 Home",
            "home"
          )
        ]
      ])
    );
  }

  const pay = reduceBalance(
    telegramId,
    50000,
    "Daftar Reseller"
  );

  if (!pay.success) {
    return ctx.editMessageText(
`❌ Saldo tidak cukup

Biaya daftar : Rp50.000
Saldo kamu   : Rp${Number(pay.balance).toLocaleString("id-ID")}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "➕ Isi Saldo",
            "deposit"
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
  }

  updateUserRole(
    telegramId,
    "reseller"
  );

  await ctx.editMessageText(
`✅ PENDAFTARAN RESELLER BERHASIL

Saldo terpotong: Rp50.000

Benefit aktif:
✅ Harga akun 50%
✅ Trial unlimited 1 jam
✅ Lock/Unlock SSH

Selamat datang reseller 👑`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "🏠 Home",
          "home"
        )
      ]
    ])
  );
});

  bot.action("customer_service", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
`💬 CUSTOMER SERVICE

Halo ${ctx.from.first_name} 👋

Ada kendala, pertanyaan, atau membutuhkan bantuan?

Tim Customer Service Z VPN STORE siap membantu Anda terkait semua layanan yang tersedia.

🕘 Jam Operasional
09:00 - 23:00 WIB

📌 Saat menghubungi CS, mohon sertakan:
• ID Telegram Anda
• Detail kendala yang dialami
• Screenshot bukti/error (jika diperlukan)

🆔 ID Telegram Anda:
${ctx.from.id}

Terima kasih telah menggunakan layanan Z VPN STORE 🚀`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "💬 Hubungi Customer Service",
          "https://t.me/iyaabebassdah"
        )
      ],
      [
        Markup.button.callback(
          "🏠 Kembali ke Home",
          "home"
        )
      ]
    ])
  );
});

};