import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(".output/public");
const destDir = path.resolve("dist");
const clientDestDir = path.resolve("dist/client");

if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, clientDestDir, { recursive: true, force: true });

  const shellHtml = path.join(destDir, "_shell.html");
  const indexHtml = path.join(destDir, "index.html");
  const baseHtml = fs.existsSync(indexHtml) ? indexHtml : shellHtml;

  if (fs.existsSync(baseHtml)) {
    if (!fs.existsSync(indexHtml)) fs.copyFileSync(baseHtml, indexHtml);
    const clientIndex = path.join(clientDestDir, "index.html");
    if (!fs.existsSync(clientIndex)) fs.copyFileSync(baseHtml, clientIndex);

    const adminDirs = [path.join(destDir, "admin"), path.join(clientDestDir, "admin")];
    for (const adminDir of adminDirs) {
      if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });
      fs.copyFileSync(baseHtml, path.join(adminDir, "index.html"));
    }
  }

  console.log("Successfully prepared dist/ and dist/client/ with index.html and admin fallback");
}
