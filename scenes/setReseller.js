const { Scenes, Markup } = require("telegraf");
const { getUser, updateUserRole } = require("../services/user");

module.exports = new Scenes.WizardScene(
  "set-reseller",

  async (ctx) => {
    ctx.wizard.state.data = {};

    await ctx.reply("Masukkan Telegram ID user:");

    return ctx.wizard.next();
  },

  async (ctx) => {
    const telegramId = ctx.message.text.trim();
    const user = getUser(telegramId);

    if (!user) {
      await ctx.reply(
        "❌ User tidak ditemukan di database.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
        ])
      );

      return ctx.scene.leave();
    }

    ctx.wizard.state.data.telegramId = telegramId;

    await ctx.reply(
`👑 SET ROLE USER

🆔 User ID : ${telegramId}
👤 Username: ${user.username || "-"}
📌 Role saat ini: ${user.role}

Pilih role baru:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("👑 Reseller", "set_role_reseller"),
          Markup.button.callback("👤 User", "set_role_user")
        ],
        [
          Markup.button.callback("❌ Batal", "panel_admin")
        ]
      ])
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.reply("Silakan pilih tombol role.");
    }

    const action = ctx.callbackQuery.data;

    if (action === "panel_admin") {
      await ctx.answerCbQuery();
      await ctx.scene.leave();
      return ctx.editMessageText(
        "❌ Set reseller dibatalkan.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
        ])
      );
    }

    if (
      action !== "set_role_reseller" &&
      action !== "set_role_user"
    ) {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery();

    const telegramId = ctx.wizard.state.data.telegramId;

    const role =
      action === "set_role_reseller"
        ? "reseller"
        : "user";

    updateUserRole(telegramId, role);

    await ctx.editMessageText(
`✅ ROLE BERHASIL DIUBAH

🆔 User ID : ${telegramId}
📌 Role baru: ${role.toUpperCase()}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );

    return ctx.scene.leave();
  }
);
