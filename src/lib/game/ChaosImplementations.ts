import Matter from 'matter-js';
import { GameEngine } from './GameEngine';
import { BALL_RADIUS, TABLE_WIDTH, TABLE_HEIGHT } from './constants';
import { ChaosEventType } from './ChaosDirector';

const { Bodies, Body, Vector } = Matter;

export class ChaosImplementations {
  static applyEvent(engine: GameEngine, type: ChaosEventType) {
    switch (type) {
      case 'EXPLOSION':
        this.explosion(engine);
        break;
      case 'HUNDRED_BALL_BREAK':
        this.hundredBallBreak(engine);
        break;
      case 'BOSS_BALL':
        this.bossBall(engine);
        break;
      case 'DRUNK_PHYSICS':
        this.drunkPhysics(engine);
        break;
      case 'BLACK_HOLE':
        this.blackHole(engine);
        break;
      case 'BUMPER_CARS':
        this.bumperCars(engine);
        break;
      case 'MAGNETISM':
        this.magnetism();
        break;
      // GHOST_BALL, PORTAL_POCKETS, MULTIPLY require ongoing logic hooks in GameEngine update loop
      // which we will add next.
    }
  }

  static cleanupEvent(engine: GameEngine, type: ChaosEventType) {
      switch(type) {
          case 'DRUNK_PHYSICS':
          case 'BUMPER_CARS':
              // Restore normal properties
              for(const ball of engine.balls) {
                  Body.set(ball, {
                      restitution: 0.9,
                      friction: 0.001,
                      frictionAir: 0.015
                  });
              }
              engine.engine.gravity.x = 0;
              engine.engine.gravity.y = 0;
              break;
      }
  }

  static explosion(engine: GameEngine) {
    if (engine.balls.length < 2) return;

    // Pick a random ball (not the cue ball if possible) to explode
    const targets = engine.balls.filter(b => b.label !== 'cue');
    if (targets.length === 0) return;

    const bomb = targets[Math.floor(Math.random() * targets.length)];
    const blastRadius = 150;
    const blastForce = 0.05;

    for (const ball of engine.balls) {
      if (ball === bomb) continue;

      const dx = ball.position.x - bomb.position.x;
      const dy = ball.position.y - bomb.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < blastRadius) {
        const forceDirection = Vector.normalise({ x: dx, y: dy });
        const forceMagnitude = blastForce * (1 - distance / blastRadius);
        Body.applyForce(ball, ball.position, {
          x: forceDirection.x * forceMagnitude,
          y: forceDirection.y * forceMagnitude
        });
      }
    }

    // Remove the bomb ball
    engine.removeBall(bomb);
  }

  static hundredBallBreak(engine: GameEngine) {
    for (let i = 0; i < 50; i++) { // Using 50 for performance, still chaotic
      const x = (TABLE_WIDTH / 2) + (Math.random() - 0.5) * 200;
      const y = (TABLE_HEIGHT / 2) + (Math.random() - 0.5) * 200;

      const num = Math.floor(Math.random() * 15) + 1;

      const miniBall = Bodies.circle(x, y, BALL_RADIUS * 0.5, {
        restitution: 1.1, // Bouncy
        friction: 0,
        frictionAir: 0.005,
        label: `ball_${num}_mini`, // Special label for rendering
        density: 0.001
      });

      engine.addBall(miniBall);

      // Give them a random kick
      Body.applyForce(miniBall, miniBall.position, {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01
      });
    }
  }

  static bossBall(engine: GameEngine) {
    const bossBall = Bodies.circle(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, BALL_RADIUS * 4, {
      restitution: 0.5,
      friction: 0.1,
      label: 'ball_8_boss',
      density: 0.05 // Very heavy
    });

    engine.addBall(bossBall);
  }

  static drunkPhysics(engine: GameEngine) {
    // Randomize friction and restitution wildly
    for (const ball of engine.balls) {
      Body.set(ball, {
        restitution: Math.random() * 1.5,
        frictionAir: Math.random() * 0.1
      });
    }

    // Slight random gravity
    engine.engine.gravity.x = (Math.random() - 0.5) * 0.5;
    engine.engine.gravity.y = (Math.random() - 0.5) * 0.5;
  }

  static blackHole(engine: GameEngine) {
      // Find a random pocket and make it a black hole
      const randomPocket = engine.pockets[Math.floor(Math.random() * engine.pockets.length)];
      randomPocket.label = 'pocket_blackhole';
  }

  static bumperCars(engine: GameEngine) {
      for (const ball of engine.balls) {
          Body.set(ball, {
              restitution: 1.5, // Extreme bounce
              frictionAir: 0
          });
      }
  }

  static magnetism() {
      // Applied in update loop
  }
}
