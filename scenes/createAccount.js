const { Scenes, Markup } = require("telegraf");
const { getServerByCode } = require("../services/server");
const { createAccount } = require("../services/vpn");
const { saveAccount } = require("../services/account");
const { getBalance, reduceBalance, addBalance } = require("../services/balance");
const { getUser } = require("../services/user");
const { sendTopicNotification } = require("../services/notification");

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

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

function formatConfig(data) {
  let text =
`🎉 AKUN BERHASIL DIBUAT

╭─〔 INFORMASI AKUN 〕
│ 🌐 Server  : ${mono(data.domain)}
│ 📡 Protocol: ${mono((data.type || "-").toUpperCase())}
│ 👤 Username: ${mono(data.username)}
│ 📅 Expired : ${mono(
  data.expired_text ||
  data.expired_date ||
  data.expired_at
)}
│ 🔢 Limit IP: ${mono(data.ip_limit || "-")}
│ 📊 Quota   : ${mono(
  data.quota_gb
    ? Number(data.quota_gb) === 0
      ? "Unlimited"
      : data.quota_gb + " GB"
    : "-"
)}
╰────────────────`;

  if (data.password) {
    text += `
    
🔑 PASSWORD
${mono(data.password)}`;
  }

  if (data.uuid) {
    text += `
    
🆔 UUID
${mono(data.uuid)}`;
  }

  if (data.links) {
  text += `

🔗 CONFIG ACCOUNT`;

  for (const [key, value] of Object.entries(data.links)) {

    const config =
      data.type === "ssh"
        ? mono(value)
        : block(value);

    text += `

📌 ${key.toUpperCase()}
${config}`;
  }
}

  if (data.payloads) {
    text += `

📦 PAYLOAD`;

    for (const [key, value] of Object.entries(data.payloads)) {
      text += `

📌 ${key.toUpperCase()}
${block(
  String(value).replace(/\[crlf\]/g, "\n")
)}`;
    }
  }

  text += `

━━━━━━━━━━━━━━━━
⚠️ Simpan akun ini dengan baik.
📢 Jangan berikan akun kepada orang lain.
━━━━━━━━━━━━━━━━`;

  return text;
}

function getText(ctx) {
  return ctx.message?.text?.trim() || null;
}

async function requireText(ctx) {
  const text = getText(ctx);

  if (!text) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }

    await ctx.reply(
      "❌ Silakan kirim teks sesuai instruksi, jangan tekan tombol."
    );

    return null;
  }

  return text;
}

