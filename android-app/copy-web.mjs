// Chép bản web ở thư mục gốc repo sang www/ cho Capacitor và điền APP_BUILD.
// Không chép sw.js: app Android đã có sẵn file trong máy, không cần service worker.
// Dùng: node copy-web.mjs [phiên-bản]  (bỏ trống: ngày giờ + mã commit)
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const root = new URL("../", import.meta.url), www = new URL("www/", import.meta.url);
export function buildId() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  const git = c => execSync(c, { cwd: root.pathname }).toString().trim();
  // "+" = index.html đang có sửa chưa commit
  const sha = git("git rev-parse --short HEAD"), dirty = git("git status --porcelain -- index.html") ? "+" : "";
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${p(d.getHours())}${p(d.getMinutes())}-${sha}${dirty}`;
}
export function copyWeb(version) {
  rmSync(www, { recursive: true, force: true });
  mkdirSync(www);
  for (const f of ["index.html", "manifest.webmanifest", "favicon.svg", "favicon-32.png",
    "apple-touch-icon.png", "icon-192.png", "icon-512.png", "img"])
    cpSync(new URL(f, root), new URL(f, www), { recursive: true });
  const idx = new URL("index.html", www), html = readFileSync(idx, "utf8");
  if (!html.includes('const APP_BUILD = "dev";')) throw new Error("index.html thiếu dòng APP_BUILD");
  writeFileSync(idx, html.replace('const APP_BUILD = "dev";', `const APP_BUILD = ${JSON.stringify(version)};`));
  return version;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const v = copyWeb(process.argv[2] || buildId());
  writeFileSync(new URL("www-version.txt", import.meta.url), v + "\n");
  console.log("đã chép web vào www/ · phiên bản " + v);
}
