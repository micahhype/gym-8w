// Test end-to-end Gym Book qua Chrome DevTools Protocol, khổ màn hình 400×860.
// Chạy bằng tests/run.sh. Thêm --shots để lưu ảnh chụp vào tests/shots/ (không commit).
import fs from "fs";
const port = 9333, base = "http://localhost:8765/", SHOTS = process.argv.includes("--shots");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const errs = [];
ws.onmessage = m => { const d = JSON.parse(m.data);
  if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === "Runtime.exceptionThrown") errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errs.push(d.params.args.map(a => a.value).join(" ")); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + " -> " + r.result.exceptionDetails.exception?.description); return r.result.result.value; };
const shot = async f => { if (!SHOTS) return; fs.mkdirSync("tests/shots", { recursive: true });
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync("tests/shots/" + f, Buffer.from(r.result.data, "base64")); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const reload = async () => { await send("Page.reload"); await sleep(1000); };
/** Ghi dữ liệu mẫu (d = seed() đã sửa bằng js) rồi tải lại trang. */
const put = async js => { await ev(`(() => { localStorage.clear(); const d = seed(); ${js}; localStorage.setItem("soSat.v2", JSON.stringify(d)); })()`); await reload(); };
const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const type = (sel, v) => ev(`{ const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', {bubbles:true})) }`);
const noOverflow = async m => ok(await ev(`document.documentElement.scrollWidth <= 400`), "không tràn ngang: " + m);
await send("Runtime.enable"); await send("Page.enable"); await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: base }); await sleep(1000);

console.log("== Màn hình chào");
await ev(`localStorage.clear()`); await reload();
ok(await ev(`tab === "setup" && document.body.classList.contains("onb")`), "người mới: màn hình chào");
ok(await ev(`getComputedStyle(document.querySelector("nav")).display === "none"`), "ẩn thanh tab");
ok(await ev(`!!document.querySelector('[data-onb=profile]') && !!document.querySelector('#importBtn')`), "có Bắt đầu mới + Nhập dữ liệu cũ");
ok(await ev(`new Date(S.profile.startDate + "T00:00:00").getDay()`) === 1, "ngày bắt đầu mặc định là thứ Hai");
await shot("onb-welcome.png"); await noOverflow("màn chào");
await click("[data-onb=profile]"); await sleep(150);
await type("#p-age", "25"); await type("#p-height", "170"); await type("#p-weight", "60");
await shot("onb-profile.png"); await noOverflow("hồ sơ");
await click(".btn[data-onb=program]"); await sleep(150);
ok(await ev(`document.querySelectorAll('[data-pick]').length`) === 5, "bước 2: 5 giáo án");
await shot("onb-program.png"); await noOverflow("chọn giáo án");
await click("[data-pick=ul4]"); await sleep(200);
ok(await ev(`tab === "train" && S.setupDone && S.programId === "ul4" && S.days[0].name === "Thân trên 1"`), "chọn Trên/Dưới → vào tab Tập");
ok(await ev(`+S.profile.weight === 60 && !!targets()`), "hồ sơ đã lưu");
ok(await ev(`getComputedStyle(document.querySelector("nav")).display !== "none"`), "hiện lại thanh tab");
await reload(); ok(await ev(`tab === "train" && S.programId === "ul4"`), "tải lại không hỏi lại");
await ev(`localStorage.clear()`); await reload();
await click("[data-onb=profile]"); await sleep(100);
await ev(`[...document.querySelectorAll('[data-onb=program]')].find(b => b.textContent.trim() === "Bỏ qua").click()`); await sleep(100);
await click("[data-pick=fb3]"); await sleep(150);
ok(await ev(`tab === "train" && S.programId === "fb3" && !targets()`), "bỏ qua hồ sơ vẫn tập được");
const backup = await ev(`(() => { const d = seed("ppl"); Object.assign(d.profile, {weight: 58, age: 29, height: 172});
  const e = d.days[0].exercises[0]; d.log["2026-09-20|" + d.days[0].id + "|" + e.id] = [{kg:"50",reps:"8"}]; delete d.setupDone; return JSON.stringify(d); })()`);
const fp = fs.mkdtempSync("/tmp/gymbook-") + "/backup.json"; fs.writeFileSync(fp, backup);
await ev(`localStorage.clear()`); await reload();
const doc = await send("DOM.getDocument"), q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#importFile" });
await send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [fp] }); await sleep(600);
ok(await ev(`tab === "train" && S.setupDone && Object.keys(S.log).length === 1 && +S.profile.weight === 58`), "nhập file từ màn chào → tab Tập, đủ dữ liệu");
await put(`delete d.setupDone; d.bw = [{date: "2026-09-01", kg: 55}]`);
ok(await ev(`tab === "train"`), "dữ liệu cũ (chưa có cờ) đã có cân nặng: không hiện màn chào");
await put(`delete d.setupDone`);
ok(await ev(`tab === "setup"`), "dữ liệu cũ nhưng trống: hiện màn chào");
await put(`d.setupDone = true`);
await click("[data-tab=me]"); await sleep(150);
ok(await ev(`!!document.querySelector('#importBtn') && !!document.querySelector('#exportBtn') && !!document.querySelector('[data-usetpl=ul4]')`), "tab Tôi chưa có hồ sơ vẫn có Dữ liệu + Giáo án");

