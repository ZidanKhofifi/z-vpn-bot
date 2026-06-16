const { Scenes, Markup } = require("telegraf");
const { generateQris } = require("../services/payment");
const {
  createDeposit,
  updateDepositMessageId
} = require("../services/deposit");


function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

function getText(ctx) {
  return ctx.message?.text?.trim() || null;
}

module.exports = new Scenes.WizardScene(
  "deposit",

  async (ctx) => {
    await ctx.reply(
`➕ ISI SALDO

Masukkan nominal deposit.

Contoh:
10000`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = getText(ctx);

    if (!text) {
      return ctx.reply("❌ Masukkan nominal dalam angka.");
    }

    const amount = Number(text);

    if (!amount || amount < 1000) {
      return ctx.reply("❌ Minimal deposit Rp1.000.");
    }

    await ctx.reply("⏳ Membuat QRIS...");

    try {
      const response = await generateQris(amount);

      if (!response.success) {
        throw new Error(response.message || "Gagal membuat QRIS.");
      }

      const data = response.data;

      createDeposit({
        telegram_id: String(ctx.from.id),
        transaction_id: data.transaction_id,
        order_id: data.order_id,
        amount: data.amount,
        status: data.transaction_status || "pending",
        checkout_url: data.checkout_url,
        qr_url: data.qr_url
      });

      const qrisMessage = await ctx.replyWithPhoto(
  { url: data.qr_url },
  {
    caption:
`✅ QRIS BERHASIL DIBUAT

Nominal : Rp${formatRupiah(data.amount)}
Status  : ${data.transaction_status}
Expired : ${data.expiry_time}

Silakan scan QRIS di atas.`,
    reply_markup: {
  inline_keyboard: [
    [
      Markup.button.callback(
        "🔄 Cek Status",
        `deposit_check_${data.transaction_id}`
      )
    ],
    [
      Markup.button.callback(
        "❌ Batalkan",
        `deposit_cancel_${data.transaction_id}`
      )
    ]
  ]
}
  }
);

      updateDepositMessageId(
  data.transaction_id,
  qrisMessage.message_id
);

      return ctx.scene.leave();
    } catch (err) {
      await ctx.reply(
`❌ Gagal membuat deposit

${err.message}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );

      return ctx.scene.leave();
    }
  }
);