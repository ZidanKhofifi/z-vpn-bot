const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(
  __dirname,
  "../data/database.sqlite"
);

function restoreDatabase(tempFile) {

  if (!fs.existsSync(tempFile)) {
    throw new Error("File backup tidak ditemukan");
  }

  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(
      DB_FILE,
      `${DB_FILE}.bak`
    );
  }

  fs.copyFileSync(
    tempFile,
    DB_FILE
  );

  return true;
}

module.exports = {
  restoreDatabase
};