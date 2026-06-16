const { Markup } = require("telegraf");
const {
  getTransactionsByUser
} = require("../../services/transaction");

function formatRupiah(number) {
  return Number(number || 0).toLocaleString("id-ID");
}

function formatDate(dateText) {
  if (!dateText) return "-";

  const date = new Date(dateText.replace(" ", "T"));

  if (isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTransactionLabel(trx) {
  const note = String(trx.note || "").toLowerCase();

  if (note.includes("deposit")) {
    return "💰 Deposit QRIS";
  }

  if (note.includes("refund delete")) {
    return "🗑 Refund Delete Akun";
  }

  if (note.includes("refund")) {
    return "♻️ Refund Gagal Order";
  }

  if (note.includes("renew")) {
    return "🔄 Renew Akun";
  }

  if (note.includes("order")) {
    return "🛒 Order Akun";
  }

  return trx.type === "credit"
    ? "➕ Saldo Masuk"
    : "➖ Saldo Keluar";
}

function getAmountText(trx) {
  const sign = trx.type === "credit" ? "+" : "-";
  return `${sign} Rp${formatRupiah(trx.amount)}`;
}

function cleanNote(note) {
  if (!note) return "-";

  return String(note)
    .replace(/^Deposit QRIS/i, "ID")
    .replace(/^Order/i, "Order")
    .replace(/^Refund order gagal/i, "Refund")
    .replace(/^Refund gagal order/i, "Refund")
    .trim();
}

module.exports = (bot) => {
  bot.action("riwayat", async (ctx) => {
    await ctx.answerCbQuery();

    const transactions = getTransactionsByUser(
      String(ctx.from.id),
      20
    );

    if (!transactions.length) {
      return ctx.editMessageText(
`📜 RIWAYAT TRANSAKSI

Belum ada transaksi.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Home", "home")]
        ])
      );
    }

    let text = `📜 RIWAYAT TRANSAKSI\n\n`;

    for (const trx of transactions) {
      text +=
`${getTransactionLabel(trx)}
${getAmountText(trx)}
${cleanNote(trx.note)}
${formatDate(trx.created_at)}

━━━━━━━━━━━━━━

`;
    }

    text += `Menampilkan 20 transaksi terakhir.`;

    await ctx.editMessageText(
      text.slice(0, 4000),
      Markup.inlineKeyboard([
        [Markup.button.callback("💰 Saldo", "saldo")],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  });
};