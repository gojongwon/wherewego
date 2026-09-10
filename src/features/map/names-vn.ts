import type { Region } from './topo';

/** 총리결정 19/2025/QĐ-TTg 성·시 코드 → 한글 이름 + 권역 */
const PROV: Readonly<Record<string, { title: string; region: string }>> = {
  '01': { title: '하노이', region: '북부' },
  '04': { title: '까오방', region: '북부' },
  '08': { title: '뚜옌꽝', region: '북부' },
  '11': { title: '디엔비엔', region: '북부' },
  '12': { title: '라이쩌우', region: '북부' },
  '14': { title: '선라', region: '북부' },
  '15': { title: '라오까이', region: '북부' },
  '19': { title: '타이응우옌', region: '북부' },
  '20': { title: '랑선', region: '북부' },
  '22': { title: '꽝닌', region: '북부' },
  '24': { title: '박닌', region: '북부' },
  '25': { title: '푸토', region: '북부' },
  '31': { title: '하이퐁', region: '북부' },
  '33': { title: '흥옌', region: '북부' },
  '37': { title: '닌빈', region: '북부' },
  '38': { title: '타인호아', region: '중부' },
  '40': { title: '응에안', region: '중부' },
  '42': { title: '하띤', region: '중부' },
  '44': { title: '꽝찌', region: '중부' },
  '46': { title: '후에', region: '중부' },
  '48': { title: '다낭', region: '중부' },
  '51': { title: '꽝응아이', region: '중부' },
  '56': { title: '카인호아', region: '중부' },
  '52': { title: '잘라이', region: '고원' },
  '66': { title: '닥락', region: '고원' },
  '68': { title: '럼동', region: '고원' },
  '75': { title: '동나이', region: '남부' },
  '79': { title: '호치민', region: '남부' },
  '80': { title: '떠이닌', region: '남부' },
  '82': { title: '동탑', region: '남부' },
  '86': { title: '빈롱', region: '남부' },
  '91': { title: '안장', region: '남부' },
  '92': { title: '껀터', region: '남부' },
  '96': { title: '까마우', region: '남부' },
};

export function vnTitle(region: Pick<Region, 'code' | 'name'>): string {
  return PROV[region.code]?.title ?? region.name;
}

export function vnSubtitle(region: Pick<Region, 'code'>): string {
  return PROV[region.code]?.region ?? '';
}
