# 매거진 커버 메이커

사진을 끌어다 놓으면 바로 매거진 표지가 되는 도구입니다. 설치할 것도, 로그인할 것도 없습니다.
**HTML 파일 하나**로 되어 있고 모든 처리가 브라우저 안에서 끝납니다.

**→ [바로 써보기](https://musicits.github.io/magazine-cover-maker/)**

---

## 무엇을 할 수 있나

- **매거진 25종 조판 프리셋** — 제호 서체·자간·크기뿐 아니라, 그 잡지가 실제로 문구를 놓는 자리까지 예시로 채워집니다
- **라이트룸식 색보정** — 노출·대비·밝은 영역·어두운 영역·흰색·검정 / 색온도·색조·생동감·채도 / 톤 커브(RGB·R·G·B) + 히스토그램
- **필름 룩 필터 9종** — 세기 0~100% 조절
- **로고 앞뒤 겹치기** — 모델이 제호 앞으로 나오게
- **여러 장 한 번에** — 사진을 여러 장 넣고 같은 디자인으로 일괄 저장

## 사진은 어디로도 올라가지 않습니다

넣으신 사진과 문구는 **브라우저 밖으로 나가지 않습니다.** 서버로 전송하는 코드가 없습니다.
설정은 브라우저 로컬 저장소에만 남고, 사진은 저장조차 하지 않습니다.

---

## 쓰는 법

1. 왼쪽 점선 상자에 사진을 끌어다 놓습니다 (여러 장 가능)
2. **3. 제호**에서 매거진을 고릅니다
3. 문구를 내 것으로 바꿉니다 — 줄 앞에 `*`를 붙이면 그 줄만 강조색
4. **14. 내보내기**에서 PNG로 저장

미리보기에서 **드래그**하면 사진 위치, **휠**은 확대/축소입니다.
도구 안 오른쪽 위 **?** 버튼에 더 자세한 설명이 있습니다.

### 제호에 쓸 수 있는 표기

| 표기 | 결과 | 예 |
|---|---|---|
| `*...*` | 그 부분만 기울임 | `HIGH *CUT*` |
| `^...^` | 위첨자 | `1^st^ Look` |

---

## 수록된 매거진

**한국판** VOGUE · Harper's BAZAAR · ELLE · W · MARIE CLAIRE · GRAZIA · COSMOPOLITAN · ALLURE · NYLON · DAZED · GQ · ESQUIRE · InStyle

**한국 매거진** CéCi · SINGLES · HIGH CUT · 1st Look · ARENA HOMME+ · BEAUTY+

**해외판** VOGUE · Harper's BAZAAR · ELLE · W · i-D · NUMÉRO TOKYO

---

## 서체에 대해

각 잡지의 제호는 그 회사의 전용 레터링이라 그대로 쓸 수 없습니다.
이 도구는 **결이 가장 가까운 무료 서체(SIL Open Font License)** 35종으로 맞춘 것입니다.

Bodoni Moda · Playfair Display · Abril Fatface · Prata · DM Serif Display · Italiana · Archivo Black ·
Inter · Instrument Serif · Cormorant Garamond · Antic Didone · Yeseva One · Cinzel · Marcellus ·
Anton · Bebas Neue · Oswald · Josefin Sans · Yellowtail · Lobster · Great Vibes · Sacramento ·
Kaushan Script · Poppins · Fraunces · Archivo · Quicksand · Figtree · Special Elite · Tinos ·
Nanum Myeongjo · Noto Sans KR · Noto Serif KR · Gowun Batang · Black Han Sans

> **공개할 때 유의하세요.** 콘셉트 참고나 내부 시안으로 쓰는 건 문제가 없지만,
> 실제 잡지 이름을 그대로 단 표지를 SNS 등 공개 채널에 올리면 **상표 문제가 될 수 있습니다.**
> 공개용은 제호를 직접 입력해 본인 브랜드 이름으로 바꿔 쓰세요.

---

## 직접 돌리기

```bash
git clone https://github.com/musicits/magazine-cover-maker.git
```

`index.html`을 브라우저로 열면 끝입니다. 빌드 과정이 없습니다.
서체는 Google Fonts에서 받아오므로 처음 열 때 인터넷이 필요합니다.

**권장 환경** Chrome / Edge / Safari 최신 버전 (Canvas 2D와 웹폰트 로딩 API를 씁니다)

---

## 라이선스

코드는 [MIT](LICENSE)입니다.

다만 **뮤직잇츠(musicITs) 로고는 예외**입니다. 상표이므로 MIT 적용을 받지 않습니다.
포크하실 때는 `LOGO_SRC` 값을 본인 로고로 바꿔주세요.

수록 서체는 각 서체의 SIL Open Font License를 따릅니다.

---

만든 곳 · [뮤직잇츠](https://blog.naver.com/musicits)
