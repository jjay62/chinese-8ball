export type ChaosEventType =
  | 'NONE'
  | 'EXPLOSION'
  | 'HUNDRED_BALL_BREAK'
  | 'BOSS_BALL'
  | 'DRUNK_PHYSICS'
  | 'BLACK_HOLE'
  | 'GHOST_BALL'
  | 'PORTAL_POCKETS'
  | 'MULTIPLY'
  | 'BUMPER_CARS'
  | 'MAGNETISM';

export interface ChaosState {
  probability: number;
  currentEvent: ChaosEventType;
  message: string | null;
  shotsTaken: number;
}

export class ChaosDirector {
  public state: ChaosState;

  private events: { type: ChaosEventType, message: string, weight: number }[] = [
    { type: 'EXPLOSION', message: 'ANOMALY: EXPLOSION DETECTED', weight: 10 },
    { type: 'HUNDRED_BALL_BREAK', message: 'ANOMALY: MASS REPLICATION', weight: 5 },
    { type: 'BOSS_BALL', message: 'WARNING: MASSIVE ENTITY DETECTED', weight: 8 },
    { type: 'DRUNK_PHYSICS', message: 'ANOMALY: FRICTION COEFFICIENT COMPROMISED', weight: 12 },
    { type: 'BLACK_HOLE', message: 'WARNING: GRAVITATIONAL SINGULARITY', weight: 7 },
    { type: 'GHOST_BALL', message: 'ANOMALY: QUANTUM TUNNELING ENABLED', weight: 10 },
    { type: 'PORTAL_POCKETS', message: 'ANOMALY: SPATIAL RIFT OPENED', weight: 8 },
    { type: 'MULTIPLY', message: 'WARNING: MITOSIS ENGAGED', weight: 9 },
    { type: 'BUMPER_CARS', message: 'ANOMALY: RESTITUTION OVERLOAD', weight: 11 },
    { type: 'MAGNETISM', message: 'WARNING: ELECTROMAGNETIC FIELD FLUCTUATION', weight: 10 },
  ];

  constructor() {
    this.state = {
      probability: 0,
      currentEvent: 'NONE',
      message: null,
      shotsTaken: 0,
    };
  }

  public registerShot(): ChaosEventType {
    this.state.shotsTaken++;
    // Probability increases with each shot, starts low, gets very high later
    this.state.probability += (this.state.shotsTaken * 0.02) + 0.05;

    // Hard cap at 90% so it's never 100% guaranteed immediately
    if (this.state.probability > 0.9) this.state.probability = 0.9;

    const roll = Math.random();
    if (roll < this.state.probability) {
      return this.triggerChaos();
    }

    return 'NONE';
  }

  public registerBallSunk(): ChaosEventType {
    // Sinking a ball adds a small spike to chaos probability for the next shot
    this.state.probability += 0.05;
    return 'NONE'; // Usually we don't trigger mid-shot unless it's a specific event, but we increase tension
  }

  private triggerChaos(): ChaosEventType {
    // Select an event based on weights
    const totalWeight = this.events.reduce((sum, e) => sum + e.weight, 0);
    let randomValue = Math.random() * totalWeight;

    let selectedEvent = this.events[0];
    for (const event of this.events) {
      randomValue -= event.weight;
      if (randomValue <= 0) {
        selectedEvent = event;
        break;
      }
    }

    this.state.currentEvent = selectedEvent.type;
    this.state.message = selectedEvent.message;

    // Reset probability after an event, but keep a base level based on shots taken so it stays chaotic
    this.state.probability = Math.min(0.2, this.state.shotsTaken * 0.01);

    return this.state.currentEvent;
  }

  public clearEvent() {
      this.state.currentEvent = 'NONE';
      this.state.message = null;
  }
}