import type { Region } from './topo';

/** 내정부 縣市 코드 → 한글 이름 + 권역 */
const COUNTY: Readonly<Record<string, { title: string; region: string }>> = {
  '63000': { title: '타이베이시', region: '북부' },
  '65000': { title: '신베이시', region: '북부' },
  '68000': { title: '타오위안시', region: '북부' },
  '10017': { title: '지룽시', region: '북부' },
  '10018': { title: '신주시', region: '북부' },
  '10004': { title: '신주현', region: '북부' },
  '10002': { title: '이란현', region: '북부' },
  '10005': { title: '먀오리현', region: '중부' },
  '66000': { title: '타이중시', region: '중부' },
  '10007': { title: '장화현', region: '중부' },
  '10008': { title: '난터우현', region: '중부' },
  '10009': { title: '윈린현', region: '중부' },
  '10020': { title: '자이시', region: '남부' },
  '10010': { title: '자이현', region: '남부' },
  '67000': { title: '타이난시', region: '남부' },
  '64000': { title: '가오슝시', region: '남부' },
  '10013': { title: '핑둥현', region: '남부' },
  '10015': { title: '화롄현', region: '동부' },
  '10014': { title: '타이둥현', region: '동부' },
  '10016': { title: '펑후현', region: '제도' },
};

export function twTitle(region: Pick<Region, 'code' | 'name'>): string {
  return COUNTY[region.code]?.title ?? region.name;
}

export function twSubtitle(region: Pick<Region, 'code'>): string {
  return COUNTY[region.code]?.region ?? '';
}
