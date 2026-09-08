import type { Region } from './topo';

/** KOSTAT 시도 코드(시군구 코드 앞 2자리) → 현재 명칭. 2023~2024 개편 반영. */
export const PROVINCE_BY_CODE: Readonly<Record<string, string>> = {
  '11': '서울특별시',
  '21': '부산광역시',
  '22': '대구광역시',
  '23': '인천광역시',
  '24': '광주광역시',
  '25': '대전광역시',
  '26': '울산광역시',
  '29': '세종특별자치시',
  '31': '경기도',
  '32': '강원특별자치도', // 2023.6 강원도 → 강원특별자치도
  '33': '충청북도',
  '34': '충청남도',
  '35': '전북특별자치도', // 2024.1 전라북도 → 전북특별자치도
  '36': '전라남도',
  '37': '경상북도',
  '38': '경상남도',
  '39': '제주특별자치도',
};

/** 데이터(2018) 이후 소속이 바뀐 시군구 */
export const PROVINCE_OVERRIDE: Readonly<Record<string, string>> = {
  군위군: '대구광역시', // 2023.7 경북 → 대구 편입
};

export function provinceOf(region: Pick<Region, 'code' | 'name'>): string {
  return PROVINCE_OVERRIDE[region.name] ?? PROVINCE_BY_CODE[region.code.slice(0, 2)] ?? '';
}

/** `수원시장안구` → `수원시 장안구`, `세종시` → `세종특별자치시` */
export function prettyName(name: string): string {
  if (name === '세종시') return '세종특별자치시';
  return name.replace(/^(.+?시)(.+구)$/, '$1 $2');
}

/** 결과 카드·공유 문구용 전체 이름. 세종은 시도명과 중복되므로 한 번만. */
export function fullName(region: Pick<Region, 'code' | 'name'>): string {
  const prov = provinceOf(region);
  const name = prettyName(region.name);
  return prov === name ? name : `${prov} ${name}`;
}
