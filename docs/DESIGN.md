# 우리 어디가 (where-we-go) — 설계서 v0.2

| 항목 | 내용 |
|---|---|
| 문서 상태 | v0.3 — 가시 바람(HUD)·비행 사건 액터 (v0.2: 디자인 리뉴얼·3D 전환, v0.1.1: MVP 스캐폴드, v0.1: 구현 전 초안) |
| 작성일 | 2026-09-08 |
| 대상 | 모바일 웹 (세로), 정적 호스팅 (GitHub Pages / Cloudflare Pages) |
| 스택 | Vite + React + TypeScript, three.js/React Three Fiber 3D 씬(기울어진 직교 카메라), DTCG 디자인 토큰(Style Dictionary), 외부 지도 API 없음 |
| 함께 보는 것 | 이 저장소의 `src/` (데모 v0.1은 단일 HTML `arrow-travel-demo.html`로 검증 후 이식) |

---

## 1. 개요

### 1.1 한 문장 규칙

> 지도 아래에서 화살을 당겨 쏘고, 꽂힌 **시/군/구**가 이번 여행지.

### 1.2 배경

"지도에 다트/마커를 던져 여행지를 정하는" 랜덤 여행 놀이의 웹 버전. 던지기를 **당겨서 쏘기**로 바꾼다. 당기기→놓기는 터치 한 번으로 방향과 세기를 동시에 표현할 수 있어, 모바일에서 가장 자연스러운 발사 입력이다.

### 1.3 설계 원칙

1. **한 손, 세로, 한 제스처.** 조준부터 발사까지 손가락 하나로 끝난다. 버튼을 먼저 누르는 단계가 없다.
2. **한 판 10초.** 당기기 1~2초, 비행 1초, 결과 확인 수 초. 반복해서 쏘고 싶어야 한다.
3. **조준 반, 운 반.** 당긴 대로 날아가되 HUD에 보이는 바람이 밀고, 가끔 비행 중 사건(종이비행기·손가락·갈매기·돌풍)이 한 번 더 꺾는다. 바람은 실력이고 사건은 운이다.
4. **링크 하나로 공유.** 서버 없이 URL만으로 결과가 재현된다.
5. **재미는 파라미터 튜닝에서 온다.** 규칙을 늘리기보다 사거리 곡선·바람·스냅 거리를 조절한다.

### 1.4 하지 않는 것 (v1)

- 실제 타일 지도(카카오/네이버/OSM) 렌더링 → 결과 카드의 딥링크로 대체
- 관광지/맛집 추천 (외부 API 키 필요) → 2단계
- 로그인, 서버 저장, 리더보드

---

## 2. 사용자 시나리오

**S1. 처음 온 사람 (공유 링크 없이)**
페이지를 열면 지도와 활이 보이고 "화면을 아래로 당겼다 놓으면 화살이 날아가요" 힌트가 있다. 아무 곳이나 눌러 아래로 끌면 활이 그 방향을 향하고 조준선과 파워 게이지가 뜬다. 놓으면 화살이 날아가 꽂히고, 지도가 잠깐 흔들린 뒤 결과 시트가 올라온다. "강원특별자치도 강릉시". 다시 쏘거나, 카카오맵으로 열거나, 공유한다.

**S2. 공유 링크로 들어온 사람**
`?lat=37.75&lng=128.88` 이 붙은 링크를 열면 비행 없이 그 자리에 화살이 꽂힌 상태로 결과 시트가 바로 뜬다. "다시 쏘기"를 누르면 자기 차례가 된다.

**S3. 친구들과 돌려 쏘기 (v1에서는 자연 발생)**
한 명이 쏘고 결과를 보여주고, 다음 사람이 "다시 쏘기"를 누른다. 별도 모드 없이도 성립하지만, 2단계에서 "N명 → N발 → 투표" 모드로 확장 가능.

---

## 3. 게임 루프 (상태 머신)

```
IDLE ──pointerdown──▶ AIMING ──pointerup(|p|≥deadZone)──▶ FLYING ──τ=1──▶ LANDED ──420ms──▶ RESULT
 ▲                      │                                                                     │
 └──pointerup(|p|<deadZone) : 취소 ◀──┘                                          다시 쏘기 ────┘
```

| 상태 | 진입 조건 | 화면 | 받는 입력 | 이탈 |
|---|---|---|---|---|
| **IDLE** | 초기 / 다시 쏘기 | 지도, 활(위를 향함), 힌트 | `pointerdown` (화면 어디든) | → AIMING |
| **AIMING** | pointerdown | 활 회전, 조준선(점선)+조준점, 파워 게이지(원호), 힌트 "놓으면 발사 · 세기 N%" | `pointermove`, `pointerup`, `pointercancel` | \|p\| < deadZone → IDLE(취소), 아니면 → FLYING |
| **FLYING** | 착지점 확정 | 화살 비행(스케일·그림자로 높이), 궤적 점선 | 없음 (전부 무시) | 비행 시간 T 경과 → LANDED |
| **LANDED** | 착지 | 임팩트 링, 꽂힌 화살(핀), 조준점 잔상, 스냅 시 점선, 해당 시군구 하이라이트, 햅틱 | 없음 | 420ms → RESULT |
| **RESULT** | 판정 완료 | 결과 시트 슬라이드 업, 착지점이 가려지면 지도 레이어를 위로 밀어 올림 | 다시 쏘기 / 카카오맵 / 공유 | 다시 쏘기 → IDLE |

