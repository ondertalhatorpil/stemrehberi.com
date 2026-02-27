import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// ─── PageCanvas ───────────────────────────────────────────────────────────────
function PageCanvas({ pdf, pageNum, targetW, targetH, onReady }) {
  const ref = useRef(null)
  const taskRef = useRef(null)
  useEffect(() => {
    if (!pdf || !pageNum || pageNum < 1 || pageNum > pdf.numPages) return
    let dead = false
    ;(async () => {
      if (taskRef.current) { try { taskRef.current.cancel() } catch (_) {} }
      const p = await pdf.getPage(pageNum)
      if (dead) return
      const vp = p.getViewport({ scale: 1 })
      const scale = Math.min(targetW / vp.width, targetH / vp.height)
      const sv = p.getViewport({ scale })
      const c = ref.current; if (!c) return
      c.width = Math.round(sv.width * 2)
      c.height = Math.round(sv.height * 2)
      c.style.width = `${sv.width}px`
      c.style.height = `${sv.height}px`
      const task = p.render({ canvasContext: c.getContext('2d'), viewport: p.getViewport({ scale: scale * 2 }) })
      taskRef.current = task
      await task.promise
      if (!dead && onReady) onReady()
    })()
    return () => { dead = true }
  }, [pdf, pageNum, targetW, targetH])
  return <canvas ref={ref} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }} />
}

