# 우리 어디가 · where-we-go

> 지도 아래에서 화살을 당겨 쏘고, 꽂힌 **시/군/구**가 이번 여행지.

모바일 세로 화면용 웹 게임. 외부 지도 API·서버 없이 정적 파일만으로 동작하며, 결과는 URL 하나로 공유·재현됩니다.
설계는 [`docs/DESIGN.md`](docs/DESIGN.md)에, 튜닝 파라미터는 [`src/shared/params.ts`](src/shared/params.ts)에 모여 있습니다.

## 시작하기

```bash
npm install
npm run dev          # http://localhost:5173 (--host 로 같은 Wi-Fi의 휴대폰에서도 접속 가능)
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 후 `dist/` 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest — 투영 왕복, 판정(구멍·스냅·헛발), 사거리 곡선, 상태 머신 등 |
| `npm run e2e` | Playwright — iPhone 14 뷰포트에서 발사→결과, 취소, 공유 URL 재현. 처음 한 번 `npx playwright install chromium` |
| `npm run map:build` | 시군구 경계 데이터 재생성 (mapshaper, `SIMPLIFY=20%` 로 강도 조절) |

## 어떻게 동작하나

1. 화면 아무 곳이나 아래로 당기면 활이 그 방향을 향하고 조준선·파워 게이지가 뜹니다 (`features/shooter/usePull.ts`).
2. 놓는 순간 착지점이 확정됩니다 — 사거리는 당김 길이의 곡선, 여기에 약한 바람(정규분포)이 더해집니다 (`physics.ts`).
3. 비행은 그 지점으로 가는 연출일 뿐이고, 판정은 이미 끝나 있습니다 (`app/makeShot.ts` → `features/map/region.ts`).
4. 바다에 떨어지면 30km 이내 해안 시군구로 스냅, 그 밖이면 헛발.
5. 결과 시트에서 카카오맵 열기 · `?lat=..&lng=..` 링크 공유. 링크로 열면 같은 자리에 꽂힌 상태로 시작합니다.

```
IDLE → AIMING → FLYING → LANDED → RESULT → (다시 쏘기) → IDLE
```

## 배포

정적 빌드(`dist/`)라 어디든 올릴 수 있습니다.

- **Cloudflare Pages (권장)** — 저장소 연결, 빌드 명령 `npm run build`, 출력 디렉터리 `dist`. 나중에 결과별 OG 이미지 같은 함수를 붙일 수 있습니다.
- **GitHub Pages** — 프로젝트 페이지라면 `VITE_BASE=/where-we-go/ npm run build` 로 base 경로를 넣어 빌드합니다.

## 데이터와 출처

- 시군구 경계: 통계청 SGIS 센서스용 행정구역경계(2018), [southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps) 정리본을 mapshaper로 단순화 (249개, 울릉군 제외, 2km² 미만 섬 제거).
- 2018 이후 개편은 코드로 보정: 강원특별자치도(2023), 전북특별자치도(2024), 군위군 → 대구광역시(2023).
- 배포 전 SGIS 이용약관/공공누리 유형을 확인하고 출처 표기를 유지해 주세요.

## 구조

```
src/app        상태 머신·레이아웃·화면 조립
src/features   map(데이터·투영·판정) / shooter(입력·물리·연출) / result(시트·공유)
src/shared     params(튜닝 단일 출처) · geo
e2e            Playwright 시나리오
scripts        데이터 파이프라인
docs           설계서
```
