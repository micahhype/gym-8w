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
await send("Emulation.setFocusEmulationEnabled", { enabled: true });  // headless không có focus thật → focusin không bắn
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
fs.rmSync(fp.replace(/\/backup\.json$/, ""), { recursive: true, force: true });
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

console.log("== Sửa set khi đang nghỉ");
await put(`d.setupDone = true`);
await ev(`curDay = S.days[0].id; exIdx = 0; tab = "train"; render()`);
await ev(`$("#kgVal").value = "40"; $("#repVal").value = "8"`); await click("#logSet"); await sleep(150);
ok(await ev(`restEnd > Date.now() && !!document.querySelector(".rest #restNum")`), "ghi set → đang nghỉ");
const end0 = await ev(`restEnd`);
await click('[data-edit="0"]'); await sleep(120);
ok(await ev(`restEnd`) === end0 && await ev(`!!$("#kgVal") && !!document.querySelector(".restmini #restNum")`), "bấm sửa set: đồng hồ vẫn chạy, hiện ở dòng nhỏ");
await sleep(1200);
ok(await ev(`(t => t.includes(":") && t !== "3:00")(document.querySelector(".restmini #restNum").textContent)`), "dòng nhỏ vẫn đếm ngược");
await ev(`$("#kgVal").value = "42.5"`); await click("#logSet"); await sleep(150);
ok(await ev(`S.log[lkey(curDate, curDay, day().exercises[0].id)][0].kg`) === "42.5", "lưu sửa set");
ok(await ev(`restEnd`) === end0 && await ev(`!!document.querySelector(".rest #restNum")`), "sửa xong: quay lại màn nghỉ, giờ không đổi");
await click('[data-edit="0"]'); await sleep(80); await click("#cancelEdit"); await sleep(80);
ok(await ev(`restEnd === ${end0} && !!document.querySelector(".rest #restNum")`), "huỷ sửa: vẫn đang nghỉ");
// hết giờ nghỉ đúng lúc đang sửa: không mất số đang gõ
await ev(`restEnd = Date.now() + 1200`); await click('[data-edit="0"]'); await sleep(80);
await ev(`$("#kgVal").value = "45"`); await sleep(1800);
ok(await ev(`$("#kgVal") && $("#kgVal").value`) === "45" && await ev(`document.querySelector(".restmini").textContent`) === "Hết giờ nghỉ", "hết giờ khi đang sửa: giữ số đang gõ, báo 'Hết giờ nghỉ'");
await click("#logSet"); await sleep(120);
ok(await ev(`S.log[lkey(curDate, curDay, day().exercises[0].id)][0].kg === "45" && restEnd === 0`), "lưu được sau khi hết giờ");
await noOverflow("sửa set khi nghỉ");

console.log("== Đổi 3 bài PPL (v7)");
ok(await ev(`(() => { const n = tplDays(tplOf("ppl")).flatMap(d => d.exercises.map(e => e.name));
  return n.includes("Duỗi tay sau qua đầu") && n.includes("Leg Curl ngồi máy") && n.includes("Incline Dumbbell Curl")
    && !n.includes("Triceps Pushdown") && !n.includes("Leg Curl") && !n.includes("Dumbbell Curl"); })()`), "giáo án PPL mới có 3 bài mới");
// dữ liệu v6: tên bài cũ, đã tập, một buổi từng dùng Leg Curl ngồi máy làm bài thay thế
await put(`d.setupDone = true; d.progVersion = 6;
  const back = { "Duỗi tay sau qua đầu": "Triceps Pushdown", "Leg Curl ngồi máy": "Leg Curl", "Incline Dumbbell Curl": "Dumbbell Curl" };
  d.days.forEach(x => x.exercises.forEach(e => { if (back[e.name]) { e.name = back[e.name]; e.alts = altsFor(e.name); e.fig = FIGKEY[e.name]; e.note = "cũ"; } }));
  const f = n => { for (const x of d.days) for (const e of x.exercises) if (e.name === n) return [x, e]; };
  const [p1, pd] = f("Triceps Pushdown"), [p2, lc] = f("Leg Curl"), [p3, dc] = f("Dumbbell Curl");
  d.log["2026-09-20|" + p1.id + "|" + pd.id] = [{kg:"20",reps:"12"},{kg:"20",reps:"11"}];
  d.log["2026-09-22|" + p2.id + "|" + lc.id] = [{kg:"30",reps:"12"}];
  d.log["2026-09-15|" + p2.id + "|" + lc.id] = [{kg:"25",reps:"12"}];
  d.swap["2026-09-15|" + p2.id + "|" + lc.id] = "seated-leg-curl";
  d.log["2026-09-21|" + p3.id + "|" + dc.id] = [{kg:"10",reps:"10"}];
  window.__ids = [pd.id, lc.id, dc.id]; d.__ids = [pd.id, lc.id, dc.id]`);
