import { useEffect, useRef } from 'react';

interface NodePoint {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  depth: number;
  vx: number;
  vy: number;
  isAccent?: boolean;
  label?: string;
}

export default function ArchitecturalScrollCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;
    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Generate geodetic spatial survey nodes
    const NODE_COUNT = Math.min(36, Math.floor(width / 45));
    const nodes: NodePoint[] = [];

    const labels = [
      'GEOFENCE_01',
      'LAT_28.6010',
      'LNG_77.2990',
      'EVID_CORP',
      'SSIM_DELTA',
      'VECTOR_RAG',
      'PROV_SIGNED',
      'NODE_0x8C',
    ];

    for (let i = 0; i < NODE_COUNT; i++) {
      const baseX = Math.random() * width;
      const baseY = Math.random() * height * 3; // spread across scroll depth
      nodes.push({
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        depth: 0.2 + Math.random() * 0.8, // parallax layer depth
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        isAccent: Math.random() < 0.15,
        label: Math.random() < 0.25 ? labels[i % labels.length] : undefined,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth scroll lerp (damping)
      const prevScroll = scrollY;
      scrollY += (targetScrollY - scrollY) * 0.08;
      scrollVelocity = (scrollY - prevScroll) * 0.5 + (scrollY - lastScrollY) * 0.5;
      lastScrollY = scrollY;

      ctx.clearRect(0, 0, width, height);

      const gridSize = 64;
      const gridOffsetY = (scrollY * 0.2) % gridSize;
      const gridOffsetX = 0;

      // 1. Draw subtle parallax grid crosshairs (+) with dynamic velocity stretch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;

      const crossSize = 3;
      const vStretch = Math.min(5, Math.abs(scrollVelocity) * 0.3);

      for (let x = gridOffsetX; x < width; x += gridSize) {
        for (let y = -gridOffsetY; y < height + gridSize; y += gridSize) {
          // Crosshair +
          ctx.beginPath();
          ctx.moveTo(x - crossSize, y);
          ctx.lineTo(x + crossSize, y);
          ctx.moveTo(x, y - (crossSize + vStretch));
          ctx.lineTo(x, y + (crossSize + vStretch));
          ctx.stroke();
        }
      }

      // 2. Draw active scanning LiDAR telemetry horizontal line
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = pageHeight > 0 ? scrollY / pageHeight : 0;
      const scanY = (scrollProgress * height) % height;

      // Scanning line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 106, 0, 0.18)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // Scan HUD Marker on the right
      ctx.fillStyle = '#ff6a00';
      ctx.font = '9px monospace';
      ctx.fillText(`SCAN // ${(scrollProgress * 100).toFixed(1)}%`, width - 90, scanY - 6);

      ctx.beginPath();
      ctx.arc(width - 96, scanY - 9, 2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Render and connect Spatial Survey Nodes with parallax
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Drift slowly
        node.baseX += node.vx;
        node.baseY += node.vy;

        // Wrap around boundaries
        if (node.baseX < 0) node.baseX = width;
        if (node.baseX > width) node.baseX = 0;
        if (node.baseY < 0) node.baseY = height * 3;
        if (node.baseY > height * 3) node.baseY = 0;

        // Compute screen position based on scroll parallax
        const screenY = ((node.baseY - scrollY * node.depth) % (height + 120)) - 60;
        const screenX = node.baseX;

        // Proximity to mouse
        const dx = mouseX - screenX;
        const dy = mouseY - screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let shiftX = 0;
        let shiftY = 0;
        if (dist < 180 && dist > 0) {
          const force = (1 - dist / 180) * 15;
          shiftX = -(dx / dist) * force;
          shiftY = -(dy / dist) * force;
        }

        const renderX = screenX + shiftX;
        const renderY = screenY + shiftY;

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const otherScreenY = ((other.baseY - scrollY * other.depth) % (height + 120)) - 60;
          const otherScreenX = other.baseX;

          const ndx = renderX - otherScreenX;
          const ndy = renderY - otherScreenY;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);

          if (nDist < 140) {
            const alpha = (1 - nDist / 140) * 0.05 * node.depth;
            ctx.beginPath();
            ctx.strokeStyle = node.isAccent || other.isAccent
              ? `rgba(255, 106, 0, ${alpha * 2})`
              : `rgba(255, 255, 255, ${alpha})`;
            ctx.moveTo(renderX, renderY);
            ctx.lineTo(otherScreenX, otherScreenY);
            ctx.stroke();
          }
        }

        // Draw node pip
        ctx.beginPath();
        if (node.isAccent) {
          ctx.fillStyle = '#ff6a00';
          ctx.arc(renderX, renderY, 2, 0, Math.PI * 2);
          ctx.fill();

          // Outer pulse ring
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 106, 0, 0.25)';
          ctx.arc(renderX, renderY, 4 + Math.sin(time * 3 + i) * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.arc(renderX, renderY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw subtle node coordinate label
        if (node.label && screenY > 40 && screenY < height - 40) {
          ctx.fillStyle = node.isAccent ? 'rgba(255, 106, 0, 0.6)' : 'rgba(255, 255, 255, 0.18)';
          ctx.font = '8px monospace';
          ctx.fillText(node.label, renderX + 6, renderY + 3);
        }
      }

      // 4. Draw subtle vertical coordinate axis ruler on right edge
      const rulerX = width - 16;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(rulerX, 0);
      ctx.lineTo(rulerX, height);
      ctx.stroke();

      const tickStep = 40;
      const tickOffsetY = (scrollY * 0.5) % tickStep;
      for (let y = -tickOffsetY; y < height; y += tickStep) {
        ctx.beginPath();
        ctx.moveTo(rulerX - 3, y);
        ctx.lineTo(rulerX, y);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
    />
  );
}
