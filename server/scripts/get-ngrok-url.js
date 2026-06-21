#!/usr/bin/env node
const { fetchNgrokUrl } = require("../src/tunnel");

fetchNgrokUrl().then((url) => {
  if (url) {
    process.stdout.write(url.replace(/\/$/, ""));
    process.exit(0);
  }
  process.exit(1);
});
