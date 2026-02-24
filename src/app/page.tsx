"use client";

import { useState, useRef, useEffect } from 'react';
import './app.css'; // We'll create robust CSS for aesthetics

export default function Home() {
  const [itemName, setItemName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTracing, setIsTracing] = useState(false);

  const [pngHistory, setPngHistory] = useState<{ url: string, name: string }[]>([]);
  const [currentPng, setCurrentPng] = useState<{ url: string, name: string } | null>(null);
  const [svgData, setSvgData] = useState<string | null>(null);

  const [inkColor, setInkColor] = useState('#000000');
  const [colorShortcuts, setColorShortcuts] = useState<string[]>(['#000000', '#3b82f6', '#10b981', '#ef4444']);
  const [customPrompt, setCustomPrompt] = useState('A single, minimalist, cute line-drawing icon of a ${itemName}, designed as a physical bullet journal rubber stamp. Thick, clean black outlines on a pure white background.');
  const [promptShortcuts, setPromptShortcuts] = useState<{name: string, prompt: string}[]>([
    { name: 'Stamp', prompt: 'A single, minimalist, cute line-drawing icon of a ${itemName}, designed as a physical bullet journal rubber stamp. Thick, clean black outlines on a pure white background.' },
    { name: 'Sketch', prompt: 'A charcoal sketch of ${itemName}, artistic lines, white background.' }
  ]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence: Load on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('pngHistory');
    const savedColors = localStorage.getItem('colorShortcuts');
    const savedPrompts = localStorage.getItem('promptShortcuts');
    if (savedHistory) setPngHistory(JSON.parse(savedHistory));
    if (savedColors) setColorShortcuts(JSON.parse(savedColors));
    if (savedPrompts) setPromptShortcuts(JSON.parse(savedPrompts));
  }, []);

  // Persistence: Save on changes
  useEffect(() => {
    if (pngHistory.length > 0) {
      localStorage.setItem('pngHistory', JSON.stringify(pngHistory));
    }
  }, [pngHistory]);

  useEffect(() => {
    localStorage.setItem('colorShortcuts', JSON.stringify(colorShortcuts));
  }, [colorShortcuts]);

  useEffect(() => {
    localStorage.setItem('promptShortcuts', JSON.stringify(promptShortcuts));
  }, [promptShortcuts]);

  const addPromptShortcut = () => {
    const name = prompt('Enter a name for this prompt shortcut:');
    if (name) {
      setPromptShortcuts([...promptShortcuts, { name, prompt: customPrompt }]);
    }
  };

  const removePromptShortcut = (idx: number) => {
    setPromptShortcuts(promptShortcuts.filter((_, i) => i !== idx));
  };

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  const addColorShortcut = () => {
    if (!colorShortcuts.includes(inkColor)) {
      setColorShortcuts([...colorShortcuts, inkColor]);
    }
  };

  const removeColorShortcut = (colorToRemove: string) => {
    setColorShortcuts(colorShortcuts.filter(c => c !== colorToRemove));
  };

  const handleDownloadPng = () => {
    if (!svgData) return;

    // Create a colored version of the SVG for the PNG
    let finalSvgData = svgData
      .replace(/fill="black"/g, `fill="${inkColor}"`)
      .replace(/fill="#000000"/g, `fill="${inkColor}"`);

    if (!finalSvgData.includes('fill=')) {
        finalSvgData = finalSvgData.replace(/<path/g, `<path fill="${inkColor}"`);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Use higher resolution for better quality
    canvas.width = 1024;
    canvas.height = 1024;

    const svgBlob = new Blob([finalSvgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${itemName.replace(/\s+/g, '_')}_stamp.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const newImage = { url: imageUrl, name: file.name.replace(/\.[^/.]+$/, "") };
      setPngHistory(prev => [newImage, ...prev]);
      setCurrentPng(newImage);
      setSvgData(null);
      setItemName(newImage.name);
    };
    reader.readAsDataURL(file);
  };

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
        body: JSON.stringify({ itemName, prompt: customPrompt }),
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

    // Replace black fills with the selected ink color for the download
    let finalSvgData = svgData
      .replace(/fill="black"/g, `fill="${inkColor}"`)
      .replace(/fill="#000000"/g, `fill="${inkColor}"`);

    // Ensure it has a fill if it didn't have one
    if (!finalSvgData.includes('fill=')) {
        finalSvgData = finalSvgData.replace(/<path/g, `<path fill="${inkColor}"`);
    }

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
      <div className="glass-panel main-content">
        <header className="header-section">
          <h1 className="title">Stamp Generator</h1>
          <p className="subtitle">
            Generate or upload a PNG to create a pristine vector rubber stamp.
          </p>
        </header>

        <div className="prompt-management">
          <div className="prompt-header">
            <button 
              className="toggle-editor-btn"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
            >
              {showPromptEditor ? 'Hide Prompt Editor' : 'Show Prompt Editor'}
            </button>
            <div className="prompt-shortcuts">
              {promptShortcuts.map((s, idx) => (
                <div key={idx} className="prompt-shortcut-chip">
                  <button 
                    className="chip-load"
                    onClick={() => setCustomPrompt(s.prompt)}
                  >
                    {s.name}
                  </button>
                  <button 
                    className="chip-delete"
                    onClick={() => removePromptShortcut(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {showPromptEditor && (
            <div className="prompt-editor-panel">
              <textarea 
                className="prompt-textarea"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter custom prompt. Use ${itemName} as placeholder..."
              />
              <button className="save-prompt-btn" onClick={addPromptShortcut}>
                Save as Shortcut
              </button>
              <p className="prompt-hint">Tip: <code>{"${itemName}"}</code> will be replaced by the text in the search box.</p>
            </div>
          )}
        </div>

        <div className="input-section">
          <form onSubmit={handleGenerate} className="input-group">
            <input
              type="text"
              className="stamp-input"
              placeholder="Describe your icon (e.g., cute cat)..."
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

          <div className="divider">OR</div>

          <button 
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || isTracing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload PNG
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/png, image/jpeg" 
            style={{ display: 'none' }} 
          />
        </div>

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
                <img src={currentPng.url} alt="Current Source" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div className="canvas-placeholder">
                  1:1 Artboard
                </div>
              )}
            </div>
          </div>

          {/* Controls & Export */}
          <div className="controls-panel">
            {currentPng && !svgData && !isGenerating && (
              <button
                onClick={handleTrace}
                className={`generate-btn ${isTracing ? 'loading' : ''}`}
                style={{ width: '100%', marginBottom: '1rem' }}
                disabled={isTracing}
              >
                {isTracing ? 'Vectorizing...' : '2. Convert to SVG'}
              </button>
            )}

            <div className="control-group">
              <label>Ink Color</label>
              <div className="color-picker-section">
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
                
                <div className="shortcuts-grid">
                  <button 
                    className="add-color-btn" 
                    onClick={addColorShortcut}
                    title="Save current color"
                    disabled={!svgData}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>

                  {colorShortcuts.map((color, idx) => (
                    <div 
                      key={idx} 
                      className={`shortcut-wrapper ${inkColor === color ? 'active' : ''}`}
                    >
                      <button
                        className="shortcut-color-circle"
                        style={{ backgroundColor: color }}
                        onClick={() => setInkColor(color)}
                        disabled={!svgData}
                        title={color}
                      />
                      <button 
                        className="delete-shortcut-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeColorShortcut(color);
                        }}
                        style={{ 
                          backgroundColor: getContrastColor(color),
                          color: color 
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
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

            <div className="export-group">
              <button
                className="export-btn svg"
                onClick={handleDownload}
                disabled={!svgData}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                SVG
              </button>
              <button
                className="export-btn png"
                onClick={handleDownloadPng}
                disabled={!svgData}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                PNG
              </button>
            </div>
          </div>
        </div>

        {/* History Section at the bottom */}
        <footer className="history-section">
          <h2 className="history-title">History</h2>
          <div className="history-grid">
            {pngHistory.length === 0 ? (
              <p className="empty-history">No images yet.</p>
            ) : (
              pngHistory.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectHistory(img)}
                  className={`history-item ${currentPng?.url === img.url ? 'active' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.name} />
                  <span className="history-label">{img.name}</span>
                </div>
              ))
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
