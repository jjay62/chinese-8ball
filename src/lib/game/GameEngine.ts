import Matter from 'matter-js';
import { TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH, POCKET_RADIUS, BALL_RADIUS } from './constants';

const { Engine, World, Bodies, Composite, Events } = Matter;

export class GameEngine {
  public engine: Matter.Engine;
  public balls: Matter.Body[] = [];
  public cueBall: Matter.Body | null = null;
  public pockets: Matter.Body[] = [];

  private onBallSunk: (label: string) => void;

  constructor(onBallSunk: (label: string) => void) {
    this.engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 }, // Top-down view
    });
    this.onBallSunk = onBallSunk;

    this.setupTable();
    this.setupBalls();
    this.setupCollisionEvents();
  }

  private setupTable() {
    const cushions = [
      // Top
      Bodies.rectangle(TABLE_WIDTH / 2, -CUSHION_WIDTH / 2, TABLE_WIDTH, CUSHION_WIDTH, { isStatic: true, restitution: 0.9, friction: 0 }),
      // Bottom
      Bodies.rectangle(TABLE_WIDTH / 2, TABLE_HEIGHT + CUSHION_WIDTH / 2, TABLE_WIDTH, CUSHION_WIDTH, { isStatic: true, restitution: 0.9, friction: 0 }),
      // Left
      Bodies.rectangle(-CUSHION_WIDTH / 2, TABLE_HEIGHT / 2, CUSHION_WIDTH, TABLE_HEIGHT, { isStatic: true, restitution: 0.9, friction: 0 }),
      // Right
      Bodies.rectangle(TABLE_WIDTH + CUSHION_WIDTH / 2, TABLE_HEIGHT / 2, CUSHION_WIDTH, TABLE_HEIGHT, { isStatic: true, restitution: 0.9, friction: 0 }),
    ];

    const pocketPositions = [
      { x: 0, y: 0 },
      { x: TABLE_WIDTH / 2, y: -10 },
      { x: TABLE_WIDTH, y: 0 },
      { x: 0, y: TABLE_HEIGHT },
      { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 10 },
      { x: TABLE_WIDTH, y: TABLE_HEIGHT },
    ];

    this.pockets = pocketPositions.map(pos =>
      Bodies.circle(pos.x, pos.y, POCKET_RADIUS, {
        isSensor: true,
        isStatic: true,
        label: 'pocket'
      })
    );

    World.add(this.engine.world, [...cushions, ...this.pockets]);
  }

  private setupBalls() {
    // 15 balls triangle formation
    const startX = TABLE_WIDTH * 0.7;
    const startY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2.1;

    // Simple rack logic for normal 8 ball: 1 at front, 8 in middle, mixed stripes/solids
    const rackOrder = [
      1,
      9, 2,
      10, 8, 3,
      11, 4, 12, 13,
      5, 14, 6, 15, 7
    ];
    let rackIndex = 0;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = startX + row * spacing * 0.866; // sqrt(3)/2
        const y = startY + (col - row / 2) * spacing;

        const ball = Bodies.circle(x, y, BALL_RADIUS, {
          restitution: 0.9,
          friction: 0.001,
          frictionAir: 0.015,
          label: `ball_${rackOrder[rackIndex]}`,
          density: 0.005
        });

        this.balls.push(ball);
        rackIndex++;
      }
    }

    // Cue ball
    this.cueBall = Bodies.circle(TABLE_WIDTH * 0.25, TABLE_HEIGHT / 2, BALL_RADIUS, {
      restitution: 0.9,
      friction: 0.001,
      frictionAir: 0.015,
      label: 'cue',
      density: 0.005
    });
    this.balls.push(this.cueBall);

    World.add(this.engine.world, this.balls);
  }

  private setupCollisionEvents() {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;

        const isPocketA = bodyA.label === 'pocket';
        const isPocketB = bodyB.label === 'pocket';
        const isBallA = bodyA.label.startsWith('ball_') || bodyA.label === 'cue';
        const isBallB = bodyB.label.startsWith('ball_') || bodyB.label === 'cue';

        if (isPocketA && isBallB) {
          this.handleBallSunk(bodyB);
        } else if (isPocketB && isBallA) {
          this.handleBallSunk(bodyA);
        }
      }
    });
  }

  public addBall(ball: Matter.Body) {
      this.balls.push(ball);
      World.add(this.engine.world, ball);
  }

  public removeBall(ball: Matter.Body) {
      Composite.remove(this.engine.world, ball);
      this.balls = this.balls.filter(b => b.id !== ball.id);
  }

  private handleBallSunk(ball: Matter.Body) {
    if (!this.balls.includes(ball)) return; // Already processed

    // Remove from world
    this.removeBall(ball);

    this.onBallSunk(ball.label);

    if (ball.label === 'cue') {
      // Simple respawn for cue ball for now
      setTimeout(() => {
        this.cueBall = Bodies.circle(TABLE_WIDTH * 0.25, TABLE_HEIGHT / 2, BALL_RADIUS, {
          restitution: 0.9,
          friction: 0.001,
          frictionAir: 0.015,
          label: 'cue',
          density: 0.005
        });
        this.balls.push(this.cueBall);
        World.add(this.engine.world, this.cueBall);
      }, 1000);
    }
  }

  public shoot(forceX: number, forceY: number) {
    if (this.cueBall) {
      Matter.Body.applyForce(this.cueBall, this.cueBall.position, { x: forceX, y: forceY });
    }
  }

  public update(currentChaosEvent?: string) {
    Engine.update(this.engine, 1000 / 60);

    if (currentChaosEvent) {
        this.applyOngoingChaos(currentChaosEvent);
    }
  }

  private applyOngoingChaos(currentEvent: string) {
      if (currentEvent === 'MAGNETISM') {
          // Attract stripes to stripes, solids to solids
          for (let i = 0; i < this.balls.length; i++) {
              for (let j = i + 1; j < this.balls.length; j++) {
                  const b1 = this.balls[i];
                  const b2 = this.balls[j];

                  if (b1.label === 'cue' || b2.label === 'cue') continue;

                  const getNum = (label: string) => parseInt(label.replace('ball_', '').replace('_mini', '').replace('_boss', ''));
                  const n1 = getNum(b1.label);
                  const n2 = getNum(b2.label);

                  if (isNaN(n1) || isNaN(n2)) continue;

                  const isStripe1 = n1 > 8;
                  const isStripe2 = n2 > 8;

                  if (isStripe1 === isStripe2) {
                      const dx = b2.position.x - b1.position.x;
                      const dy = b2.position.y - b1.position.y;
                      const distSq = dx*dx + dy*dy;

                      if (distSq < 40000 && distSq > 100) { // Limit range and avoid divide by zero
                          const force = 0.0005 / distSq;
                          const dir = Matter.Vector.normalise({x: dx, y: dy});
                          Matter.Body.applyForce(b1, b1.position, {x: dir.x * force, y: dir.y * force});
                          Matter.Body.applyForce(b2, b2.position, {x: -dir.x * force, y: -dir.y * force});
                      }
                  }
              }
          }
      } else if (currentEvent === 'BLACK_HOLE') {
          const blackHole = this.pockets.find(p => p.label === 'pocket_blackhole');
          if (blackHole) {
              for (const ball of this.balls) {
                  const dx = blackHole.position.x - ball.position.x;
                  const dy = blackHole.position.y - ball.position.y;
                  const distSq = dx*dx + dy*dy;
                  if (distSq < 90000) { // Radius of effect
                      const force = 0.05 / distSq; // Strong pull
                      const dir = Matter.Vector.normalise({x: dx, y: dy});
                      Matter.Body.applyForce(ball, ball.position, {x: dir.x * force * ball.mass, y: dir.y * force * ball.mass});
                  }
              }
          }
      }
  }
}
