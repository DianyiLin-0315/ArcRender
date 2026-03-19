'use client';

import { BUILDING_TYPES, GALLERY_IMAGES, type BuildingType } from '@/data/gallery';
import { captureEvent } from '@/lib/posthog';

interface ReferenceGalleryProps {
  selectedType: BuildingType;
  onTypeChange: (type: BuildingType) => void;
  onImageSelect: (url: string) => void;
}

export default function ReferenceGallery({ selectedType, onTypeChange, onImageSelect }: ReferenceGalleryProps) {
  const filtered = GALLERY_IMAGES.filter(img => img.buildingType === selectedType);

  const handleDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.effectAllowed = 'copy';
    captureEvent('gallery_image_dragged', { buildingType: selectedType });
  };

  return (
    <div className="arc-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header + tabs */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <div className="arc-section-label" style={{ marginBottom: '8px' }}>参考图库</div>
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
          {BUILDING_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => onTypeChange(type.id)}
              className={`arc-tab${selectedType === type.id ? ' active' : ''}`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        <div className="arc-gallery-grid">
          {filtered.map(img => (
            <div
              key={img.id}
              className="arc-gallery-item"
              draggable
              onDragStart={(e) => handleDragStart(e, img.url)}
              onClick={() => {
                onImageSelect(img.url);
                captureEvent('reference_image_set', { source: 'gallery_click', buildingType: selectedType });
              }}
              title="拖拽或点击设为参考图"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} loading="lazy" />
              <div className="arc-gallery-item-overlay">
                <span>设为参考</span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--arc-muted)', fontSize: '11px' }}>
            暂无该类型参考图
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        flexShrink: 0, padding: '8px 10px',
        borderTop: '1px solid var(--arc-border)',
        fontSize: '9px', color: 'var(--arc-muted)', letterSpacing: '0.05em', textAlign: 'center',
      }}>
        拖拽图片到参考图区域 · 或点击直接选用
      </div>
    </div>
  );
}
