'use client';

import { useState } from 'react';
import ImageModal from '@/components/ImageModal';
import { captureEvent } from '@/lib/posthog';

function BuildingWireframe() {
  return (
    <svg viewBox="0 0 240 156" fill="none" className="w-[180px] opacity-40" aria-hidden>
      <path
        d="M 15,150 L 15,92 L 58,92 L 58,62 L 82,62 L 82,42 L 92,42 L 92,26 L 120,14 L 148,26 L 148,42 L 158,42 L 158,62 L 182,62 L 182,92 L 225,92 L 225,150 Z"
        stroke="var(--arc-amber)" strokeWidth="1.5"
        strokeDasharray="1100" strokeDashoffset="1100"
        style={{ animation: 'draw-line 2.6s ease-out 0.2s forwards' }}
      />
      <line x1="5" y1="150" x2="235" y2="150"
        stroke="var(--arc-amber)" strokeWidth="1"
        strokeDasharray="230" strokeDashoffset="230"
        style={{ animation: 'draw-line 0.7s ease-out 2.6s forwards' }}
      />
      {[22, 38].map((x, i) => (
        <rect key={`lw-${i}`} x={x} y={101} width={11} height={9}
          stroke="var(--arc-amber)" strokeWidth="0.8" strokeOpacity="0.8"
          strokeDasharray="40" strokeDashoffset="40"
          style={{ animation: `draw-line 0.35s ease-out ${2.9 + i * 0.12}s forwards` }}
        />
      ))}
      {[185, 201].map((x, i) => (
        <rect key={`rw-${i}`} x={x} y={101} width={11} height={9}
          stroke="var(--arc-amber)" strokeWidth="0.8" strokeOpacity="0.8"
          strokeDasharray="40" strokeDashoffset="40"
          style={{ animation: `draw-line 0.35s ease-out ${2.9 + i * 0.12}s forwards` }}
        />
      ))}
      {[48, 63, 78].map((y, row) =>
        [96, 110, 124].map((x, col) => (
          <rect key={`tw-${row}-${col}`} x={x} y={y} width={9} height={7}
            stroke="var(--arc-amber)" strokeWidth="0.7" strokeOpacity="0.7"
            strokeDasharray="32" strokeDashoffset="32"
            style={{ animation: `draw-line 0.28s ease-out ${3.2 + (row * 3 + col) * 0.08}s forwards` }}
          />
        ))
      )}
      <rect x={110} y={130} width={20} height={20}
        stroke="var(--arc-amber)" strokeWidth="0.9" strokeOpacity="0.8"
        strokeDasharray="80" strokeDashoffset="80"
        style={{ animation: 'draw-line 0.4s ease-out 4s forwards' }}
      />
      <line x1="15" y1="92" x2="225" y2="92"
        stroke="var(--arc-amber)" strokeWidth="0.5" strokeOpacity="0.3"
        strokeDasharray="210" strokeDashoffset="210"
        style={{ animation: 'draw-line 0.9s ease-out 4.2s forwards' }}
      />
    </svg>
  );
}

interface OutputPanelProps {
  generatedImage: string | null;
  isGenerating: boolean;
  onDownload: () => void;
}

export default function OutputPanel({ generatedImage, isGenerating, onDownload }: OutputPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="arc-panel" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Corner brackets */}
      <div className={`arc-corner tl${isGenerating ? ' pulse' : ''}`} />
      <div className={`arc-corner tr${isGenerating ? ' pulse' : ''}`} />
      <div className={`arc-corner bl${isGenerating ? ' pulse' : ''}`} />
      <div className={`arc-corner br${isGenerating ? ' pulse' : ''}`} />

      {/* Scan line */}
      {isGenerating && <div className="arc-scan-line" />}

      {/* Top bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        borderBottom: '1px solid var(--arc-border)',
      }}>
        <div className="arc-section-label">Output</div>
        {generatedImage && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="arc-action-btn"
              onClick={() => {
                setIsModalOpen(true);
                captureEvent('image_preview_opened', { image_type: 'generated' });
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              全屏预览
            </button>
            <button className="arc-action-btn" onClick={onDownload}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              下载
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {generatedImage ? (
          <div
            className="animate-fade-in"
            style={{ width: '100%', height: '100%', cursor: 'zoom-in' }}
            onClick={() => {
              setIsModalOpen(true);
              captureEvent('image_clicked_to_preview', { image_type: 'generated' });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImage}
              alt="Generated rendering"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {isGenerating ? (
              <>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-spin-slow">
                  <circle cx="24" cy="24" r="20" stroke="var(--arc-border-light)" strokeWidth="1.5" />
                  <path d="M 24 4 A 20 20 0 0 1 44 24" stroke="var(--arc-amber)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--arc-amber)', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Rendering
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--arc-secondary)' }}>正在生成渲染图，请稍候…</p>
                </div>
              </>
            ) : (
              <>
                <BuildingWireframe />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--arc-secondary)', textTransform: 'uppercase' }}>
                    Add Reference &amp; Generate
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--arc-muted)', marginTop: '4px' }}>渲染图将在此显示</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {generatedImage && (
        <ImageModal
          src={generatedImage}
          alt="生成的渲染图"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
