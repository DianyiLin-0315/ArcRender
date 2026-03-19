'use client';

import { useEffect } from 'react';
import { captureEvent } from '@/lib/posthog';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      captureEvent('image_modal_opened');
    } else {
      document.body.style.overflow = '';
      captureEvent('image_modal_closed');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,8,12,0.92)',
        backdropFilter: 'blur(16px)',
        animation: 'fade-in 0.2s ease both',
      }}
    >
      {/* Corner brackets on modal */}
      <div style={{ position: 'absolute', top: '32px', left: '32px', width: '24px', height: '24px', borderTop: '1.5px solid var(--arc-amber)', borderLeft: '1.5px solid var(--arc-amber)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: '32px', right: '32px', width: '24px', height: '24px', borderTop: '1.5px solid var(--arc-amber)', borderRight: '1.5px solid var(--arc-amber)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: '32px', left: '32px', width: '24px', height: '24px', borderBottom: '1.5px solid var(--arc-amber)', borderLeft: '1.5px solid var(--arc-amber)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: '32px', right: '32px', width: '24px', height: '24px', borderBottom: '1.5px solid var(--arc-amber)', borderRight: '1.5px solid var(--arc-amber)', opacity: 0.5 }} />

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 2,
          width: '32px', height: '32px',
          background: 'var(--arc-surface)',
          border: '1px solid var(--arc-border-light)',
          borderRadius: '5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--arc-secondary)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--arc-amber)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--arc-amber)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--arc-border-light)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--arc-secondary)';
        }}
        aria-label="关闭"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="11" y2="11" />
          <line x1="11" y1="1" x2="1" y2="11" />
        </svg>
      </button>

      {/* ESC hint */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '9px', letterSpacing: '0.14em', color: 'var(--arc-muted)', textTransform: 'uppercase',
      }}>
        ESC 关闭
      </div>

      {/* Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '92vw', maxHeight: '88vh', animation: 'fade-in-up 0.25s ease both' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '88vh',
            objectFit: 'contain',
            display: 'block',
            borderRadius: '4px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    </div>
  );
}