const v7 = await ev(`(() => { const ids = JSON.parse(localStorage.getItem("soSat.v2")).__ids;
  const all = S.days.flatMap(x => x.exercises.map(e => [x, e])), by = id => all.find(([, e]) => e.id === id);
  return { v: S.progVersion, names: ids.map(id => by(id)[1].name), starts: ids.map(id => by(id)[1].start),
    figs: ids.map(id => by(id)[1].fig), notes: ids.map(id => by(id)[1].note),
    sw: Object.fromEntries(Object.entries(S.swap)), ids,
    sug: ids.map(id => { const [x, e] = by(id); curDay = x.id; return suggest(eff(e, curDate, x.id), 0).kg; }) }; })()`);
ok(v7.v === 7, "lên progVersion 7");
ok(JSON.stringify(v7.names) === JSON.stringify(["Duỗi tay sau qua đầu", "Leg Curl ngồi máy", "Incline Dumbbell Curl"]), "đổi tên, giữ id: " + v7.names);
ok(JSON.stringify(v7.figs) === JSON.stringify(["ohext", "seatedlegcurl", "inclinecurl"]) && !v7.notes.includes("cũ"), "ảnh và ghi chú của bài mới");
ok(JSON.stringify(v7.starts) === JSON.stringify([15, 30, 8]), "khởi điểm ước từ bài cũ (20×0.7→15, 30, 10−2): " + v7.starts);
// Leg Curl ngồi máy: buổi 15/09 từng tập đúng máy này (25kg) → dùng lịch sử thật thay vì ước lượng
ok(JSON.stringify(v7.sug.map(Number)) === JSON.stringify([15, 25, 8]), "gợi ý: khởi điểm mới, hoặc lịch sử thật của đúng bài mới: " + v7.sug);
const swv = Object.values(v7.sw).sort().join(",");
ok(swv === "db-curl,lying-leg-curl,pushdown", "set cũ gắn nhãn bài thay thế tên cũ, buổi dùng bài mới làm bài thay → thành bài chính: " + swv);
await click("[data-tab=history]"); await sleep(150);
const h7 = await ev(`document.querySelector('#view').textContent`);
ok(/Triceps Pushdown/.test(h7) && /Leg Curl nằm máy/.test(h7) && /Dumbbell Curl/.test(h7) && /Leg Curl ngồi máy/.test(h7) && !/bài thay đã xoá|Bài đã xoá/.test(h7), "nhật ký cũ vẫn đúng tên bài đã tập");
// máy bận: chọn lại Triceps Pushdown thì gợi ý theo tạ cũ
await ev(`(() => { const id = JSON.parse(localStorage.getItem("soSat.v2")).__ids[0]; const x = S.days.find(x => x.exercises.some(e => e.id === id));
  curDay = x.id; exIdx = x.exercises.findIndex(e => e.id === id); tab = "train"; render(); })()`);
await click('[data-alt="pushdown"]'); await sleep(150);
ok(await ev(`$("#kgVal").value`) === "20", "dùng Pushdown làm bài thay: gợi ý 20kg như cũ");
await reload();
ok(await ev(`S.progVersion === 7 && Object.values(S.swap).filter(v => v === "pushdown").length >= 1`), "tải lại không chuyển đổi hai lần");
await put(`d.setupDone = true; d.programId = "ul4"; d.progVersion = 6; d.days = tplDays(tplOf("ulppl"));
  const e = d.days[0].exercises.find(e => e.name === "Triceps Pushdown"); d.log["2026-09-20|" + d.days[0].id + "|" + e.id] = [{kg:"20",reps:"12"}]`);
