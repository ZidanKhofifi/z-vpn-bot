const { Markup } = require("telegraf");
const { getServers } = require("../../services/server");
const { getUser } = require("../../services/user");
const { trialAccount } = require("../../services/vpn");
const {
  hasTrialToday,
  saveTrialLog
} = require("../../services/trial");
const { sendTopicNotification } = require("../../services/notification");

function formatConfig(data) {
  let text =
`🧪 AKUN TRIAL BERHASIL DIBUAT

🌐 Server   : ${data.domain || "-"}
📡 Type     : ${(data.type || "-").toUpperCase()}
👤 Username : ${data.username || "-"}`;

  if (data.password) {
    text += `\n🔑 Password : ${data.password}`;
  }

  if (data.uuid) {
    text += `\n🆔 UUID     : ${data.uuid}`;
  }

  text += `\n⏰ Masa Aktif : 60 Menit`;

  if (data.links) {
    text += `\n\n🔗 LINK AKUN`;

    for (const [key, value] of Object.entries(data.links)) {
      text += `\n\n${key.toUpperCase()}:\n${value}`;
    }
  }

  return text;
}

module.exports = (bot) => {

  bot.action("trial_akun", async (ctx) => {
    await ctx.answerCbQuery();

    const user = getUser(String(ctx.from.id));

    if (!user || user.role === "user") {
      const used = hasTrialToday(
        String(ctx.from.id)
      );

      if (used) {
        return ctx.editMessageText(
`❌ Trial sudah digunakan hari ini.

Silakan coba lagi besok.`,
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
    }

    await ctx.editMessageText(
`🧪 TRIAL AKUN

Pilih protocol:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "📡 VMESS",
            "trial_vmess"
          ),
          Markup.button.callback(
            "📡 VLESS",
            "trial_vless"
          )
        ],
        [
          Markup.button.callback(
            "🔐 SSH",
            "trial_ssh"
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

  bot.action(/^trial_(ssh|vmess|vless)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const protocol = ctx.match[1];

    const servers = getServers();

    if (!servers.length) {
      return ctx.editMessageText(
        "❌ Belum ada server."
      );
    }

    const buttons = servers.map(
      (server) => [
        Markup.button.callback(
          server.name,
          `trial_create_${protocol}_${server.code}`
        )
      ]
    );

    buttons.push([
      Markup.button.callback(
        "🏠 Home",
        "home"
      )
    ]);

    await ctx.editMessageText(
`🧪 TRIAL ${protocol.toUpperCase()}

Pilih server:`,
      Markup.inlineKeyboard(buttons)
    );
  });

  bot.action(
    /^trial_create_(ssh|vmess|vless)_(.+)$/,
    async (ctx) => {
      await ctx.answerCbQuery();

      const protocol = ctx.match[1];
      const serverCode = ctx.match[2];

      const server = getServers().find(
        (s) => s.code === serverCode
      );

      if (!server) {
        return ctx.editMessageText(
          "❌ Server tidak ditemukan."
        );
      }

      await ctx.editMessageText(
        "⏳ Membuat trial..."
      );

      try {
        const response =
          await trialAccount(
            server,
            protocol
          );

        if (
          response.status !== "success"
        ) {
          throw new Error(
            response.message ||
            "Gagal membuat trial."
          );
        }

        const user = getUser(String(ctx.from.id));

if (!user || user.role === "user") {
  saveTrialLog({
    telegram_id: String(ctx.from.id),
    protocol,
    server_code: server.code,
    username: response.username
  });
}

        await ctx.reply(
          formatConfig(response),
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "🏠 Home",
                "home"
              )
            ]
          ])
        );

        await sendTopicNotification(
  ctx,
`🧪 <b>TRIAL ACCOUNT CREATED</b>

<blockquote>
👤 User       : ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}
📡 Protocol   : ${protocol.toUpperCase()}
👤 Username   : ${response.username || "-"}
⏰ Masa Aktif : 60 Menit
🌐 Server     : ${server.name}
</blockquote>

🚀 Selamat mencoba layanan Z VPN Store`
);

      } catch (err) {
        await ctx.reply(
`❌ Gagal membuat trial

${err.message}`,
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
    }
  );

};