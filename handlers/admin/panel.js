const { Markup } = require("telegraf");
const { getUser } = require("../../services/user");
const { getServers, deleteServer } = require("../../services/server");
const { getAllUsers } = require("../../services/user");
const { getAllAccounts } = require("../../services/account");
const { getTransactionStats } = require("../../services/transaction");
const {
  getSshMember,
  getSshOnline,
  getSshLimit,
  getXrayMember,
  getXrayOnline
} = require("../../services/vpn");

function isAdmin(ctx) {
  const user = getUser(String(ctx.from.id));
  return user && user.role === "admin";
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("➕ Tambah Server", "admin_add_server"),
      Markup.button.callback("📋 List Server", "admin_list_server")
    ],
    [
      Markup.button.callback("✏️ Edit Server", "admin_edit_server"),
      Markup.button.callback("🗑 Hapus Server", "admin_delete_server")
    ],
    [
  Markup.button.callback("💰 Tambah Saldo", "admin_add_balance"),
  Markup.button.callback("👥 List User", "admin_list_user_1")
],
[
  Markup.button.callback("👑 Set Reseller", "admin_set_reseller")
],
    [
  Markup.button.callback("📊 Statistik", "admin_stats"),
  Markup.button.callback("🖥 Monitoring", "admin_monitor")
],
    [
  Markup.button.callback("📢 Broadcast", "admin_broadcast")
],
    [
      Markup.button.callback("🏠 Menu Utama", "home")
    ]
  ]);
}

function paginate(items, page = 1, perPage = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * perPage;

  return {
    data: items.slice(start, start + perPage),
    page: currentPage,
    totalPages,
    start
  };
}

