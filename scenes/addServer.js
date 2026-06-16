const { Scenes } = require("telegraf");
const { getServerInfo, saveServer } = require("../services/server");

module.exports = new Scenes.WizardScene(
  "add-server",

  async (ctx) => {
    ctx.wizard.state.server = {};

    await ctx.reply(
`➕ Tambah Server

Masukkan kode server.

Contoh:
id1`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.code = ctx.message.text.trim().toLowerCase();

    await ctx.reply(
`Masukkan nama server.

Contoh:
ID Biznet 5IP`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.name = ctx.message.text.trim();

    await ctx.reply(
`Masukkan API URL.

Contoh:
http://id1.zstore.space:5888`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.api_url = ctx.message.text.trim();

    await ctx.reply(
`Masukkan API KEY.

Contoh:
kelaz`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.api_key = ctx.message.text.trim();

    await ctx.reply(
`Masukkan harga 30 hari.

Contoh:
10000`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.price = Number(ctx.message.text.trim());

    if (!ctx.wizard.state.server.price) {
      await ctx.reply("❌ Harga harus angka. Ulangi masukkan harga 30 hari:");
      return;
    }

    await ctx.reply(
`Masukkan quota GB.

Isi 0 untuk Unlimited.

Contoh:
0`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.quota = Number(ctx.message.text.trim());

    if (Number.isNaN(ctx.wizard.state.server.quota)) {
      await ctx.reply("❌ Quota harus angka. Isi 0 untuk Unlimited.");
      return;
    }

    await ctx.reply(
`Masukkan limit IP.

Contoh:
5`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.ip_limit = Number(ctx.message.text.trim());

    if (!ctx.wizard.state.server.ip_limit) {
      await ctx.reply("❌ Limit IP harus angka. Ulangi:");
      return;
    }

    await ctx.reply(
`Masukkan max akun server.

Contoh:
100`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.wizard.state.server.max_accounts = Number(ctx.message.text.trim());

    if (!ctx.wizard.state.server.max_accounts) {
      await ctx.reply("❌ Max akun harus angka. Ulangi:");
      return;
    }

    const server = ctx.wizard.state.server;

    await ctx.reply("⏳ Mengecek API server...");

    try {
      const info = await getServerInfo(
        server.api_url,
        server.api_key
      );

      if (info.status !== "success") {
        await ctx.reply("❌ API server tidak valid.");
        return ctx.scene.leave();
      }

      saveServer({
        ...server,
        domain: info.domain || "",
        ip: info.ip || "",
        isp: info.isp || "",
        city: info.city || ""
      });

      await ctx.reply(
`✅ Server berhasil ditambahkan

🌐 Nama: ${server.name}
🔖 Code: ${server.code}
🌍 Domain: ${info.domain}
📡 ISP: ${info.isp}
📍 City: ${info.city}
🔢 Limit IP: ${server.ip_limit}
📊 Quota: ${server.quota === 0 ? "Unlimited" : server.quota + " GB"}
💰 Harga 30 Hari: Rp${server.price.toLocaleString("id-ID")}
👥 Max Akun: ${server.max_accounts}`
      );

      return ctx.scene.leave();
    } catch (err) {
      await ctx.reply(
`❌ Gagal konek API server.

Error:
${err.message}`
      );

      return ctx.scene.leave();
    }
  }
);