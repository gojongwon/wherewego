// 디자인 토큰 빌드 — src/shared/tokens/tokens.json (DTCG) → tokens.css + tokens.ts
// 실행: npm run tokens:build  (prebuild에서도 자동 실행). 생성물은 커밋한다 (tsc -b가 tokens.ts를 필요로 함).
import StyleDictionary from 'style-dictionary';
import { fileHeader, minifyDictionary } from 'style-dictionary/utils';

// transformGroup 'css'는 size/rem을 포함해 "4px"를 4rem으로 바꿔 버린다 → 필요한 transform만 명시
const valueTransforms = ['color/css', 'fontFamily/css', 'cubicBezier/css', 'shadow/css/shorthand'];

const sd = new StyleDictionary({
  source: ['src/shared/tokens/tokens.json'],
  hooks: {
    formats: {
      'typescript/const': async ({ dictionary, file }) =>
        (await fileHeader({ file })) +
        `export const tokens = ${JSON.stringify(minifyDictionary(dictionary.tokens, true), null, 2)} as const;\n`,
    },
  },
  platforms: {
    css: {
      transforms: ['name/kebab', ...valueTransforms],
      buildPath: 'src/shared/tokens/',
      files: [{ destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } }],
    },
    ts: {
      transforms: ['name/camel', ...valueTransforms],
      buildPath: 'src/shared/tokens/',
      files: [{ destination: 'tokens.ts', format: 'typescript/const' }],
    },
  },
});

await sd.buildAllPlatforms();