ok(await ev(`S.days[0].exercises.some(e => e.name === "Triceps Pushdown")`), "giáo án khác PPL: không đổi bài");

console.log("== Ăn uống");
await put(`d.setupDone = true; Object.assign(d.profile, { age: 29, height: 172, weight: 56 })`);
ok(await ev(`document.querySelectorAll("nav .tab").length`) === 4, "thanh tab có 4 mục");
await click("[data-tab=an]"); await sleep(150);
ok(await ev(`tab === "an" && foodDate === today()`), "mở tab Ăn ở ngày hôm nay");
ok(await ev(`document.querySelectorAll("[data-fav]").length`) === 6, "6 món quen mặc định");
await shot("food-empty.png"); await noOverflow("tab Ăn");
await click("[data-fav]"); await sleep(120);
ok(await ev(`foodTotals(today()).kcal`) === 750 && await ev(`foodDay(today())[0].t.length`) === 5, "bấm món quen → ghi 750 kcal, có giờ");
// tìm không dấu
await ev(`$("#foodQ").focus()`); await type("#foodQ", "pho bo"); await sleep(100);
ok(await ev(`[...document.querySelectorAll("#foodResults .foodrow")].map(b => b.textContent).join("|").includes("Phở bò")`), "gõ không dấu 'pho bo' ra Phở bò");
ok(await ev(`document.activeElement.id`) === "foodQ", "gõ tìm không mất con trỏ");
await ev(`[...document.querySelectorAll("#foodResults .foodrow")].find(b => b.textContent.includes("Phở bò")).click()`); await sleep(100);
ok(await ev(`!!document.querySelector("[data-fmode]")`) === false, "món cả suất (tô) không có chế độ gam");
await click('[data-fqset="1.5"]'); await sleep(80);
ok(await ev(`$("#foodCalc").textContent`) === "675 kcal · 38 g đạm", "1,5 tô phở = 675 kcal");
await click("[data-addsel]"); await sleep(120);
ok(await ev(`foodDay(today()).at(-1).q`) === "1,5 tô" && await ev(`foodTotals(today()).kcal`) === 1425, "thêm 1,5 tô phở, tổng 1 425");
// theo gam
await type("#foodQ", "uc ga chin"); await sleep(80);
await click("#foodResults .foodrow"); await sleep(80);
ok(await ev(`!!$("#foodG")`), "món tính theo 100 g: mở sẵn ô gam");
ok(!(await ev(`document.querySelector("#view").textContent.includes("1 100 g")`)), "không hiện '1 100 g'");
await click('[data-fmode="q"]'); await sleep(80); await click('[data-fqset="1.5"]'); await sleep(80);
ok(await ev(`$("#foodQtxt").textContent`) === "1,5 × 100 g", "theo phần: '1,5 × 100 g'");
await click('[data-fmode="g"]'); await sleep(80);
await type("#foodG", "180"); await sleep(80);
ok(await ev(`$("#foodCalc").textContent`) === "297 kcal · 56 g đạm", "180 g ức gà chín = 297 kcal, 56 g đạm");
await shot("food-gram.png");
await click("[data-addsel]"); await sleep(120);
ok(await ev(`foodDay(today()).at(-1).q`) === "180 g" && await ev(`foodDay(today()).at(-1).p`) === 55.8, "ghi theo gam, lưu đạm lẻ");
// kết quả nằm ngay dưới ô tìm, không bị hàng nút nhóm đẩy xuống
ok(await ev(`document.querySelector(".chips.scroll").offsetHeight`) < 60, "nút nhóm gọn một hàng");
ok(await ev(`document.querySelector(".chips.scroll").scrollWidth > document.querySelector(".chips.scroll").clientWidth`), "hàng nút nhóm cuộn ngang được");
ok(await ev(`document.querySelector("#foodResults").getBoundingClientRect().top - $("#foodQ").getBoundingClientRect().bottom`) < 70, "kết quả ngay dưới ô tìm");
await ev(`window.scrollTo(0, 0); $("#foodQ").blur(); $("#foodQ").focus()`); await sleep(900);
ok(await ev(`$("#foodQ").getBoundingClientRect().top - $("#topbar").offsetHeight`) < 30, "chạm ô tìm: tự cuộn lên sát đầu màn hình: "
  + await ev(`JSON.stringify({ y: scrollY, top: $("#foodQ").getBoundingClientRect().top, bar: $("#topbar").offsetHeight, h: document.documentElement.scrollHeight, act: document.activeElement.id, mh: $("#foodResults").style.minHeight })`));
