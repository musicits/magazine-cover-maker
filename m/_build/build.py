# -*- coding: utf-8 -*-
"""모바일판 만들기 — python3 m/_build/build.py

PC 판(index.html)에서 그리기 엔진과 메뉴 마크업을 그대로 떼어 와,
이 폴더의 조각들(head.html · body_top.html · body_bottom.html · extras.js)과 합쳐
m/index.html 을 새로 만듭니다. PC 판 파일은 읽기만 하고 절대 고치지 않습니다.

PC 판을 손본 뒤 이 명령을 다시 돌리면 모바일판도 같이 최신이 됩니다.
다만 m/index.html 을 손으로 고쳤다면 그 내용은 사라지니, 고칠 일은 이 폴더의 조각에 하세요.
(PC 판의 문장이 바뀌면 아래 rep() 이 '패치 대상을 못 찾음' 으로 멈춥니다. 그때 그 문장만 맞춰주세요.)
"""
import io, os, sys, re

HERE = os.path.dirname(os.path.abspath(__file__))      # <저장소>/m/_build
SRC  = os.path.join(HERE, "..", "..", "index.html")     # PC 판 (읽기만 한다)
S    = HERE
OUT  = os.path.join(HERE, "..", "index.html")           # 모바일 판

src = io.open(SRC, encoding="utf-8").read()

def cut(text, a, b, inc_b=False):
    i = text.index(a); j = text.index(b, i)
    return text[i: j + (len(b) if inc_b else 0)]

def rep(text, old, new, n=1):
    assert text.count(old) == n, "패치 대상을 못 찾음: %r (%d)" % (old[:70], text.count(old))
    return text.replace(old, new)

# ---------- 1. 조각 떼어내기 ----------
fontlinks = cut(src, '<link href="https://fonts.googleapis.com/css2?family=Bodoni',
                     '<style>').rstrip()
tokens    = cut(src, '  /* ===== 기본(라이트)', '  *{box-sizing:border-box}')
sections  = cut(src, '  <details class="sec" open>', '\n</div>\n\n<div id="grip"')
helpmodal = cut(src, '<div id="helpBg">', '<script>')
js        = cut(src, '<script>\n', '</script>')[len('<script>\n'):]

# ---------- 2. 엔진 패치 (모바일 조작으로 바꿔치기) ----------
js = rep(js, "const PV = 2;",
    "const PV = (Math.min(screen.width, screen.height) > 520) ? 1.5 : 1;   /* 모바일 — 미리보기를 가볍게 */")

js = rep(js,
    '  const s = Math.min(($("#stage").clientWidth - 32)/DW, (window.innerHeight - 92)/DH);',
    '  const st = $("#stage");\n'
    '  const s = Math.max(0.02, Math.min((st.clientWidth - 18)/DW, (st.clientHeight - 14)/DH));')

drag_old = '''let drag = null;
cv.addEventListener("mousedown", e=>{
  dragMoved = false;
  if(!imgs[cur]) return;
  const r = cv.getBoundingClientRect(), k = DW/r.width;
  drag = {sx:e.clientX*k, sy:e.clientY*k, ox:imgs[cur].x, oy:imgs[cur].y, k:k};
  cv.classList.add("drag");
});
window.addEventListener("mousemove", e=>{
  if(!drag) return;
  dragMoved = true;
  imgs[cur].x = drag.ox + (e.clientX*drag.k - drag.sx);
  imgs[cur].y = drag.oy + (e.clientY*drag.k - drag.sy);
  markPhoto(); render();
});
window.addEventListener("mouseup", ()=>{ drag = null; cv.classList.remove("drag"); });'''
js = rep(js, drag_old, '/* 사진 이동·확대는 맨 아래 모바일 스크립트(손가락 조작)에서 붙인다 */')

click_old = '''cv.addEventListener("click", e=>{
  if(dragMoved) return;
  const key = hitBlock(e); if(!key) return;
  const d = document.querySelector('#side details[data-hl="' + key + '"]');
  if(!d) return;
  d.open = true;
  d.scrollIntoView({behavior:"smooth", block:"start"});
  setHL(key);
});
cv.addEventListener("mousemove", e=>{
  if(drag) return;
  cv.style.cursor = hitBlock(e) ? "pointer" : "grab";
});'''
click_new = '''cv.addEventListener("click", e=>{
  if(dragMoved) return;
  const key = hitBlock(e); if(!key) return;
  openSection(key);            /* 모바일 — 하단 시트를 그 메뉴로 연다 */
  setHL(key);
});'''
js = rep(js, click_old, click_new)

