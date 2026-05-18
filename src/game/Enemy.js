import { TILE_SIZE, GRAVITY, PLAYER_SPEED, CLIMB_SPEED, TILE } from './constants';

export class Enemy {
  constructor(gridX, gridY) {
    this.x = gridX * TILE_SIZE;
    this.y = gridY * TILE_SIZE;
    this.vx = -PLAYER_SPEED * 0.5;
    this.vy = 0;
    this.width = TILE_SIZE * 0.75;
    this.height = TILE_SIZE * 0.9;
    this.direction = -1;
    this.alive = true;
    this.frame = 0;
    this.frameTimer = 0;
    this.climbingTimer = 0;
  }

  update(grid, playerX, playerY) {
    if (!this.alive) return;

    const centerCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const bodyRow = Math.floor((this.y + this.height / 2) / TILE_SIZE);
    const onLadder = this.isTouchingLadder(grid);
    const onSolid = this.isOnSolid(grid);

    // Falling
    if (!onSolid && !onLadder) {
      this.vy += GRAVITY;
      if (this.vy > 12) this.vy = 12;
      this.y += this.vy;
      this.x += this.vx * 0.3;
      this.resolveHorizontalCollision(grid);

      if (this.isOnSolid(grid)) {
        this.snapToGround(grid);
        this.vy = 0;
      }
      // Grab rope while falling
      if (this.isOnRope(grid) && this.vy > 0) {
        this.vy = 0;
      }
      // Fall off map
      if (this.y > TILE_SIZE * 14 + TILE_SIZE) {
        this.alive = false;
      }
      return;
    }

    // On solid ground or ladder
    this.vy = 0;

    // AI: decide direction towards player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    this.direction = dx > 0 ? 1 : -1;

    // Try to use ladder if player is on a different row
    if (onLadder && Math.abs(dy) > TILE_SIZE) {
      this.climbingTimer = 30;
      this.vy = dy < 0 ? -CLIMB_SPEED * 0.8 : CLIMB_SPEED * 0.8;
      this.y += this.vy;

      // Check if still on ladder
      if (!this.isTouchingLadder(grid) && this.vy < 0) {
        this.y -= this.vy;
        this.vy = 0;
        this.climbingTimer = 0;
      }

      // Landed on ground while climbing down
      if (this.isOnSolid(grid) && this.vy > 0) {
        this.snapToGround(grid);
        this.vy = 0;
        this.climbingTimer = 0;
      }
    }

    if (this.climbingTimer > 0) {
      this.climbingTimer--;
    } else {
      // Horizontal movement
      this.vx = this.direction * PLAYER_SPEED * 0.5;
      this.x += this.vx;
      this.resolveHorizontalCollision(grid);

      // If hit a wall and on ladder, start climbing
      if (this.vx === 0 && onLadder) {
        this.climbingTimer = 30;
        this.vy = -CLIMB_SPEED * 0.8;
        this.y += this.vy;
      }
    }

    // Animation
    this.frameTimer++;
    if (this.frameTimer > 10) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 2;
    }
  }

  getTileAt(col, row, grid) {
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
      return TILE.BRICK;
    }
    return grid[row][col];
  }

  isTouchingLadder(grid) {
    const centerX = this.x + this.width / 2;
    const topY = this.y + 2;
    const bottomY = this.y + this.height - 2;
    const col = Math.floor(centerX / TILE_SIZE);
    const rowTop = Math.floor(topY / TILE_SIZE);
    const rowBot = Math.floor(bottomY / TILE_SIZE);
    for (let r = rowTop; r <= rowBot; r++) {
      if (this.getTileAt(col, r, grid) === TILE.LADDER) return true;
    }
    return false;
  }

  isOnSolid(grid) {
    const bottom = this.y + this.height;
    const row = Math.floor(bottom / TILE_SIZE);
    const left = this.x + 2;
    const right = this.x + this.width - 2;
    const colL = Math.floor(left / TILE_SIZE);
    const colR = Math.floor(right / TILE_SIZE);

    for (let c = colL; c <= colR; c++) {
      const tile = this.getTileAt(c, row, grid);
      if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
        const tileTop = row * TILE_SIZE;
        if (bottom >= tileTop && bottom <= tileTop + TILE_SIZE * 0.15) {
          return true;
        }
      }
    }
    return false;
  }

  isOnRope(grid) {
    const centerX = this.x + this.width / 2;
    const col = Math.floor(centerX / TILE_SIZE);
    for (let offsetY = 2; offsetY < this.height * 0.6; offsetY += 4) {
      const row = Math.floor((this.y + offsetY) / TILE_SIZE);
      if (this.getTileAt(col, row, grid) === TILE.ROPE) return true;
    }
    return false;
  }

  snapToGround(grid) {
    const bottom = this.y + this.height;
    const row = Math.floor(bottom / TILE_SIZE);
    this.y = row * TILE_SIZE - this.height;
  }

  resolveHorizontalCollision(grid) {
    const top = this.y + 2;
    const bottom = this.y + this.height - 2;
    const rowTop = Math.floor(top / TILE_SIZE);
    const rowBot = Math.floor(bottom / TILE_SIZE);

    if (this.vx <= 0) {
      const left = this.x;
      const col = Math.floor(left / TILE_SIZE);
      for (let r = rowTop; r <= rowBot; r++) {
        const tile = this.getTileAt(col, r, grid);
        if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
          this.x = (col + 1) * TILE_SIZE;
          this.vx = 0;
          break;
        }
      }
    }

    if (this.vx >= 0) {
      const right = this.x + this.width;
      const col = Math.floor(right / TILE_SIZE);
      for (let r = rowTop; r <= rowBot; r++) {
        const tile = this.getTileAt(col, r, grid);
        if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
          this.x = col * TILE_SIZE - this.width;
          this.vx = 0;
          break;
        }
      }
    }

    if (this.x < 0) this.x = 0;
    const maxX = TILE_SIZE * 20 - this.width;
    if (this.x > maxX) this.x = maxX;
  }

  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4,
    };
  }
}

export function checkCollision(a, b) {
  const ab = a.getBounds();
  const bb = b.getBounds();
  return (
    ab.x < bb.x + bb.width &&
    ab.x + ab.width > bb.x &&
    ab.y < bb.y + bb.height &&
    ab.y + ab.height > bb.y
  );
}
