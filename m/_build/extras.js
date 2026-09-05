"use strict";
/* =========================================================================
   모바일 전용 조작 — 위 엔진(그리기·보정·프리셋)은 PC판과 같은 코드입니다.
   여기서는 손가락 조작, 하단 시트, 탭, 저장/공유만 다룹니다.
   ========================================================================= */

/* ---------------- 하단 시트 ---------------- */
const sheet = $("#sheet"), grab = $("#grab"), tabsEl = $("#tabs"),
      sideEl = $("#side"), dockEl = $("#dock");
let sheetOpen = true;

function sheetMin(){ return grab.offsetHeight + tabsEl.offsetHeight + dockEl.offsetHeight; }
function sheetMax(){ return Math.round(window.innerHeight * 0.80); }

let layoutPending = false;
function relayout(){
  if(layoutPending) return;
  layoutPending = true;
  requestAnimationFrame(()=>{ layoutPending = false; layout(); render(); });
}
function setSheet(px, store){
  const min = sheetMin(), max = sheetMax();
  const h = Math.round(Math.min(max, Math.max(min, px)));
  sheet.style.height = h + "px";
  document.documentElement.style.setProperty("--sh", h + "px");
  sheetOpen = h > min + 30;
  relayout();
  if(store){ try{ localStorage.setItem("magcover_m_sheet", h); }catch(e){} }
}
function openSheet(){ setSheet(Math.round(window.innerHeight * 0.48), true); }
function closeSheet(){ setSheet(0, true); }

let sDrag = null;
grab.addEventListener("pointerdown", e=>{
  grab.setPointerCapture(e.pointerId);
  sDrag = {y:e.clientY, h:sheet.offsetHeight, moved:false};
});
grab.addEventListener("pointermove", e=>{
  if(!sDrag) return;
  const dy = sDrag.y - e.clientY;
  if(Math.abs(dy) > 5) sDrag.moved = true;
  if(sDrag.moved) setSheet(sDrag.h + dy, false);
});
function endGrab(){
  if(!sDrag) return;
  if(sDrag.moved) setSheet(sheet.offsetHeight, true);
  else if(sheetOpen) closeSheet(); else openSheet();
  sDrag = null;
}
grab.addEventListener("pointerup", endGrab);
grab.addEventListener("pointercancel", endGrab);

/* ---------------- 탭 (메뉴 바로가기) ---------------- */
const TAB_NAMES = ["사진","판형","제호","로고앞","발행","커버L","커버R","헤드라인",
                   "본문","빛","색","필터","곡선","질감","서명","저장"];
const secs = Array.from(document.querySelectorAll("#side details.sec"));
const tabBtns = [];
secs.forEach((d, i)=>{
  const b = document.createElement("div");
  b.className = "tab";
  b.textContent = TAB_NAMES[i] || ("메뉴 " + (i+1));
  b.onclick = ()=>goSection(d);
  tabsEl.appendChild(b);
  tabBtns.push(b);
  d.addEventListener("toggle", ()=>{ if(d.open) markTab(d); });
});
function markTab(d){
  const i = secs.indexOf(d);
  tabBtns.forEach((b, j)=>b.classList.toggle("on", j === i));
  const b = tabBtns[i];
  if(b) tabsEl.scrollTo({left: b.offsetLeft - 60, behavior:"smooth"});
}
function goSection(d){
  secs.forEach(x=>{ if(x !== d) x.open = false; });   /* 한 번에 하나만 — 좁은 화면에서 헤매지 않게 */
  d.open = true;
  if(!sheetOpen) openSheet();
  /* 곡선 편집기는 자리가 넉넉해야 만질 수 있다 */
  if(d.dataset.hl === "curve"){
    const need = Math.round(window.innerHeight * 0.70);
    if(sheet.offsetHeight < need) setSheet(need, true);
  }
  markTab(d);
  requestAnimationFrame(()=>{ sideEl.scrollTop = Math.max(0, d.offsetTop - 4); });
}
/* 미리보기에서 요소를 누르면 그 메뉴가 열린다 (엔진의 탭 판정이 부른다) */
function openSection(key){
  const d = document.querySelector('#side details[data-hl="' + key + '"]');
  if(d) goSection(d);
}

