'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/GameEngine';
import { Renderer } from '@/lib/game/Renderer';
import { ChaosDirector } from '@/lib/game/ChaosDirector';
import { ChaosImplementations } from '@/lib/game/ChaosImplementations';
import { TABLE_WIDTH, TABLE_HEIGHT } from '@/lib/game/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function PoolTable() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const directorRef = useRef<ChaosDirector>(new ChaosDirector());
  const requestRef = useRef<number>();

  const [chaosState, setChaosState] = useState(directorRef.current.state);

  // Use refs for aiming state to avoid triggering re-renders that reset the game engine
  const isAimingRef = useRef(false);
  const aimStartRef = useRef({ x: 0, y: 0 });
  const aimCurrentRef = useRef({ x: 0, y: 0 });

  // To handle cleanup and transitions
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new Renderer(ctx);

    engineRef.current = new GameEngine(() => {
      // On ball sunk
      directorRef.current.registerBallSunk();
      setChaosState({ ...directorRef.current.state });
    });

    const render = () => {
      if (!engineRef.current || !rendererRef.current || !canvasRef.current) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // Update Physics
      engineRef.current.update(directorRef.current.state.currentEvent);

      // Render
      ctx.clearRect(0, 0, width, height);
      rendererRef.current.drawTable(width, height);
      rendererRef.current.drawPockets(width, height, engineRef.current.pockets);

      // Draw balls
      // Adjust coordinates based on table centering
      const offsetX = (width - TABLE_WIDTH) / 2;
      const offsetY = (height - TABLE_HEIGHT) / 2;

      for (const ball of engineRef.current.balls) {
        rendererRef.current.drawBall(
          ball.position.x + offsetX,
          ball.position.y + offsetY,
          ball.angle,
          ball.id,
          ball.label
        );
      }

      // Draw Aiming Line
      if (isAimingRef.current && engineRef.current.cueBall) {
        ctx.beginPath();
        ctx.moveTo(engineRef.current.cueBall.position.x + offsetX, engineRef.current.cueBall.position.y + offsetY);

        // Direction is reversed because we pull back to shoot
        const dx = aimStartRef.current.x - aimCurrentRef.current.x;
        const dy = aimStartRef.current.y - aimCurrentRef.current.y;

        ctx.lineTo(
          engineRef.current.cueBall.position.x + offsetX + dx,
          engineRef.current.cueBall.position.y + offsetY + dy
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dependency array ensures this only runs once on mount

  const handlePointerDown = (e: React.PointerEvent) => {
    isAimingRef.current = true;
    aimStartRef.current = { x: e.clientX, y: e.clientY };
    aimCurrentRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isAimingRef.current) return;
    aimCurrentRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isAimingRef.current || !engineRef.current) return;
    isAimingRef.current = false;

    const dx = aimStartRef.current.x - e.clientX;
    const dy = aimStartRef.current.y - e.clientY;

    // Scale down the force visually vs physics
    const forceX = dx * 0.0001;
    const forceY = dy * 0.0001;

    // Only shoot if there was actual drag
    if (Math.abs(forceX) > 0.001 || Math.abs(forceY) > 0.001) {
        engineRef.current.shoot(forceX, forceY);

        // Check for chaos trigger
        const previousEvent = directorRef.current.state.currentEvent;
        if (previousEvent !== 'NONE') {
            ChaosImplementations.cleanupEvent(engineRef.current, previousEvent);
            directorRef.current.clearEvent();
        }

        const newEvent = directorRef.current.registerShot();
        setChaosState({ ...directorRef.current.state });

        if (newEvent !== 'NONE') {
            triggerVisualJuice();
            ChaosImplementations.applyEvent(engineRef.current, newEvent);
        }
    }
  };

  const triggerVisualJuice = () => {
      setShake(true);
      setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-gray-900 overflow-hidden">

      {/* Chaos UI Overlay */}
      <AnimatePresence>
        {chaosState.message && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute top-10 z-50 pointer-events-none"
          >
            <div className="bg-red-600/90 text-white px-8 py-4 rounded-xl border-4 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.6)] font-mono uppercase tracking-widest text-2xl animate-pulse text-center">
              {chaosState.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 text-white/50 font-mono text-sm pointer-events-none">
          Shots: {chaosState.shotsTaken} | Anomaly Probability: {(chaosState.probability * 100).toFixed(0)}%
      </div>

      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0], y: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <canvas
            ref={canvasRef}
            width={1000}
            height={600}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-crosshair shadow-2xl rounded-2xl touch-none"
            style={{
                boxShadow: chaosState.currentEvent !== 'NONE'
                    ? '0 0 100px rgba(220, 38, 38, 0.2)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
        />
      </motion.div>

      <div className="absolute bottom-10 text-gray-500 font-mono pointer-events-none">
          Drag to shoot. A perfectly normal game of pool.
      </div>
    </div>
  );
}
