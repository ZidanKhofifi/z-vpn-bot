const { Scenes, Markup } = require("telegraf");
const { getAllUsers } = require("../services/user");

module.exports = new Scenes.WizardScene(
  "broadcast",

  async (ctx) => {
    ctx.wizard.state.data = {};

    await ctx.reply(
`📢 BROADCAST

Kirim pesan yang ingin disebarkan ke semua user:`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message) {
  return ctx.reply("❌ Kirim pesan broadcast dulu.");
}

ctx.wizard.state.data.messageId = ctx.message.message_id;
ctx.wizard.state.data.fromChatId = ctx.chat.id;

    await ctx.reply(
`📢 KONFIRMASI BROADCAST

Pesan sudah diterima.
Bisa berupa teks, foto, video, file, atau media lain.

Kirim ke semua user?`,
  Markup.inlineKeyboard([
    [Markup.button.callback("✅ Kirim", "confirm_broadcast")],
    [Markup.button.callback("❌ Batal", "panel_admin")]
  ])
);

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.reply("Silakan pilih tombol.");
    }

    if (ctx.callbackQuery.data === "panel_admin") {
      await ctx.answerCbQuery();
      await ctx.scene.leave();

      return ctx.editMessageText(
        "❌ Broadcast dibatalkan.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
        ])
      );
    }

    if (ctx.callbackQuery.data !== "confirm_broadcast") {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery();

    const messageId = ctx.wizard.state.data.messageId;
    const fromChatId = ctx.wizard.state.data.fromChatId;
    const users = getAllUsers();

    let success = 0;
    let failed = 0;

    await ctx.editMessageText("⏳ Mengirim broadcast...");

    for (const user of users) {
      try {
        await ctx.telegram.copyMessage(
  user.telegram_id,
  fromChatId,
  messageId
);
        success++;
      } catch {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await ctx.reply(
`✅ BROADCAST SELESAI

Berhasil : ${success}
Gagal    : ${failed}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );

    return ctx.scene.leave();
  }
);