ok(await ev(`getComputedStyle(document.querySelector("nav")).display`) === "none", "đang gõ tìm: ẩn thanh tab");
await ev(`$("#foodQ").blur()`); await sleep(80);
ok(await ev(`getComputedStyle(document.querySelector("nav")).display`) !== "none", "rời ô tìm: hiện lại thanh tab");
// lọc nhóm
await type("#foodQ", ""); await click('[data-fgroup="bs"]'); await sleep(100);
ok(await ev(`document.querySelectorAll("#foodResults .foodrow").length`) === 3, "nhóm Bổ sung: 3 món");
// lưu món quen từ món đã chọn
await click("#foodResults .foodrow"); await sleep(80); await click('[data-fqset="2"]'); await click("[data-favsel]"); await sleep(100);
ok(await ev(`favs().at(-1).name`) === "Whey · 2 muỗng" && await ev(`favs().at(-1).kcal`) === 240, "lưu 'Whey · 2 muỗng' thành món quen");
// tự nhập
await click('[data-custom="1"]'); await sleep(80);
await type("#cName", "Cơm nhà"); await type("#cKcal", "600"); await type("#cP", "30");
await ev(`$("#cFav").checked = true`); await click("[data-addcustom]"); await sleep(120);
ok(await ev(`foodDay(today()).at(-1).name === "Cơm nhà" && favs().some(f => f.name === "Cơm nhà")`), "tự nhập món + lưu món quen");
// xoá
const before = await ev(`foodDay(today()).length`);
await click("[data-fdel]"); await sleep(100);
ok(await ev(`foodDay(today()).length`) === before - 1, "xoá một món đã ăn");
// sửa món quen
await click("[data-favedit]"); await sleep(80); const nf = await ev(`favs().length`);
await click("[data-favdel]"); await sleep(80);
ok(await ev(`favs().length`) === nf - 1, "xoá món quen");
await click("[data-favedit]"); await sleep(80);
await shot("food.png"); await noOverflow("tab Ăn có dữ liệu");
// xem ngày trước, không đi quá hôm nay
await click('[data-fday="1"]'); await sleep(80);
ok(await ev(`foodDate === today()`), "không sang được ngày mai");
await click('[data-fday="-1"]'); await sleep(80);
ok(await ev(`foodDate === addDays(today(), -1) && document.querySelector("#view").textContent.includes("Chưa ghi gì")`), "xem hôm qua");
// lưu, tải lại, xuất/nhập
await reload();
ok(await ev(`foodDay(today()).length`) === before - 1 && await ev(`!!S.favs`), "tải lại vẫn còn");
// nối với nhịp tăng cân: 4 ngày ăn ~2 300, cân không lên
await put(`d.setupDone = true; Object.assign(d.profile, { age: 29, height: 172, weight: 56 });
  d.bw = [{date: addDays(today(), -10), kg: 56}, {date: today(), kg: 56}];
  d.food = {}; [1,2,3,4].forEach(i => d.food[addDays(today(), -i)] = [{id: "x" + i, name: "Cơm", kcal: 2300, p: 110}])`);
await click("[data-tab=me]"); await sleep(150);
const pace = await ev(`document.querySelector("#view").textContent.replace(/\s+/g, " ")`);
ok(/7 ngày qua ăn trung bình 2\.300 kcal \(4 ngày có ghi\) → nhắm khoảng 2\.550 kcal/.test(pace), "cân không lên: gợi ý ăn 2 550 dựa trên số thật: " + (pace.match(/.{0,40}7 ngày qua.{0,120}/) || [pace.slice(0, 300)])[0]);
// today() theo giờ máy
ok(await ev(`today() === (d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"))(new Date())`), "today() theo giờ máy");

