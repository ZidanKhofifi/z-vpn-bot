const { Markup } = require("telegraf");
const {
  getAccountsByUser,
  getAccountById
} = require("../../services/account");
const { deleteVpnAccount } = require("../../services/vpn");
const { getServerByCode } = require("../../services/server");
const { deleteAccount } = require("../../services/account");
const { renewAccount } = require("../../services/vpn");
const { updateAccountExpiry } = require("../../services/account");
const { addBalance } = require("../../services/balance");
const {
  lockAccount,
  unlockAccount
} = require("../../services/vpn");

const {
  updateAccountStatus
} = require("../../services/account");

function escapeHTML(text) {
  return String(text || "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mono(text) {
  return `<code>${escapeHTML(text)}</code>`;
}

function block(text) {
  return `<pre>${escapeHTML(text)}</pre>`;
}

function accountsKeyboard(accounts) {
  const buttons = accounts.map((account) => [
    Markup.button.callback(
      `${account.protocol.toUpperCase()} | ${account.username}`,
      `my_account_${account.id}`
    )
  ]);

  buttons.push([
    Markup.button.callback("🛒 Buat Akun", "buat_akun")
  ]);

  buttons.push([
    Markup.button.callback("🏠 Home", "home")
  ]);

  return Markup.inlineKeyboard(buttons);
}

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

function getRemainingDays(expiredAt) {
  if (!expiredAt) return 0;

  const today = new Date();
  const expired = new Date(`${expiredAt}T23:59:59`);

  const diffMs = expired - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

function calculateDeleteRefund(account) {
  const totalPrice = Number(account.price || 0);
  const totalDays = Number(account.days || 0);

  if (!totalPrice || !totalDays) {
    return {
      remainingDays: 0,
      grossRefund: 0,
      fee: 0,
      netRefund: 0
    };
  }

  const remainingDays = getRemainingDays(account.expired_at);
  const pricePerDay = Math.ceil(totalPrice / totalDays);

  const grossRefund = Math.max(0, remainingDays * pricePerDay);
  const fee = Math.ceil(grossRefund * 0.2);
  const netRefund = Math.max(0, grossRefund - fee);

  return {
    remainingDays,
    grossRefund,
    fee,
    netRefund
  };
}

module.exports = (bot) => {
  bot.action("akun_saya", async (ctx) => {
    await ctx.answerCbQuery();

    

    const accounts = getAccountsByUser(
      String(ctx.from.id)
    );

    

    if (!accounts.length) {
      return ctx.editMessageText(
`📦 AKUN SAYA

Anda belum memiliki akun VPN.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🛒 Buat Akun", "buat_akun")
          ],
          [
            Markup.button.callback("🏠 Home", "home")
          ]
        ])
      );
    }

    await ctx.editMessageText(
`📦 AKUN SAYA

Pilih akun:`,
      accountsKeyboard(accounts)
    );
  });

  bot.action(/^my_account_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText(
      "❌ Akun tidak ditemukan.",
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Kembali", "akun_saya")]
      ])
    );
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  const statusMap = {
    active: "🟢 Active",
    locked: "🔴 Locked",
    expired: "⚫ Expired"
  };

  const statusText =
    statusMap[account.status] || account.status || "🟢 Active";

  const buttons = [
  [
    Markup.button.callback(
      "📋 Show Config",
      `account_config_${account.id}`
    )
  ]
];

if (account.status === "active") {

  if (account.protocol === "ssh") {
    buttons.push([
      Markup.button.callback(
        "🔒 Lock",
        `account_lock_${account.id}`
      )
    ]);
  }

  buttons.push([
    Markup.button.callback(
      "♻️ Renew",
      `account_renew_${account.id}`
    ),
    Markup.button.callback(
      "❌ Delete",
      `account_delete_${account.id}`
    )
  ]);

} else if (account.status === "locked") {

  buttons.push([
    Markup.button.callback(
      "🔓 Unlock",
      `account_unlock_${account.id}`
    )
  ]);

  buttons.push([
    Markup.button.callback(
      "♻️ Renew",
      `account_renew_${account.id}`
    ),
    Markup.button.callback(
      "❌ Delete",
      `account_delete_${account.id}`
    )
  ]);

} else if (account.status === "expired") {

  buttons.push([
    Markup.button.callback(
      "❌ Delete",
      `account_delete_${account.id}`
    )
  ]);

}

  buttons.push([
    Markup.button.callback("⬅️ Kembali", "akun_saya"),
    Markup.button.callback("🏠 Home", "home")
  ]);

  await ctx.editMessageText(
`📦 DETAIL AKUN

🌐 Server   : ${account.server_name || account.server_code}
📡 Protocol : ${account.protocol.toUpperCase()}
👤 Username : ${account.username}
📅 Expired  : ${account.expired_at || "-"}

Status     : ${statusText}`,
    Markup.inlineKeyboard(buttons)
  );
});

  bot.action(/^account_config_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  const config = JSON.parse(account.config_json || "{}");

  let text =
`📋 CONFIG AKUN

╭─〔 INFORMASI AKUN 〕
│ 🌐 Server  : ${mono(account.server_name || account.server_code)}
│ 📡 Protocol: ${mono(account.protocol.toUpperCase())}
│ 👤 Username: ${mono(account.username)}
│ 📅 Expired : ${mono(account.expired_text || account.expired_at || "-")}
│ 🔢 Limit IP: ${mono(config.ip_limit || "-")}
│ 📊 Quota   : ${mono(
  config.quota_gb
    ? Number(config.quota_gb) === 0
      ? "Unlimited"
      : config.quota_gb + " GB"
    : "-"
)}
╰────────────────`;

  if (config.password) {
    text += `

🔑 PASSWORD
${mono(config.password)}`;
  }

  if (config.uuid) {
    text += `

🆔 UUID
${mono(config.uuid)}`;
  }

  if (config.links) {
    text += `

🔗 CONFIG ACCOUNT`;

    for (const [key, value] of Object.entries(config.links)) {
      const result =
        account.protocol === "ssh"
          ? mono(value)
          : block(value);

      text += `

📌 ${key.toUpperCase()}
${result}`;
    }
  }

  if (config.payloads) {
    text += `

📦 PAYLOAD`;

    for (const [key, value] of Object.entries(config.payloads)) {
      text += `

📌 ${key.toUpperCase()}
${block(String(value).replace(/\[crlf\]/g, "\n"))}`;
    }
  }

  text += `

━━━━━━━━━━━━━━━━
⚠️ Simpan akun ini dengan baik.
📢 Jangan berikan akun kepada orang lain.
━━━━━━━━━━━━━━━━`;

  await ctx.editMessageText(
    text.slice(0, 4000),
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "⬅️ Kembali",
            `my_account_${account.id}`
          )
        ]
      ]).reply_markup
    }
  );
});

  bot.action(/^account_renew_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.scene.enter("renew-account", {
    accountId: ctx.match[1]
  });
});

  bot.action("renew_akun", async (ctx) => {
  await ctx.answerCbQuery();

  const accounts = getAccountsByUser(String(ctx.from.id));

  if (!accounts.length) {
    return ctx.editMessageText(
`♻️ PERPANJANG AKUN

Anda belum memiliki akun.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Buat Akun", "buat_akun")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  }

  const buttons = accounts.map((account) => [
    Markup.button.callback(
      `${account.protocol.toUpperCase()} | ${account.username}`,
      `account_renew_${account.id}`
    )
  ]);

  buttons.push([
    Markup.button.callback("🏠 Home", "home")
  ]);

  await ctx.editMessageText(
`♻️ PERPANJANG AKUN

Pilih akun yang ingin diperpanjang:`,
    Markup.inlineKeyboard(buttons)
  );
});

  bot.action(/^renew_confirm_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);
  const days = Number(ctx.match[2]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  const server = getServerByCode(account.server_code);

  if (!server) {
    return ctx.editMessageText("❌ Server akun tidak ditemukan.");
  }

  await ctx.editMessageText("⏳ Memproses renew akun...");

  try {
    let payload;

    if (account.protocol === "ssh") {
      payload = {
        username: account.username,
        days
      };
    } else {
      payload = {
        username: account.username,
        days,
        quota_gb: Number(server.quota),
        ip_limit: Number(server.ip_limit)
      };
    }

    const response = await renewAccount(
      server,
      account.protocol,
      payload
    );

    if (response.status !== "success") {
      throw new Error(response.message || response.raw || "Renew gagal.");
    }

    updateAccountExpiry(
      account.username,
      response.expired_date || "",
      response.expired_text || ""
    );

    await ctx.editMessageText(
`✅ RENEW BERHASIL

Protocol : ${account.protocol.toUpperCase()}
Username : ${account.username}
Tambah   : ${days} hari
Expired  : ${response.expired_text || response.expired_date}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("📦 Detail Akun", `my_account_${account.id}`)
        ],
        [
          Markup.button.callback("🏠 Home", "home")
        ]
      ])
    );
  } catch (err) {
    await ctx.editMessageText(
`❌ Renew gagal

${err.message}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("⬅️ Kembali", `my_account_${account.id}`)
        ]
      ])
    );
  }
});

  bot.action(/^account_lock_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  if (account.protocol !== "ssh") {
    return ctx.answerCbQuery("Lock hanya untuk SSH.", {
      show_alert: true
    });
  }

  const server = getServerByCode(account.server_code);

  if (!server) {
    return ctx.editMessageText("❌ Server akun tidak ditemukan.");
  }

  await ctx.editMessageText("⏳ Mengunci akun SSH...");

  try {
    const response = await lockAccount(
      server,
      account.username
    );

    if (response.status !== "success") {
      throw new Error(response.message || "Lock gagal.");
    }

    updateAccountStatus(account.username, "locked");

    await ctx.editMessageText(
`🔒 AKUN BERHASIL DI-LOCK

Username : ${account.username}
Status   : Locked`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📦 Detail Akun", `my_account_${account.id}`)],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  } catch (err) {
    await ctx.editMessageText(
`❌ Lock gagal

${err.message}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Kembali", `my_account_${account.id}`)]
      ])
    );
  }
});

bot.action(/^account_unlock_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  if (account.protocol !== "ssh") {
    return ctx.answerCbQuery("Unlock hanya untuk SSH.", {
      show_alert: true
    });
  }

  const server = getServerByCode(account.server_code);

  if (!server) {
    return ctx.editMessageText("❌ Server akun tidak ditemukan.");
  }

  await ctx.editMessageText("⏳ Membuka lock akun SSH...");

  try {
    const response = await unlockAccount(
      server,
      account.username
    );

    if (response.status !== "success") {
      throw new Error(response.message || "Unlock gagal.");
    }

    updateAccountStatus(account.username, "active");

    await ctx.editMessageText(
`🔓 AKUN BERHASIL DI-UNLOCK

Username : ${account.username}
Status   : Active`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📦 Detail Akun", `my_account_${account.id}`)],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  } catch (err) {
    await ctx.editMessageText(
`❌ Unlock gagal

${err.message}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Kembali", `my_account_${account.id}`)]
      ])
    );
  }
});

  bot.action(/^account_delete_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  const refund = calculateDeleteRefund(account);

  await ctx.editMessageText(
`❌ HAPUS AKUN

Protocol : ${account.protocol.toUpperCase()}
Username : ${account.username}
Server   : ${account.server_name || account.server_code}
Expired  : ${account.expired_text || account.expired_at}

💰 Refund Prorata
Sisa aktif : ${refund.remainingDays} hari
Refund     : Rp${formatRupiah(refund.grossRefund)}
Potongan   : Rp${formatRupiah(refund.fee)}
Diterima   : Rp${formatRupiah(refund.netRefund)}

Yakin ingin menghapus akun ini?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "✅ Ya, Hapus",
          `delete_confirm_${account.id}`
        )
      ],
      [
        Markup.button.callback(
          "⬅️ Batal",
          `my_account_${account.id}`
        )
      ]
    ])
  );
});

  bot.action(/^delete_confirm_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const account = getAccountById(ctx.match[1]);

  if (!account) {
    return ctx.editMessageText("❌ Akun tidak ditemukan.");
  }

  if (String(account.telegram_id) !== String(ctx.from.id)) {
    return ctx.editMessageText("❌ Akun ini bukan milik Anda.");
  }

  const server = getServerByCode(account.server_code);

  if (!server) {
    return ctx.editMessageText("❌ Server akun tidak ditemukan.");
  }

  const refund = calculateDeleteRefund(account);

  await ctx.editMessageText("⏳ Menghapus akun...");

  try {
    const response = await deleteVpnAccount(
      server,
      account.protocol,
      {
        username: account.username
      }
    );

    if (response.status !== "success") {
      throw new Error(response.message || response.raw || "Delete gagal.");
    }

    deleteAccount(account.username);

    if (refund.netRefund > 0) {
      addBalance(
        String(ctx.from.id),
        refund.netRefund,
        `Refund delete ${account.protocol.toUpperCase()} ${account.username}`
      );
    }

    await ctx.editMessageText(
`✅ AKUN BERHASIL DIHAPUS

Protocol : ${account.protocol.toUpperCase()}
Username : ${account.username}

💰 Refund
Sisa aktif : ${refund.remainingDays} hari
Diterima   : Rp${formatRupiah(refund.netRefund)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📦 Akun Saya", "akun_saya")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  } catch (err) {
    await ctx.editMessageText(
`❌ Gagal menghapus akun

${err.message}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Kembali", `my_account_${account.id}`)]
      ])
    );
  }
});

  bot.action("hapus_akun", async (ctx) => {
  await ctx.answerCbQuery();

  const accounts = getAccountsByUser(String(ctx.from.id));

  if (!accounts.length) {
    return ctx.editMessageText(
`❌ HAPUS AKUN

Anda belum memiliki akun.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Buat Akun", "buat_akun")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  }

  const buttons = accounts.map((account) => [
    Markup.button.callback(
      `${account.protocol.toUpperCase()} | ${account.username}`,
      `account_delete_${account.id}`
    )
  ]);

  buttons.push([
    Markup.button.callback("🏠 Home", "home")
  ]);

  await ctx.editMessageText(
`❌ HAPUS AKUN

Pilih akun yang ingin dihapus:`,
    Markup.inlineKeyboard(buttons)
  );
});

  bot.action("lock_akun", async (ctx) => {
  await ctx.answerCbQuery();

  const accounts = getAccountsByUser(String(ctx.from.id))
    .filter((account) => account.protocol === "ssh");

  if (!accounts.length) {
    return ctx.editMessageText(
`🔒 LOCK SSH

Anda belum memiliki akun SSH.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  }

  const buttons = accounts.map((account) => [
    Markup.button.callback(
      `🔒 ${account.username}`,
      `account_lock_${account.id}`
    )
  ]);

  buttons.push([Markup.button.callback("🏠 Home", "home")]);

  await ctx.editMessageText(
`🔒 LOCK SSH

Pilih akun SSH yang ingin dikunci:`,
    Markup.inlineKeyboard(buttons)
  );
});

bot.action("unlock_akun", async (ctx) => {
  await ctx.answerCbQuery();

  const accounts = getAccountsByUser(String(ctx.from.id))
    .filter((account) => account.protocol === "ssh");

  if (!accounts.length) {
    return ctx.editMessageText(
`🔓 UNLOCK SSH

Anda belum memiliki akun SSH.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  }

  const buttons = accounts.map((account) => [
    Markup.button.callback(
      `🔓 ${account.username}`,
      `account_unlock_${account.id}`
    )
  ]);

  buttons.push([Markup.button.callback("🏠 Home", "home")]);

  await ctx.editMessageText(
`🔓 UNLOCK SSH

Pilih akun SSH yang ingin dibuka:`,
    Markup.inlineKeyboard(buttons)
  );
});
};