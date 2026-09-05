"use strict";
/* =========================================================================
   모바일 전용 조작 — 위 엔진(그리기·보정·프리셋)은 PC 판과 같은 코드입니다.
   여기서는 라이트룸식 하단 도구바, 손가락 조작, 사진 가져오기, 저장/공유만 다룹니다.

   화면 짜임새
     위      미리보기 (한 손가락 이동 · 두 손가락 확대)
     아래①  조절판 — 고른 항목의 슬라이더만 올라온다 (안 고르면 안 뜬다)
     아래②  필름스트립 — 사진 두 장 이상일 때
     아래③  항목 줄 — 지금 단계 안의 메뉴들
     아래④  단계 줄 — 사진 → 커버 → 보정 → 내보내기
   ========================================================================= */

/* ---------------- 아이콘 ---------------- */
const IC = {
  photo:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.4"/><path d="M4 17l4.5-4 3 2.5L15 12l5 5"/>',
  ratio:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 9h16"/>',
  mast: '<path d="M4 7.5V5h16v2.5M12 5v14M8.5 19h7"/>',
  overlay:'<path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z"/><path d="M4 12.5L12 17l8-4.5"/>',
  issue:'<path d="M4.5 9h15M4.5 15h15M10 4l-2 16M17 4l-2 16"/>',
  colL: '<path d="M4 6h11M4 10h16M4 14h11M4 18h8"/>',
  colR: '<path d="M9 6h11M4 10h16M9 14h11M12 18h8"/>',
  head: '<path d="M5 19V5h5a3.5 3.5 0 010 7H5m0 0h6a3.5 3.5 0 010 7H5z"/>',
  body: '<path d="M4 5v14M7.5 5v14M11 5v14M14 5v10M17 5v14M20 5v14"/>',
  light:'<circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
  color:'<path d="M12 3.2s6.2 6.6 6.2 10.4A6.2 6.2 0 015.8 13.6C5.8 9.8 12 3.2 12 3.2z"/>',
  filter:'<path d="M3.5 5h17v2.6l-6.3 6.3V19l-4.4 2.2v-7.3L3.5 7.6z"/>',
  curve:'<path d="M4 20V4M4 20h16"/><path d="M4.5 16.5c6.5 0 8-11 15-13"/>',
  grain:'<circle cx="7" cy="8" r=".9"/><circle cx="12.5" cy="6" r=".9"/><circle cx="17.5" cy="9.5" r=".9"/><circle cx="6.5" cy="14.5" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="17" cy="16" r=".9"/><circle cx="10" cy="18" r=".9"/>',
  logo: '<path d="M4 16.5c4-.5 5.5-9.5 8.5-9.5S15 14 20 12.5"/><path d="M4 20h16"/>',
  export:'<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>',
  cover:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 7.5h8M8 11h5"/>',
  tone: '<path d="M4 8h8M16.5 8H20M4 16h3.5M12 16h8"/><circle cx="14.2" cy="8" r="2.2"/><circle cx="9.7" cy="16" r="2.2"/>'
};
const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>';

/* ---------------- 단계와 항목 ----------------
   i = PC 판 메뉴 차례 (1.사진 … 14.내보내기). 줄에 놓는 순서는 이 배열 순서. */
const MODES = [
  {key:"photo",  name:"사진",   sub:"고르기",  icon:"photo"},
  {key:"cover",  name:"커버",   sub:"조판",    icon:"cover"},
  {key:"tone",   name:"보정",   sub:"빛·색",   icon:"tone"},
  {key:"export", name:"내보내기", sub:"저장",   icon:"export"}
];
const CATS = [
  {i:0,  m:"photo",  label:"사진 넣기", icon:"photo"},
  {i:1,  m:"photo",  label:"판형",     icon:"ratio"},

  {i:2,  m:"cover",  label:"제호",     icon:"mast"},
  {i:4,  m:"cover",  label:"발행 정보", icon:"issue"},
  {i:5,  m:"cover",  label:"커버라인 왼쪽", icon:"colL"},
  {i:6,  m:"cover",  label:"커버라인 오른쪽", icon:"colR"},
  {i:7,  m:"cover",  label:"헤드라인",  icon:"head"},
  {i:8,  m:"cover",  label:"서체·바코드", icon:"body"},
  {i:3,  m:"cover",  label:"로고 앞으로", icon:"overlay"},
  {i:14, m:"cover",  label:"서명",     icon:"logo"},

  {i:9,  m:"tone",   label:"빛",       icon:"light"},
  {i:10, m:"tone",   label:"색",       icon:"color"},
  {i:11, m:"tone",   label:"필터",     icon:"filter"},
  {i:12, m:"tone",   label:"곡선",     icon:"curve"},
  {i:13, m:"tone",   label:"질감",     icon:"grain"},

  {i:15, m:"export", label:"내보내기",  icon:"export"}
];
/* 짧은 이름 — 항목 줄에는 좁게 들어가야 한다 */
const SHORT = {"사진 넣기":"넣기","발행 정보":"발행","커버라인 왼쪽":"왼쪽","커버라인 오른쪽":"오른쪽",
               "서체·바코드":"서체","로고 앞으로":"로고앞","내보내기":"저장"};