구현 메모: 상태는 단일 `useReducer`(또는 zustand 스토어 하나)로 관리한다. **착지점은 `pointerup` 순간에 확정**하고, FLYING은 그 지점으로 가는 연출이다. 판정(`findRegion`)은 착지 직후 1회 호출한다.

---

## 4. 화면 설계

### 4.1 기준 뷰포트

390×844 (iPhone 14 계열) 기준, `100dvh`. 데스크톱에서는 최대 430px 폭의 세로 스테이지를 가운데 배치.

```
┌──────────────────────────────┐  0
│ 우리 어디가          ↗ 18km  │  safe-area + 14  (HUD 바람 게이지)
│      힌트 텍스트 (상태별)      │  ~64
├──────────────────────────────┤  96   ← mapTop
│                              │
│         지도 (SVG)            │
│   17개 시도 / 249개 시군구     │
│   Mercator, 뷰포트 fit        │
│                              │
│                    ◯ 조준점   │
│                   ⋰          │
│                  ⋰ 조준선     │
├──────────────────────────────┤  anchor.y − 40  ← 지도 하한
│        ╭─파워 게이지─╮        │
│        │  🏹 활+화살 │        │  anchor = (W/2, H−170)
│        ╰────────────╯        │
│    ↓ 당길 공간 (≈170px)       │
│  경계 데이터 출처 (10px)        │
└──────────────────────────────┘  844
```

### 4.2 레이어 구성 (z 순서)

1. `SceneLayer` (three.js Canvas, `features/scene`) — 바다 시트·1° 격자, 249 시군구 extrude 지형(드로우콜 1)+외곽선, 활·시위·장전 화살, 조준선(점선)·조준점·게이지, 비행 화살·그림자·궤적 리본, 임팩트·핀·스냅 점선. **`frameloop="demand"`** — IDLE에서는 프레임 0, 포인터/애니메이션이 `invalidate()`로 프레임을 요청한다. 프레임 단위 갱신은 `useFrame` + ref (React 리렌더 없음).
2. `InputLayer` (div, `features/shooter`) — 입력 전용 투명 레이어. `touch-action: none`, `setPointerCapture`. 당김을 mutable `AimState`에 쓰고 씬(Bow·AimGuide)이 프레임마다 읽는다.
3. HUD(브랜드, 바람 게이지, 힌트) — `pointer-events: none`. 바람 게이지는 DOM(rAF), 캔버스는 IDLE 프레임 0.
4. 결과 시트(bottom sheet, `shared/ui/Sheet`) — 버튼만 인터랙티브. 시트가 착지점을 가리면 **카메라**를 shiftY만큼 이동한다(`translateY(-shiftY)`와 등가).

### 4.3 비주얼 톤

낮의 종이지도(2026-09-08 리뉴얼). 크림 종이 배경 `#F6EFDC`, 시트 `#FFFCF3`, 잉크 텍스트 `#2B2118`, 종이 파랑 물 `#CFE2E8`(옆면 `#B4D0D9`), 육지는 시도별 파스텔 5색(sage `#CFE0B8` · sand `#F3E3A8` · peach `#F6CDB3` · lilac `#DCD3EA` · mint `#C6E3DB`, 인접 시도 상이 — `scene/palette.test.ts`) + 잉크 외곽선 `#75634F`, 강조(화살촉·조준·게이지·primary 버튼) 오렌지 `#E8702A`(텍스트는 `#A64A12`), 하이라이트 `#F3A15F`, 임팩트 `#C9432F`. 디스플레이 서체 Jua(지역명·브랜드·버튼), 본문 Gowun Dodum. 라이트 단일 테마(게임 화면)로 고정.

**단일 출처는 `src/shared/tokens/tokens.json`(W3C DTCG).** `npm run tokens:build`(Style Dictionary v5)가 `tokens.css`(CSS 변수, primitive→semantic→component 3계층)와 `tokens.ts`(three.js 머티리얼용 상수)를 생성하고 둘 다 커밋한다(`prebuild`로 stale 방지). `tokens.test.ts`가 WCAG AA 대비를 고정한다. 컴포넌트 프리미티브는 `src/shared/ui`(Button·Sheet·Toast·text.css, 플레인 CSS·전역 클래스), 쇼케이스는 dev 전용 `/design`(`design.html`, 프로덕션 번들 밖).

### 4.5 3D 좌표계 · 카메라

