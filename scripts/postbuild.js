import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(".output/public");
const destDir = path.resolve("dist");
const clientDestDir = path.resolve("dist/client");

if (fs.existsSync(srcDir)) {
  // Populate dist/ and dist/client/
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, clientDestDir, { recursive: true, force: true });

  const shellHtml = path.join(destDir, "_shell.html");
  const indexHtml = path.join(destDir, "index.html");
  const clientIndexHtml = path.join(clientDestDir, "index.html");

  if (fs.existsSync(shellHtml)) {
    if (!fs.existsSync(indexHtml)) fs.copyFileSync(shellHtml, indexHtml);
    if (!fs.existsSync(clientIndexHtml)) fs.copyFileSync(shellHtml, clientIndexHtml);
  }

  console.log("Successfully prepared dist/ and dist/client/ with index.html for static deployment");
}
