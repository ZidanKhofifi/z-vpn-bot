const { registerAdminPanel } = require("./admin/panel");
const registerAdminServer = require("./admin/server");

module.exports = (bot) => {
  registerAdminPanel(bot);
  registerAdminServer(bot);
};