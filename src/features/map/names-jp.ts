import type { Region } from './topo';

/** JIS X 0401 도도부현 코드 → 한글 현 이름 + 지방 */
const PREF: Readonly<Record<string, { title: string; region: string }>> = {
  '01': { title: '홋카이도', region: '홋카이도' },
  '02': { title: '아오모리현', region: '도호쿠' },
  '03': { title: '이와테현', region: '도호쿠' },
  '04': { title: '미야기현', region: '도호쿠' },
  '05': { title: '아키타현', region: '도호쿠' },
  '06': { title: '야마가타현', region: '도호쿠' },
  '07': { title: '후쿠시마현', region: '도호쿠' },
  '08': { title: '이바라키현', region: '간토' },
  '09': { title: '도치기현', region: '간토' },
  '10': { title: '군마현', region: '간토' },
  '11': { title: '사이타마현', region: '간토' },
  '12': { title: '지바현', region: '간토' },
  '13': { title: '도쿄도', region: '간토' },
  '14': { title: '가나가와현', region: '간토' },
  '15': { title: '니가타현', region: '주부' },
  '16': { title: '도야마현', region: '주부' },
  '17': { title: '이시카와현', region: '주부' },
  '18': { title: '후쿠이현', region: '주부' },
  '19': { title: '야마나시현', region: '주부' },
  '20': { title: '나가노현', region: '주부' },
  '21': { title: '기후현', region: '주부' },
  '22': { title: '시즈오카현', region: '주부' },
  '23': { title: '아이치현', region: '주부' },
  '24': { title: '미에현', region: '긴키' },
  '25': { title: '시가현', region: '긴키' },
  '26': { title: '교토부', region: '긴키' },
  '27': { title: '오사카부', region: '긴키' },
  '28': { title: '효고현', region: '긴키' },
  '29': { title: '나라현', region: '긴키' },
  '30': { title: '와카야마현', region: '긴키' },
  '31': { title: '돗토리현', region: '주고쿠' },
  '32': { title: '시마네현', region: '주고쿠' },
  '33': { title: '오카야마현', region: '주고쿠' },
  '34': { title: '히로시마현', region: '주고쿠' },
  '35': { title: '야마구치현', region: '주고쿠' },
  '36': { title: '도쿠시마현', region: '시코쿠' },
  '37': { title: '가가와현', region: '시코쿠' },
  '38': { title: '에히메현', region: '시코쿠' },
  '39': { title: '고치현', region: '시코쿠' },
  '40': { title: '후쿠오카현', region: '규슈' },
  '41': { title: '사가현', region: '규슈' },
  '42': { title: '나가사키현', region: '규슈' },
  '43': { title: '구마모토현', region: '규슈' },
  '44': { title: '오이타현', region: '규슈' },
  '45': { title: '미야자키현', region: '규슈' },
  '46': { title: '가고시마현', region: '규슈' },
};

export function jpTitle(region: Pick<Region, 'code' | 'name'>): string {
  return PREF[region.code]?.title ?? region.name;
}

export function jpSubtitle(region: Pick<Region, 'code'>): string {
  return PREF[region.code]?.region ?? '';
}
