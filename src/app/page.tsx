'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILDING_TYPES, GALLERY_IMAGES, type BuildingType } from '@/data/gallery';
import ImageModal from '@/components/ImageModal';
import { captureEvent } from '@/lib/posthog';
import { compressImage, urlToBase64 } from '@/lib/image';

/* ── Translations ──────────────────────────────────────── */
const LANG = {
  zh: {
    appSub: 'AI 建筑渲染工作台',
    tune: '参数设置',
    genBtn: 'Generate AI Render',
    rendering: 'Rendering…',
    noRef: '请先选参考图',
    noDrawing: '请上传方案图',
    genCount: (n: number) => `已生成 ${n} 张`,
    refLib: '参考图库',
    refLibHint: '点击选中 · 拖拽到方案图直接生成',
    refActive: '参考图已选中',
    refActiveHint: '可拖拽到方案图立即生成',
    galleryCount: (n: number) => `${n} 张参考图`,
    ready: '就绪',
    uploadCard: '上传方案图',
    uploadHint: '草图、SU截图或照片 · 点击或拖拽',
    drawingLabel: '方案图',
    resultLabel: '生成结果',
    mergeRelease: '松开以开始生成',
    aiRendering: 'AI 渲染中…',
    dragHint: '将图库参考图拖拽到此处立即生成',
    preview: '预览',
    download: '下载',
    buildingType: '建筑类型',
    environment: '环境',
    strength: '参考强度',
    followDrawing: '贴近方案图',
    followRef: '贴近参考图',
    additionalPrompt: '补充描述',
    optional: '可选',
    promptPlaceholder: '如：黄昏光线，有人物活动，绿植点缀…',
    refLabel: '参考图',
    resetView: '重置视图',
    select: '选择',
    toLight: '切换到日间模式',
    toDark: '切换到夜间模式',
  },
  en: {
    appSub: 'AI Architectural Renderer',
    tune: 'Settings',
    genBtn: 'Generate AI Render',
    rendering: 'Rendering…',
    noRef: 'Select a reference first',
    noDrawing: 'Upload a drawing first',
    genCount: (n: number) => `${n} rendered`,
    refLib: 'Reference Library',
    refLibHint: 'Click to select · Drag onto drawing to generate',
    refActive: 'Reference selected',
    refActiveHint: 'Drag onto drawing to generate',
    galleryCount: (n: number) => `${n} references`,
    ready: 'Ready',
    uploadCard: 'Upload Drawing',
    uploadHint: 'Sketch, SU screenshot or photo · Click or drag',
    drawingLabel: 'Drawing',
    resultLabel: 'Result',
    mergeRelease: 'Release to generate',
    aiRendering: 'AI Rendering…',
    dragHint: 'Drag a reference here to generate',
    preview: 'Preview',
    download: 'Download',
    buildingType: 'Building Type',
    environment: 'Environment',
    strength: 'Ref. Strength',
    followDrawing: 'Follow drawing',
    followRef: 'Follow reference',
    additionalPrompt: 'Additional Prompt',
    optional: 'optional',
    promptPlaceholder: 'e.g. sunset light, people, greenery…',
    refLabel: 'Reference',
    resetView: 'Reset view',
    select: 'Select',
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
  },
} as const;
type Lang = keyof typeof LANG;

/* ── Environments ──────────────────────────────────────── */
const ENVIRONMENTS = [
  { zh: '城市', en: 'City' },
  { zh: '草原', en: 'Grassland' },
  { zh: '海岸', en: 'Coast' },
  { zh: '高原', en: 'Plateau' },
  { zh: '戈壁', en: 'Gobi' },
  { zh: '沙漠', en: 'Desert' },
  { zh: '广场', en: 'Plaza' },
  { zh: '街道', en: 'Street' },
];

const LAYOUT_LEFT    = 88;
const LAYOUT_RIGHT   = 348;
const LAYOUT_TOP     = 88;
const CARD_W         = 460;
const RESULT_COL_GAP = CARD_W + 24;
const RESULT_ROW_GAP = 440;

interface GenerationResult { id: string; image: string; index: number; }

function centerViewport() {
  const uw = window.innerWidth  - LAYOUT_RIGHT - LAYOUT_LEFT;
  const uh = window.innerHeight - LAYOUT_TOP;
  return { x: LAYOUT_LEFT + uw / 2, y: LAYOUT_TOP + uh / 2, scale: 1 as const };
}