const secs   = Array.from(document.querySelectorAll("#side details.sec"));
const trayEl = $("#tray"), sideEl = $("#side"), catsEl = $("#cats"),
      modesEl = $("#modes"), filmEl = $("#film"), bottomEl = $("#bottom");
let mode = "photo", openCat = -1;

/* 다시 그리기는 한 프레임에 한 번만 */
let layoutPending = false;
function relayout(){
  if(layoutPending) return;
  layoutPending = true;
  requestAnimationFrame(()=>{
    layoutPending = false;
    /* 조절판이 덮는 높이 — 미리보기는 그 위 공간에 맞춰 커진다 */
    document.documentElement.style.setProperty("--trayH",
      (trayEl.classList.contains("on") ? trayEl.offsetHeight : 0) + "px");
    layout(); render();
    /* 곡선판은 숨어 있는 동안 크기를 잴 수 없다 — 보일 때 다시 그린다 */
    if(secs[12] && secs[12].classList.contains("on")) drawCurve();
    document.documentElement.style.setProperty("--bh", bottomEl.offsetHeight + "px");
  });
}
window.addEventListener("resize", relayout);
if(window.visualViewport) window.visualViewport.addEventListener("resize", relayout);

/* ---------------- 단계 줄 ---------------- */
MODES.forEach(m=>{
  const b = document.createElement("button");
  b.className = "mode"; b.dataset.m = m.key;
  b.innerHTML = svg(m.icon) + '<span class="n">' + m.name + '</span>';
  b.onclick = ()=>setMode(m.key);
  modesEl.appendChild(b);
});
function setMode(k, keepCat){
  mode = k;
  Array.from(modesEl.children).forEach(b=>b.classList.toggle("on", b.dataset.m === k));
  buildCats();
  if(!keepCat){
    /* 내보내기는 항목이 하나뿐이라 바로 펼친다 */
    if(k === "export") showCat(15); else closeTray();
  }
  try{ localStorage.setItem("magcover_m_mode", k); }catch(e){}
}

/* ---------------- 항목 줄 ---------------- */
function buildCats(){
  catsEl.innerHTML = "";
  CATS.filter(c=>c.m === mode).forEach(c=>{
    const b = document.createElement("button");
    b.className = "cat" + (c.i === openCat ? " on" : "");
    b.dataset.i = c.i;
    b.innerHTML = svg(c.icon) + "<span>" + (SHORT[c.label] || c.label) + "</span>";
    b.onclick = ()=>{ (c.i === openCat) ? closeTray() : showCat(c.i); };
    catsEl.appendChild(b);
  });
}
function markCats(){
  Array.from(catsEl.children).forEach(b=>b.classList.toggle("on", +b.dataset.i === openCat));
  const on = catsEl.querySelector(".cat.on");
  if(on) catsEl.scrollTo({left: on.offsetLeft - 70, behavior:"smooth"});
}
function showCat(i){
  const d = secs[i]; if(!d) return;
  openCat = i;
  secs.forEach((x, j)=>{ x.classList.toggle("on", j === i); x.open = (j === i); });
  trayEl.classList.add("on");
  sideEl.classList.toggle("tall", d.dataset.hl === "curve");   /* 곡선은 넓게 */
  markCats();
  sideEl.scrollTop = 0;
  relayout();
}
function closeTray(){
  openCat = -1;
  trayEl.classList.remove("on");
  secs.forEach(x=>x.classList.remove("on"));
  markCats();
  relayout();
}
/* 조절판 머리글(제목·↺·✕)을 누르면 접는다 — 열고 닫기는 항목 줄이 맡는다 */
secs.forEach((d, i)=>{
  const sm = d.querySelector("summary");
  const c = CATS.find(x=>x.i === i);
  if(c && sm.firstChild && sm.firstChild.nodeType === 3) sm.firstChild.nodeValue = c.label;
  sm.addEventListener("click", e=>{ e.preventDefault(); closeTray(); });
});
/* 미리보기에서 요소를 누르면 그 항목이 열린다 (엔진의 탭 판정이 부른다) */
function openSection(key){
  const d = document.querySelector('#side details[data-hl="' + key + '"]');
  if(!d) return;
  const i = secs.indexOf(d);
  const c = CATS.find(x=>x.i === i); if(!c) return;
  if(c.m !== mode) setMode(c.m, true);
  showCat(i);
}

