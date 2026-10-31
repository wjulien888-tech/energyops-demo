const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const root = path.join(__dirname, "../dist");
const index = path.join(root, "index.html");
const before = fs.readFileSync(index, "utf8");
const after = before.replace(
  /(src|href)="([^"?]+\.(?:js|css))(?:\?v=[^" ]*)?"/g,
  (_, attr, name) => {
    const file = path.join(root, name);
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex")
      .slice(0, 12);
    return `${attr}="${name}?v=${hash}"`;
  },
);
if (process.argv.includes("--check")) {
  if (before !== after) {
    console.error("Asset versions are stale. Run npm run prepare:site.");
    process.exit(1);
  }
  console.log("Asset versions verified.");
} else {
  fs.writeFileSync(index, after);
  console.log("Asset versions updated.");
}
