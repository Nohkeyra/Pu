import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  speedY: number;
  speedX: number;
  amplitude: number;
  frequency: number;
  phase: number;
  opacity: number;
  life: number;
  maxLife: number;
}

// Updated for bright tropical palette
const PARTICLE_COLORS = [
  'rgba(255, 202, 38, ',    // sunshine yellow
  'rgba(248, 96, 21, ',     // crisp carrot orange
  'rgba(154, 188, 4, ',     // kiwi green
  'rgba(212, 37, 24, ',     // tomato burst red
  'rgba(243, 232, 204, ',   // cream (subtle)
];

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxParticles = isMobile ? 30 : 50; // Reduced for light theme subtlety

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => {
      const colorIdx = Math.floor(Math.random() * PARTICLE_COLORS.length);
      const life = Math.random() * 200 + 100;
      return {
        x: Math.random() * width,
        y: height + Math.random() * 50,
        radius: Math.random() * 2 + 1,
        color: PARTICLE_COLORS[colorIdx],
        speedY: -(Math.random() * 0.5 + 0.2),
        speedX: (Math.random() - 0.5) * 0.3,
        amplitude: Math.random() * 40 + 20,
        frequency: Math.random() * 0.002 + 0.001,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.3 + 0.2,
        life: 0,
        maxLife: life,
      };
    };

    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particlesRef.current.push(p);
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;
      lastTime = currentTime;

      // Delta time calculation relative to a standard 60 FPS (16.67ms frame duration)
      // Cap at 4.0 to prevent massive leaps when returning to a backgrounded tab
      const dt = Math.min(elapsed / 16.67, 4.0);

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((p) => {
        p.life += dt;
        p.x += (p.speedX + Math.sin(p.life * p.frequency + p.phase) * 0.3) * dt;
        p.y += p.speedY * dt;

        if (p.life > p.maxLife || p.y < -50) {
          Object.assign(p, createParticle());
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * p.opacity;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha + ')';
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      particlesRef.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  );
}
