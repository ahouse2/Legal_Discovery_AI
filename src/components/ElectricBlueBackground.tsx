import { useEffect, useRef } from 'react';

export default function ElectricBlueBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    interface Line {
      x: number;
      y: number;
      h: number;
      w: number;
      speed: number;
      opacity: number;
      maxOpacity: number;
      flickerRate: number;
      color: string;
    }

    const lines: Line[] = [];
    const numLines = 100;
    const colors = [
      '#00ffff', // Cyan
      '#00bfff', // Deep Sky Blue
      '#1e90ff', // Dodger Blue
      '#00ced1', // Dark Turquoise
      '#e0ffff', // Light Cyan
    ];

    // Initialize lines
    for (let i = 0; i < numLines; i++) {
      lines.push({
        x: Math.random() * width,
        y: Math.random() * height,
        h: Math.random() * 500 + 100, // Taller lines
        w: Math.random() * 5 + 1, // Slightly wider range
        speed: (Math.random() - 0.5) * 0.5, // Slow vertical movement
        opacity: Math.random(),
        maxOpacity: Math.random() * 0.5 + 0.2,
        flickerRate: Math.random() * 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trail effect
      ctx.fillRect(0, 0, width, height);

      lines.forEach(line => {
        // Update
        line.y += line.speed;
        if (line.y > height) line.y = -line.h;
        if (line.y < -line.h) line.y = height;

        // Flicker
        if (Math.random() < line.flickerRate) {
          line.opacity = Math.random() * line.maxOpacity;
        }

        // Draw
        ctx.fillStyle = line.color;
        ctx.globalAlpha = line.opacity;
        ctx.shadowBlur = 15;
        ctx.shadowColor = line.color;
        
        // Draw the main line
        ctx.fillRect(line.x, line.y, line.w, line.h);

        // Occasional "glitch" horizontal offset
        if (Math.random() > 0.99) {
           ctx.fillRect(line.x + (Math.random() * 10 - 5), line.y, line.w, line.h);
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
