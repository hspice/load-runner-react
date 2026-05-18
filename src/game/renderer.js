import { TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, TILE, GRID_COLS, GRID_ROWS } from './constants';

// Color palette - retro style
const COLORS = {
  BACKGROUND: '#1a1a2e',
  BRICK: '#c0392b',
  BRICK_DARK: '#922b21',
  BRICK_LIGHT: '#e74c3c',
  DIGGABLE: '#e67e22',
  DIGGABLE_DARK: '#d35400',
  LADDER: '#f39c12',
  LADDER_DARK: '#d68910',
  ROPE: '#daa520',
  ROPE_DARK: '#b8860b',
  GOLD: '#f1c40f',
  GOLD_DARK: '#f39c12',
  GOLD_SHINE: '#ffeaa7',
  EXIT_OPEN: '#2ecc71',
  EXIT_CLOSED: '#7f8c8d',
  EXIT_GLOW: '#27ae60',
  PLAYER_BODY: '#3498db',
  PLAYER_HEAD: '#f5cba7',
  PLAYER_HAT: '#2980b9',
  PLAYER_LEGS: '#2c3e50',
  ENEMY_BODY: '#8e44ad',
  ENEMY_HEAD: '#f5cba7',
  ENEMY_LEGS: '#6c3483',
  HUD_BG: 'rgba(0,0,0,0.7)',
  HUD_TEXT: '#ecf0f1',
  HUD_GOLD: '#f1c40f',
  DIG_HOLE: '#0d0d1a',
};

function drawBrick(ctx, x, y, size, isDiggable = false) {
  const baseColor = isDiggable ? COLORS.DIGGABLE : COLORS.BRICK;
  const darkColor = isDiggable ? COLORS.DIGGABLE_DARK : COLORS.BRICK_DARK;

  // Main brick
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, size, size);

  // Brick pattern (2 rows of offset bricks)
  const brickH = size / 4;
  const brickW = size / 2;
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * brickH);
    ctx.lineTo(x + size, y + i * brickH);
    ctx.stroke();
  }

  // Vertical lines (offset per row)
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = 0; col < 3; col++) {
      const vx = x + offset + col * brickW;
      if (vx >= x && vx <= x + size) {
        ctx.beginPath();
        ctx.moveTo(vx, y + row * brickH);
        ctx.lineTo(vx, y + (row + 1) * brickH);
        ctx.stroke();
      }
    }
  }

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, size, 2);
}

function drawLadder(ctx, x, y, size) {
  const railW = 4;
  const padding = 4;

  // Side rails
  ctx.fillStyle = COLORS.LADDER_DARK;
  ctx.fillRect(x + padding, y, railW, size);
  ctx.fillRect(x + size - padding - railW, y, railW, size);

  // Side rail highlight
  ctx.fillStyle = COLORS.LADDER;
  ctx.fillRect(x + padding + 1, y, 2, size);
  ctx.fillRect(x + size - padding - railW + 1, y, 2, size);

  // Rungs
  const rungCount = 4;
  const rungSpacing = size / (rungCount + 1);
  for (let i = 1; i <= rungCount; i++) {
    const ry = y + i * rungSpacing;
    ctx.fillStyle = COLORS.LADDER;
    ctx.fillRect(x + padding + railW, ry - 1, size - 2 * padding - 2 * railW, 3);
    ctx.fillStyle = COLORS.LADDER_DARK;
    ctx.fillRect(x + padding + railW, ry, size - 2 * padding - 2 * railW, 1);
  }
}