월드 = 레이아웃 px (`x→x`, `z→y(아래)`, `y=높이`, 1unit = 1px). 카메라는 **기울어진 직교(orthographic)**, 피치 θ=55°(`SCENE.pitchDeg`), 프러스텀 높이 `H·sinθ` → 지면 점 `(x,0,z)`가 화면 px `(x, z−shiftY)`에 **항등 매핑**된다(`scene/camera.ts`). 그래서 `computeShot`·`findRegion`·`LAYOUT`·`PARAMS`의 px 수치가 모두 그대로 유효하고, 드래그 벡터가 곧 지면 벡터라 레이캐스트가 필요 없다. 높이 h는 화면 위로 `h·cotθ`px 시어되어 extrude 측벽(남쪽 면)·화살 아치·그림자로 입체감이 난다. 불변식은 `scene/camera.test.ts`가 고정한다. 원근 카메라로 바꾸려면 `CameraRig` + 입력 언프로젹션만 교체.

- 높이 레벨: 바다 시트 −3.5..−0.5 · 격자 −0.3 · 육지 0..8(`SCENE.depth`) · 외곽선 8.2 · 맞은 시군구 +4(`SCENE.hitLift`) · 오버레이 UI(조준선·게이지·임팩트·그림자·마커) 0.4에 `depthTest: false`
- 조명·톤매핑 없음(`flat`, `MeshBasicMaterial` + 정점색 베이크) → 토큰 hex가 그대로 렌더된다. 추가하면 대비를 다시 검증할 것.

### 4.4 결과 시트

| 요소 | 내용 |
|---|---|
| 아이브로 | "이번 여행지" / 헛발이면 "헛발" |
| 지역명 | 시군구 (Jua 40px, `.t-display`). `수원시장안구` → `수원시 장안구`로 표시 |
| 시/도 | 강조색. 코드 앞 2자리 기준 + 예외(군위군→대구) |
| 메타 | 좌표(소수 4자리), 바람(HUD 바람이 민 km), 사건(있으면 튕긴 km), 행정코드 |
| 노트 | 스냅됐을 때 "바다에 떨어졌지만 N km 옆 해안으로 붙였어요" |
| 액션 | **다시 쏘기**(primary) · 카카오맵(딥링크) · 공유(Web Share → 클립보드 폴백) |

---

## 5. 인터랙션 & 물리 모델

### 5.1 입력

- Pointer Events 사용 (`pointerdown/move/up/cancel`), `setPointerCapture`로 손가락이 요소 밖으로 나가도 추적.
- **상대 드래그**: 활을 정확히 잡을 필요 없이 화면 어디서든 시작. 당김 벡터 `p = start − current`.
- 발사 방향 `p̂ = p / |p|` (당긴 반대쪽). 아래로 당기면 위로 날아간다.
- 게임 영역: `touch-action: none`, `overscroll-behavior: none`, `user-select: none`.

### 5.2 당김 → 사거리

```
u = (clamp(|p|, deadZone, pMax) − deadZone) / (pMax − deadZone)      // 0..1
d = dMin + (dMax − dMin) · u^γ                                          // px
aim = anchor + d · p̂
```

데드존 경계가 정확히 `dMin`(제주 바로 아래)에 대응하도록 데드존을 뺀 구간을 정규화한다. 이렇게 하지 않으면 제주 구간이 데드존 안에 들어가 사실상 도달 불가가 된다(데모에서 실제로 겪은 문제).

### 5.3 바람 (가시·실시간)

라운드마다 시드 `Round = { seed, t0 }`. HUD가 `windAt(seed, now−t0)`을 rAF로 표시하고, 놓는 순간의 값이 착지에 적용된다. 같은 seed면 같은 곡선(순수 함수, mulberry32).

```
θ(t) = θ0 + 0.6·sin(2πt/T1+φ1) + 0.25·sin(2πt/T2+φ2)
m(t) = maxPx · (0.5 + 0.5·sin(2πt/T3+φ3)) · (0.6 + 0.4·s0)     // 0..maxPx
wind = (m·cosθ, m·sinθ)                                        // "끝까지 쏘면 밀리는 px"
drift = wind · (d / dMax)
residual = (N(0,1)·residualSigma·d, …)                         // HUD에 안 보이는 잔여
event = sampleEvent(..., rate = lerp(rate, rateWindy, |wind|/maxPx))  // 무풍 55% → 최대풍 10%
landing = aim + drift + residual + (event?.kick ?? 0)
```

`periodsSec = [7, 2.9, 5.3]`(무리수 비율 → 반복 안 함). 조준 점선은 무풍 경로 — 보정은 플레이어 몫. 게이지는 IDLE·AIMING에서만 움직이고, 놓은 뒤 그 순간의 바람에 멈춘다.

이 스케일에서 1px ≈ 1.05km. `maxPx=60`이면 끝까지 쐈을 때 최대 ≈63km. 잔여 σ=0.01은 사거리 500px 기준 ≈5px≈5km. 사건이 없을 확률은 바람이 셀수록 올라간다(무풍일 때 사건이 더 잘 난다).

