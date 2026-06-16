const { Scenes, Markup } = require("telegraf");
const {
  getServerByCode,
  updateServerField
} = require("../services/server");

const fields = {
  name: "Nama Server",
  api_url: "API URL",
  api_key: "API Key",
  domain: "Domain",
  ip: "IP",
  isp: "ISP",
  city: "City",
  quota: "Quota GB",
  ip_limit: "Limit IP",
  price: "Harga 30 Hari",
  max_accounts: "Max Accounts"
};

module.exports = new Scenes.WizardScene(
  "edit-server",

  async (ctx) => {
    const { serverCode } = ctx.scene.state;

    const server = getServerByCode(serverCode);

    if (!server) {
      await ctx.reply("❌ Server tidak ditemukan.");
      return ctx.scene.leave();
    }

    ctx.wizard.state.serverCode = serverCode;

    const buttons = Object.entries(fields).map(([key, label]) => [
      Markup.button.callback(label, `edit_field_${key}`)
    ]);

    buttons.push([
      Markup.button.callback("❌ Batal", "panel_admin")
    ]);

    await ctx.reply(
`✏️ EDIT SERVER

Nama : ${server.name}
Code : ${server.code}

Pilih field yang ingin diedit:`,
      Markup.inlineKeyboard(buttons)
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.reply("Silakan pilih field dari tombol.");
    }

    const data = ctx.callbackQuery.data;

    if (data === "panel_admin") {
      await ctx.answerCbQuery();
      await ctx.scene.leave();
      return ctx.editMessageText(
        "❌ Edit server dibatalkan.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
        ])
      );
    }

    if (!data.startsWith("edit_field_")) {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery();

    const field = data.replace("edit_field_", "");

    if (!fields[field]) {
       return ctx.reply("❌ Field tidak valid.");
    }

    ctx.wizard.state.field = field;

    const server = getServerByCode(
      ctx.wizard.state.serverCode
    );

    await ctx.editMessageText(
`✏️ EDIT ${fields[field]}

Nilai saat ini:
${server[field] || "-"}

Kirim nilai baru:`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const value = ctx.message?.text?.trim();

    if (!value) {
      return ctx.reply("❌ Kirim nilai baru dalam bentuk teks.");
    }

    const code = ctx.wizard.state.serverCode;
    const field = ctx.wizard.state.field;

    const numberFields = [
      "quota",
      "ip_limit",
      "price",
      "max_accounts"
    ];

    const finalValue = numberFields.includes(field)
      ? Number(value)
      : value;

    if (
      numberFields.includes(field) &&
      isNaN(finalValue)
    ) {
      return ctx.reply("❌ Field ini harus angka.");
    }

    updateServerField(
      code,
      field,
      finalValue
    );

    await ctx.reply(
`✅ SERVER BERHASIL DIUPDATE

Field : ${fields[field]}
Nilai : ${finalValue}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✏️ Edit Lagi", `edit_server_${code}`)],
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );

    return ctx.scene.leave();
  }
);