function drawRope(ctx, x, y, size) {
  const ropeY = y + size / 2;

  // Main rope
  ctx.strokeStyle = COLORS.ROPE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, ropeY);
  ctx.lineTo(x + size, ropeY);
  ctx.stroke();

  // Rope highlight
  ctx.strokeStyle = '#ffeaa7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, ropeY - 1);
  ctx.lineTo(x + size, ropeY - 1);
  ctx.stroke();

  // Rope knots
  for (let i = 0; i < 2; i++) {
    const kx = x + (i + 1) * (size / 3);
    ctx.fillStyle = COLORS.ROPE_DARK;
    ctx.beginPath();
    ctx.arc(kx, ropeY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGold(ctx, x, y, size, frame) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 3;

  // Glow
  const glowAlpha = 0.3 + 0.1 * Math.sin(frame * 0.1);
  ctx.fillStyle = `rgba(241, 196, 15, ${glowAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  // Bar shape
  ctx.fillStyle = COLORS.GOLD;
  const barW = size * 0.6;
  const barH = size * 0.35;
  ctx.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);

  // Shine
  ctx.fillStyle = COLORS.GOLD_SHINE;
  ctx.fillRect(cx - barW / 2 + 3, cy - barH / 2 + 2, barW * 0.4, barH * 0.3);

  // Dark bottom
  ctx.fillStyle = COLORS.GOLD_DARK;
  ctx.fillRect(cx - barW / 2, cy + barH / 2 - 3, barW, 3);
}

function drawExit(ctx, x, y, size, isOpen, frame) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (isOpen) {
    // Glowing exit
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
    ctx.fillStyle = `rgba(46, 204, 113, ${0.2 + pulse * 0.3})`;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Door frame
    ctx.strokeStyle = COLORS.EXIT_OPEN;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 2, size - 8, size - 4);

    // Arrow up
    ctx.fillStyle = COLORS.EXIT_OPEN;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.closePath();
    ctx.fill();

    // Pulsing border
    ctx.strokeStyle = `rgba(39, 174, 96, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
  } else {
    // Closed exit
    ctx.fillStyle = COLORS.EXIT_CLOSED;
    ctx.fillRect(x + 4, y + 2, size - 8, size - 4);
    ctx.strokeStyle = '#566573';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 2, size - 8, size - 4);

    // Lock
    ctx.fillStyle = '#95a5a6';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 3, cy, 6, 6);
  }
}