function calcResultPos(drawingPos: { x: number; y: number }, i: number) {
  return {
    x: drawingPos.x + CARD_W + 40 + (i % 2) * RESULT_COL_GAP,
    y: drawingPos.y + Math.floor(i / 2) * RESULT_ROW_GAP,
  };
}

export default function Home() {
  const canvasRef       = useRef<HTMLDivElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const imgCache        = useRef<Record<string, string>>({});

  const [vt, setVt]               = useState({ x: 0, y: 0, scale: 1 });
  const [drawingPos, setDrawingPos] = useState({ x: 0, y: -160 });
  const [resultPos, setResultPos]   = useState<Record<string, { x: number; y: number }>>({});

  const ia = useRef<{
    type: 'pan' | 'drag'; itemId: string | null;
    startMouse: { x: number; y: number }; startVal: { x: number; y: number }; scale: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [buildingType,        setBuildingType]        = useState<BuildingType>('residential');
  const [environment,         setEnvironment]         = useState('');
  const [referenceImage,      setReferenceImage]      = useState<string | null>(null);
  const [architectureDrawing, setArchitectureDrawing] = useState<{ file: File; preview: string } | null>(null);
  const [strength,            setStrength]            = useState(0.7);
  const [prompt,              setPrompt]              = useState('');
  const [results,             setResults]             = useState<GenerationResult[]>([]);
  const [isGenerating,        setIsGenerating]        = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const [isModalOpen,         setIsModalOpen]         = useState(false);
  const [modalSrc,            setModalSrc]            = useState('');
  const [showSettings,        setShowSettings]        = useState(false);
  const [isDragOver,          setIsDragOver]          = useState(false);
  const [isDragOverDrawing,   setIsDragOverDrawing]   = useState(false);

  /* ── Language & Dark mode ── */
  const [lang,     setLang]     = useState<Lang>('zh');
  const [darkMode, setDarkMode] = useState(false);
  const t = LANG[lang];

  /* ── Theme color palette ── */
  const C = darkMode ? {
    bg: '#0f172a', cardBg: '#1e293b', headerBg: '#0f172a',
    border: '#334155', borderLight: '#334155',
    text: '#f1f5f9', textSec: '#94a3b8', textMuted: '#64748b',
    hover: '#334155', inputBg: '#1e293b', dotColor: '#334155',
    uploadBg: 'rgba(30,41,59,0.6)', logoBg: '#f1f5f9', logoIconColor: '#0f172a',
    btnSecBg: '#1e293b', btnSecBorder: '#334155', btnSecColor: '#94a3b8', divider: '#334155',
    cardShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
    envGroupBg: '#334155',
  } : {
    bg: '#f6f6f8', cardBg: '#ffffff', headerBg: '#f8fafc',
    border: '#e2e8f0', borderLight: '#f1f5f9',
    text: '#0f172a', textSec: '#64748b', textMuted: '#94a3b8',
    hover: '#f1f5f9', inputBg: '#f8fafc', dotColor: '#cbd5e1',
    uploadBg: 'rgba(255,255,255,0.6)', logoBg: '#0f172a', logoIconColor: '#ffffff',
    btnSecBg: '#ffffff', btnSecBorder: '#e2e8f0', btnSecColor: '#64748b', divider: '#e2e8f0',
    cardShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
    envGroupBg: '#f1f5f9',
  };

  const galleryFiltered = useMemo(
    () => GALLERY_IMAGES.filter(img => img.buildingType === buildingType),
    [buildingType],
  );

  useEffect(() => { setVt(centerViewport()); }, []);

  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
      setVt(prev => {
        const ns = Math.min(8, Math.max(0.08, prev.scale * factor));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const r = ns / prev.scale;
        return { x: mx - r * (mx - prev.x), y: my - r * (my - prev.y), scale: ns };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const startInteraction = (e: React.MouseEvent, itemId?: string) => {
    if (e.button !== 0) return;
    if (itemId) e.stopPropagation();
    const startVal = itemId
      ? (itemId === 'drawing' ? { ...drawingPos } : { ...resultPos[itemId] })
      : { x: vt.x, y: vt.y };
    ia.current = { type: itemId ? 'drag' : 'pan', itemId: itemId ?? null, startMouse: { x: e.clientX, y: e.clientY }, startVal, scale: vt.scale };
    setDragging(true);
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const cur = ia.current; if (!cur) return;
    const dx = e.clientX - cur.startMouse.x, dy = e.clientY - cur.startMouse.y;
    if (cur.type === 'pan') {
      setVt(prev => ({ ...prev, x: cur.startVal.x + dx, y: cur.startVal.y + dy }));
    } else if (cur.itemId === 'drawing') {
      setDrawingPos({ x: cur.startVal.x + dx / cur.scale, y: cur.startVal.y + dy / cur.scale });
    } else if (cur.itemId) {
      setResultPos(prev => ({ ...prev, [cur.itemId!]: { x: cur.startVal.x + dx / cur.scale, y: cur.startVal.y + dy / cur.scale } }));
    }
  };

  const onMouseUp = () => { ia.current = null; setDragging(false); };

  const zoom = (factor: number) => {
    setVt(prev => {
      const ns = Math.min(8, Math.max(0.08, prev.scale * factor));
      const el = canvasRef.current;
      const cx = el ? el.clientWidth / 2 : window.innerWidth / 2;
      const cy = el ? el.clientHeight / 2 : window.innerHeight / 2;
      const r = ns / prev.scale;
      return { x: cx - r * (cx - prev.x), y: cy - r * (cy - prev.y), scale: ns };
    });
  };
  const resetView = () => setVt(centerViewport());

  const resolveUrl = async (url: string): Promise<string> => {
    if (imgCache.current[url]) return imgCache.current[url];
    try {
      const result = await compressImage(await urlToBase64(url));
      imgCache.current[url] = result; return result;
    } catch { return url; }
  };

  const handleDrawingFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const preview = await compressImage(e.target?.result as string);
      setArchitectureDrawing({ file, preview }); setError(null);
      captureEvent('drawing_uploaded', { file_type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const url = e.dataTransfer.getData('text/plain');
    if (url?.startsWith('http')) { setReferenceImage(await resolveUrl(url)); captureEvent('reference_image_set', { source: 'canvas_drop' }); return; }
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleDrawingFile(file);
  };

  const handleDropOnDrawing = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOverDrawing(false);
    const url = e.dataTransfer.getData('text/plain');
    if (!url?.startsWith('http') || !architectureDrawing) return;
    const refImg = await resolveUrl(url);
    setReferenceImage(refImg);
    captureEvent('reference_image_set', { source: 'drag_to_drawing' });
    await generate(refImg, architectureDrawing.preview);
  };

  const handleGallerySelect = async (url: string) => {
    setReferenceImage(await resolveUrl(url));
    captureEvent('reference_image_set', { source: 'gallery_click', buildingType });
  };

  const generate = async (refImg: string, drawingImg: string) => {
    setIsGenerating(true); setError(null); setShowSettings(false);
    captureEvent('generation_started', { buildingType, environment, strength });
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 150000);
      let res: Response;
      try {
        res = await fetch('/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referenceImage: refImg, architectureDrawing: drawingImg, buildingType, location: environment || undefined, prompt: prompt || undefined, strength }),
          signal: controller.signal,
        });
        clearTimeout(tid);
      } catch (fe: unknown) { clearTimeout(tid); throw (fe instanceof Error && fe.name === 'AbortError') ? new Error('请求超时（150秒）。') : fe; }

      let data: { result?: string; error?: string; details?: string };
      try { data = await res.json(); } catch { throw new Error(await res.text() || `服务器错误 (${res.status})`); }

      if (!res.ok) {
        let msg = data.error || 'Failed to generate';
        if (res.status === 429) msg = 'API 配额已用完（429）。';
        else if (data.details) { try { msg += '\n' + JSON.parse(data.details)?.error?.message; } catch { msg += '\n' + data.details; } }
        throw new Error(msg);
      }
      if (!data.result) throw new Error('API 未返回图片，请检查配置。');

      const newId = `result-${Date.now()}`;
      setResults(prev => {
        const pos = calcResultPos(drawingPos, prev.length);
        setResultPos(rp => ({ ...rp, [newId]: pos }));
        return [...prev, { id: newId, image: data.result!, index: prev.length + 1 }];
      });
      captureEvent('generation_succeeded', { buildingType });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      captureEvent('generation_failed', { error_message: msg.substring(0, 200) });
      setError(msg.includes('Failed to fetch') || msg.includes('NetworkError') ? '网络连接失败，请重试。' : msg);
    } finally { setIsGenerating(false); }
  };

  const handleGenerate = () => {
    if (!referenceImage || !architectureDrawing) return;
    generate(referenceImage, architectureDrawing.preview);
  };

  const handleDownload = (image: string, index: number) => {
    const a = document.createElement('a'); a.href = image; a.download = `arcrender-${index}-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    captureEvent('image_downloaded', { buildingType, index });
  };

  const canGenerate = !!referenceImage && !!architectureDrawing && !isGenerating;

  const cardBase: React.CSSProperties = {
    position: 'absolute', transform: 'translate(-50%, 0)', width: CARD_W,
    background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow,
    overflow: 'hidden', userSelect: 'none',
  };

  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-inter), system-ui, sans-serif', color: C.text, background: C.bg }}
    >

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden' }}
        onMouseDown={e => startInteraction(e)}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleCanvasDrop}
      >
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${C.dotColor} 1.5px, transparent 1.5px)`,
          backgroundSize: `${24 * vt.scale}px ${24 * vt.scale}px`,
          backgroundPosition: `${vt.x % (24 * vt.scale)}px ${vt.y % (24 * vt.scale)}px`,
          opacity: 0.7,
        }} />

        {isDragOver && !isDragOverDrawing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,91,236,0.04)', border: '2px dashed rgba(19,91,236,0.3)', pointerEvents: 'none', zIndex: 5 }} />
        )}

        {/* Canvas world */}
        <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${vt.x}px,${vt.y}px) scale(${vt.scale})` }}>

          {/* Upload prompt */}
          {!architectureDrawing && (
            <div
              className="hover-border-primary"
              style={{ position: 'absolute', left: -(CARD_W / 2), top: -160, width: CARD_W, height: 280, border: '2px dashed', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: C.uploadBg, cursor: 'pointer' }}
              onClick={() => drawingInputRef.current?.click()}
              onMouseDown={e => e.stopPropagation()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: C.textMuted }}>upload_file</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{t.uploadCard}</p>
                <p style={{ fontSize: 12, color: C.textMuted }}>{t.uploadHint}</p>
              </div>
            </div>
          )}

          {/* Drawing card */}
          {architectureDrawing && (
            <div
              className={isDragOverDrawing ? 'card-merge-active' : ''}
              style={{ ...cardBase, left: drawingPos.x, top: drawingPos.y, cursor: dragging && ia.current?.itemId === 'drawing' ? 'grabbing' : 'move' }}
              onMouseDown={e => startInteraction(e, 'drawing')}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverDrawing(true); }}
              onDragLeave={e => { e.stopPropagation(); setIsDragOverDrawing(false); }}
              onDrop={handleDropOnDrawing}
            >
              <div style={{ padding: '10px 14px', background: C.headerBg, borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.textMuted }}>drag_indicator</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.drawingLabel}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setArchitectureDrawing(null); setResults([]); setResultPos({}); }}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: C.hover, cursor: 'pointer', color: C.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseDown={e => e.stopPropagation()}
                >✕</button>
              </div>

              <div style={{ position: 'relative', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={architectureDrawing.preview} alt={t.drawingLabel} style={{ width: '100%', display: 'block', opacity: isGenerating || isDragOverDrawing ? 0.45 : 1, transition: 'opacity 0.25s' }} draggable={false} />

                {isDragOverDrawing && !isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div className="scan-line" />
                    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: '10px 20px', textAlign: 'center', zIndex: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#135bec', display: 'block', marginBottom: 4 }}>auto_awesome</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#135bec' }}>{t.mergeRelease}</p>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: 'spin 1.5s linear infinite' }}>
                      <circle cx="20" cy="20" r="16" stroke="#e2e8f0" strokeWidth="2" />
                      <path d="M 20 4 A 16 16 0 0 1 36 20" stroke="#135bec" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '6px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#135bec', textTransform: 'uppercase' }}>Rendering</p>
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.aiRendering}</p>
                    </div>
                  </div>
                )}
              </div>

              {!isDragOverDrawing && !isGenerating && referenceImage && (
                <div style={{ padding: '8px 14px', background: 'rgba(19,91,236,0.04)', borderTop: '1px solid rgba(19,91,236,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#135bec' }}>drag_pan</span>
                  <span style={{ fontSize: 10, color: '#135bec', fontWeight: 600 }}>{t.dragHint}</span>
                </div>
              )}
            </div>
          )}

          {/* Result cards */}
          {results.map(result => {
            const pos = resultPos[result.id] ?? { x: 0, y: 0 };
            return (
              <div
                key={result.id}
                className="animate-fade-in"
                style={{ ...cardBase, left: pos.x, top: pos.y, cursor: dragging && ia.current?.itemId === result.id ? 'grabbing' : 'move' }}
                onMouseDown={e => startInteraction(e, result.id)}
              >
                <div style={{ padding: '10px 14px', background: 'rgba(19,91,236,0.04)', borderBottom: '1px solid rgba(19,91,236,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.textMuted }}>drag_indicator</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#135bec', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t.resultLabel} #{result.index}
                    </span>
                    <span style={{ background: '#135bec', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>AI</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onMouseDown={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setModalSrc(result.image); setIsModalOpen(true); }}
                      style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.btnSecBorder}`, background: C.btnSecBg, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.btnSecColor, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fullscreen</span>
                      {t.preview}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDownload(result.image, result.index); }}
                      style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#135bec', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                      {t.download}
                    </button>
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image} alt={`${t.resultLabel} #${result.index}`} style={{ width: '100%', display: 'block' }} draggable={false} />
              </div>
            );
          })}

        </div>
      </div>

      {/* ── Top-Left: Logo ── */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 8px 8px', borderRadius: 9999 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.logoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.logoIconColor }}>architecture</span>
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>ArcRender</span>
            <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.appSub}</p>
          </div>
        </div>
      </div>

      {/* ── Top-Right: Language & Dark mode ── */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderRadius: 9999 }}>
          <button
            className="ws-toggle-btn"
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>translate</span>
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <div style={{ width: 1, height: 20, background: C.divider }} />
          <button
            className="ws-toggle-btn"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? t.toLight : t.toDark}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Top-Center: Action Bar ── */}
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 6px 6px 8px', borderRadius: 9999 }}>
          <button
            onClick={() => setShowSettings(v => !v)}
            style={{ height: 40, padding: '0 12px', borderRadius: 9999, border: 'none', background: showSettings ? C.hover : 'transparent', color: C.textSec, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
            {t.tune}
          </button>
          <div style={{ width: 1, height: 24, background: C.divider, margin: '0 4px' }} />
          <button className="btn-generate" onClick={handleGenerate} disabled={!canGenerate}>
            {isGenerating ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                {t.rendering}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                {!referenceImage ? t.noRef : !architectureDrawing ? t.noDrawing : t.genBtn}
              </>
            )}
          </button>
          {results.length > 0 && (
            <div style={{ marginLeft: 4, padding: '0 10px', height: 40, display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted }}>
              {t.genCount(results.length)}
            </div>
          )}
        </div>

        {/* Settings popover */}
        {showSettings && (
          <div className="ws-panel animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 320, borderRadius: 16, padding: 16, zIndex: 50 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {([['ref', t.refLabel, referenceImage], ['drawing', t.drawingLabel, architectureDrawing]] as [string, string, unknown][]).map(([k, label, val]) => (
                <div key={k} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: val ? 'rgba(34,197,94,0.06)' : C.inputBg, border: `1px solid ${val ? 'rgba(34,197,94,0.25)' : C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: val ? '#22c55e' : C.textMuted }}>{val ? 'check_circle' : 'radio_button_unchecked'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: val ? '#16a34a' : C.textMuted }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.strength}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#135bec', background: 'rgba(19,91,236,0.08)', padding: '2px 8px', borderRadius: 6 }}>{Math.round(strength * 100)}%</span>
              </div>
              <input type="range" min="0.3" max="1" step="0.05" value={strength} onChange={e => setStrength(parseFloat(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: C.textMuted }}>{t.followDrawing}</span>
                <span style={{ fontSize: 10, color: C.textMuted }}>{t.followRef}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {t.additionalPrompt} <span style={{ color: C.textMuted, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{t.optional}</span>
              </div>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                style={{ width: '100%', minHeight: 68, resize: 'none', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, color: C.text, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                onFocus={e => (e.target.style.borderColor = '#135bec')}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
            {error && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                {error.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} style={{ fontSize: 11, color: i === 0 ? '#ef4444' : C.textSec, lineHeight: 1.5, marginTop: i > 0 ? 2 : 0 }}>{line}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Left Toolbar ── */}
      <div style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, borderRadius: 9999 }}>
          {[{ icon: 'near_me', label: t.select, active: true }, { icon: 'rectangle', label: 'Rectangle' }, { icon: 'crop_free', label: 'Frame' }].map(tb => (
            <button key={tb.icon} className={`tool-btn${tb.active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{tb.icon}</span>
              <span className="tooltip">{tb.label}</span>
            </button>
          ))}
          <div style={{ width: 24, height: 1, background: C.divider, margin: '4px auto' }} />
          <button className="tool-btn" onClick={() => drawingInputRef.current?.click()}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
            <span className="tooltip">{t.uploadCard}</span>
          </button>
          <button className="tool-btn" onClick={() => setShowSettings(v => !v)}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>tune</span>
            <span className="tooltip">{t.tune}</span>
          </button>
        </div>
      </div>

      {/* ── Zoom Controls ── */}
      <div style={{ position: 'absolute', left: 80, bottom: 32, zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderRadius: 9999 }}>
          <button onClick={() => zoom(1 / 0.85)} className="tool-btn" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          </button>
          <button onClick={resetView} style={{ padding: '0 10px', height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.textSec, minWidth: 52, textAlign: 'center' }}>
            {Math.round(vt.scale * 100)}%
          </button>
          <button onClick={() => zoom(0.85)} className="tool-btn" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
          </button>
          <div style={{ width: 1, height: 20, background: C.divider, margin: '0 4px' }} />
          <button onClick={resetView} className="tool-btn" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fit_screen</span>
            <span className="tooltip">{t.resetView}</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Filter Bar ── */}
      <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
        <div className="ws-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderRadius: 9999 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{t.buildingType}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {BUILDING_TYPES.map(bt => (
                <button key={bt.id} className={`ws-pill${buildingType === bt.id ? ' active' : ''}`} onClick={() => setBuildingType(bt.id)}>
                  {lang === 'zh' ? bt.name : bt.en}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: 1, height: 24, background: C.divider, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{t.environment}</span>
            <div style={{ display: 'flex', gap: 2, padding: 2, background: C.envGroupBg, borderRadius: 9999 }}>
              {ENVIRONMENTS.map(env => (
                <button
                  key={env.zh}
                  className={`env-pill${environment === env.zh ? ' active' : ''}`}
                  onClick={() => setEnvironment(environment === env.zh ? '' : env.zh)}
                >
                  {lang === 'zh' ? env.zh : env.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Reference Library ── */}
      <div style={{ position: 'absolute', right: 24, top: 88, bottom: 24, width: 300, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
        <div className="ws-panel" style={{ borderRadius: 20, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.borderLight}` }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.refLib}</h2>
            <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>{t.refLibHint}</p>
          </div>

          {referenceImage && (
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.borderLight}`, background: 'rgba(19,91,236,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceImage} alt={t.refLabel} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#135bec', marginBottom: 1 }}>{t.refActive}</p>
                  <p style={{ fontSize: 10, color: C.textMuted }}>{t.refActiveHint}</p>
                </div>
                <button onClick={() => setReferenceImage(null)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: C.hover, cursor: 'pointer', color: C.textSec, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
          )}

          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {galleryFiltered.map(img => (
                <div
                  key={img.id}
                  className={`gallery-item${referenceImage === img.url ? ' selected' : ''}`}
                  onClick={() => handleGallerySelect(img.url)}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', img.url); e.dataTransfer.effectAllowed = 'copy'; captureEvent('gallery_image_dragged', { buildingType }); }}
                  title={lang === 'zh' ? '点击选中 · 拖到方案图自动生成' : 'Click to select · Drag onto drawing to generate'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} loading="lazy" />
                  {referenceImage === img.url && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,91,236,0.15)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 6 }}>
                      <span style={{ background: '#135bec', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>ACTIVE</span>
                    </div>
                  )}
                </div>
              ))}
              <div
                className="hover-border-blue"
                style={{ aspectRatio: '1', borderRadius: 12, border: '2px dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: C.textMuted }}
                onClick={() => drawingInputRef.current?.click()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>upload_file</span>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t.uploadCard}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.borderLight}`, background: darkMode ? C.headerBg : 'rgba(248,250,252,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: C.textMuted }}>
              <span>{t.galleryCount(galleryFiltered.length)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />{t.ready}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hidden input ── */}
      <input ref={drawingInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleDrawingFile(f); e.target.value = ''; }} />

      {/* ── Image Modal ── */}
      {isModalOpen && modalSrc && (
        <ImageModal src={modalSrc} alt={t.preview} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