module.exports = new Scenes.WizardScene(
  "create-account",

  async (ctx) => {
    const { protocol, serverCode } = ctx.scene.state;

    ctx.wizard.state.order = {
      protocol,
      serverCode
    };

    await ctx.reply(
`👤 Masukkan username untuk ${protocol.toUpperCase()}

Contoh:
ucok123`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = await requireText(ctx);

if (!text) return;

const username = text.toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return ctx.reply(
        "❌ Username hanya boleh huruf kecil, angka, underscore, 3-20 karakter."
      );
    }

    ctx.wizard.state.order.username = username;

    if (ctx.wizard.state.order.protocol === "ssh") {
      await ctx.reply(
`🔑 Masukkan password SSH

Contoh:
rahasia123`
      );

      return ctx.wizard.next();
    }

    await ctx.reply(
`📅 Masukkan durasi hari

Contoh:
30`
    );

    ctx.wizard.state.order.skipPassword = true;

    return ctx.wizard.selectStep(3);
  },

  async (ctx) => {
    const password = await requireText(ctx);

if (!password) return;

    if (password.length < 3 || password.length > 32) {
      return ctx.reply("❌ Password minimal 3 karakter dan maksimal 32 karakter.");
    }

    ctx.wizard.state.order.password = password;

    await ctx.reply(
`📅 Masukkan durasi hari

Contoh:
30`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = await requireText(ctx);

if (!text) return;

const days = Number(text);

    if (!days || days < 1) {
      return ctx.reply("❌ Durasi harus angka minimal 1.");
    }

    const order = ctx.wizard.state.order;
    order.days = days;

    const server = getServerByCode(order.serverCode);

    if (!server) {
      await ctx.reply("❌ Server tidak ditemukan.");
      return ctx.scene.leave();
    }

    const user = getUser(String(ctx.from.id));

const normalPrice = Math.ceil(Number(server.price) / 30 * days);

const price =
  user.role === "reseller"
    ? Math.ceil(normalPrice / 2)
    : normalPrice;
    order.price = price;

    await ctx.reply(
`🧾 KONFIRMASI ORDER

Protocol : ${order.protocol.toUpperCase()}
Server   : ${server.name}
Username : ${order.username}
${order.protocol === "ssh" ? `Password : ${order.password}\n` : ""}Durasi   : ${days} hari
Saldo    : Rp${formatRupiah(getBalance(String(ctx.from.id)))}
${user.role === "reseller" ? `Harga Normal : Rp${formatRupiah(normalPrice)}\nDiskon Reseller : 50%\n` : ""}Harga    : Rp${formatRupiah(price)}

Lanjut buat akun?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Buat Sekarang", "confirm_create_account")],
        [Markup.button.callback("❌ Batal", "home")]
      ])
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) {
  return ctx.reply("Silakan klik tombol ✅ Buat Sekarang atau ❌ Batal.");
}

if (ctx.callbackQuery.data === "home") {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  return ctx.editMessageText(
    "❌ Order dibatalkan.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Home", "home")]
    ])
  );
}

if (ctx.callbackQuery.data !== "confirm_create_account") {
  await ctx.answerCbQuery();
  return;
}

    await ctx.answerCbQuery();

    const order = ctx.wizard.state.order;
    const server = getServerByCode(order.serverCode);

    if (!server) {
      await ctx.reply("❌ Server tidak ditemukan.");
      return ctx.scene.leave();
    }

    const pay = reduceBalance(
  String(ctx.from.id),
  Number(order.price),
  `Order ${order.protocol.toUpperCase()} ${order.username}`
);

if (!pay.success) {
  await ctx.reply(
`❌ Saldo tidak cukup

Saldo Anda : Rp${formatRupiah(pay.balance)}
Harga      : Rp${formatRupiah(order.price)}`,
  {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("💰 Saldo", "saldo")],
      [Markup.button.callback("🏠 Home", "home")]
    ]).reply_markup
  }
);

  return ctx.scene.leave();
}

    await ctx.editMessageText("⏳ Membuat akun, mohon tunggu...");

    try {
      let payload;

      if (order.protocol === "ssh") {
        payload = {
          username: order.username,
          password: order.password,
          ip_limit: Number(server.ip_limit),
          expired_days: Number(order.days)
        };
      } else {
        payload = {
          username: order.username,
          quota_gb: Number(server.quota),
          ip_limit: Number(server.ip_limit),
          expired_days: Number(order.days)
        };
      }

      const response = await createAccount(
        server,
        order.protocol,
        payload
      );

      if (response.status !== "success") {
        throw new Error(
          response.message ||
          response.raw ||
          "API gagal membuat akun."
        );
      }

      saveAccount({
  telegram_id: String(ctx.from.id),
  server_code: server.code,
  protocol: response.type || order.protocol,
  username: response.username || order.username,
  password: response.password || order.password || "",
  uuid: response.uuid || "",
  expired_at:
    response.expired_date ||
    response.expired_at ||
    "",
  expired_text:
    response.expired_text || "",
  config: response,
  price: order.price,
  days: order.days
});

      await ctx.reply(
  formatConfig(response),
  {
    parse_mode: "HTML",
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "📦 Akun Saya",
          "akun_saya"
        )
      ],
      [
        Markup.button.callback(
          "🏠 Home",
          "home"
        )
      ]
    ]).reply_markup
  }
);

      await sendTopicNotification(
  ctx,
`🎉 <b>ACCOUNT CREATED</b>

<blockquote>
👤 User       : ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}
📡 Protocol   : ${(response.type || order.protocol).toUpperCase()}
👤 Username   : ${response.username || order.username}
📅 Expired    : ${response.expired_text || response.expired_date || response.expired_at || "-"}
🌐 Server     : ${server.name}
💰 Harga      : Rp${formatRupiah(order.price)}
</blockquote>

✨ Terima kasih telah menggunakan Z VPN Store ❤️`
);

      return ctx.scene.leave();

    } catch (err) {

  console.error(err);

  addBalance(
    String(ctx.from.id),
    Number(order.price),
    `Refund gagal order ${order.protocol.toUpperCase()} ${order.username}`
  );

  const errorText =
    err.response?.data?.message ||
    err.message ||
    "Terjadi kesalahan.";

  if (
    errorText.includes("sudah ada") ||
    errorText.includes("already exists")
  ) {
    await ctx.reply(
`❌ Username "${order.username}" sudah digunakan.

Silakan gunakan username lain.`
    );

    return ctx.scene.leave();
  }

  await ctx.reply(
`❌ Gagal membuat akun

${errorText}`
  );

  return ctx.scene.leave();
    }
  }
);