/* ---------------- 미리보기 손가락 조작 ----------------
   한 손가락 = 사진 이동, 두 손가락 = 확대·축소.
   움직이지 않고 떼면 탭 — 그 자리의 요소 메뉴가 열린다. */
const ptrs = new Map();
let gest = null, cvDown = false;
/* 시트를 접자마자 그 자리에 미리보기가 들어오면 브라우저가 캔버스로 클릭을 보낸다.
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
/* 한 손가락으로 톡 치면 그 자리 요소의 메뉴가 열린다 */
cv.addEventListener("click", e=>{
  if(dragMoved) return;
  if(!imgs.length){ $("#file").click(); return; }
});

/* ---------------- 사진 넘기기 ---------------- */
function setCur(i){
  if(!imgs.length) return;
  cur = (i + imgs.length) % imgs.length;
  drawThumbs(); syncZoom(); markPhoto(); render();
}
$("#prevImg").onclick = ()=>setCur(cur - 1);
$("#nextImg").onclick = ()=>setCur(cur + 1);
$("#dockAdd").onclick = ()=>$("#file").click();
$("#empty").onclick   = ()=>$("#file").click();

/* 화면 상태 갱신 — 엔진의 render() 에 얹는다 */
const _render = render;
render = function(){
  _render();
  const n = imgs.length;
  $("#empty").classList.toggle("off", n > 0);
  $("#nav").classList.toggle("off", n < 2);
  if(n > 1) $("#count").textContent = (cur+1) + "/" + n;
  $("#bar").style.display = n ? "" : "none";
};

/* ---------------- 저장 · 공유 ---------------- */
async function makeBlob(){
  const c = exportCanvas(cur, +$("#expW").value);
  return await new Promise(r=>c.toBlob(r, "image/png"));
}
$("#save").onclick = async ()=>{
  if(cur < 0) return toast("사진을 먼저 넣어주세요");
  toast("저장하는 중…");
  await new Promise(r=>setTimeout(r, 40));
  await download(exportCanvas(cur, +$("#expW").value), "cover_" + imgs[cur].name);
  toast("저장했습니다");
};
async function shareCover(){
  if(cur < 0) return toast("사진을 먼저 넣어주세요");
  toast("만드는 중…");
  await new Promise(r=>setTimeout(r, 40));
  const b = await makeBlob();
  if(!b) return toast("만들지 못했습니다");
  const file = new File([b], "cover_" + imgs[cur].name + ".png", {type:"image/png"});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], title:"매거진 커버"}); }
    catch(err){ if(err && err.name !== "AbortError") toast("공유하지 못했습니다"); }
  }else{
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = file.name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    toast("공유를 지원하지 않아 저장했습니다");
  }
}
$("#share").onclick    = shareCover;
$("#dockShare").onclick = shareCover;
$("#dockSave").onclick  = ()=>$("#save").click();

/* ---------------- 시작 상태 ---------------- */
let mSheet = null;
try{ mSheet = parseInt(localStorage.getItem("magcover_m_sheet"), 10); }catch(e){}
setSheet(mSheet || Math.round(window.innerHeight * 0.48), false);
secs.forEach((d,i)=>{ d.open = (i === 0); });   /* 좁은 화면 — 한 번에 한 메뉴만 */
markTab(secs[0]);

/* 주소창이 접혔다 펴지거나 화면을 돌리면 다시 맞춘다 */
window.addEventListener("orientationchange", ()=>setTimeout(()=>{ setSheet(sheet.offsetHeight, false); }, 250));
if(window.visualViewport) window.visualViewport.addEventListener("resize", relayout);
render(); drawCurve();
