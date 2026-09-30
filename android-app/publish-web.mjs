// Đẩy bản web mới cho app Android tự cập nhật (không cần cài lại APK).
// Gói www/ thành zip, đưa lên repo public tandnguyendev/forma-app (GitHub Pages)
// cùng update.json; app đọc update.json, tải zip, áp khi tắt hẳn rồi mở lại.
// Dùng: node publish-web.mjs            (build mới rồi đẩy)
//       node publish-web.mjs --same     (đẩy đúng bản vừa build vào APK)
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { copyWeb, buildId } from "./copy-web.mjs";
const REPO = "tandnguyendev/forma-app", SITE = "https://tandnguyendev.github.io/forma-app/";
const dist = homedir() + "/.cache/forma-app";
const sh = (c, cwd) => execSync(c, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const verFile = new URL("www-version.txt", import.meta.url);
const version = process.argv.includes("--same") && existsSync(verFile) ? readFileSync(verFile, "utf8").trim() : buildId();
copyWeb(version);
if (!existsSync(dist + "/.git")) sh(`gh repo clone ${REPO} ${dist}`);
// repo mới tạo chưa có nhánh nào: bỏ qua pull, đẩy lần đầu lên main
const hasMain = sh("git ls-remote --heads origin main", dist) !== "";
if (hasMain) sh("git pull -q --rebase origin main", dist); else sh("git checkout -q -B main", dist);
mkdirSync(dist + "/bundles", { recursive: true });
const zip = `bundles/forma-${version.replace(/[^\w.-]/g, "_")}.zip`;
sh(`zip -qr -X ${dist}/${zip} .`, new URL("www/", import.meta.url).pathname);
// giữ 5 gói gần nhất
const old = readdirSync(dist + "/bundles").filter(f => f.endsWith(".zip")).sort().reverse().slice(5);
old.forEach(f => rmSync(`${dist}/bundles/${f}`));
writeFileSync(dist + "/update.json", JSON.stringify({ version, url: SITE + zip, date: new Date().toISOString() }, null, 2) + "\n");
if (!existsSync(dist + "/.nojekyll")) writeFileSync(dist + "/.nojekyll", "");
sh("git add -A", dist);
sh(`git commit -q -m "Bản ${version}"`, dist);
sh("git push -q -u origin main", dist);
console.log(`đã đẩy bản ${version} → ${SITE}update.json (GitHub Pages cần ~1 phút)`);