// ─── Flip Transition — CSS 3D Kitap Çevirme ──────────────────────────────────
function FlipTransition({ pdf, fromPage, toPage, direction, onDone, pageW, pageH }) {
  const [phase, setPhase] = useState('start') // start → flip → done

  useEffect(() => {
    // Kısa gecikme sonra animasyonu başlat
    const t1 = setTimeout(() => setPhase('flip'), 30)
    const t2 = setTimeout(() => {
      onDone()
    }, 700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const isFwd = direction === 'fwd'

  return (
    <div className="flip-scene" style={{ width: pageW, height: pageH }}>
      {/* Arka sayfa — hedef */}
      <div className="flip-back-page">
        <PageCanvas pdf={pdf} pageNum={toPage} targetW={pageW} targetH={pageH} />
      </div>

      {/* Dönen kapak — kaynak sayfa */}
      <div
        className={`flip-card ${isFwd ? 'flip-card-fwd' : 'flip-card-bwd'} ${phase === 'flip' ? 'flipping' : ''}`}
      >
        {/* Ön yüz: mevcut sayfa */}
        <div className="flip-face flip-front">
          <PageCanvas pdf={pdf} pageNum={fromPage} targetW={pageW} targetH={pageH} />
          {/* Kıvrılma gradyanı */}
          <div className={`curl-shadow ${isFwd ? 'curl-shadow-fwd' : 'curl-shadow-bwd'}`} />
        </div>
        {/* Arka yüz: bir önceki/sonraki sayfa (ters) */}
        <div className="flip-face flip-back-face">
          <PageCanvas pdf={pdf} pageNum={toPage} targetW={pageW} targetH={pageH} />
        </div>
      </div>

      {/* Gölge efekti */}
      <div className={`flip-shadow ${isFwd ? 'flip-shadow-fwd' : 'flip-shadow-bwd'} ${phase === 'flip' ? 'shadow-active' : ''}`} />
    </div>
  )
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumbnail({ pdf, pageNum, isActive, onClick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!pdf || !pageNum) return
    let dead = false
    pdf.getPage(pageNum).then(p => {
      if (dead) return
      const vp = p.getViewport({ scale: 1 })
      const scale = (110 / vp.width) * 2
      const sv = p.getViewport({ scale })
      const c = canvasRef.current
      if (!c) return
      c.width = sv.width
      c.height = sv.height
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, c.width, c.height)
      p.render({ canvasContext: ctx, viewport: sv })
    }).catch(() => {})
    return () => { dead = true }
  }, [pdf, pageNum])

  return (
    <div className={`thumb ${isActive ? 'active' : ''}`} onClick={onClick}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '110px', height: 'auto' }} />
      <span className="thumb-label">{pageNum}</span>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [pdf, setPdf] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [transition, setTransition] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbs, setShowThumbs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const busy = useRef(false)

  const canFwd = page < numPages
  const canBwd = page > 1

  const navigate = useCallback((dir) => {
    if (busy.current) return
    if (dir === 'fwd' && !canFwd) return
    if (dir === 'bwd' && !canBwd) return
    const nextPage = dir === 'fwd' ? page + 1 : page - 1
    busy.current = true
    setTransition({ from: page, to: nextPage, dir })
  }, [page, canFwd, canBwd])

  const handleDone = useCallback(() => {
    setPage(t => transition ? transition.to : t)
    setTransition(null)
    busy.current = false
  }, [transition])

  const jumpTo = useCallback((p) => {
    if (p === page || busy.current) return
    const dir = p > page ? 'fwd' : 'bwd'
    busy.current = true
    setTransition({ from: page, to: p, dir })
    setShowThumbs(false)
  }, [page])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate('fwd')
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate('bwd')
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 't' || e.key === 'T') setShowThumbs(s => !s)
      if (e.key === 'Escape') setShowThumbs(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  useEffect(() => {
    setLoading(true); setLoadProgress(0)
    const task = pdfjsLib.getDocument({ url: '/SUNUM.pdf' })
    task.onProgress = ({ loaded, total }) => {
      if (total) setLoadProgress(Math.round((loaded / total) * 100))
    }
    task.promise.then(doc => {
      setPdf(doc); setNumPages(doc.numPages); setPage(1); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const loadFile = async (file) => {
    if (!file) return
    setLoading(true); setLoadProgress(0)
    const ab = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: ab }).promise
    setPdf(doc); setNumPages(doc.numPages); setPage(1); setLoading(false)
  }

  const PW = 900, PH = 530
  const progressPct = numPages > 1 ? ((page - 1) / (numPages - 1)) * 100 : 0

  return (
    <div ref={containerRef} className={`app ${isFullscreen ? 'fs' : ''}`}>
      <div className="bg" />

      {/* Header */}
      <header className="hdr">
        <div className="logo">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
         {/*  <span>Reader</span> */}
        </div>
        <div className="hdr-center">
          {pdf && !loading && (
            <span className="pager">{page}<em> / {numPages}</em></span>
          )}
        </div>
        <div className="hdr-actions">
          {pdf && !loading && (
            <>
              <button className="icon-btn" onClick={() => setShowThumbs(s => !s)} title="Sayfalar (T)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
              </button>
              <button className="icon-btn" onClick={toggleFullscreen} title="Tam Ekran (F)">
                {isFullscreen
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                }
              </button>
            </>
          )}
        
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => loadFile(e.target.files[0])} />
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Yükleniyor <strong>{loadProgress}%</strong></p>
            <div className="ld-bar"><div className="ld-fill" style={{ width: `${loadProgress}%` }} /></div>
          </div>
        ) : !pdf ? (
          <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.25"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <h2>PDF Yükle</h2>
            <p>Sürükle bırak veya tıkla</p>
          </div>
        ) : (
          <div className="reader">
            <button className={`nav nav-l ${!canBwd ? 'off' : ''}`} onClick={() => navigate('bwd')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="15,18 9,12 15,6"/></svg>
            </button>

            <div className="book" style={{ width: PW, height: PH }}>
              {!transition ? (
                <div className="page-wrap">
                  <PageCanvas pdf={pdf} pageNum={page} targetW={PW} targetH={PH} />
                </div>
              ) : (
                <FlipTransition
                  pdf={pdf}
                  fromPage={transition.from}
                  toPage={transition.to}
                  direction={transition.dir}
                  onDone={handleDone}
                  pageW={PW}
                  pageH={PH}
                />
              )}
              <div className="hit-l" onClick={() => navigate('bwd')} />
              <div className="hit-r" onClick={() => navigate('fwd')} />
            </div>

            <button className={`nav nav-r ${!canFwd ? 'off' : ''}`} onClick={() => navigate('fwd')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      {pdf && !loading && (
        <footer className="footer">
          <div className="prog" onClick={e => {
            const r = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - r.left) / r.width
            jumpTo(Math.max(1, Math.min(numPages, Math.round(ratio * numPages))))
          }}>
            <div className="prog-fill" style={{ width: `${progressPct}%` }} />
            <div className="prog-dot" style={{ left: `${progressPct}%` }} />
          </div>
          <div className="hints">
            <span><kbd>←</kbd><kbd>→</kbd> Gezin</span>
            <span><kbd>T</kbd> Sayfalar</span>
            <span><kbd>F</kbd> Tam Ekran</span>
          </div>
        </footer>
      )}

      {/* Thumbnail panel */}
      {showThumbs && pdf && (
        <>
          <div className="overlay" onClick={() => setShowThumbs(false)} />
          <div className="panel">
            <div className="panel-hdr">
              <span>Sayfalar <em>({numPages})</em></span>
              <button className="close-btn" onClick={() => setShowThumbs(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="panel-grid">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
                <Thumbnail key={p} pdf={pdf} pageNum={p} isActive={p === page} onClick={() => jumpTo(p)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}