/* ---------------- 미리보기 손가락 조작 ----------------
   한 손가락 = 사진 이동, 두 손가락 = 확대·축소.
   움직이지 않고 떼면 탭 — 그 자리의 요소 항목이 열린다. */
const ptrs = new Map();
let gest = null, cvDown = false;
/* 조절판을 접자마자 그 자리에 미리보기가 들어오면 브라우저가 캔버스로 클릭을 보낸다.
   미리보기에서 시작한 터치가 아니면 그 클릭은 버린다. */
window.addEventListener("click", e=>{
  if(e.target !== cv) return;
  if(!cvDown){ e.stopImmediatePropagation(); e.preventDefault(); }
  cvDown = false;
}, true);

function ptrList(){ return Array.from(ptrs.values()); }
function canvasK(){ const r = cv.getBoundingClientRect(); return {k: DW/r.width, r:r}; }

cv.addEventListener("pointerdown", e=>{
  cvDown = true;
  if(!imgs[cur]) return;
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  dragMoved = false;
  startGesture();
});
function startGesture(){
  const o = imgs[cur]; if(!o) return;
  const p = ptrList(), {k} = canvasK();
  if(p.length === 1) gest = {n:1, k:k, sx:p[0].x*k, sy:p[0].y*k, ox:o.x, oy:o.y};
  else if(p.length >= 2){
    const cx = (p[0].x + p[1].x)/2, cy = (p[0].y + p[1].y)/2;
    const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    gest = {n:2, k:k, cx:cx, cy:cy, d:Math.max(1, d), ox:o.x, oy:o.y, os:o.scale};
  }
}
cv.addEventListener("pointermove", e=>{
  if(!ptrs.has(e.pointerId) || !gest) return;
  e.preventDefault();
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  const o = imgs[cur]; if(!o) return;
  const p = ptrList(), {k, r} = canvasK();

  if(gest.n === 1 && p.length === 1){
    const dx = p[0].x*k - gest.sx, dy = p[0].y*k - gest.sy;
    if(Math.abs(dx) + Math.abs(dy) > 6*k) dragMoved = true;
    o.x = gest.ox + dx; o.y = gest.oy + dy;
  }else if(gest.n === 2 && p.length >= 2){
    dragMoved = true;
    const cx = (p[0].x + p[1].x)/2, cy = (p[0].y + p[1].y)/2;
    const d  = Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y));
    const f  = d / gest.d;
    /* 두 손가락 가운데를 기준으로 확대 — 그 지점의 사진은 제자리에 남는다 */
    const mx = (gest.cx - r.left)*k, my = (gest.cy - r.top)*k;
    const px = (mx - gest.ox)/gest.os, py = (my - gest.oy)/gest.os;
    o.scale = Math.min(24, Math.max(0.05, gest.os * f));
    o.x = mx - px*o.scale + (cx - gest.cx)*k;
    o.y = my - py*o.scale + (cy - gest.cy)*k;
    syncZoom();
  }
  markPhoto(); render();
}, {passive:false});
function endPtr(e){
  if(!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if(ptrs.size === 0){ gest = null; syncZoom(); }
  else startGesture();
}
cv.addEventListener("pointerup", endPtr);
cv.addEventListener("pointercancel", endPtr);
cv.addEventListener("click", e=>{
  if(dragMoved) return;
  if(!imgs.length) openPick();
});

/* ---------------- 사진 가져오는 곳 고르기 ----------------
   앨범 / 카메라 / 파일 앱(구글 드라이브·원드라이브 등)
   ‘파일’ 쪽 입력칸에는 일부러 accept 를 걸지 않았다. 그래야 안드로이드에서
   사진 전용 화면이 아니라 드라이브가 보이는 파일 선택 화면이 열린다. */
const pickBg = $("#pickBg");
function openPick(v){ pickBg.classList.toggle("on", v !== false); }
const PICKERS = {album:"#file", cam:"#fileCam", files:"#fileAny"};
Array.from($("#pick").querySelectorAll("button")).forEach(b=>{
  b.onclick = ()=>{
    const k = b.dataset.pick;
    openPick(false);
    if(PICKERS[k]) $(PICKERS[k]).click();   /* 누른 그 순간에 바로 열어야 아이폰이 막지 않는다 */
  };
});
pickBg.addEventListener("click", e=>{ if(e.target === pickBg) openPick(false); });
window.addEventListener("keydown", e=>{ if(e.key === "Escape") openPick(false); });

$("#pickAlbum").onclick = ()=>$("#file").click();
$("#pickCam").onclick   = ()=>$("#fileCam").click();
$("#pickFiles").onclick = ()=>$("#fileAny").click();
["#fileCam", "#fileAny"].forEach(id=>{
  $(id).onchange = e=>{ addFiles(e.target.files); e.target.value = ""; };
});
$("#drop").onclick = ()=>openPick();
$("#empty").onclick = ()=>openPick();

/* ---------------- 화면 상태 갱신 (엔진의 render() 에 얹는다) ---------------- */
const _render = render;
let filmOn = null;
render = function(){
  _render();
  const n = imgs.length;
  $("#empty").classList.toggle("off", n > 0);
  $("#bar").style.display = n ? "" : "none";
  const want = n > 1;
  if(want !== filmOn){ filmOn = want; filmEl.classList.toggle("on", want); relayout(); }
};

/* ---------------- 저장 진행창 · 완료 알림 ---------------- */
const progBg = $("#progBg");
let cancelJob = false;
function progOpen(title, total){
  cancelJob = false;
  $("#progTitle").textContent = title;
  $("#progName").textContent = "";
  $("#progCount").textContent = "0/" + total;
  $("#progFill").style.width = "0%";
  progBg.classList.add("on");
}
function progStep(name, i, total){
  $("#progName").textContent = name;
  $("#progCount").textContent = i + "/" + total;
  $("#progFill").style.width = Math.round(i/total*100) + "%";
}
function progClose(){ progBg.classList.remove("on"); }
$("#progCancel").onclick = ()=>{ cancelJob = true; progClose(); };

let doneT = null;
function done(msg){
  $("#doneTxt").textContent = msg;
  $("#done").classList.add("on");
  clearTimeout(doneT); doneT = setTimeout(()=>$("#done").classList.remove("on"), 3200);
}
$("#doneX").onclick = ()=>$("#done").classList.remove("on");
/* 화면이 한 번 그려질 틈을 준다 — 안 그러면 진행창이 안 보인 채 멈춘 것처럼 보인다 */
const breathe = ()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r, 30)));

