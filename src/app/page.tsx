"use client";

import { useState, useRef } from 'react';
import './app.css'; // We'll create robust CSS for aesthetics

export default function Home() {
  const [itemName, setItemName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTracing, setIsTracing] = useState(false);

  const [pngHistory, setPngHistory] = useState<{ url: string, name: string }[]>([]);
  const [currentPng, setCurrentPng] = useState<{ url: string, name: string } | null>(null);
  const [svgData, setSvgData] = useState<string | null>(null);

  const [inkColor, setInkColor] = useState('#000000');
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    setIsGenerating(true);
    setSvgData(null);
    setError(null);

    try {
      // 1. Generate Raster Image
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName }),
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateData.error || 'Failed to generate image');
      }

      const imageUrl = `data:image/png;base64,${generateData.image}`;
      const newImage = { url: imageUrl, name: itemName };

      setPngHistory(prev => [newImage, ...prev]);
      setCurrentPng(newImage);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrace = async () => {
    if (!currentPng) return;

    setIsTracing(true);
    setError(null);
    setScale(1); // Reset scale on new trace

    try {
      // remove the data:image/png;base64, prefix
      const base64Data = currentPng.url.replace(/^data:image\/png;base64,/, '');

      // 2. Trace Image to SVG
      const traceResponse = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      const traceData = await traceResponse.json();

      if (!traceResponse.ok) {
        throw new Error(traceData.error || 'Failed to trace image');
      }

      setSvgData(traceData.svg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTracing(false);
    }
  };

  const handleSelectHistory = (img: { url: string, name: string }) => {
    setCurrentPng(img);
    setSvgData(null); // Clear SVG so user can see the PNG again
    setItemName(img.name);
  };

  const handleDownload = () => {
    if (!svgData || !canvasRef.current) return;

    let finalSvgData = svgData;
    finalSvgData = finalSvgData.replace(/<svg/, `<svg fill="${inkColor}" `);

    const blob = new Blob([finalSvgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${itemName.replace(/\s+/g, '_')}_stamp.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-container">
      {/* Sidebar for History */}
      <aside className="glass-panel sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '250px', padding: '1.5rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-accent)' }}>History</h2>
        {pngHistory.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No images generated yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pngHistory.map((img, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectHistory(img)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: currentPng?.url === img.url ? '3px solid var(--accent)' : '3px solid transparent',
                  background: 'white'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} style={{ width: '100%', display: 'block', aspectRatio: '1/1', objectFit: 'cover' }} />
                <div style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center', background: 'var(--bg-glass-heavy)', color: 'var(--text-primary)' }}>
                  {img.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <div className="glass-panel main-content" style={{ flex: 1 }}>
        <h1 className="title">Bullet Journal Stamp Generator</h1>
        <p className="subtitle">
          Describe any object. We'll generate a pristine vector rubber stamp contour.
        </p>

        <form onSubmit={handleGenerate} className="input-group">
          <input
            type="text"
            className="stamp-input"
            placeholder="e.g., matching tea cups, cute sleepy cat, bonsai tree..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            disabled={isGenerating || isTracing}
          />
          <button
            type="submit"
            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
            disabled={isGenerating || isTracing || !itemName}
          >
            {isGenerating ? 'Generating...' : '1. Create Image'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        <div className="workspace">
          {/* Interactive Canvas */}
          <div className="canvas-wrapper">
            <div className="canvas-container" ref={canvasRef} style={{ background: 'white' }}>
              {isGenerating ? (
                <div className="canvas-placeholder">AI is dreaming...</div>
              ) : svgData ? (
                <div
                  className="svg-display"
                  dangerouslySetInnerHTML={{ __html: svgData }}
                  style={{
                    fill: inkColor,
                    color: inkColor,
                    transform: `scale(${scale})`,
                    transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    width: '100%',
                    height: '100%'
                  }}
                />
              ) : currentPng ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={currentPng.url} alt="Generated Model Output" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div className="canvas-placeholder">
                  1:1 Artboard
                </div>
              )}
            </div>
            {currentPng && !svgData && !isGenerating && (
              <button
                onClick={handleTrace}
                className={`generate-btn ${isTracing ? 'loading' : ''}`}
                style={{ marginTop: '1rem', width: '100%' }}
                disabled={isTracing}
              >
                {isTracing ? 'Vectorizing...' : '2. Convert to SVG'}
              </button>
            )}
          </div>

          {/* Controls & Export */}
          <div className="controls-panel">
            <div className="control-group">
              <label>Ink Color</label>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  value={inkColor}
                  onChange={(e) => setInkColor(e.target.value)}
                  className="color-input"
                  disabled={!svgData}
                />
                <span className="color-hex">{inkColor}</span>
              </div>
            </div>

            <div className="control-group">
              <label>Scale Design</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="range-input"
                disabled={!svgData}
              />
            </div>

            <button
              className="export-btn"
              onClick={handleDownload}
              disabled={!svgData}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download SVG
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
