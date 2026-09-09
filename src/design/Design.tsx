import { useState, type ReactNode } from 'react';
import { tokens } from '@/shared/tokens/tokens';
import { Button, Sheet, Toast } from '@/shared/ui';

type Leaf = string | number;
type Tree = { readonly [k: string]: Leaf | Tree };

/** 중첩 토큰 → [경로, 값] 목록 */
function flatten(tree: Tree, prefix = ''): [string, Leaf][] {
  return Object.entries(tree).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' ? flatten(v, path) : [[path, v] as [string, Leaf]];
  });
}

const SAMPLE = '강릉시 · 우리 어디가';

export function Design() {
  return (
    <main className="ds">
      <h1 className="t-display">우리 어디가 · 디자인 시스템</h1>
      <p className="t-meta">출처 src/shared/tokens/tokens.json · 편집 후 npm run tokens:build</p>

      <Section title="색">
        {(['paper', 'ink', 'water', 'orange', 'stamp', 'land', 'wood'] as const).map((g) => (
          <div key={g} className="ds-row">
            <span className="ds-label">{g}</span>
            {flatten(tokens.color[g]).map(([k, hex]) => (
              <Swatch key={k} name={k} hex={String(hex)} />
            ))}
          </div>
        ))}
        <div className="ds-row">
          <span className="ds-label">semantic</span>
          {flatten({ bg: tokens.color.bg, text: tokens.color.text, accent: tokens.color.accent }).map(([p, v]) => (
            <Swatch key={p} name={p} hex={String(v)} />
          ))}
        </div>
        <div className="ds-row">
          <span className="ds-label">map</span>
          {flatten(tokens.map)
            .filter(([, v]) => typeof v === 'string')
            .map(([p, v]) => (
              <Swatch key={p} name={p} hex={String(v)} />
            ))}
        </div>
      </Section>

      <Section title="타이포">
        {Object.entries(tokens.font.size).map(([k, size]) => (
          <div key={k} className="ds-type">
            <span className="ds-label">
              {k} · {size}
            </span>
            <span style={{ fontFamily: tokens.font.family.display, fontSize: size, lineHeight: 1.1 }}>{SAMPLE}</span>
            <span style={{ fontFamily: tokens.font.family.body, fontSize: size, lineHeight: 1.1 }}>{SAMPLE}</span>
          </div>
        ))}
        <div className="ds-row" style={{ gap: 24 }}>
          <span className="t-display">t-display</span>
          <span className="t-title">t-title</span>
          <span className="t-eyebrow">t-eyebrow</span>
          <span className="t-meta">t-meta 1,234.5</span>
        </div>
      </Section>

      <Section title="간격 · 라운드 · 그림자">
        <div className="ds-row">
          {Object.entries(tokens.space).map(([k, v]) => (
            <div key={k} className="ds-space" style={{ width: v }} title={`space.${k} = ${v}`} />
          ))}
        </div>
        <div className="ds-row">
          {Object.entries(tokens.radius).map(([k, v]) => (
            <div key={k} className="ds-box" style={{ borderRadius: v }}>
              {k}
            </div>
          ))}
          {Object.entries(tokens.shadow).map(([k, v]) => (
            <div key={k} className="ds-box" style={{ boxShadow: v, border: 'none' }}>
              {k}
            </div>
          ))}
        </div>
      </Section>

      <Section title="모션">
        <MotionDemo />
      </Section>

      <Section title="컴포넌트">
        <div className="ds-row">
          <Button variant="primary">다시 쏘기</Button>
          <Button>공유</Button>
          <Button href="https://map.kakao.com">카카오맵 ↗</Button>
          <Button disabled>disabled</Button>
        </div>
        <div className="ds-frame">
          <Sheet open>
            <div className="t-eyebrow">이번 여행지</div>
            <h1 className="t-display" style={{ margin: '4px 0 0' }}>
              수원시 장안구
            </h1>
            <div style={{ color: 'var(--color-text-accent)', marginTop: 4 }}>경기도</div>
            <div className="ds-row" style={{ marginTop: 16 }}>
              <Button variant="primary" style={{ flex: 1.4 }}>
                다시 쏘기
              </Button>
              <Button style={{ flex: 1 }}>카카오맵</Button>
              <Button style={{ flex: 1 }}>공유</Button>
            </div>
          </Sheet>
          <Toast message="링크를 복사했어요" />
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ds-section">
      <h2 className="t-title">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="ds-swatch">
      <div className="ds-chip" style={{ background: hex }} />
      <span>{name}</span>
      <code>{hex}</code>
    </div>
  );
}

function MotionDemo() {
  const [on, setOn] = useState(false);
  return (
    <div className="ds-row" style={{ alignItems: 'flex-start' }}>
      {Object.entries(tokens.motion.duration).map(([k, d]) => (
        <div key={k} className="ds-motion">
          <span className="ds-label">
            {k} · {d}
          </span>
          <div
            className="ds-chip"
            style={{
              background: 'var(--color-accent-default)',
              transform: on ? 'translateX(80px)' : 'none',
              transition: `transform ${d} ${tokens.motion.easing.out}`,
            }}
          />
        </div>
      ))}
      <Button onClick={() => setOn((v) => !v)}>재생</Button>
    </div>
  );
}
