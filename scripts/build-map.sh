#!/usr/bin/env bash
# 경계 데이터 파이프라인
#   npm run map:build        한국 시군구 (설계서 §6.1)
#   npm run map:build:jp     일본 도도부현 (오키나와 제외)
#   npm run map:build:tw     대만 현시 (진먼·롄장 제외)
#
# SIMPLIFY=20% npm run map:build  (단순화 강도 조절)
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="${1:-kr}"
SIMPLIFY="${SIMPLIFY:-30%}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ "$TARGET" = tw ]; then
  # 원본: 내정부 鄉鎮市區界 — taiwan-atlas counties (22 縣市)
  SRC_URL="https://unpkg.com/taiwan-atlas@2021.9.20/counties-10t.json"
  OUT="src/features/map/data/tw.topo.json"
  echo "▶ 다운로드: $SRC_URL"
  curl -sSL "$SRC_URL" -o "$TMP/src.json"

  echo "▶ mapshaper: 진먼·롄장 제외, simplify $SIMPLIFY, 2km² 미만 섬 제거"
  npx --yes mapshaper "$TMP/src.json" \
    -filter 'COUNTYNAME != "連江縣" && COUNTYNAME != "金門縣"' target=counties \
    -drop target=nation \
    -each 'code=COUNTYCODE; name=COUNTYNAME; delete COUNTYID; delete COUNTYCODE; delete COUNTYNAME; delete COUNTYENG' \
    -simplify "$SIMPLIFY" keep-shapes \
    -filter-islands min-area=2km2 \
    -rename-layers tw \
    -o format=topojson quantization=20000 "$OUT"
elif [ "$TARGET" = jp ]; then
  # 원본: 국토교통성 국토수치정보(N03) — smartnews-smri/japan-topography 1% 단순화본
  SRC_URL="https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010/prefectures.json"
  OUT="src/features/map/data/jp.topo.json"
  echo "▶ 다운로드: $SRC_URL"
  curl -sSL "$SRC_URL" -o "$TMP/src.json"

  echo "▶ mapshaper: simplify $SIMPLIFY, 2km² 미만 섬 제거, 오키나와 제외, JIS 코드"
  npx --yes mapshaper "$TMP/src.json" \
    -simplify "$SIMPLIFY" keep-shapes \
    -filter-islands min-area=2km2 \
    -filter 'N03_001 != "沖縄県"' \
    -each 'var C={"北海道":"01","青森県":"02","岩手県":"03","宮城県":"04","秋田県":"05","山形県":"06","福島県":"07","茨城県":"08","栃木県":"09","群馬県":"10","埼玉県":"11","千葉県":"12","東京都":"13","神奈川県":"14","新潟県":"15","富山県":"16","石川県":"17","福井県":"18","山梨県":"19","長野県":"20","岐阜県":"21","静岡県":"22","愛知県":"23","三重県":"24","滋賀県":"25","京都府":"26","大阪府":"27","兵庫県":"28","奈良県":"29","和歌山県":"30","鳥取県":"31","島根県":"32","岡山県":"33","広島県":"34","山口県":"35","徳島県":"36","香川県":"37","愛媛県":"38","高知県":"39","福岡県":"40","佐賀県":"41","長崎県":"42","熊本県":"43","大分県":"44","宮崎県":"45","鹿児島県":"46"}; code=C[N03_001]; name=N03_001; delete N03_001' \
    -rename-layers pref \
    -o format=topojson quantization=20000 "$OUT"
else
  SRC_URL="https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json"
  OUT="src/features/map/data/sgg.topo.json"
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
fi

echo "▶ 결과: $OUT ($(wc -c < "$OUT") bytes, gzip $(gzip -c "$OUT" | wc -c) bytes)"
