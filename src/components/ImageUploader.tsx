'use client';

import { useState, useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelect: (file: File, preview: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onImageSelect, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        onImageSelect(file, preview);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`arc-upload-zone${isDragging ? ' dragging' : ''}${disabled ? ' disabled' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Upload icon */}
      <div style={{
        width: '32px', height: '32px',
        border: `1px solid ${isDragging ? 'var(--arc-amber)' : 'var(--arc-border-light)'}`,
        borderRadius: '5px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.2s',
        color: isDragging ? 'var(--arc-amber)' : 'var(--arc-secondary)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, color: isDragging ? 'var(--arc-amber)' : 'var(--arc-secondary)', marginBottom: '2px', transition: 'color 0.2s' }}>
          {isDragging ? '释放以上传' : '拖放或点击上传'}
        </p>
        <p style={{ fontSize: '9px', color: 'var(--arc-muted)', letterSpacing: '0.08em' }}>
          JPG · PNG · WebP
        </p>
      </div>
    </div>
  );
}