### 5.4 비행 연출 (착지점은 이미 확정)

```
T = tMin + (tMax − tMin) · (d / dMax)              // 비행 시간
τ = (now − t0) / T,  e = 1 − (1 − τ)^1.6           // ease-out: 초반 빠르고 끝에 꽂힘
pos = anchor + (landing − anchor) · e
h = 4·τ·(1 − τ)                                    // 가짜 높이 0..1, 정점 τ=0.5
scale = 1 + apexScale · h
shadow = pos + (18h, 26h), opacity 0.28·(1 − 0.6h)
```

`prefers-reduced-motion`이면 τ=1로 즉시 착지.

3D에서는 위 수식을 그대로 쓰되 높이를 실제 y로 올린다 (`scene/pose.ts`):

```
apexH = clamp(apexRatio · d, 30, 160)                             // 정점 높이 (unit = px)
pos = (anchor + (landing − anchor)·e,  apexH·h)
yaw = −atan2(dz, dx)
pitch = max(atan2(vy, v수평), −pinPitch)     // easeOut'(1)=0 → 마지막에 정확히 −pinPitch(62°)로 꽂힘
```

그림자는 같은 화살 메시를 지면(오버레이 높이)에 납작하게 깔고, 궤적은 48샘플 리본(최신이 넓고 진함). 직교 카메라라 원근 확대가 없어 `apexScale`은 0.35로 낮췄다. 핀은 비행 화살 메시 그대로 스냅 지점에 `−pinPitch`로 꽂힌다(맞으면 솟은 시군구 윗면 높이).

사건이 있으면 궤적이 `at`에서 꺾인다. `L0 = landing − kick`, `τ < at`는 목표 L0, 이후 `Pe → landing`. 비행 시간 `T += extraMs`. 액터(종이비행기·손가락·갈매기·돌풍)는 `at` 전후 창에서만 보이고, `prefers-reduced-motion`이면 생략(문구만).

```
Pe = anchor + (L0−anchor)·easeOut(at)
τ ≥ at : u = (τ−at)/(1−at) ; pos = Pe + (landing−Pe)·easeOut(u)
```

### 5.5 튜닝 파라미터 (데모 v0.1 값)

| 이름 | 값 | 의미 | 조절 방향 |
|---|---|---|---|
| `deadZone` | 18 px | 이 미만으로 당기고 놓으면 취소 | 터치 지터(2~3px)보다 충분히 크게 |
| `pMax` | 170 px | 최대 당김 (포화) | 앵커 아래 남는 공간에 맞춤 |
| `gamma` | 1.2 | 당김→사거리 곡선 지수 | ↑ 근거리 해상도↑, 북부 압축 |
| `dMinPx` | 50 px | 데드존 경계에서의 사거리 | 제주 남단 바로 아래 |
| `overshootPx` | 40 px | 지도 북단 위 여유 | ↑ 북쪽 헛발 증가 |
| `wind.maxPx` | 60 px | 끝까지 쐈을 때 바람 상한 | ↑ 뽑기·보정 폭 |
| `wind.residualSigma` | 0.01 | 잔여 난수 σ / 사거리 | ↑ 숨은 흔들림 |
| `wind.periodsSec` | 7 / 2.9 / 5.3 | 각도·세기 주기(초) | 무리수 비율 유지 |
| `events.rate` | 0.55 | 무풍일 때 사건 확률 | ↑ 잔잔할수록 사건 |
| `events.rateWindy` | 0.10 | 최대 바람일 때 사건 확률 | ↓ 강풍에 사건 억제 |
| `events.atRange` | 0.40..0.52 | 사건 τ 구간 | 정점 근처 |
| `events.extraMs` | 800 | 사건 시 비행 가산 | ↑ 액터가 오래 보임 |
| `events.kick.*` | 0.06..0.09 | 종류별 킥 / 사거리 | |
| `events.maxKick` | 0.12 | 킥 상한 / 사거리 | |
| `snapKm` | 30 km | 바다 착지 시 스냅 허용 | ↑ 헛발 감소 |
| `tMin / tMax` | 650 / 1200 ms | 비행 시간 | 느리면 지루, 빠르면 안 보임 |
| `apexScale` | 0.35 | 정점 확대 (직교라 약하게) | 높이감 보조 |
| `apexRatio` | 0.22 | 정점 높이 / 사거리 (30..160 클램프) | ↑ 아치 높이 |
| `pinPitchDeg` | 62 | 꽂힌 화살 기울기 | 비행 마지막 피치가 여기로 수렴 |

**알려진 트레이드오프:** 제주는 전체 사거리의 약 5%라 당김 폭 약 11px 구간에 해당한다. 어느 시군구든 3~5%라 이는 구조적이며, 바람·사건이 이를 압도한다. 앵커를 더 내리면(지도 축소) 제주 구간이 넓어진다. 플레이테스트 후 결정.

---

## 6. 지도 데이터 · 좌표계 · 판정

### 6.1 데이터 출처와 파이프라인

