const { Markup } = require("telegraf");
const {
  getServers,
  getServerInfo
} = require("../../services/server");

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

async function getServerUsage(server) {
  try {
    const info = await getServerInfo(
      server.api_url,
      server.api_key
    );

    

    if (info.status === "success" && info.accounts) {
      return {
        used: info.accounts.total || "0",
        status: "🟢 Online"
      };
    }

    return {
      used: "-",
      status: "🔴 Offline"
    };
  } catch {
    return {
      used: "-",
      status: "🔴 Offline"
    };
  }
}

module.exports = (bot) => {
  bot.action("buat_akun", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
`🛒 BUAT AKUN VPN

Pilih protocol yang ingin dibuat:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("📡 VMESS", "protocol_vmess"),
          Markup.button.callback("📡 VLESS", "protocol_vless")
        ],
        [
         // Markup.button.callback("🐎 TROJAN", "protocol_trojan"),
          Markup.button.callback("🔐 SSH", "protocol_ssh")
        ],
        [
          Markup.button.callback("🏠 Home", "home")
        ]
      ])
    );
  });

  bot.action(/^protocol_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const protocol = ctx.match[1];
    const servers = getServers();

    if (!servers.length) {
      return ctx.editMessageText(
        "❌ Belum ada server.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );
    }

    let text = `📡 Protocol: ${protocol.toUpperCase()}\n\n`;
    const buttons = [];

    for (const server of servers) {
      const usage = await getServerUsage(server);

      const hargaHari = Math.ceil(Number(server.price) / 30);
      const quotaText =
        Number(server.quota) === 0
          ? "Unlimited"
          : `${server.quota} GB`;

      text +=
`🌐 ${server.name}
📡 ISP: ${server.isp || "-"}
💰 Harga per hari: Rp${formatRupiah(hargaHari)}
📅 Harga per 30 hari: Rp${formatRupiah(server.price)}
📊 Quota: ${quotaText}
🔢 Limit IP: ${server.ip_limit} IP
👥 Total Create Akun: ${usage.used}/${server.max_accounts}
${usage.status}

`;

      buttons.push([
        Markup.button.callback(
          `🌐 ${server.name}`,
          `detail_${protocol}_${server.code}`
        )
      ]);
    }

    buttons.push([
      Markup.button.callback("⬅️ Kembali", "buat_akun"),
      Markup.button.callback("🏠 Home", "home")
    ]);

    await ctx.editMessageText(
      text.trim(),
      Markup.inlineKeyboard(buttons)
    );
  });

  bot.action(/^detail_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const protocol = ctx.match[1];
    const code = ctx.match[2];

    const server = getServers().find(
      (s) => s.code === code
    );

    if (!server) {
      return ctx.editMessageText(
        "❌ Server tidak ditemukan.",
        Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Kembali", `protocol_${protocol}`)],
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );
    }

    const usage = await getServerUsage(server);

    const hargaHari = Math.ceil(Number(server.price) / 30);
    const quotaText =
      Number(server.quota) === 0
        ? "Unlimited"
        : `${server.quota} GB`;

    await ctx.editMessageText(
`🌐 DETAIL SERVER

Protocol : ${protocol.toUpperCase()}

Nama   : ${server.name}
Domain : ${server.domain}
ISP    : ${server.isp || "-"}
City   : ${server.city || "-"}

💰 Harga/Hari    : Rp${formatRupiah(hargaHari)}
📅 Harga/30 Hari : Rp${formatRupiah(server.price)}
📊 Quota         : ${quotaText}
🔒 Limit IP      : ${server.ip_limit} IP
👥 Total Akun    : ${usage.used}/${server.max_accounts}

${usage.status}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🛒 Order Server Ini",
            `order_${protocol}_${server.code}`
          )
        ],
        [
          Markup.button.callback("⬅️ Kembali", `protocol_${protocol}`),
          Markup.button.callback("🏠 Home", "home")
        ]
      ])
    );
  });

  bot.action(/^order_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const protocol = ctx.match[1];
    const serverCode = ctx.match[2];

    await ctx.scene.enter("create-account", {
      protocol,
      serverCode
    });
  });
};