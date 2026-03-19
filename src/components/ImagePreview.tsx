'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  src: string;
  alt: string;
  title: string;
  onRemove?: () => void;
}

export default function ImagePreview({ src, alt, onRemove }: ImagePreviewProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '5px', overflow: 'hidden' }}>
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: 'absolute', top: '6px', right: '6px', zIndex: 2,
            width: '20px', height: '20px',
            background: 'rgba(12,12,16,0.75)',
            border: '1px solid var(--arc-border-light)',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--arc-secondary)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--arc-error)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--arc-error)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--arc-border-light)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--arc-secondary)';
          }}
          title="移除图片"
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      )}

      {/* Image */}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
