import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, ArrowRight, Sparkles, Terminal, Code2, Layers, Play, Zap } from 'lucide-react';

/**
 * IntroPage — 3D Perspective Illusion Landing Page
 * Inspired by Leonardo.ai's iconic 3D typography room illusion.
 *
 * Surrounds the viewer in warped, perspective-transformed electric-indigo typography:
 * - Ceiling: "V - VISION"
 * - Left Wall: "YOUR CODE" & "DATA STRUCTURES"
 * - Right Wall: "YOUR LOGIC" & "ALGORITHMS"
 * - Floor: "SEE CODE RUN"
 * - Center Focal Point: Headline + "Enter V-Vision" White Pill Button
 * - Dynamic mouse parallax tracking for interactive 3D spatial illusion
 */
export default function IntroPage({ onEnter }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isEntering, setIsEntering] = useState(false);
  const containerRef = useRef(null);

  // Mouse move handler for interactive 3D tilt
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      // Normalized between -1 and 1
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLaunch = () => {
    setIsEntering(true);
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  // Subtle 3D tilt values derived from cursor
  const tiltX = mousePos.y * -8;
  const tiltY = mousePos.x * 12;

  return (
    <motion.div
      ref={containerRef}
      className="intro-viewport"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.15, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Header Navbar */}
      <header className="intro-navbar">
        <div className="intro-nav-left">
          <div className="intro-logo">
            <div className="intro-logo-icon">
              <Cpu size={18} />
            </div>
            <span className="intro-logo-text">V-VISION</span>
            <span className="intro-logo-badge">v2.0 PRO</span>
          </div>
        </div>

        <nav className="intro-nav-links">
          <span className="intro-nav-link">Live Execution</span>
          <span className="intro-nav-link">Data Structures</span>
          <span className="intro-nav-link">Recursion Trees</span>
          <span className="intro-nav-link">Memory & Pointers</span>
        </nav>

        <div className="intro-nav-right">
          <button className="intro-nav-btn" onClick={handleLaunch}>
            <span>Enter App</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* 3D Perspective Illusion Room */}
      <div
        className="intro-3d-scene"
        style={{
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
        }}
      >
        {/* Background Grid Lines & Tunnel Lights */}
        <div className="intro-depth-glow" />
        <div className="intro-tunnel-grid" />

        {/* ── TOP / CEILING WALL ─────────────────────────────── */}
        <div className="wall-section wall-top">
          <div className="wall-typo typo-top">
            <span className="typo-word-stretch">V - VISION</span>
          </div>
        </div>

        {/* ── LEFT PERSPECTIVE WALL ──────────────────────────── */}
        <div className="wall-section wall-left">
          <div className="wall-typo typo-left">
            <div className="typo-stack">
              <span className="typo-huge">YOUR</span>
              <span className="typo-huge typo-emphasis">CODE</span>
              <span className="typo-sub-block">DATA STRUCTURES</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PERSPECTIVE WALL ─────────────────────────── */}
        <div className="wall-section wall-right">
          <div className="wall-typo typo-right">
            <div className="typo-stack">
              <span className="typo-huge">YOUR</span>
              <span className="typo-huge typo-emphasis">LOGIC</span>
              <span className="typo-sub-block">REAL ALGORITHMS</span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM / FLOOR WALL ────────────────────────────── */}
        <div className="wall-section wall-bottom">
          <div className="wall-typo typo-bottom">
            <span className="typo-floor-text">SEE CODE RUN</span>
          </div>
        </div>

        {/* ── CENTER FOCAL HERO BLOCK ────────────────────────── */}
        <motion.div
          className="intro-center-hero"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Tech badge */}
          <div className="intro-hero-badge">
            <Zap size={13} className="hero-badge-icon" />
            <span>REAL-TIME GCC & GDB EXECUTION ENGINE</span>
          </div>

          {/* Main Title matching Leonardo.ai center headline */}
          <h1 className="intro-hero-title">
            THE NEXT-GEN C CODE
            <br />
            EXECUTION & VISUALIZATION PLATFORM
          </h1>

          <p className="intro-hero-sub">
            Observe real pointers cross, vertical stacks push & pop, FIFO queues convey,
            and recursion trees unfold dynamically with true hardware memory fidelity.
          </p>

          {/* Center Call to Action Button (Single Clean CTA) */}
          <div className="intro-cta-row">
            <button
              id="intro-enter-btn"
              className={`intro-btn-primary ${isEntering ? 'launching' : ''}`}
              onClick={handleLaunch}
            >
              <span>{isEntering ? 'Launching...' : 'Enter V-Vision'}</span>
              <ArrowRight size={17} className="btn-arrow" />
            </button>
          </div>

          {/* Feature chips */}
          <div className="intro-feature-strip">
            <span className="feature-item"><span className="feature-dot" /> Arrays & Pointers</span>
            <span className="feature-item"><span className="feature-dot" /> LIFO Stacks</span>
            <span className="feature-item"><span className="feature-dot" /> FIFO Queues</span>
            <span className="feature-item"><span className="feature-dot" /> Recursive Trees</span>
            <span className="feature-item"><span className="feature-dot" /> Dynamic Heap</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
