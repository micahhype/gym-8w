// Chép bản web ở thư mục gốc repo sang www/ cho Capacitor. Không chép sw.js:
// app Android đã có sẵn file trong máy, không cần service worker.
import { cpSync, rmSync, mkdirSync } from "node:fs";
const root = new URL("../", import.meta.url), www = new URL("www/", import.meta.url);
rmSync(www, { recursive: true, force: true });
mkdirSync(www);
for (const f of ["index.html", "manifest.webmanifest", "favicon.svg", "favicon-32.png",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png", "img"])
  cpSync(new URL(f, root), new URL(f, www), { recursive: true });
console.log("đã chép web vào www/");