/* ---------------- 저장 · 공유 ---------------- */
$("#save").onclick = async ()=>{
  if(cur < 0) return toast("사진을 먼저 넣어주세요");
  const name = "cover_" + imgs[cur].name;
  progOpen("커버 저장", 1);
  progStep(name + ".png", 0, 1);
  await breathe();
  await download(exportCanvas(cur, +$("#expW").value), name);
  progStep(name + ".png", 1, 1);
  await breathe();
  progClose();
  done("저장했습니다 · " + $("#expW").value + "px · 사진 앨범에 넣으려면 [공유]");
};

/* 넣어둔 사진 전부를 같은 디자인으로 — 중간에 취소할 수 있다 */
$("#saveAll").onclick = async ()=>{
  if(!imgs.length) return toast("사진을 먼저 넣어주세요");
  const w = +$("#expW").value, n = imgs.length;
  progOpen("전체 사진 저장", n);
  await breathe();
  let k = 0;
  for(let i = 0; i < n; i++){
    if(cancelJob) break;
    const name = "cover_" + imgs[i].name;
    progStep(name + ".png", i, n);
    await breathe();
    await download(exportCanvas(i, w), name);
    k++;
    progStep(name + ".png", k, n);
    if(!dlCap) await new Promise(r=>setTimeout(r, 380));
  }
  progClose(); render();
  done(cancelJob ? (k + "장까지 저장하고 멈췄습니다") : (k + "장을 저장했습니다"));
};
async function shareCover(){
  if(cur < 0) return toast("사진을 먼저 넣어주세요");
  const nm = "cover_" + imgs[cur].name;
  progOpen("공유 준비", 1);
  progStep(nm + ".png", 0, 1);
  await breathe();
  const c = exportCanvas(cur, +$("#expW").value);
  const b = await new Promise(r=>c.toBlob(r, "image/png"));
  progStep(nm + ".png", 1, 1);
  await breathe();
  progClose();
  if(!b) return toast("만들지 못했습니다");
  const file = new File([b], nm + ".png", {type:"image/png"});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], title:"매거진 커버"}); }
    catch(err){ if(err && err.name !== "AbortError") toast("공유하지 못했습니다"); }
  }else{
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = file.name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    done("공유를 지원하지 않아 파일로 저장했습니다");
  }
}
$("#share").onclick     = shareCover;
$("#topShare").onclick  = shareCover;
$("#topSave").onclick   = ()=>$("#save").click();

/* ---------------- 시작 상태 ---------------- */
let startMode = "photo";
try{ startMode = localStorage.getItem("magcover_m_mode") || "photo"; }catch(e){}
if(!MODES.some(m=>m.key === startMode)) startMode = "photo";
setMode(startMode);
render(); drawCurve(); relayout();