- 원본: 통계청 SGIS 센서스용 행정구역경계(시군구, 2018) — [southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps) `kostat/2018/json/skorea-municipalities-2018-topo-simple.json` (553KB, 250 features). 저장소 README 기준 KOSTAT 데이터는 "Free to share or remix". **배포 전 SGIS 이용약관/공공누리 유형 재확인 후 출처 표기.**
- 가공 (데모에서 사용한 명령):
  ```bash
  # 30% 단순화, 2km² 미만 섬 제거, 울릉군(37430) 제외(v1), 불필요 속성 삭제 → 약 177KB
  npx mapshaper skorea-municipalities-2018-topo-simple.json \
    -simplify 30% keep-shapes \
    -filter-islands min-area=2km2 \
    -filter 'code != "37430"' \
    -each 'delete name_eng; delete base_year' \
    -rename-layers sgg \
    -o format=topojson quantization=20000 sgg.topo.json
  ```
- 번들에 TopoJSON으로 포함, 클라이언트에서 디코드(arc delta + transform). `topojson-client`를 쓰거나 40줄짜리 디코더를 직접 둔다(데모는 직접 구현).
- **행정구역 개편 반영** (데이터가 2018이므로 코드로 보정):
  - `32` → 강원특별자치도 (2023.6), `35` → 전북특별자치도 (2024.1)
  - `군위군`(37xxx) → 소속 시도 **대구광역시** (2023.7)
  - `세종시` → 표시명 "세종특별자치시"
- 시/도 이름 매핑 (KOSTAT 코드 앞 2자리): 11 서울, 21 부산, 22 대구, 23 인천, 24 광주, 25 대전, 26 울산, 29 세종, 31 경기, 32 강원, 33 충북, 34 충남, 35 전북, 36 전남, 37 경북, 38 경남, 39 제주.

### 6.2 투영

- Mercator. `mx = lon·π/180`, `my = ln(tan(π/4 + lat·π/360))`.
- 전체 링의 bbox를 계산해 지도 영역(`mapTop` ~ `anchor.y − 40`, 좌우 패딩 18px)에 `k = min(availW/Δmx, availH/Δmy)`로 fit.
- 화면↔경위도 변환은 `project` / `invert` 두 함수로만 한다. (invert의 y 부호 주의: `my = (cy − y)/k + my0`.)
- 리사이즈 시 IDLE 상태에서만 재계산.

### 6.3 판정 (`findRegion`)

1. 착지 화면좌표로 각 시군구의 **화면좌표 링**에 대해 ray casting. 한 feature의 모든 링(외곽+구멍)을 합쳐 **even-odd** 판정 → 구멍 처리 자동.
2. 성능: 249 feature × 수천 정점, 모바일에서도 수 ms. 필요하면 feature별 bbox 1차 필터 추가.
3. 아무 곳에도 안 들어가면 → **바다 처리**(§7).
4. 결과: `{ index, snapped, snapPt, snapKm? }`. 경위도는 `invert(snapPt)`.

### 6.4 순수 함수로 분리할 것 (단위 테스트 대상)

- `pullToRange(mag, P)`, `landingFrom(anchor, p, P, rng)`
- `decodeTopo(topo)`, `project/invert`
- `findRegion(pt, screenRings, P)`
- `provinceOf(feature)`, `prettyName(name)`

---

## 7. 예외 처리

| 상황 | 처리 (v1 결정) | 근거 |
|---|---|---|
| 바다 착지, 가장 가까운 육지 정점까지 ≤ `snapKm`(30km) | 그 시군구로 **스냅**. 핀은 스냅 지점에, 실제 착지점과 점선으로 연결, 노트로 알림 | 해안 시군구는 폴리곤이 좁아 순수 판정으로는 거의 안 뽑힘. "아깝게 빠졌다" 감각 유지 |
| 바다 착지, > 30km | **헛발**. "바다에 빠졌어요" 시트, 다시 쏘기만 제공 | 무한 스냅은 조준 의미를 없앰 |
| 지도 북단 위(북한 방향)/좌우 밖 | 헛발과 동일 | — |
| 울릉도·독도 | v1 지도에서 제외 (`37430` 필터) | 뷰포트 fit이 동쪽으로 늘어남. 인셋 박스 여부는 열린 질문 |
| 2km² 미만 섬 | 단순화 단계에서 제거 | 게임 지도 가독성. 우도(6km²)·백령도 등은 유지 |
| 데드존 미만 당김 | 취소, 힌트로 안내 | 오터치 방지 |
| FLYING/LANDED 중 입력 | 무시 | 연출 중 상태 꼬임 방지 |
| 리사이즈/회전 | IDLE에서만 레이아웃 재계산. 가로 모드는 세로 스테이지를 가운데 배치 | — |

---

## 8. 결과 · 공유

