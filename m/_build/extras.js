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

/* ---------------- 화면 크기 ----------------
   머리말 높이와 미리보기 높이를 CSS 에 알려준다. 미리보기 카드는 스크롤해도
   화면 위에 붙어 있으므로(sticky) 높이가 고정이어야 덜컹거리지 않는다. */
const sideEl = $("#side"), stageEl = $("#stage");
const secs = Array.from(document.querySelectorAll("#side details.sec"));

let layoutPending = false;
function relayout(){
  if(layoutPending) return;
  layoutPending = true;
  requestAnimationFrame(()=>{
    layoutPending = false;
    const root = document.documentElement.style;
    root.setProperty("--hh", $("#head").offsetHeight + "px");
    /* 미리보기 = 화면의 38% (최소 190px), 나머지는 설정 레일 몫 */
    const h = Math.max(190, Math.round(window.innerHeight * 0.38));
    root.setProperty("--pvH", h + "px");
    layout(); render();
  });
}
window.addEventListener("resize", relayout);
window.addEventListener("orientationchange", ()=>setTimeout(relayout, 250));
if(window.visualViewport) window.visualViewport.addEventListener("resize", relayout);

/* 미리보기에서 요소를 누르면 그 항목으로 데려간다 (엔진의 탭 판정이 부른다) */
function openSection(key){
  const d = document.querySelector('#side details[data-hl="' + key + '"]');
  if(!d) return;
  d.open = true;
  sideEl.scrollTo({top: Math.max(0, d.offsetTop - 4), behavior:"smooth"});
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

/* ---------------- 아이폰 HEIC 사진 ----------------
   사파리는 HEIC 를 그냥 열지만 안드로이드 크롬은 못 연다.
   그래서 ‘열지 못했을 때만’ 변환기를 내려받아 JPG 로 바꿔 다시 넣는다.
   (평소에는 아무것도 받지 않는다. 아이폰에서는 이 길로 오지도 않는다.) */
const HEIC_LIB = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
let heicLib = null;
function loadHeic(){
  if(heicLib) return heicLib;
  heicLib = new Promise((ok, no)=>{
    const s = document.createElement("script");
    s.src = HEIC_LIB;
    s.onload = ()=>ok(window.heic2any);
    s.onerror = ()=>no(new Error("no net"));
    document.head.appendChild(s);
  });
  return heicLib;
}
const isHeic = f => /\.(heic|heif)$/i.test(f.name || "") || /image\/hei[cf]/i.test(f.type || "");

async function rescueImage(f){
  if(!isHeic(f)){
    toast("이 사진은 열 수 없어요 — " + (f.name || ""));
    return;
  }
  progOpen("아이폰 사진(HEIC) 변환", 1);
  progStep(f.name, 0, 1);
  await breathe();
  try{
    const conv = await loadHeic();
    const out = await conv({blob:f, toType:"image/jpeg", quality:0.94});
    const blob = Array.isArray(out) ? out[0] : out;
    const jpg = new File([blob], (f.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg",
                         {type:"image/jpeg"});
    progStep(f.name, 1, 1);
    await breathe();
    progClose();
    addFiles([jpg]);
    done("아이폰 사진(HEIC)을 변환해서 넣었습니다");
  }catch(e){
    progClose();
    toast("HEIC 변환에 실패했어요 — ‘사진 앨범’ 으로 고르면 자동 변환됩니다");
  }
}

/* ---------------- 화면 상태 갱신 (엔진의 render() 에 얹는다) ---------------- */
const _render = render;
render = function(){
  _render();
  const n = imgs.length;
  $("#empty").classList.toggle("off", n > 0);
  $("#bar").style.display = n ? "" : "none";
  $("#film").classList.toggle("on", n > 1);
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
$("#share").onclick    = shareCover;
$("#dockPick").onclick = ()=>openPick();
/* 하단 바의 [저장] 은 공유창을 먼저 띄운다 — 사진 앨범에 바로 넣는 길이 제일 짧다 */
$("#dockSave").onclick = shareCover;

/* ---------------- 시작 상태 ---------------- */
secs.forEach(d=>{ d.open = true; });     /* 폰 목업 스튜디오처럼 모두 펼쳐 둔다 (머리글을 누르면 접힘) */
relayout();
render(); drawCurve();