curve_old = cut(js, 'let cDrag = -1;',
                '  if(hit > 0 && hit < pts.length-1){ pts.splice(hit,1); drawCurve(); scheduleRender(); save(); }\n});',
                inc_b=True)
curve_new = '''let cDrag = -1, cTapT = 0, cTapP = null;
function curveHit(x, y, tol){
  const pts = curves[chan];
  let hit = -1, best = tol;
  pts.forEach((p,i)=>{ const d = Math.hypot(p[0]-x, p[1]-y); if(d < best){ best = d; hit = i; } });
  return hit;
}
cvC.addEventListener("pointerdown", e=>{
  e.preventDefault();
  cvC.setPointerCapture(e.pointerId);
  const [x,y] = curvePos(e);
  const pts = curves[chan];
  /* 같은 자리를 두 번 톡톡 치면 그 점을 지운다 (PC 의 더블클릭) */
  const now = Date.now();
  if(cTapP && now - cTapT < 340 && Math.hypot(cTapP[0]-x, cTapP[1]-y) < 0.06){
    const del = curveHit(x, y, 0.07);
    if(del > 0 && del < pts.length-1){
      pts.splice(del, 1); cDrag = -1; cTapP = null;
      drawCurve(); scheduleRender(); save(); return;
    }
  }
  cTapT = now; cTapP = [x,y];
  let hit = curveHit(x, y, 0.06);
  if(hit < 0){ pts.push([x,y]); pts.sort((a,b)=>a[0]-b[0]); hit = pts.findIndex(p=>p[0]===x && p[1]===y); }
  cDrag = hit;
  drawCurve(); scheduleRender();
}, {passive:false});
cvC.addEventListener("pointermove", e=>{
  if(cDrag < 0) return;
  e.preventDefault();
  const [x,y] = curvePos(e);
  const pts = curves[chan];
  if(cDrag === 0) pts[0] = [0, y];
  else if(cDrag === pts.length-1) pts[cDrag] = [1, y];
  else{
    const lo = pts[cDrag-1][0] + 0.01, hi = pts[cDrag+1][0] - 0.01;
    pts[cDrag] = [Math.min(hi, Math.max(lo, x)), y];
  }
  drawCurve(); scheduleRender();
}, {passive:false});
function curveEnd(){ if(cDrag >= 0){ cDrag = -1; save(); } }
cvC.addEventListener("pointerup", curveEnd);
cvC.addEventListener("pointercancel", curveEnd);'''
js = rep(js, curve_old, curve_new)

side_old = cut(js, '/* ---- 사이드바 너비 조절 ---- */',
                   'grip.addEventListener("dblclick", ()=>setSideW(SIDE_DEF, true));', inc_b=True)
js = rep(js, side_old, '/* (PC 의 사이드바 너비 조절은 모바일에 없다) */')
js = rep(js, '  if(!sideStored) fitSideToHeader();\n', '')

# 저장 안내 문구도 모바일 표현으로
js = rep(js, '"투명 배경 PNG를 원본과 같은 크기로 저장해 넣으면 위치가 자동으로 맞습니다. 없으면 타원 영역으로 동작합니다."',
             '"투명 배경 PNG를 원본과 같은 크기로 저장해 넣으면 위치가 자동으로 맞습니다. 없으면 타원 영역으로 동작합니다."')

js = rep(js, 'if(el.id === "zoom" || el.id === "file") return;',
             'if(el.id === "zoom" || el.type === "file") return;')

js = rep(js, '  if(!files.length) return;',
             '  if(!files.length){ toast("사진 파일이 아닙니다"); return; }')

js = rep(js, '''      im.onload = ()=>{
        const o = {img:im, name:f.name.replace(/\\.[^.]+$/,""), x:0, y:0, scale:1};''',
'''      /* 아이폰 HEIC 처럼 브라우저가 못 여는 형식이면 조용히 사라지지 않게 알려준다 */
      im.onerror = ()=>{
        if(++done === files.length){ syncZoom(); markPhoto(); render(); }
        toast("이 사진은 열 수 없어요 — " + f.name);
      };
      im.onload = ()=>{
        const o = {img:im, name:f.name.replace(/\\.[^.]+$/,""), x:0, y:0, scale:1};''')