- **공유 URL**: `?lat=37.75190&lng=128.87610` (소수 5자리). 페이지 로드 시 파라미터가 있으면 비행 없이 `land(pt, pt)` → 같은 결과 재현. 서버 불필요.
- **Web Share API** → 미지원 시 `navigator.clipboard` → 실패 시 URL 토스트.
- **카카오맵 딥링크**: `https://map.kakao.com/link/map/{이름},{lat},{lng}`. (네이버는 2단계에서 검토.)
- **OG 이미지**: v1은 정적 한 장. 결과별 이미지는 Cloudflare Pages Functions(엣지에서 SVG→PNG)로 2단계. 이것이 GitHub Pages ↔ Cloudflare 선택의 실질적 분기점.

---

## 9. 기술 스택 · 아키텍처

### 9.1 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드/프레임워크 | Vite 8 + React 19 + TypeScript 5.9 | 정적 빌드, 다른 사이드 프로젝트와 동일 스택 |
| 지도·연출 렌더 | three.js 0.185 + @react-three/fiber 9 (`features/scene`) | 249 시군구 extrude 지형(병합, 드로우콜 1) + 기울어진 직교 카메라로 2D 좌표 그대로(§4.5). drei 미사용 |
| 화살/연출 | `useFrame` + ref, `frameloop="demand"` | 프레임당 setState 0, IDLE 프레임 0. 화살은 절차적 지오메트리(glTF 없음) |
| 디자인 토큰 | DTCG `tokens.json` → Style Dictionary v5 (devDep) | `tokens.css` + `tokens.ts` 단일 출처, 생성물 커밋 |
| 지오 | 자체 Mercator + ray casting (`features/map`) | 의존성 0. d3-geo로 바꿔도 `project/invert` 인터페이스는 동일 |
| 상태 | `useReducer` 1개 (`app/gameReducer.ts`) | 상태 5개, 의존성 0 |
| 테스트 | Vitest 61개(순수 함수 + 카메라 항등·지오메트리·팔레트 인접·토큰 대비) + Playwright e2e 4개(iPhone 14 뷰포트, Chromium + SwiftShader WebGL) | 튜닝·좌표계 회귀 방지 |
| 배포 | Cloudflare Pages (권장) 또는 GitHub Pages | §10 |

### 9.2 폴더 (FSD 축소판) — 실제 구조

```
design.html               # 디자인 시스템 쇼케이스 (dev 전용, npm run dev → /design)
src/
  main.tsx                # tokens.css → styles.css 순서로 import
  app/
    App.tsx             # 스테이지 측정, 레이아웃→투영→화면링 useMemo, 상태 머신 배선, 시트 시프트, 공유, data-phase/data-hit
    gameReducer.ts      # Phase 5개 + Shot + Hint, 순수 reducer
    layout.ts           # computeLayout(width,height) → anchor/mapBox/dMax
    makeShot.ts         # 발사 기하 → findRegion 판정 → Shot / replayShot(URL 좌표)
    styles.css          # 앱 레벨 스타일(스테이지·HUD). 토큰은 shared/tokens
  design/               # /design 쇼케이스 (Design.tsx — 토큰·프리미티브 전 상태)
  features/
    map/
      data/sgg.topo.json   # 시군구 249개 TopoJSON (울릉군 제외)
      topo.ts              # decodeTopo — polygons([외곽,...구멍], 3D용) + rings(평탄, 판정용)
      projection.ts        # fitMercator — project/invert
      region.ts            # toScreen, inRing, pointInRegion(even-odd), findRegion(스냅)
      names.ts             # 시도 코드 매핑, 개편 보정, prettyName/fullName
      index.ts             # REGIONS (모듈 로드 시 1회 디코드)
    shooter/
      physics.ts           # pullToRange, computeShot(바람·사건), sampleEvent, flightTime, easeOut, heightAt
      usePull.ts           # Pointer Events 상대 드래그 훅 (setPointerCapture)
      aimState.ts          # AimState — mutable 조준 상태 (InputLayer가 쓰고 씬이 읽음)
      InputLayer.tsx       # 투명 입력 div + usePull + computeShot → onFire
    wind/
      wind.ts              # windAt(seed, t), newRound                         [test]
      WindGauge.tsx        # HUD 바람 화살 + km (rAF, setState 없음)
    scene/                 # three.js 씬 (map·shooter의 순수 함수·타입만 import, 역방향 금지)
      camera.ts            # orthoCamera — 지면↔화면 항등 매핑 (§4.5)          [test]
      CameraRig.tsx        # 카메라 적용 + shiftY 댐핑
      geometry.ts          # polygonToShape, extrudeColored, buildTerrain, outlineGeometry  [test]
      palette.ts           # SCENE_COLORS(tokens.ts 유일 소비자), provinceVariant  [test]
      Water.tsx / Terrain.tsx   # 바다 시트·격자 / 249 extrude + 외곽선 + HitRegion
      ArrowMesh.tsx        # 절차적 화살 지오메트리 (장전·비행·핀·그림자 공용)
      pose.ts              # apexHeight, flightPose(2구간), yawOf               [test]
      actors.ts            # actorPose — 사건 액터 동선                         [test]
      EventActor.tsx       # 종이비행기·손가락·갈매기·돌풍 절차적 메시
      ribbon.ts / dots.ts  # 궤적 리본 버퍼 / 점선 InstancedMesh 배치
      Bow.tsx / AimGuide.tsx / Flight.tsx   # 활·시위·장전 / 조준선·조준점·게이지 / 비행·그림자·임팩트·핀·스냅·액터
      SceneLayer.tsx       # <Canvas frameloop="demand"> 조립, data-ready/data-region-count
    result/
      ResultSheet.tsx      # 바텀시트 내용 (shared/ui Sheet·Button 사용)
      share.ts             # buildShareUrl, parseReplayParams, shareResult(Web Share→클립보드)
      deeplink.ts          # kakaoMapUrl
  shared/
    params.ts           # PARAMS(튜닝 표) + LAYOUT + SCENE 상수 — 단일 출처
    geo.ts              # haversineKm, clamp, 타입
    useReducedMotion.ts # prefers-reduced-motion 훅
    tokens/             # tokens.json(출처) · tokens.css / tokens.ts(생성물, 커밋) · tokens.test.ts(대비)
    ui/                 # Button · Sheet · Toast · text.css 프리미티브
scripts/build-tokens.mjs  # Style Dictionary v5 설정+실행 (npm run tokens:build, prebuild)
scripts/build-map.sh      # 데이터 파이프라인 (mapshaper)
e2e/shoot.spec.ts         # 첫 화면 / 발사→결과→다시 / 데드존 취소 / 공유 URL 재현 (data-* 속성 기반)
docs/DESIGN.md            # 이 문서
```

