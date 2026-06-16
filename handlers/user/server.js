const { Markup } = require("telegraf");
const { getServers, getServerByCode, getServerInfo } = require("../../services/server");

function serverListKeyboard() {
  const servers = getServers();

  const buttons = servers.map((server) => [
    Markup.button.callback(
      `🌐 ${server.name}`,
      `user_server_detail_${server.code}`
    )
  ]);

  buttons.push([
    Markup.button.callback("🏠 Home", "home")
  ]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = (bot) => {
  bot.action("cek_server", async (ctx) => {
    await ctx.answerCbQuery();

    const servers = getServers();

    if (!servers.length) {
      return ctx.editMessageText(
        "❌ Belum ada server tersedia.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );
    }

    await ctx.editMessageText(
`📊 CEK SERVER

Pilih server untuk melihat detail:`,
      serverListKeyboard()
    );
  });

  bot.action(/^user_server_detail_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const code = ctx.match[1];
    const server = getServerByCode(code);

    if (!server) {
      return ctx.editMessageText(
        "❌ Server tidak ditemukan.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Kembali", "cek_server")],
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );
    }

    let totalAccounts = "0";

    try {
      const info = await getServerInfo(server.api_url, server.api_key);

      if (info.status === "success" && info.accounts) {
        totalAccounts = info.accounts.total || "0";
      }
    } catch (err) {
      totalAccounts = "offline";
    }

    const quotaText =
      Number(server.quota) === 0
        ? "Unlimited"
        : `${server.quota} GB`;

    const priceDay = Math.ceil(Number(server.price) / 30);

    await ctx.editMessageText(
`🌐 DETAIL SERVER

Nama   : ${server.name}
Domain : ${server.domain}
ISP    : ${server.isp}
City   : ${server.city}

💰 Harga 30 Hari : Rp${Number(server.price).toLocaleString("id-ID")}
💰 Harga per Hari: Rp${priceDay.toLocaleString("id-ID")}
📊 Quota         : ${quotaText}
🔢 Limit IP      : ${server.ip_limit} IP
👥 Akun          : ${totalAccounts}/${server.max_accounts}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("🛒 Order Server Ini", `order_server_${server.code}`)
        ],
        [
          Markup.button.callback("⬅️ Kembali", "cek_server"),
          Markup.button.callback("🏠 Home", "home")
        ]
      ])
    );
  });
};