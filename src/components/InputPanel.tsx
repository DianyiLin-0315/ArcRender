'use client';

import { useRef, useState } from 'react';
import { BUILDING_TYPES, type BuildingType } from '@/data/gallery';
import { captureEvent } from '@/lib/posthog';
import { compressImage, urlToBase64 } from '@/lib/image';

export interface InputPanelProps {
  buildingType: BuildingType;
  onBuildingTypeChange: (type: BuildingType) => void;
  location: string;
  onLocationChange: (v: string) => void;
  referenceImage: string | null;
  onReferenceImageChange: (img: string | null) => void;
  architectureDrawing: { file: File; preview: string } | null;
  onArchitectureDrawingChange: (d: { file: File; preview: string } | null) => void;
  strength: number;
  onStrengthChange: (v: number) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  error: string | null;
}

export default function InputPanel({
  buildingType, onBuildingTypeChange,
  location, onLocationChange,
  referenceImage, onReferenceImageChange,
  architectureDrawing, onArchitectureDrawingChange,
  strength, onStrengthChange,
  prompt, onPromptChange,
  onGenerate, isGenerating, error,
}: InputPanelProps) {
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [isDragOverRef, setIsDragOverRef] = useState(false);

  const handleDrawingFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      const compressed = await compressImage(preview);
      onArchitectureDrawingChange({ file, preview: compressed });
      captureEvent('drawing_uploaded', { file_type: file.type, file_size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const handleRefFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      const compressed = await compressImage(preview);
      onReferenceImageChange(compressed);
      captureEvent('reference_image_set', { source: 'upload' });
    };
    reader.readAsDataURL(file);
  };

  const handleRefDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRef(false);

    // Gallery drag (text/plain = image URL)
    const url = e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      try {
        const base64 = await urlToBase64(url);
        const compressed = await compressImage(base64);
        onReferenceImageChange(compressed);
        captureEvent('reference_image_set', { source: 'gallery_drop' });
        return;
      } catch {
        // CORS blocked — fallback: store URL directly (API will receive it)
        onReferenceImageChange(url);
        captureEvent('reference_image_set', { source: 'gallery_drop_url' });
        return;
      }
    }

    // File drop
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleRefFile(file);
  };

  const canGenerate = !!referenceImage && !!architectureDrawing && !isGenerating;
  const strengthPct = Math.round(strength * 100);

  return (
    <div className="arc-panel" style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      padding: '10px', gap: '10px',
    }}>
      <div className="arc-section-label">参数设置</div>

      {/* Building type */}
      <div style={{ flexShrink: 0 }}>
        <div className="arc-field-label">建筑类型</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
          {BUILDING_TYPES.map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => onBuildingTypeChange(type.id)}
              style={{
                padding: '3px 9px', fontSize: '10px', letterSpacing: '0.04em',
                border: '1px solid',
                borderColor: buildingType === type.id ? 'var(--arc-amber)' : 'var(--arc-border)',
                background: buildingType === type.id ? 'var(--arc-amber-dim)' : 'transparent',
                color: buildingType === type.id ? 'var(--arc-amber)' : 'var(--arc-secondary)',
                borderRadius: '3px', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div style={{ flexShrink: 0 }}>
        <div className="arc-field-label">
          环境 <span style={{ color: 'var(--arc-muted)', fontSize: '9px' }}>可选</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
          {['城市', '草原', '海岸', '高原', '戈壁', '沙漠', '广场', '街道'].map(env => (
            <button
              key={env}
              type="button"
              onClick={() => onLocationChange(location === env ? '' : env)}
              style={{
                padding: '3px 8px', fontSize: '10px', letterSpacing: '0.04em',
                border: '1px solid',
                borderColor: location === env ? 'var(--arc-amber)' : 'var(--arc-border)',
                background: location === env ? 'var(--arc-amber-dim)' : 'transparent',
                color: location === env ? 'var(--arc-amber)' : 'var(--arc-secondary)',
                borderRadius: '3px', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Reference image */}
      <div style={{ flexShrink: 0 }}>
        <div className="arc-field-label">
          参考图 <span style={{ color: 'var(--arc-amber)', fontSize: '8px', marginLeft: '2px' }}>必填</span>
        </div>
        <div
          className={`arc-drop-zone${isDragOverRef ? ' drag-over' : ''}${referenceImage ? ' has-image' : ''}`}
          style={{ marginTop: '5px', height: '82px', cursor: referenceImage ? 'default' : 'pointer' }}
          onDragOver={e => { e.preventDefault(); setIsDragOverRef(true); }}
          onDragLeave={() => setIsDragOverRef(false)}
          onDrop={handleRefDrop}
          onClick={() => !referenceImage && refInputRef.current?.click()}
        >
          {referenceImage ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImage} alt="参考图" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
              <button
                onClick={e => { e.stopPropagation(); onReferenceImageChange(null); }}
                className="arc-remove-btn"
              >✕</button>
            </div>
          ) : (
            <div className="arc-drop-zone-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>从图库拖拽，或点击上传</span>
            </div>
          )}
        </div>
        <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleRefFile(f); e.target.value = ''; }}
        />
      </div>

      {/* Architecture drawing */}
      <div style={{ flexShrink: 0 }}>
        <div className="arc-field-label">
          方案图 <span style={{ color: 'var(--arc-amber)', fontSize: '8px', marginLeft: '2px' }}>必填</span>
        </div>
        <div
          className={`arc-drop-zone${architectureDrawing ? ' has-image' : ''}`}
          style={{ marginTop: '5px', height: '82px', cursor: 'pointer' }}
          onClick={() => drawingInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleDrawingFile(f); }}
        >
          {architectureDrawing ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={architectureDrawing.preview} alt="方案图" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
              <button
                onClick={e => { e.stopPropagation(); onArchitectureDrawingChange(null); }}
                className="arc-remove-btn"
              >✕</button>
            </div>
          ) : (
            <div className="arc-drop-zone-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>上传草图 / SU截图 / 照片</span>
            </div>
          )}
        </div>
        <input ref={drawingInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleDrawingFile(f); e.target.value = ''; }}
        />
      </div>

      {/* Strength slider */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <div className="arc-field-label">参考强度</div>
          <span style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--arc-amber)',
            background: 'var(--arc-amber-dim)', padding: '1px 6px', borderRadius: '3px',
          }}>
            {strengthPct}%
          </span>
        </div>
        <input type="range" min="0.3" max="1" step="0.05" value={strength}
          onChange={e => onStrengthChange(parseFloat(e.target.value))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--arc-muted)' }}>贴近方案图</span>
          <span style={{ fontSize: '8px', color: 'var(--arc-muted)' }}>贴近参考图</span>
        </div>
      </div>

      {/* Optional prompt */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="arc-field-label">
          补充描述 <span style={{ color: 'var(--arc-muted)', fontSize: '9px' }}>可选</span>
        </div>
        <textarea
          className="arc-textarea"
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          placeholder="如：黄昏光线，有人物活动，绿植点缀…"
          style={{ flex: 1, marginTop: '5px', minHeight: '48px' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          flexShrink: 0, padding: '7px 9px',
          background: 'var(--arc-error-dim)',
          border: '1px solid rgba(224,92,82,0.3)',
          borderRadius: '5px',
        }}>
          {error.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} style={{
              fontSize: '10px', lineHeight: 1.5, marginTop: i > 0 ? '2px' : 0,
              color: i === 0 ? 'var(--arc-error)' : 'var(--arc-secondary)',
            }}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`arc-generate-btn${isGenerating ? ' generating' : ''}`}
        style={{ flexShrink: 0 }}
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
          !referenceImage ? '请先添加参考图' : !architectureDrawing ? '请上传方案图' : 'Generate Render'
        )}
      </button>
    </div>
  );
}
