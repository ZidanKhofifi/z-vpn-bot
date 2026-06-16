const { Markup } = require("telegraf");

function mainMenu(role) {
  const buttons = [
    [
      Markup.button.callback("🛒 Buat Akun", "buat_akun"),
      Markup.button.callback("♻️ Perpanjang", "renew_akun")
    ],
    [
      Markup.button.callback("❌ Hapus Akun", "hapus_akun"),
      Markup.button.callback("🧪 Trial", "trial_akun")
    ],
    [
      Markup.button.callback("📦 Akun Saya", "akun_saya"),
    ],
    [
  Markup.button.callback("📜 Riwayat", "riwayat"),
  Markup.button.callback("💰 Saldo", "saldo")
],
    [
      Markup.button.callback("📊 Cek Server", "cek_server"),
      Markup.button.callback("👑 Reseller", "jadi_reseller")
    ],
    [
  Markup.button.callback("💬 Customer Service", "customer_service")
]
  ];

  if (role === "reseller" || role === "admin") {
    buttons.push([
      Markup.button.callback("🔒 Lock", "lock_akun"),
      Markup.button.callback("🔓 Unlock", "unlock_akun")
    ]);
  }

  if (role === "admin") {
    buttons.push([
      Markup.button.callback("⚙️ Panel Admin", "panel_admin")
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

module.exports = mainMenu;