의존 방향: `shared` ← `features/*` ← `app`. features 사이는 타입만 참조하되 `scene`은 `map`·`shooter`의 **순수 함수**도 import한다(렌더 조립 계층). `shooter`·`scene`이 `app/gameReducer`의 `Phase`/`Shot` 타입을 쓰는 것은 화면 전용 컴포넌트라 예외로 허용.

### 9.3 성능 예산

- 초기 로드: gzip 후 < 400KB. 실측 v0.2: 앱 청크 ≈ 177KB + three 청크 ≈ 185KB(`manualChunks`로 분리, 배포 간 캐시) ≈ 362KB. (v0.1 SVG 시절 65KB → 3D 채택으로 예산 상향, 2026-09-08 결정.)
- 비행 중 60fps: `useFrame`에서 화살 위치/회전·그림자·리본 버퍼 갱신, 드로우콜 ≈ 16, 정적 삼각형 ≈ 10만. IDLE·RESULT는 프레임 0(`frameloop="demand"`).
- 판정 < 5ms (모바일 중급기).

---

## 10. 모바일 · 배포

### 10.1 모바일 체크리스트

- `viewport-fit=cover`, `env(safe-area-inset-*)` 반영 (HUD 상단, 시트 하단, 크레딧)
- `100dvh`, `overscroll-behavior: none`, 게임 영역 `touch-action: none`
- `navigator.vibrate` — Android만 동작, 옵셔널 호출
- `prefers-reduced-motion` 존중
- 터치 타깃 44px 이상 (버튼 `min-height: 44px`)
- iOS Safari: 더블탭 확대 방지(`user-scalable=no`는 접근성 트레이드오프 → 게임 화면이라 허용)
- PWA 매니페스트(홈 화면 추가)는 선택

### 10.2 배포

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| 정적 호스팅 | ✓ | ✓ |
| 커스텀 도메인 | ✓ | ✓ (DNS 통합) |
| 프리뷰 배포(PR별) | ✗ | ✓ |
| 서버리스 함수(OG 이미지 등) | ✗ | ✓ Functions |
| 주의 | Vite `base: '/<repo>/'` 필요 | — |

**권장: Cloudflare Pages.** GitHub Actions(`.github/workflows/ci.yml`)에서 `npm ci` → typecheck → Vitest → build → e2e. 배포는 Cloudflare Pages가 저장소를 직접 연결(빌드 명령 `npm run build`, 출력 `dist`). GitHub Pages로 갈 경우 `vite.config.ts`의 `base` 설정과 공유 URL 생성 시 `location.pathname` 사용을 잊지 말 것(데모는 pathname 기반이라 그대로 동작).

---

## 11. MVP 범위

**포함**
- 시군구 249개 벡터 지도 (울릉군 제외), 1° 격자
- 상대 드래그 조준, 조준선·조준점·파워 게이지, 데드존 취소
- 사거리 곡선 + 가시 바람(HUD) + 비행 사건(무풍 55%→강풍 10%), 비행 연출(스케일·그림자·궤적·액터), 임팩트·핀·하이라이트, 햅틱
- even-odd 판정, 30km 스냅, 헛발 처리
- 결과 시트(지역명·시도·좌표·바람·코드·스냅 노트), 착지점 가림 방지 시프트
- 공유 URL 재현, Web Share/클립보드, 카카오맵 딥링크
- 행정구역 개편 보정(강원·전북·군위)

