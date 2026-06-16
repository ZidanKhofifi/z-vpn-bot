const { getUser } = require("../services/user");

module.exports = (bot) => {
  bot.hears("💰 Saldo", async (ctx) => {
    const user = getUser(String(ctx.from.id));

    await ctx.reply(
`💰 Saldo Anda

Rp${Number(user.balance).toLocaleString("id-ID")}`
    );
  });

  bot.hears("📞 Admin", async (ctx) => {
    await ctx.reply("📞 Admin: @username_admin");
  });
};