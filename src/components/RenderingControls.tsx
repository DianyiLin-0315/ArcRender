'use client';

import { useState, useEffect, useRef } from 'react';
import { captureEvent } from '@/lib/posthog';

interface RenderingControlsProps {
  onGenerate: (settings: RenderingSettings) => void;
  isGenerating: boolean;
  disabled?: boolean;
  hideStyleSelection?: boolean;
  initialStyle?: string;
}

export interface RenderingSettings {
  style: string;
  prompt: string;
  strength: number;
}

const STYLES = [
  { id: 'modern',      name: '现代', en: 'MODERN',  description: '简洁线条，玻璃和钢材' },
  { id: 'traditional', name: '传统', en: 'CLASSIC', description: '经典建筑元素' },
  { id: 'minimalist',  name: '极简', en: 'MINIMAL', description: '简约优雅的设计' },
  { id: 'industrial',  name: '工业', en: 'RAW',     description: '原始材料，裸露结构' },
  { id: 'futuristic',  name: '未来', en: 'FUTURE',  description: '先进创新的设计' },
  { id: 'natural',     name: '自然', en: 'NATURE',  description: '有机形态，绿色元素' },
];

export default function RenderingControls({
  onGenerate, isGenerating, disabled, hideStyleSelection = false, initialStyle = 'modern',
}: RenderingControlsProps) {
  const strengthChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [style, setStyle]       = useState(initialStyle);
  const [prompt, setPrompt]     = useState('');
  const [strength, setStrength] = useState(0.75);

  useEffect(() => { setStyle(initialStyle); }, [initialStyle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ style, prompt, strength });
  };

  const strengthPct = Math.round(strength * 100);

  return (
    <form
      onSubmit={handleSubmit}
      className="arc-panel"
      style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      <div className="arc-section-label">Settings</div>

      {/* Style selection (shown when not hidden) */}
      {!hideStyleSelection && (
        <div>
          <p style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--arc-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
            建筑风格
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`arc-style-btn${style === s.id ? ' active' : ''}`}
                onClick={() => {
                  setStyle(s.id);
                  captureEvent('style_selected', { style: s.id });
                }}
              >
                <span className="zh">{s.name}</span>
                <span className="en">{s.en}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt textarea */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--arc-secondary)', textTransform: 'uppercase' }}>
          附加描述 <span style={{ color: 'var(--arc-muted)' }}>（可选）</span>
        </label>
        <textarea
          className="arc-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：阳光明媚，绿意盎然的花园…"
          rows={4}
          style={{ flex: 1, minHeight: 0 }}
        />
      </div>

      {/* Strength slider */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--arc-secondary)', textTransform: 'uppercase' }}>
            变换强度
          </label>
          <span style={{
            fontSize: '10px', fontWeight: 600,
            color: 'var(--arc-amber)',
            background: 'var(--arc-amber-dim)',
            padding: '1px 6px',
            borderRadius: '3px',
            letterSpacing: '0.04em',
          }}>
            {strengthPct}%
          </span>
        </div>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={strength}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setStrength(v);
            if (strengthChangeTimeout.current) clearTimeout(strengthChangeTimeout.current);
            strengthChangeTimeout.current = setTimeout(() => {
              captureEvent('strength_adjusted', { strength: v, strength_percentage: Math.round(v * 100) });
            }, 500);
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
          <span style={{ fontSize: '8px', color: 'var(--arc-muted)', letterSpacing: '0.06em' }}>保持原样</span>
          <span style={{ fontSize: '8px', color: 'var(--arc-muted)', letterSpacing: '0.06em' }}>完全变换</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--arc-border)', flexShrink: 0 }} />

      {/* Generate button */}
      <button
        type="submit"
        disabled={disabled || isGenerating}
        className={`arc-generate-btn${isGenerating ? ' generating' : ''}`}
      >
        {isGenerating ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: 'spin 1.2s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Rendering…
          </span>
        ) : (
          'Generate Render'
        )}
      </button>
    </form>
  );
}