# ---------- 3. 마크업 패치 ----------
sections = rep(sections,
  '<div id="drop">사진을 여기로 끌어다 놓기<br><span style="font-size:11px">(또는 클릭해서 선택 · 여러 장 가능)</span></div>',
  '<div id="drop">여기를 눌러 사진 넣기<br><span style="font-size:11px">(앨범 · 카메라 · 파일/드라이브 · 여러 장 가능)</span></div>')

# 사진을 어디서 가져올지 고를 수 있게 — 기기 앨범 / 카메라 / 파일앱(구글 드라이브 등)
sections = rep(sections,
  '      <input type="file" id="file" accept="image/*" multiple hidden>',
  '      <div class="btns" style="margin-top:8px">\n'
  '        <button id="pickAlbum">사진 앨범</button>\n'
  '        <button id="pickCam">카메라</button>\n'
  '        <button id="pickFiles">파일 · 드라이브</button>\n'
  '      </div>\n'
  '      <div class="hint"><b>파일 · 드라이브</b> 는 휴대폰의 파일 앱을 엽니다. 거기서 <b>구글 드라이브</b>·원드라이브·'
  '다운로드 폴더에 있는 사진도 고를 수 있어요.<br>'
  '드라이브가 안 보이면 파일 앱(아이폰) 또는 파일 선택 화면(안드로이드)에서 드라이브를 한 번 켜주면 계속 보입니다.</div>\n'
  '      <input type="file" id="file" accept="image/*" multiple hidden>\n'
  '      <input type="file" id="fileCam" accept="image/*" capture="environment" hidden>\n'
  '      <input type="file" id="fileAny" multiple hidden>')

sections = rep(sections,
  '<div class="hint">캔버스에서 <b>드래그</b>하면 위치 이동, <b>휠</b>은 확대/축소.</div>',
  '<div class="hint">미리보기에서 <b>한 손가락</b>으로 끌면 위치 이동, <b>두 손가락</b>을 벌리면 확대·축소.<br>'
  '미리보기의 제호·문구를 <b>톡</b> 치면 그 메뉴가 바로 열립니다.</div>')

sections = rep(sections,
  '<div class="hint">빈 곳을 <b>클릭</b>하면 점 추가, <b>드래그</b>로 이동, <b>더블클릭</b>으로 삭제. 뒤 그래프는 현재 사진의 히스토그램입니다.</div>',
  '<div class="hint">빈 곳을 <b>톡</b> 치면 점 추가, <b>끌면</b> 이동, 같은 점을 <b>두 번 톡톡</b> 치면 삭제. 뒤 그래프는 현재 사진의 히스토그램입니다.</div>')

sections = rep(sections,
  '''      <div class="btns">
        <button class="pri" id="save">이 커버 PNG 저장</button>
        <button id="saveAll">전체 사진 일괄 저장</button>
      </div>''',
  '''      <div class="btns">
        <button class="pri" id="save">이 커버 PNG 저장</button>
        <button id="share">사진 앱으로 공유</button>
      </div>
      <div class="btns" style="margin-top:6px"><button id="saveAll">전체 사진 일괄 저장</button></div>''')

sections = rep(sections,
  '<div class="hint">설정은 자동 저장돼서 창을 닫았다 열어도 그대로입니다. 사진은 저장되지 않습니다.</div>',
  '<div class="hint"><b>공유</b>를 쓰면 아이폰·갤럭시의 공유창이 떠서 사진 앨범이나 카톡으로 바로 보낼 수 있습니다.<br>'
  '설정은 자동 저장돼서 창을 닫았다 열어도 그대로입니다. 사진은 저장되지 않습니다.</div>')

# 안내창(사용 방법) 문구를 손가락 조작으로
helpmodal = rep(helpmodal,
  '<div class="sub">사진을 넣으면 바로 커버가 됩니다. 저장 전까지 아무것도 서버로 올라가지 않습니다.</div>',
  '<div class="sub">휴대폰용입니다. 사진을 넣으면 바로 커버가 되고, 아무것도 서버로 올라가지 않습니다.</div>')
helpmodal = rep(helpmodal,
  '<li>왼쪽 <b>점선 상자</b>에 사진을 끌어다 놓거나 클릭해서 고릅니다. 여러 장 한꺼번에 됩니다.</li>',
  '<li>아래 <b>＋ 사진</b> 을 눌러 앨범에서 고릅니다. 여러 장 한꺼번에 됩니다.</li>')