console.log("== Bữa nhiều món");
await put(`d.setupDone = true; Object.assign(d.profile, { age: 29, height: 172, weight: 56 })`);
await click("[data-tab=an]"); await sleep(120);
const find = async (q, name) => { await type("#foodQ", q); await sleep(80);
  return ev(`(() => { const b = [...document.querySelectorAll("#foodResults .foodrow")].find(b => b.textContent.includes(${JSON.stringify(name)})); if (b) b.click(); return !!b; })()`); };
ok(await find("broccoli", "Bông cải xanh") && await find("sup lo xanh", "Bông cải xanh"), "tìm bằng tên khác: broccoli, súp lơ xanh");
ok(await find("trung chien", "Trứng gà chiên"), "tìm 'trung chien' ra trứng chiên");
ok(await find("thit lon ran", "Thịt heo chiên"), "tìm 'thit lon ran' ra thịt heo chiên");
// bữa trưa: 200 g cơm, 1 trứng chiên, 200 g thịt heo chiên, 50 g bông cải
await find("com trang", "Cơm trắng"); await sleep(60); await click('[data-fmode="g"]'); await sleep(60); await type("#foodG", "200");
await click("[data-totray]"); await sleep(120);
ok(await ev(`tray().length === 1 && foodQ === "" && !!$("#tray")`), "+ Vào bữa: khay hiện, ô tìm xoá trắng");
await find("trung chien", "Trứng gà chiên"); await sleep(60); await click("[data-totray]"); await sleep(100);
await find("thit heo chien", "Thịt heo chiên"); await sleep(60); await type("#foodG", "200"); await click("[data-totray]"); await sleep(100);
await find("bong cai xanh", "Bông cải xanh"); await sleep(60); await type("#foodG", "50"); await click("[data-totray]"); await sleep(100);
ok(await ev(`JSON.stringify(sumItems(tray()), (k, v) => typeof v === "number" ? Math.round(v) : v)`) === '{"kcal":938,"p":65}', "khay 4 món: 938 kcal · 65 g");
ok(await ev(`$("#tray").textContent.replace(/\s+/g, " ").includes("938 kcal · 65 g đạm")`), "khay hiện tổng 938 kcal · 65 g");
await shot("tray.png"); await noOverflow("khay bữa");
await reload(); await click("[data-tab=an]"); await sleep(120);
ok(await ev(`tray().length`) === 4, "tải lại khay vẫn còn");
await click("[data-traydel='1']"); await sleep(80);
ok(await ev(`tray().length === 3 && !tray().some(x => x.name.startsWith("Trứng"))`), "bỏ một món khỏi khay");
await find("trung chien", "Trứng gà chiên"); await sleep(60); await click("[data-totray]"); await sleep(100);
await type("#trayName", "Cơm trưa"); await ev(`$("#trayFav").checked = true`);
await click("[data-traylog]"); await sleep(150);
const e = await ev(`foodDay(today()).at(-1)`);
ok(e.name === "Cơm trưa" && e.kcal === 938 && Math.round(e.p) === 65 && e.items.length === 4 && e.q === "4 món", "ghi thành một dòng 'Cơm trưa' 938 kcal, 4 món");
ok(await ev(`tray().length === 0 && !$("#tray")`), "ghi xong khay trống");
ok(await ev(`[...document.querySelectorAll("#view details.note summary")].some(x => x.textContent === "4 món")`), "dòng đã ăn có '4 món' bấm xem chi tiết");
const fav = await ev(`favs().at(-1)`);
ok(fav.name === "Cơm trưa" && fav.items.length === 4, "lưu 'Cơm trưa' thành món quen kèm chi tiết");
await ev(`document.querySelector('[data-fav="' + favs().at(-1).id + '"]').click()`); await sleep(100);
ok(await ev(`foodDay(today()).length === 2 && foodDay(today()).at(-1).items.length === 4 && foodTotals(today()).kcal === 1876`), "bấm món quen 'Cơm trưa' → ghi lại cả bữa");
// tự nhập cũng vào bữa được
await click('[data-custom="1"]'); await sleep(60);
await type("#cName", "Canh chua nhà"); await type("#cKcal", "90"); await type("#cP", "6"); await click("[data-customtray]"); await sleep(100);
ok(await ev(`tray().length === 1 && tray()[0].name === "Canh chua nhà"`), "món tự nhập cũng vào bữa được");
await shot("food-meal.png"); await noOverflow("tab Ăn có bữa gộp");

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