console.log("== Giáo án mẫu");
await put(`d.profile = { ...d.profile, age: 29, height: 172, weight: 56, startDate: "2026-09-01" };
  const push = d.days[0], legs = d.days[2], f = n => push.exercises.find(e => e.name === n);
  d.log["2026-09-20|" + push.id + "|" + f("Bench Press").id] = [{kg:"50",reps:"8"},{kg:"50",reps:"7"}];
  d.log["2026-09-20|" + push.id + "|" + f("Lateral Raise").id] = [{kg:"8",reps:"14"}];
  d.log["2026-09-22|" + legs.id + "|" + legs.exercises[0].id] = [{kg:"55",reps:"8"}];
  delete d.programId; delete d.setupDone`);
ok(await ev(`tab === "train" && tplOf(S.programId).id === "ppl"`), "người dùng cũ: PPL, không màn chào");
ok(await ev(`TPL.every(t => tplDays(t).every(d => d.exercises.every(e => e.fig && FIGLABEL[e.fig] && e.alts.length && (MUSCLE_OF[e.name] || /Leg Raise|Gập bụng/.test(e.name)))))`), "mọi bài có ảnh, bài thay thế, nhóm cơ");
await click("[data-tab=me]"); await sleep(150);
await shot("me.png"); await noOverflow("tab Tôi");
await ev(`window.confirm = () => true`); await click("[data-usetpl=ul4]"); await sleep(250);
ok(await ev(`S.programId === "ul4" && tab === "train" && S.oldDays.flatMap(d => d.exercises).length === 3`), "đổi giáo án, cất 3 bài có nhật ký");
ok(await ev(`suggest(eff(day().exercises[0], curDate, curDay), 0).kg`) === "50", "Bench gợi ý theo lịch sử cũ");
await click("[data-tab=history]"); await sleep(150);
const hist = await ev(`document.querySelector('#view').textContent`);
ok(!/Bài đã xoá/.test(hist) && /Buổi Đẩy/.test(hist) && /Bench Press/.test(hist), "nhật ký giữ tên buổi/bài cũ");
await reload(); ok(await ev(`S.programId === "ul4" && S.oldDays.length === 2`), "tải lại giữ giáo án");
await click("[data-tab=me]"); await sleep(100); await ev(`window.confirm = () => true`);
await click("[data-usetpl=fb2]"); await sleep(100); await click("[data-tab=me]"); await sleep(100); await click("#resetBtn"); await sleep(100);
ok(await ev(`S.programId === "fb2" && S.days[0].name === "Tối thiểu A"`), "khôi phục gốc giữ giáo án đang chọn");
ok(await ev(`cooldown({name:"Thân dưới 1"}).includes("st-quad") && cooldown({name:"Thân trên 2"}).includes("st-latwall")`), "giãn cơ theo Thân trên/dưới");

console.log("== Ghi chú chung");
ok(await ev(`!tplDays(tplOf("ppl")).some(d => d.exercises.some(e => /mức cũ|với bạn|bàn phím/.test(e.note)))`), "giáo án PPL không còn ghi chú riêng");
await put(`d.setupDone = true; const sq = d.days[2].exercises[0], dl = d.days[1].exercises[0];
  sq.note = "Bài quan trọng nhất với bạn — squat đang là lift yếu nhất so với thân trên. Xuống tới khi đùi song song sàn.";
  dl.note = "Khởi điểm 52.5kg ≈ 65% mức cũ 80kg — tôi tự thêm dòng này"`);
ok(await ev(`S.days[2].exercises[0].note.startsWith("Đùi trước, bài chính")`), "dữ liệu cũ: ghi chú nguyên văn được thay");
ok(await ev(`S.days[1].exercises[0].note.endsWith("tôi tự thêm dòng này")`), "ghi chú người dùng đã sửa thì giữ");

console.log("== Nhật ký, tuần");
await put(`d.setupDone = true; d.profile.startDate = "2026-09-02";
  const add = (date, di, n) => { const x = d.days[di]; x.exercises.slice(0, n).forEach(e => d.log[date + "|" + x.id + "|" + e.id] = [{kg:"40",reps:"8"},{kg:"42.5",reps:"6"}]); };
  add("2026-09-15", 0, 5); add("2026-09-21", 0, 3); add("2026-09-22", 1, 4); add("2026-09-24", 2, 6); add("2026-09-28", 0, 5)`);
