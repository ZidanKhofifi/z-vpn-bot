const { createUser, getUser } = require("../services/user");
const mainMenu = require("../keyboards/main");

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

function roleBadge(role) {
  if (role === "admin") return "🛡️ ADMIN";
  if (role === "reseller") return "👑 RESELLER";
  return "👤 USER";
}

module.exports = (bot) => {
  bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    const username = ctx.from.username || "";
    const name = ctx.from.first_name || "User";

    createUser(telegramId, username);

    const user = getUser(telegramId);

    await ctx.reply(
`╭━━━━〔 🚀 Z VPN STORE 〕━━━━╮
┃         Premium VPN Auto Order
╰━━━━━━━━━━━━━━━━━━━━━━╯

👋 Halo, ${name}

╭─〔 ACCOUNT INFO 〕
│ 🆔 ID       : ${telegramId}
│ 🏷️ Role     : ${roleBadge(user.role)}
│ 💰 Saldo    : Rp${formatRupiah(user.balance)}
╰────────────────────

╭─〔 LAYANAN 〕
│ 🔐 SSH / OpenVPN
│ 📡 VMESS / VLESS
│ 🧪 Trial 1 Jam
│ ♻️ Renew Otomatis
╰────────────────────

╭─〔 STATUS SISTEM 〕
│ 🟢 Bot Online
│ ⚡ Auto Create Aktif
│ 💳 QRIS Payment Ready
╰────────────────────

Silakan pilih menu di bawah 👇`,
      mainMenu(user.role)
    );
  });
};