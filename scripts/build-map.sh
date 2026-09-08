#!/usr/bin/env bash
# 시군구 경계 데이터 파이프라인 (설계서 §6.1)
# 원본: 통계청 SGIS 센서스용 행정구역경계(2018) — southkorea/southkorea-maps 정리본
# 결과: src/features/map/data/sgg.topo.json (약 177KB, gzip ≈ 55KB)
#
# 사용: npm run map:build            (mapshaper는 npx로 받아 실행)
#      SIMPLIFY=20% npm run map:build (단순화 강도 조절)
set -euo pipefail

cd "$(dirname "$0")/.."
SRC_URL="https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json"
TMP="$(mktemp -d)"
OUT="src/features/map/data/sgg.topo.json"
SIMPLIFY="${SIMPLIFY:-30%}"

echo "▶ 다운로드: $SRC_URL"
curl -sSL "$SRC_URL" -o "$TMP/src.topo.json"

echo "▶ mapshaper: simplify $SIMPLIFY, 2km² 미만 섬 제거, 울릉군(37430) 제외(v1), 속성 정리"
npx --yes mapshaper "$TMP/src.topo.json" \
  -simplify "$SIMPLIFY" keep-shapes \
  -filter-islands min-area=2km2 \
  -filter 'code != "37430"' \
  -each 'delete name_eng; delete base_year' \
  -rename-layers sgg \
  -o format=topojson quantization=20000 "$OUT"

echo "▶ 결과: $OUT ($(wc -c < "$OUT") bytes, gzip $(gzip -c "$OUT" | wc -c) bytes)"
rm -rf "$TMP"