**제외 (2단계 후보)**
- 울릉도·독도 인셋, 관광지 추천(TourAPI), 결과별 OG 이미지, 시/도 한정 모드, 3발 중 선택, N명 돌려 쏘기·투표, 네이버지도 딥링크, PWA, 효과음

---

## 12. 열린 질문

1. **울릉도·독도**: 인셋 박스로 넣을지(조준 가능), 제외할지, 확률 이벤트("동해 특별편")로 넣을지.
2. **바다 처리 최종안**: 스냅 30km가 맞는지. 스냅 대신 "바다 여행(동해/서해/남해)" 결과를 인정하는 안과 비교.
3. **1발 vs 3발**: 한 판 1발이 원칙에 맞지만, 3발 쏘고 하나 고르기가 "여행지 정하기" 목적에 더 실용적일 수 있음.
4. **공유 URL 페이로드**: 좌표(`lat,lng`) vs 시드(비행까지 재현). 좌표가 단순하고 충분해 보임.
5. **감도 곡선 γ와 앵커 위치**: 제주·남해안 근거리 해상도 vs 북부 압축. 플레이테스트 5명 이상 후 결정.
6. ~~**이름**~~: "우리 어디가"(where-we-go)로 결정 (2026-09-08).

---

## 13. 로드맵

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **0. 데모** (완료) | 단일 HTML, 핵심 루프 검증 | 당기기→비행→판정→결과→공유 URL 동작 |
| **1. MVP** (이식 완료, 배포 전) | Vite+React+TS로 이식, 폴더 구조, 순수 함수 테스트 ✓ / Cloudflare Pages 배포 · 실기기 검증 △ | 휴대폰 3종에서 60fps, 파라미터 표대로 동작 |
| **2. 튠** | 플레이테스트, γ/σ/snapKm 조정, 효과음·햅틱 다듬기 | "한 번 더" 비율 체감 |
| **3. 확장** | 시/도 한정 모드, 3발 모드, 울릉·독도 인셋, 결과별 OG 이미지(Functions) | 한 가지씩 추가 |
| **4. 콘텐츠** | 관광지 추천(TourAPI, 키는 Functions 뒤로) | 결과 카드에 3곳 추천 |

---

## 부록 A. 데모 v0.1 → MVP 이식 메모

- 데모의 `P` 객체가 그대로 `shared/params.ts`가 된다.
- `decodeTopo`, `project/invert`, `inRing/findRegion`, `pullToRange`, `haversineKm`, `prettyName/provinceOf`는 그대로 순수 함수 모듈로 옮기고 Vitest를 붙인다.
- `fly()`의 rAF 루프는 `useEffect` 안에서 ref로 DOM을 잡아 동일하게 유지한다(React state로 프레임을 돌리지 않는다).
- 결과 시트는 React 컴포넌트로, 상태 머신은 reducer로. 시트가 착지점을 가릴 때의 `translateY` 시프트는 유지.
- 데이터 파이프라인(mapshaper 명령)은 `scripts/build-map.sh`로 저장소에 남긴다.

## 부록 B. 데모에서 확인된 것

- Playwright(390×844, 터치 에뮬레이션)로 10회 안팎 발사: 육지 판정, 해안 스냅, 헛발, 데드존 취소, 공유 URL 재현(강릉 좌표 → "강원특별자치도 강릉시")이 모두 기대대로 동작. 데모 전체 gzip ≈ 65KB(지도 데이터 ≈ 55KB).
- 초기 구현에서 `invert`의 y 부호 오류로 위도가 반전된 채 표시된 사례가 있었음 → `project/invert` 왕복 테스트(`invert(project(p)) ≈ p`)를 반드시 단위 테스트에 포함.
- 데드존을 빼지 않은 사거리 정규화에서는 제주가 도달 불가였음 → §5.2의 정규화로 해결.

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v0.1 | 2026-09-08 | 구현 전 초안. 단일 HTML 데모로 핵심 루프 검증 |
| v0.1.1 | 2026-09-08 | 이름 "우리 어디가" 확정, Vite+React+TS 이식 반영(§9), 테스트 수치 갱신, 로드맵 1단계 상태 갱신 |
| v0.2 | 2026-09-08 | 디자인 리뉴얼: 낮·종이지도 라이트 테마, DTCG 토큰 + Style Dictionary, shared/ui 프리미티브, /design 쇼케이스(§4.3). three.js/R3F 3D 씬으로 SVG 지도·연출 대체 — 기울어진 직교 카메라 항등 매핑(§4.5), extrude 지형, 절차적 화살(§5.4). e2e를 data-* 속성 기반으로. 번들 예산 400KB(§9.3) |
| v0.3 | 2026-09-08 | 가시 바람: `windAt` 순수 함수 + HUD 게이지, 잔여 난수. 비행 사건 4종(종이비행기·손가락·갈매기·돌풍) — 꺾이는 궤적 + 절차적 액터. `windSigma` 삭제. |
