const { Scenes, Markup } = require("telegraf");
const { addBalance } = require("../services/balance");

module.exports = new Scenes.WizardScene(
  "add-balance",

  async (ctx) => {
    ctx.wizard.state.data = {};

    await ctx.reply("Masukkan Telegram ID user:");

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.data.telegramId = ctx.message.text.trim();

    await ctx.reply("Masukkan nominal saldo:");

    return ctx.wizard.next();
  },

  async (ctx) => {
    const amount = Number(ctx.message.text.trim());

    if (!amount || amount < 1) {
      return ctx.reply("❌ Nominal harus angka.");
    }

    const telegramId = ctx.wizard.state.data.telegramId;

    addBalance(
      telegramId,
      amount,
      "Tambah saldo manual oleh admin"
    );

    await ctx.reply(
`✅ Saldo berhasil ditambahkan

🆔 User ID: ${telegramId}
💰 Nominal: Rp${amount.toLocaleString("id-ID")}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );

    return ctx.scene.leave();
  }
);