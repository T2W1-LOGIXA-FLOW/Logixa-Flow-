'use client';

import React, { useRef, useEffect, useState } from 'react';

interface Port {
  name: string;
  x: number; // 0-1 (percent of width)
  y: number; // 0-1 (percent of height)
  volume: string;
}

interface Tooltip {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

const WorldTradeRoutesCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({ visible: false, text: '', x: 0, y: 0 });

  // Define major ports
  const ports: Port[] = [
    { name: 'Singapore', x: 0.65, y: 0.65, volume: '37M TEU' },
    { name: 'Shanghai', x: 0.72, y: 0.45, volume: '43M TEU' },
    { name: 'Rotterdam', x: 0.35, y: 0.35, volume: '15M TEU' },
    { name: 'Los Angeles', x: 0.12, y: 0.40, volume: '10M TEU' },
    { name: 'Dubai', x: 0.42, y: 0.60, volume: '21M TEU' },
    { name: 'Yangon', x: 0.60, y: 0.60, volume: '5M TEU' },
  ];

  // Define trade routes as arrays of [x, y] normalized coordinates
  const tradeRoutes = [
    // Asia → Europe (via Suez)
    [
      [0.72, 0.45], // Shanghai
      [0.65, 0.60], // Singapore
      [0.42, 0.60], // Dubai
      [0.35, 0.35], // Rotterdam
    ],
    // Asia → North America (transpacific)
    [
      [0.72, 0.45], // Shanghai
      [0.42, 0.42], // Midpoint
      [0.12, 0.40], // Los Angeles
    ],
    // Europe → North America (transatlantic)
    [
      [0.35, 0.35], // Rotterdam
      [0.24, 0.32], // Midpoint
      [0.12, 0.40], // Los Angeles
    ],
    // Southeast Asia → China
    [
      [0.65, 0.60], // Singapore
      [0.72, 0.45], // Shanghai
    ],
  ];

  const drawMap = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle background grid (light grid)
    ctx.strokeStyle = 'rgba(0, 163, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSpacing = 50;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw continents (simplified polygons)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    drawContinents(ctx, width, height);

    // Draw trade routes
    drawTradeRoutes(ctx, width, height);

    // Draw ports
    drawPorts(ctx, width, height);

    // Draw border
    ctx.strokeStyle = 'rgba(0, 163, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  };

  const drawContinents = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Simple continent outlines (North America, Europe, Asia, Africa)
    // North America
    ctx.fillRect(width * 0.05, height * 0.25, width * 0.15, height * 0.35);
    // Europe
    ctx.fillRect(width * 0.30, height * 0.20, width * 0.10, height * 0.25);
    // Asia
    ctx.fillRect(width * 0.50, height * 0.20, width * 0.35, height * 0.50);
    // Africa
    ctx.fillRect(width * 0.35, height * 0.45, width * 0.12, height * 0.40);
  };

  const drawTradeRoutes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    tradeRoutes.forEach((route, idx) => {
      // Alternate cyan and orange
      const isOrange = idx % 2 === 0;
      ctx.strokeStyle = isOrange ? 'rgba(249, 115, 22, 0.4)' : 'rgba(0, 163, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      route.forEach((point, i) => {
        const x = point[0] * width;
        const y = point[1] * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
  };

  const drawPorts = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ports.forEach((port) => {
      const x = port.x * width;
      const y = port.y * height;
      const radius = 5;

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      gradient.addColorStop(0, 'rgba(0, 163, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 163, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw main dot (cyan)
      ctx.fillStyle = '#00A3FF';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const getPortAtMouse = (clientX: number, clientY: number): Port | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const port of ports) {
      const portX = port.x * canvas.width;
      const portY = port.y * canvas.height;
      const distance = Math.sqrt((x - portX) ** 2 + (y - portY) ** 2);
      if (distance <= 15) {
        return port;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const port = getPortAtMouse(e.clientX, e.clientY);
    if (port) {
      setTooltip({
        visible: true,
        text: `${port.name}\n${port.volume}`,
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      setTooltip({ visible: false, text: '', x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      const height = window.innerWidth < 768 ? 200 : 300;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawMap(canvas, ctx);
      }
    };

    // Initial render
    handleResize();

    // Resize listener with debounce
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
    // drawMap is stable for this canvas lifecycle; adding it retriggers resize redraw loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="section-shell py-20">
      <div className="space-y-6">
        <div className="section-heading mb-12">
          <p className="eyebrow">GLOBAL LOGISTICS</p>
          <h2 className="text-3xl font-bold">Global Trade Network</h2>
          <p className="hero-body max-w-3xl mt-4">
            Visualize major shipping routes, port hubs, and trade corridors connecting Asia, Europe, and North America. Real‑time monitoring of global supply chain flows.
          </p>
        </div>

        <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden border border-[rgba(0,163,255,0.3)] pb-6 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full block bg-gradient-to-b from-slate-900 to-slate-950"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {tooltip.visible && (
            <div
              className="fixed bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-pre-wrap"
              style={{
                left: `${tooltip.x + 10}px`,
                top: `${tooltip.y + 10}px`,
                zIndex: 50,
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00A3FF]" />
            <span className="text-muted-foreground">Port Hubs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[rgba(0,163,255,0.4)]" />
            <span className="text-muted-foreground">Main Routes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[rgba(249,115,22,0.4)]" />
            <span className="text-muted-foreground">Alt Routes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldTradeRoutesCanvas;