await click("[data-tab=history]"); await sleep(200);
ok(await ev(`[...document.querySelectorAll('details.sess')].length === 5 && [...document.querySelectorAll('details.sess')].every(x => !x.open)`), "5 buổi, thu gọn sẵn");
let heads = await ev(`[...document.querySelectorAll('.wkhead')].map(x => x.textContent).join(" | ")`);
ok(heads === "Tuần 4 · 23/09 – 29/09 · 2 buổi | Tuần 3 · 16/09 – 22/09 · 2 buổi | Tuần 2 · 09/09 – 15/09 · 1 buổi", "tiêu đề tuần có khoảng ngày: " + heads);
await ev(`document.querySelector('details.sess summary').click()`); await sleep(100);
ok(await ev(`document.querySelector('details.sess').open && document.querySelector('details.sess').querySelectorAll('.lrow').length === 5`), "bấm mở xem chi tiết");
await shot("history.png"); await noOverflow("nhật ký");
await click("[data-tab=me]"); await sleep(100);
ok(await ev(`document.querySelector('[data-snapmon]')?.dataset.snapmon`) === "2026-08-31", "gợi ý lùi về thứ Hai 31/08");
await click("[data-snapmon]"); await sleep(150);
await click("[data-tab=history]"); await sleep(150);
heads = await ev(`[...document.querySelectorAll('.wkhead')].map(x => x.textContent).join(" | ")`);
ok(heads.startsWith("Tuần 5 · 28/09 – 04/10 · 1 buổi | Tuần 4 · 21/09 – 27/09 · 3 buổi"), "sau khi lùi: tuần thứ Hai – Chủ nhật");

console.log("== Bỏ qua bài");
// Buổi Đẩy (PPL): 0 Bench · 1 Incline · 2 OHP · 3 Lateral · 4 Pushdown (phụ). Incline đã tập xong.
const today_ = await ev(`today()`);
await put(`d.setupDone = true; const x = d.days[0];
  d.log["${today_}|" + x.id + "|" + x.exercises[1].id] = [1,2,3].map(() => ({kg:"16",reps:"10"}))`);
await ev(`curDay = S.days[0].id; exIdx = 0; render()`);
await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`exIdx`) === 2, "bỏ qua Bench → sang OHP, bỏ qua Incline đã xong");
await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`exIdx`) === 3, "bỏ qua OHP → Lateral");
await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`exIdx === 3 && document.querySelector('#view').textContent.includes("Xong bài chính")`), "hết bài chính, còn bài phụ: ở lại hỏi làm bài phụ hay về");
await ev(`exIdx = 4; render()`); await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`document.querySelector('#view').textContent.includes("Xong buổi")`), "hết mọi bài: màn Xong buổi");
// vòng lại: bài trước còn dở thì quay về bài đó
await put(`d.setupDone = true`);
await ev(`curDay = S.days[0].id; exIdx = 2; render()`);
await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`exIdx`) === 3, "bỏ qua OHP → Lateral");
await ev(`exIdx = 4; render()`); await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`exIdx`) === 0, "bỏ qua bài cuối → vòng lại Bench còn dở");
// ẩn bài phụ: xong hết bài chính là Xong buổi
await put(`d.setupDone = true; d.hideOpt = true; const x = d.days[0];
  [0,1,2].forEach(i => d.log["${today_}|" + x.id + "|" + x.exercises[i].id] = Array.from({length: x.exercises[i].sets}, () => ({kg:"20",reps:"8"})))`);
await ev(`curDay = S.days[0].id; exIdx = 3; render()`);
await click("[data-skip=rest]"); await sleep(150);
ok(await ev(`document.querySelector('#view').textContent.includes("Xong buổi")`), "ẩn bài phụ + xong bài chính → Xong buổi");
// bỏ từng set: chỉ chuyển khi bài đã xong
await put(`d.setupDone = true`);
await ev(`curDay = S.days[0].id; exIdx = 0; render()`);
await click("[data-skip=one]"); await sleep(120);
ok(await ev(`exIdx`) === 0, "bỏ 1 set, bài chưa xong: ở lại");
// nút "Bài tiếp" sau khi tập xong trỏ tới bài chưa tập
await put(`d.setupDone = true; const x = d.days[0];
  [0,1].forEach(i => d.log["${today_}|" + x.id + "|" + x.exercises[i].id] = Array.from({length: x.exercises[i].sets}, () => ({kg:"20",reps:"8"})))`);
await ev(`curDay = S.days[0].id; exIdx = 0; render()`);
ok(await ev(`document.querySelector('.btn.jade[data-jump]')?.dataset.jump`) === "2", "Bài tiếp bỏ qua bài đã xong");

console.log("== Giữ màn hình sáng");
await put(`d.setupDone = true`);
const lock = () => ev(`new Promise(r => setTimeout(() => r(!!wakeLock && !wakeLock.released), 300))`);
ok(await lock(), "tab Tập: giữ sáng");
await click("[data-tab=me]"); ok(!(await lock()), "tab Tôi: thả");
await ev(`{ const c = document.querySelector('#keepAwake'); c.checked = false; c.dispatchEvent(new Event('input', {bubbles:true})) }`);
await click("[data-tab=train]"); ok(!(await lock()), "tắt tuỳ chọn: không giữ");
await put(`d.setupDone = true; d.keepAwake = true`); ok(await lock(), "bật lại: giữ");
ok(await ev(`!NATIVE`), "bản web không bật nhánh Android");

ok(errs.length === 0, "không lỗi console: " + errs.join(" | "));
console.log(`\n${pass} pass, ${fail} fail`);
ws.close(); process.exit(fail ? 1 : 0);
