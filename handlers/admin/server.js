const { Markup } = require("telegraf");
const {
  getServers,
  getServerByCode,
  getServerStatus
} = require("../../services/server");
const { isAdmin, adminMenu } = require("./panel");

function serverListKeyboard(back = "panel_admin") {
  const servers = getServers();

  const buttons = servers.map((server) => [
    Markup.button.callback(
      `🌐 ${server.name}`,
      `server_detail_${server.code}`
    )
  ]);

  buttons.push([
    Markup.button.callback("⬅️ Kembali", back)
  ]);

  return Markup.inlineKeyboard(buttons);
}

function serviceStatus(value) {
  return value === "active" ? "🟢 Active" : "🔴 Down";
}

module.exports = (bot) => {
  bot.action("admin_add_server", async (ctx) => {
    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery();
    await ctx.scene.enter("add-server");
  });

  bot.action("admin_list_server", async (ctx) => {
    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery();

    const servers = getServers();

    if (!servers.length) {
      return ctx.editMessageText(
`📋 LIST SERVER

Belum ada server.`,
        adminMenu()
      );
    }

    await ctx.editMessageText(
`📋 LIST SERVER

Pilih server untuk melihat detail:`,
      serverListKeyboard()
    );
  });

  bot.action(/^server_detail_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery();

    const code = ctx.match[1];
    const server = getServerByCode(code);

    if (!server) {
      return ctx.editMessageText("❌ Server tidak ditemukan.", adminMenu());
    }

    await ctx.editMessageText(
`🌐 DETAIL SERVER

Nama   : ${server.name}
Code   : ${server.code}
Domain : ${server.domain}
IP     : ${server.ip}
ISP    : ${server.isp}
City   : ${server.city}

💰 Harga 30 Hari : Rp${Number(server.price).toLocaleString("id-ID")}
📊 Quota         : ${Number(server.quota) === 0 ? "Unlimited" : server.quota + " GB"}
🔒 Limit IP      : ${server.ip_limit}
👥 Max Akun      : ${server.max_accounts}

API URL:
${server.api_url}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("🖥 Status VPS", `server_status_${server.code}`)
        ],
        [
          Markup.button.callback("✏️ Edit", `edit_server_${server.code}`),
Markup.button.callback("🗑 Hapus", `delete_server_${server.code}`)
        ],
        [
          Markup.button.callback("⬅️ List Server", "admin_list_server"),
          Markup.button.callback("🏠 Home", "home")
        ]
      ])
    );
  });

  bot.action(/^server_status_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery("Mengambil status VPS...");

    const code = ctx.match[1];
    const server = getServerByCode(code);

    if (!server) {
      return ctx.editMessageText("❌ Server tidak ditemukan.", adminMenu());
    }

    try {
      const status = await getServerStatus(
        server.api_url,
        server.api_key
      );

      if (status.status !== "success") {
        return ctx.editMessageText(
`❌ Gagal mengambil status VPS.

Response tidak valid.`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback("⬅️ Detail Server", `server_detail_${server.code}`)
            ]
          ])
        );
      }

      const ramUsed = status.ram?.used_mb || "0";
      const ramTotal = status.ram?.total_mb || "0";
      const ramAvailable = status.ram?.available_mb || "0";

      const diskUsed = status.disk?.used || "-";
      const diskTotal = status.disk?.total || "-";
      const diskAvailable = status.disk?.available || "-";
      const diskPercent = status.disk?.percent || "-";

      const xray = serviceStatus(status.services?.xray);
      const nginx = serviceStatus(status.services?.nginx);

      await ctx.editMessageText(
`🖥 STATUS VPS

🌐 ${server.name}

⏱ Uptime:
${status.uptime || "-"}

⚙️ Load:
${status.load || "-"}

🧠 RAM:
Used      : ${ramUsed} MB
Total     : ${ramTotal} MB
Available : ${ramAvailable} MB

💽 Disk:
Used      : ${diskUsed}
Total     : ${diskTotal}
Available : ${diskAvailable}
Usage     : ${diskPercent}

🚀 Xray  : ${xray}
🌍 Nginx : ${nginx}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🔄 Refresh", `server_status_${server.code}`)
          ],
          [
            Markup.button.callback("⬅️ Detail Server", `server_detail_${server.code}`)
          ],
          [
            Markup.button.callback("🏠 Home", "home")
          ]
        ])
      );
    } catch (err) {
      await ctx.editMessageText(
`❌ Gagal mengambil status VPS.

Error:
${err.message}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("⬅️ Detail Server", `server_detail_${server.code}`)
          ],
          [
            Markup.button.callback("🏠 Home", "home")
          ]
        ])
      );
    }
  });

  bot.action("admin_edit_server", async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery("Pilih server dari List Server dulu.");
  });

  bot.action("admin_delete_server", async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery("Pilih server dari List Server dulu.");
  });

  
};