function drawPlayer(ctx, player) {
  const x = player.x;
  const y = player.y;
  const w = player.width;
  const h = player.height;
  const dir = player.direction;

  ctx.save();

  // Flip based on direction
  if (dir === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  // Body
  ctx.fillStyle = COLORS.PLAYER_BODY;
  ctx.fillRect(4, h * 0.25, w - 8, h * 0.45);

  // Head
  ctx.fillStyle = COLORS.PLAYER_HEAD;
  ctx.fillRect(8, 0, w - 16, h * 0.25);

  // Hat/Helmet
  ctx.fillStyle = COLORS.PLAYER_HAT;
  ctx.fillRect(6, 0, w - 12, h * 0.15);

  // Eyes
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(w - 14, h * 0.1, 3, 3);

  // Legs
  ctx.fillStyle = COLORS.PLAYER_LEGS;
  const legOffset = player.state === 'running' ? Math.sin(player.frame * 1.5) * 3 : 0;
  ctx.fillRect(8, h - 10, 8, 10 + legOffset);
  ctx.fillRect(w - 16, h - 10, 8, 10 - legOffset);

  // Arms
  if (player.state === PLAYER_STATE.CLIMBING) {
    const armOffset = Math.sin(player.frame * 2) * 4;
    ctx.fillStyle = COLORS.PLAYER_HEAD;
    ctx.fillRect(0, 12 + armOffset, 6, 4);
    ctx.fillRect(w - 6, 12 - armOffset, 6, 4);
  } else if (player.state === PLAYER_STATE.ON_ROPE) {
    ctx.fillStyle = COLORS.PLAYER_HEAD;
    ctx.fillRect(-2, 4, 6, 4);
    ctx.fillRect(w - 4, 4, 6, 4);
  }

  ctx.restore();
}

function drawEnemy(ctx, enemy) {
  const x = enemy.x;
  const y = enemy.y;
  const w = enemy.width;
  const h = enemy.height;
  const dir = enemy.direction;

  ctx.save();

  if (dir === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  // Body
  ctx.fillStyle = COLORS.ENEMY_BODY;
  ctx.fillRect(4, h * 0.25, w - 8, h * 0.45);

  // Head
  ctx.fillStyle = COLORS.ENEMY_HEAD;
  ctx.fillRect(8, 0, w - 16, h * 0.25);

  // Evil eyes (red)
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(w - 14, h * 0.1, 3, 3);
  ctx.fillRect(w - 20, h * 0.1, 3, 3);

  // Legs
  ctx.fillStyle = COLORS.ENEMY_LEGS;
  const legOffset = Math.sin(enemy.frame * 2) * 3;
  ctx.fillRect(8, h - 10, 8, 10 + legOffset);
  ctx.fillRect(w - 16, h - 10, 8, 10 - legOffset);

  ctx.restore();
}

import { PLAYER_STATE } from './constants';

export function render(ctx, gameState) {
  const { grid, player, enemies, goldPositions, exitPos, score, lives, level, frame, allGoldCollected, dugHoles } = gameState;

  // Clear
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw grid
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = grid[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      switch (tile) {
        case TILE.BRICK:
          drawBrick(ctx, x, y, TILE_SIZE, false);
          break;
        case TILE.DIGGABLE:
          drawBrick(ctx, x, y, TILE_SIZE, true);
          break;
        case TILE.LADDER:
          drawLadder(ctx, x, y, TILE_SIZE);
          break;
        case TILE.ROPE:
          drawRope(ctx, x, y, TILE_SIZE);
          break;
        case TILE.GOLD:
          drawGold(ctx, x, y, TILE_SIZE, frame);
          break;
        case TILE.EXIT:
          drawExit(ctx, x, y, TILE_SIZE, allGoldCollected, frame);
          break;
      }
    }
  }

  // Draw dug holes
  dugHoles.forEach(hole => {
    const x = hole.x * TILE_SIZE;
    const y = hole.y * TILE_SIZE;
    ctx.fillStyle = COLORS.DIG_HOLE;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Hole edges
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

  // Regeneration indicator (starts filling in last ~90 frames of 270)
  if (hole.timer < 90) {
    const progress = 1 - hole.timer / 90;
      ctx.fillStyle = `rgba(192, 57, 43, ${progress * 0.5})`;
      ctx.fillRect(x, y, TILE_SIZE * progress, TILE_SIZE);
    }
  });

  // Draw enemies
  enemies.forEach(enemy => {
    if (enemy.alive) drawEnemy(ctx, enemy);
  });

  // Draw player
  if (player.alive) drawPlayer(ctx, player);

  // HUD
  drawHUD(ctx, score, lives, level, goldPositions);
}

function drawHUD(ctx, score, lives, level, goldPositions) {
  const hudH = 36;

  // HUD background
  ctx.fillStyle = COLORS.HUD_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, hudH);

  // Score
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 12, 24);

  // Level
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${level + 1}`, CANVAS_WIDTH / 2, 24);

  // Lives
  ctx.textAlign = 'left';
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = COLORS.PLAYER_BODY;
    ctx.fillRect(CANVAS_WIDTH - 120 + i * 24, 10, 16, 16);
    ctx.fillStyle = COLORS.PLAYER_HEAD;
    ctx.fillRect(CANVAS_WIDTH - 118 + i * 24, 6, 12, 8);
  }

  // Gold count
  const remaining = goldPositions.filter(g => !g.collected).length;
  const total = goldPositions.length;
  ctx.fillStyle = COLORS.HUD_GOLD;
  ctx.textAlign = 'right';
  ctx.fillText(`GOLD: ${total - remaining}/${total}`, CANVAS_WIDTH - 12, 24);
}