module.exports = {
  isAdmin,
  adminMenu,

  registerAdminPanel(bot) {
    bot.action("panel_admin", async (ctx) => {
      if (!isAdmin(ctx)) return;

      await ctx.answerCbQuery();

      await ctx.editMessageText(
`⚙️ PANEL ADMIN

Silakan pilih menu admin:`,
        adminMenu()
      );
    });

    bot.action(/^admin_list_user_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const page = Number(ctx.match[1]);
  const users = getAllUsers();

  const paged = paginate(users, page, 10);

  let text =
`👥 LIST USER

Total User : ${users.length}
Page       : ${paged.page}/${paged.totalPages}

━━━━━━━━━━━━━━`;

  if (!users.length) {
    text += `\n\nBelum ada user.`;
  } else {
    paged.data.forEach((user, i) => {
      text += `

${paged.start + i + 1}. ${user.username ? "@" + user.username : "-"}
├ ID      : ${user.telegram_id}
├ Role    : ${user.role || "user"}
├ Saldo   : Rp${Number(user.balance || 0).toLocaleString("id-ID")}
└ Status  : ${user.status || "active"}`;
    });
  }

  const nav = [];

  if (paged.page > 1) {
    nav.push(
      Markup.button.callback(
        "⬅️ Prev",
        `admin_list_user_${paged.page - 1}`
      )
    );
  }

  if (paged.page < paged.totalPages) {
    nav.push(
      Markup.button.callback(
        "Next ➡️",
        `admin_list_user_${paged.page + 1}`
      )
    );
  }

  await ctx.editMessageText(
    text,
    Markup.inlineKeyboard([
      nav,
      [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
      [Markup.button.callback("🏠 Home", "home")]
    ].filter(row => row.length))
  );
});

    bot.action("admin_monitor", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const servers = getServers();

  if (!servers.length) {
    return ctx.editMessageText(
      "❌ Belum ada server.",
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
      ])
    );
  }

  const buttons = servers.map((server) => [
    Markup.button.callback(
      `🖥 ${server.name}`,
      `monitor_server_${server.code}`
    )
  ]);

  buttons.push([
    Markup.button.callback("⚙️ Panel Admin", "panel_admin")
  ]);

  await ctx.editMessageText(
`🖥 MONITORING SERVER

Pilih server yang ingin dipantau:`,
    Markup.inlineKeyboard(buttons)
  );
});

    bot.action(/^monitor_server_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const server = getServers().find(
    s => s.code === ctx.match[1]
  );

  if (!server) {
    return ctx.editMessageText("❌ Server tidak ditemukan.");
  }

  await ctx.editMessageText("⏳ Mengambil data monitoring...");

  try {
    const [
      sshMember,
      sshOnline,
      sshLimit,
      xrayMember,
      xrayOnline
    ] = await Promise.all([
      getSshMember(server),
      getSshOnline(server),
      getSshLimit(server),
      getXrayMember(server),
      getXrayOnline(server)
    ]);

    const sshOnlineTotal =
      Number(sshOnline.dropbear?.length || 0) +
      Number(sshOnline.openssh?.length || 0);

    const sshLimitWarning =
      (sshLimit.users || []).filter(
        user => user.status === "LIMIT"
      ).length;

    await ctx.editMessageText(
`🖥 MONITORING SERVER

🌐 Server : ${server.name}
🌍 Domain : ${server.domain || "-"}
📍 Lokasi : ${server.city || "-"}
🏢 ISP    : ${server.isp || "-"}

━━━━━━━━━━━━━━

👥 SSH ACCOUNT
├ Total Akun  : ${sshMember.total_users || 0}
├ Online      : ${sshOnlineTotal}
└ Limit Error : ${sshLimitWarning}

📡 XRAY ACCOUNT
├ Total Akun  : ${xrayMember.total?.all || 0}
├ VMESS       : ${xrayMember.total?.vmess || 0}
├ VLESS       : ${xrayMember.total?.vless || 0}
└ Online      : ${xrayOnline.total?.all || 0}

━━━━━━━━━━━━━━

🟢 Status Server
ONLINE`,
      Markup.inlineKeyboard([
  [
    Markup.button.callback("👥 SSH Online", `monitor_ssh_online_${server.code}_1`),
    Markup.button.callback("📡 XRAY Online", `monitor_xray_online_${server.code}_1`)
  ],
  [
    Markup.button.callback(
      "⚠️ SSH Limit",
      `monitor_ssh_limit_${server.code}`
    ),
    Markup.button.callback(
      "🔄 Refresh",
      `monitor_server_${server.code}`
    )
  ],
  [
    Markup.button.callback(
      "⬅️ Pilih Server",
      "admin_monitor"
    ),
    Markup.button.callback(
      "🏠 Home",
      "home"
    )
  ]
])
    );
  } catch (err) {
    await ctx.editMessageText(
`❌ Gagal mengambil data monitoring

${err.message}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "⬅️ Pilih Server",
            "admin_monitor"
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
  }
});

    bot.action(/^monitor_ssh_limit_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const server = getServers().find(s => s.code === ctx.match[1]);

  if (!server) {
    return ctx.editMessageText("❌ Server tidak ditemukan.");
  }

  await ctx.editMessageText("⏳ Mengambil data SSH limit...");

  try {
    const data = await getSshLimit(server);

    const limitUsers = (data.users || []).filter(
      user => user.status === "LIMIT"
    );

    let text =
`⚠️ SSH LIMIT MONITOR

🌐 Server : ${server.name}

Total Online : ${data.total_online || 0}
Melanggar    : ${limitUsers.length}

━━━━━━━━━━━━━━`;

    if (!limitUsers.length) {
      text += `

✅ Tidak ada akun yang melanggar limit IP.`;
    } else {
      limitUsers.slice(0, 20).forEach((user, index) => {
        text += `

${index + 1}. ${user.username}
├ Login IP : ${user.login_ip}
├ Limit IP : ${user.limit_ip}
└ Status   : ${user.status}`;
      });
    }

    await ctx.editMessageText(
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Refresh", `monitor_ssh_limit_${server.code}`)],
        [Markup.button.callback("⬅️ Monitoring", `monitor_server_${server.code}`)],
        [Markup.button.callback("🏠 Home", "home")]
      ])
    );
  } catch (err) {
    await ctx.editMessageText(`❌ Gagal mengambil SSH limit\n\n${err.message}`);
  }
});

    bot.action(/^monitor_ssh_online_(.+)_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const serverCode = ctx.match[1];
  const page = Number(ctx.match[2]);
  const server = getServers().find(s => s.code === serverCode);

  if (!server) return ctx.editMessageText("❌ Server tidak ditemukan.");

  const data = await getSshOnline(server);

  const all = [
    ...(data.dropbear || []).map(x => ({ ...x, protocol: "Dropbear" })),
    ...(data.openssh || []).map(x => ({ ...x, protocol: "OpenSSH" }))
  ];

  const paged = paginate(all, page, 10);

  let text =
`👥 SSH ONLINE

🌐 Server : ${server.name}
📄 Page   : ${paged.page}/${paged.totalPages}
Total    : ${all.length}

━━━━━━━━━━━━━━`;

  if (!all.length) {
    text += `\n\n😴 Belum ada akun SSH online.`;
  } else {
    paged.data.forEach((user, i) => {
      text += `

${paged.start + i + 1}. ${user.username}
├ Protocol : ${user.protocol}
├ IP       : ${user.ip || "-"}
└ PID      : ${user.pid || "-"}`;
    });
  }

  const nav = [];

  if (paged.page > 1) {
    nav.push(Markup.button.callback("⬅️ Prev", `monitor_ssh_online_${server.code}_${paged.page - 1}`));
  }

  if (paged.page < paged.totalPages) {
    nav.push(Markup.button.callback("Next ➡️", `monitor_ssh_online_${server.code}_${paged.page + 1}`));
  }

  await ctx.editMessageText(
    text,
    Markup.inlineKeyboard([
      nav,
      [Markup.button.callback("🔄 Refresh", `monitor_ssh_online_${server.code}_${paged.page}`)],
      [Markup.button.callback("⬅️ Monitoring", `monitor_server_${server.code}`)],
      [Markup.button.callback("🏠 Home", "home")]
    ].filter(row => row.length))
  );
});

    bot.action(/^monitor_xray_online_(.+)_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const serverCode = ctx.match[1];
  const page = Number(ctx.match[2]);
  const server = getServers().find(s => s.code === serverCode);

  if (!server) return ctx.editMessageText("❌ Server tidak ditemukan.");

  const data = await getXrayOnline(server);

  const all = [
    ...(data.vmess || []).map(x => ({ ...x, type: "VMESS" })),
    ...(data.vless || []).map(x => ({ ...x, type: "VLESS" }))
  ];

  const paged = paginate(all, page, 10);

  let text =
`📡 XRAY ONLINE

🌐 Server : ${server.name}
📄 Page   : ${paged.page}/${paged.totalPages}
Total    : ${all.length}

━━━━━━━━━━━━━━`;

  if (!all.length) {
    text += `\n\n😴 Belum ada akun XRAY online.`;
  } else {
    paged.data.forEach((user, i) => {
      text += `

${paged.start + i + 1}. ${user.username}
├ Type   : ${user.type}
├ Login  : ${user.last_login || "-"}
├ IP     : ${user.login_ip || 0}/${user.ip_limit || "-"}
└ Quota  : ${user.usage_quota || "0B"} / ${user.limit_quota || "-"}`;
    });
  }

  const nav = [];

  if (paged.page > 1) {
    nav.push(Markup.button.callback("⬅️ Prev", `monitor_xray_online_${server.code}_${paged.page - 1}`));
  }

  if (paged.page < paged.totalPages) {
    nav.push(Markup.button.callback("Next ➡️", `monitor_xray_online_${server.code}_${paged.page + 1}`));
  }

  await ctx.editMessageText(
    text,
    Markup.inlineKeyboard([
      nav,
      [Markup.button.callback("🔄 Refresh", `monitor_xray_online_${server.code}_${paged.page}`)],
      [Markup.button.callback("⬅️ Monitoring", `monitor_server_${server.code}`)],
      [Markup.button.callback("🏠 Home", "home")]
    ].filter(row => row.length))
  );
});

    bot.action("admin_stats", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const users = getAllUsers();
  const accounts = getAllAccounts();
  const servers = getServers();
  const trx = getTransactionStats();

  const totalUsers =
    users.filter(u => u.role === "user").length;

  const totalReseller =
    users.filter(u => u.role === "reseller").length;

  const totalAdmin =
    users.filter(u => u.role === "admin").length;

  const activeAccounts =
    accounts.filter(a => a.status === "active").length;

  const lockedAccounts =
    accounts.filter(a => a.status === "locked").length;

  const expiredAccounts =
    accounts.filter(a => a.status === "expired").length;

  const totalBalance = users.reduce(
    (sum, user) => sum + Number(user.balance || 0),
    0
  );

  await ctx.editMessageText(
`📊 STATISTIK BOT

👤 User      : ${totalUsers}
👑 Reseller  : ${totalReseller}
🛡 Admin     : ${totalAdmin}

🌐 Server    : ${servers.length}

📦 Total Akun : ${accounts.length}
🟢 Active     : ${activeAccounts}
🔴 Locked     : ${lockedAccounts}
⚫ Expired    : ${expiredAccounts}

💰 Total Saldo User
Rp${totalBalance.toLocaleString("id-ID")}

➕ Total Credit
Rp${trx.credit.toLocaleString("id-ID")}

➖ Total Debit
Rp${trx.debit.toLocaleString("id-ID")}`,
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "🔄 Refresh",
        "admin_stats"
      )
    ],
    [
      Markup.button.callback(
        "⚙️ Panel Admin",
        "panel_admin"
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

    bot.action("admin_add_balance", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();
  await ctx.scene.enter("add-balance");
});

    bot.action("admin_edit_server", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const servers = getServers();

  if (!servers.length) {
    return ctx.editMessageText(
      "❌ Belum ada server.",
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
      ])
    );
  }

  const buttons = servers.map((server) => [
    Markup.button.callback(
      server.name,
      `edit_server_${server.code}`
    )
  ]);

  buttons.push([
    Markup.button.callback("⚙️ Panel Admin", "panel_admin")
  ]);

  await ctx.editMessageText(
`✏️ EDIT SERVER

Pilih server yang ingin diedit:`,
    Markup.inlineKeyboard(buttons)
  );
});

    bot.action(/^edit_server_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  await ctx.scene.enter("edit-server", {
    serverCode: ctx.match[1]
  });
});
    
    bot.action("admin_delete_server", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const servers = getServers();

  if (!servers.length) {
    return ctx.editMessageText(
      "❌ Belum ada server.",
      Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ Panel Admin", "panel_admin")]
      ])
    );
  }

  const buttons = servers.map(server => [
    Markup.button.callback(
      server.name,
      `delete_server_${server.code}`
    )
  ]);

  buttons.push([
    Markup.button.callback(
      "⚙️ Panel Admin",
      "panel_admin"
    )
  ]);

  await ctx.editMessageText(
`🗑 HAPUS SERVER

Pilih server yang ingin dihapus:`,
    Markup.inlineKeyboard(buttons)
  );
});

    bot.action("admin_set_reseller", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();
  await ctx.scene.enter("set-reseller");
});

    bot.action(/^delete_server_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const code = ctx.match[1];
  const server = getServers().find(s => s.code === code);

  if (!server) {
    return ctx.editMessageText("❌ Server tidak ditemukan.");
  }

  await ctx.editMessageText(
`🗑 HAPUS SERVER

Nama : ${server.name}
Code : ${server.code}

Yakin ingin menghapus server ini?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "✅ Ya, Hapus",
          `confirm_delete_server_${server.code}`
        )
      ],
      [
        Markup.button.callback(
          "❌ Batal",
          "admin_delete_server"
        )
      ]
    ])
  );
});

bot.action(/^confirm_delete_server_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  const code = ctx.match[1];

  deleteServer(code);

  await ctx.editMessageText(
`✅ SERVER BERHASIL DIHAPUS

Code: ${code}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⚙️ Panel Admin", "panel_admin")],
      [Markup.button.callback("🏠 Home", "home")]
    ])
  );
});

    bot.action("admin_broadcast", async (ctx) => {
  if (!isAdmin(ctx)) return;

  await ctx.answerCbQuery();

  await ctx.scene.enter("broadcast");
});
  }
};