helpmodal = rep(helpmodal,
  '<li>미리보기에서 <b>드래그</b>하면 사진 위치, <b>마우스 휠</b>은 확대·축소입니다.</li>',
  '<li>미리보기에서 <b>한 손가락</b>으로 끌면 사진 위치, <b>두 손가락</b>을 벌리면 확대·축소입니다.</li>')
helpmodal = rep(helpmodal,
  '<li>썸네일을 누르면 사진이 바뀌고, 오른쪽 위 <b>×</b>로 뺍니다. 설정은 그대로 유지됩니다.</li>',
  '<li>사진이 여러 장이면 아래쪽 <b>◀ ▶</b> 로 넘깁니다. 작은 그림의 <b>×</b> 를 누르면 뺍니다. 설정은 그대로 유지됩니다.</li>')
helpmodal = rep(helpmodal,
  '<li><b>3. 제호</b>의 매거진 목록에서 고르면 제호 서체·자간뿐 아니라 <b>그 잡지가 실제로 문구를 놓는 자리</b>까지 예시로 채워집니다.</li>',
  '<li>아래 <b>제호</b> 탭의 매거진 목록에서 고르면 제호 서체·자간뿐 아니라 <b>그 잡지가 실제로 문구를 놓는 자리</b>까지 예시로 채워집니다.</li>')
helpmodal = rep(helpmodal,
  '<li><b>11. 곡선</b> — 뒤에 보이는 산 모양이 이 사진의 히스토그램입니다. 선을 <b>클릭</b>해 점을 추가하고 <b>드래그</b>로 옮깁니다. <b>더블클릭</b>하면 점이 지워집니다. RGB / R / G / B 채널을 따로 만질 수 있습니다.</li>',
  '<li><b>곡선</b> — 뒤에 보이는 산 모양이 이 사진의 히스토그램입니다. 빈 곳을 <b>톡</b> 쳐 점을 추가하고 <b>끌어서</b> 옮깁니다. 같은 점을 <b>두 번 톡톡</b> 치면 지워집니다.</li>')
helpmodal = rep(helpmodal,
  '<li><b>이 커버 PNG 저장</b>은 지금 보이는 한 장, <b>전체 사진 일괄 저장</b>은 넣어둔 사진 전부를 같은 디자인으로 내보냅니다.</li>',
  '<li>아래 <b>저장</b>은 파일로 내려받고, <b>공유</b>는 휴대폰 공유창을 띄워 사진 앨범·카톡으로 바로 보냅니다.</li>')
helpmodal = helpmodal.replace('<h3>1 · 사진 넣기</h3>',
  '<h3>0 · 화면 보는 법</h3>\n    <ul>\n'
  '      <li>아래 <b>손잡이(━)</b> 를 위아래로 끌면 메뉴 칸이 커지고 작아집니다. 톡 치면 접혔다 펴집니다.</li>\n'
  '      <li>손잡이 아래 <b>동그란 탭</b> 을 누르면 그 메뉴로 바로 갑니다.</li>\n'
  '    </ul>\n\n    <h3>1 · 사진 넣기</h3>')

helpmodal = rep(helpmodal,
  '    <div class="foot"><button class="pri" id="helpClose">닫기</button></div>',
  '    <h3>PC 에서 쓰려면</h3>\n'
  '    <p>넓은 화면용(사이드바 방식)은 <a href="../" style="color:var(--acc)">여기</a> 에 있습니다. '
  '설정은 화면마다 따로 저장됩니다.</p>\n\n'
  '    <div class="foot"><button class="pri" id="helpClose">닫기</button></div>')

# 섹션마다 data-tab 이름을 붙일 필요는 없다 — 순서대로 탭을 만든다.

# ---------- 4. 조립 ----------
head   = io.open(S + "/head.html", encoding="utf-8").read()
btop   = io.open(S + "/body_top.html", encoding="utf-8").read()
bbot   = io.open(S + "/body_bottom.html", encoding="utf-8").read()
extras = io.open(S + "/extras.js", encoding="utf-8").read()

head = head.replace("__FONTLINKS__", fontlinks).replace("__TOKENS__", tokens.rstrip() + "\n")

out = (head + btop + sections + "\n" + bbot + "\n" + helpmodal
       + "\n<script>\n" + js + "</script>\n"
       + "<script>\n" + extras + "</script>\n</body>\n</html>\n")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
io.open(OUT, "w", encoding="utf-8").write(out)
print("wrote", OUT, len(out), "bytes")
