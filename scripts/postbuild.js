import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(".output/public");
const destDir = path.resolve("dist");

if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });

  const shellHtml = path.join(destDir, "_shell.html");
  const indexHtml = path.join(destDir, "index.html");

  if (fs.existsSync(shellHtml) && !fs.existsSync(indexHtml)) {
    fs.copyFileSync(shellHtml, indexHtml);
  }

  console.log("Successfully prepared dist/ with index.html for static deployment");
}
