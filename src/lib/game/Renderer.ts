import { TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH, BALL_RADIUS, BALL_COLORS } from './constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public drawTable(width: number, height: number) {
    const { ctx } = this;

    // Clear background
    ctx.fillStyle = '#111827'; // Dark background outside table
    ctx.fillRect(0, 0, width, height);

    // Center the table
    const x = (width - TABLE_WIDTH) / 2;
    const y = (height - TABLE_HEIGHT) / 2;

    // Wood Trim
    ctx.fillStyle = '#451a03'; // Dark brown
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    ctx.fillRect(
      x - CUSHION_WIDTH,
      y - CUSHION_WIDTH,
      TABLE_WIDTH + CUSHION_WIDTH * 2,
      TABLE_HEIGHT + CUSHION_WIDTH * 2
    );

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Green Felt
    const gradient = ctx.createLinearGradient(x, y, x + TABLE_WIDTH, y + TABLE_HEIGHT);
    gradient.addColorStop(0, '#065f46');
    gradient.addColorStop(1, '#064e3b');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, TABLE_WIDTH, TABLE_HEIGHT);
  }

  public drawPockets(width: number, height: number, pockets: Matter.Body[]) {
    const { ctx } = this;

    // Center the table offset
    const offsetX = (width - TABLE_WIDTH) / 2;
    const offsetY = (height - TABLE_HEIGHT) / 2;

    ctx.fillStyle = '#0a0a0a';
    for (const pocket of pockets) {
      ctx.beginPath();
      ctx.arc(
        pocket.position.x + offsetX,
        pocket.position.y + offsetY,
        pocket.circleRadius!,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Inner shadow/gradient for depth
      const grad = ctx.createRadialGradient(
        pocket.position.x + offsetX,
        pocket.position.y + offsetY,
        pocket.circleRadius! * 0.5,
        pocket.position.x + offsetX,
        pocket.position.y + offsetY,
        pocket.circleRadius!
      );
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  public drawBall(x: number, y: number, angle: number, id: number, label: string) {
    const { ctx } = this;
    const radius = BALL_RADIUS;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Ball shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const numLabel = parseInt(label.replace('ball_', ''));
    const isStripe = numLabel > 8;
    const isCue = label === 'cue';

    // Base color
    let color = '#ffffff';
    if (!isCue) {
      color = BALL_COLORS[numLabel as keyof typeof BALL_COLORS];
    }

    if (isStripe) {
      // Base white
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Stripe
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.clip(); // Clip to circle bounds

      ctx.fillStyle = color;
      ctx.fillRect(-radius, -radius * 0.5, radius * 2, radius);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Reset shadow before drawing number/details
    ctx.shadowColor = 'transparent';

    // White circle for number
    if (!isCue) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Number
      ctx.translate(0, 0); // Keep centered but un-rotate text if desired (requires counter rotation)
      ctx.rotate(-angle); // So numbers are always upright to screen, optional but looks nicer if we don't have true 3D rolling
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(numLabel.toString(), 0, 1);
    }

    // 3D Shading Overlay (Specular Highlight & Vignette)
    ctx.restore(); // Restore back to non-rotated for the shading to stay constant relative to light source
    ctx.save();
    ctx.translate(x, y);

    const shading = ctx.createRadialGradient(
      -radius * 0.3, -radius * 0.3, radius * 0.1,
      0, 0, radius
    );
    shading.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    shading.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    shading.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = shading;
    ctx.fill();

    ctx.restore();
  }
}
