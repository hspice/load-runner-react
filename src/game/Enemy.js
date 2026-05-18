import { TILE_SIZE, GRAVITY, PLAYER_SPEED, CLIMB_SPEED, TILE, GRID_ROWS } from './constants';

const ENEMY_SPEED = PLAYER_SPEED * 0.55;
const ENEMY_CLIMB_SPEED = CLIMB_SPEED * 0.7;

export class Enemy {
  constructor(gridX, gridY) {
    this.x = gridX * TILE_SIZE;
    this.y = gridY * TILE_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.prevY = this.y;
    this.width = TILE_SIZE * 0.75;
    this.height = TILE_SIZE * 0.9;
    this.direction = -1; // -1 = left, 1 = right
    this.alive = true;
    this.frame = 0;
    this.frameTimer = 0;
    this.isClimbing = false;
    this.climbTargetRow = -1; // target row when climbing
    this.patrolDir = -1; // for horizontal patrol when no path to player
    this.patrolTimer = 0;
  }

  update(grid, playerX, playerY) {
    if (!this.alive) return;

    this.prevY = this.y;

    // Current state detection
    const onLadder = this.isTouchingLadder(grid);
    const onSolid = this.isOnSolid(grid);
    const onRope = this.isOnRope(grid);

    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    const playerRow = Math.floor(playerY / TILE_SIZE);
    const enemyRow = Math.floor((this.y + this.height) / TILE_SIZE);
    const sameFloor = Math.abs(dy) < TILE_SIZE * 1.2;

    // ---- FALLING ----
    if (!onSolid && !onLadder && !onRope && !this.isClimbing) {
      this.vy += GRAVITY;
      if (this.vy > 8) this.vy = 8;

      const prevBottom = this.prevY + this.height;
      this.y += this.vy;
      this.x += this.direction * PLAYER_SPEED * 0.3;
      this.resolveHorizontalCollision(grid);

      const landingResult = this.checkLanding(grid, prevBottom);
      if (landingResult) {
        this.y = landingResult.tileTop - this.height;
        this.vy = 0;
      }

      if (this.y > TILE_SIZE * (GRID_ROWS + 1)) {
        this.alive = false;
      }
      this.updateAnimation();
      return;
    }

    // ---- ON ROPE ----
    if (onRope && !this.isClimbing) {
      this.vy = 0;
      // Move horizontally on rope toward player
      this.vx = (dx > 0 ? 1 : -1) * ENEMY_SPEED;
      this.direction = dx > 0 ? 1 : -1;
      this.x += this.vx;
      this.resolveHorizontalCollision(grid);

      // Drop off rope if player is below
      if (dy > 0) {
        // Player is below - drop
      }

      // Check if still on rope
      if (!this.isOnRope(grid)) {
        this.vy = 0;
      }

      // Can grab ladder from rope
      if (onLadder && dy < -TILE_SIZE) {
        this.isClimbing = true;
        this.climbTargetRow = playerRow;
      }

      this.updateAnimation();
      return;
    }

    // ---- CLIMBING LADDER ----
    if (this.isClimbing) {
      this.vy = dy < 0 ? -ENEMY_CLIMB_SPEED : ENEMY_CLIMB_SPEED;
      this.y += this.vy;

      // Snap to ladder center while climbing
      this.snapToLadderCenter(grid);

      // Reached solid ground while climbing
      if (this.isOnSolid(grid)) {
        // Check if we should step off the ladder
        const shouldStepOff = sameFloor ||
          (this.vy > 0 && enemyRow >= playerRow) ||  // going down, reached player's row or below
          (this.vy < 0 && enemyRow <= playerRow);     // going up, reached player's row or above

        if (shouldStepOff || !this.isTouchingLadder(grid)) {
          this.snapToGround(grid);
          this.vy = 0;
          this.vx = 0;
          this.isClimbing = false;
          this.climbTargetRow = -1;
          // Immediately start walking toward player
          this.direction = dx > 0 ? 1 : -1;
          this.vx = this.direction * ENEMY_SPEED;
          this.x += this.vx;
          this.resolveHorizontalCollision(grid);
        }
      }

      // Off the ladder without solid ground — stop climbing
      if (!this.isTouchingLadder(grid) && !this.isOnSolid(grid)) {
        this.y -= this.vy;
        this.vy = 0;
        this.isClimbing = false;
        this.climbTargetRow = -1;
      }

      this.updateAnimation();
      return;
    }

    // ---- ON SOLID GROUND (walking) ----
    this.vy = 0;

    if (sameFloor) {
      // Same floor as player — chase directly
      this.direction = dx > 0 ? 1 : -1;
      this.vx = this.direction * ENEMY_SPEED;
      this.x += this.vx;
      this.resolveHorizontalCollision(grid);

      // Hit a wall while chasing — try climbing or reverse
      if (this.vx === 0) {
        if (onLadder) {
          this.isClimbing = true;
          this.climbTargetRow = playerRow;
          this.vy = dy < 0 ? -ENEMY_CLIMB_SPEED : ENEMY_CLIMB_SPEED;
          this.y += this.vy;
        } else {
          this.direction = -this.direction;
          this.vx = this.direction * ENEMY_SPEED;
          this.x += this.vx;
          this.resolveHorizontalCollision(grid);
        }
      }

      // Reached a ladder and player is on different floor — climb
      if (onLadder && !sameFloor) {
        this.isClimbing = true;
        this.climbTargetRow = playerRow;
        this.vy = dy < 0 ? -ENEMY_CLIMB_SPEED : ENEMY_CLIMB_SPEED;
        this.y += this.vy;
      }
    } else {
      // Different floor from player — need to find a ladder
      if (onLadder) {
        // Standing on a ladder — start climbing
        this.isClimbing = true;
        this.climbTargetRow = playerRow;
        this.vy = dy < 0 ? -ENEMY_CLIMB_SPEED : ENEMY_CLIMB_SPEED;
        this.y += this.vy;
      } else {
        // No ladder here — walk to find one
        const ladderDir = this.findLadderDirection(grid, dx);

        if (ladderDir !== 0) {
          this.direction = ladderDir;
        } else {
          // No ladder found nearby — patrol
          this.patrolTimer++;
          if (this.patrolTimer > 60 || this.vx === 0) {
            this.patrolDir = -this.patrolDir;
            this.patrolTimer = 0;
          }
          this.direction = this.patrolDir;
        }

        this.vx = this.direction * ENEMY_SPEED;
        this.x += this.vx;
        this.resolveHorizontalCollision(grid);

        // Hit a wall — reverse
        if (this.vx === 0) {
          this.direction = -this.direction;
          this.vx = this.direction * ENEMY_SPEED;
          this.x += this.vx;
          this.resolveHorizontalCollision(grid);
        }

        // If we just walked onto a ladder, start climbing
        if (this.isTouchingLadder(grid)) {
          this.isClimbing = true;
          this.climbTargetRow = playerRow;
          this.vy = dy < 0 ? -ENEMY_CLIMB_SPEED : ENEMY_CLIMB_SPEED;
          this.y += this.vy;
        }
      }
    }

    this.updateAnimation();
  }

  updateAnimation() {
    this.frameTimer++;
    if (this.frameTimer > 10) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 2;
    }
  }

  // Find the direction to the nearest ladder, preferring toward the player
  findLadderDirection(grid, dxToPlayer) {
    const centerX = this.x + this.width / 2;
    const bottomY = this.y + this.height;
    const currentCol = Math.floor(centerX / TILE_SIZE);
    const currentRow = Math.floor(bottomY / TILE_SIZE);
    const preferredDir = dxToPlayer > 0 ? 1 : -1;

    // Search in preferred direction first (up to 8 tiles), then opposite
    const dirs = [preferredDir, -preferredDir];
    for (const dir of dirs) {
      for (let offset = 1; offset <= 8; offset++) {
        const checkCol = currentCol + dir * offset;
        if (checkCol < 0 || checkCol >= grid[0].length) continue;
        // Check current row and rows around for ladder
        for (let r = Math.max(0, currentRow - 2); r <= Math.min(grid.length - 1, currentRow + 1); r++) {
          if (grid[r][checkCol] === TILE.LADDER) {
            return dir;
          }
        }
      }
    }
    return 0; // No ladder found
  }

  // Snap enemy to the center of the ladder tile they are on
  snapToLadderCenter(grid) {
    const centerX = this.x + this.width / 2;
    const topY = this.y + 2;
    const bottomY = this.y + this.height - 2;
    const col = Math.floor(centerX / TILE_SIZE);
    const rowTop = Math.floor(topY / TILE_SIZE);
    const rowBot = Math.floor(bottomY / TILE_SIZE);

    let ladderCol = -1;
    for (let r = rowTop; r <= rowBot; r++) {
      if (this.getTileAt(col, r, grid) === TILE.LADDER) {
        ladderCol = col;
        break;
      }
    }
    if (ladderCol < 0) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (c < 0 || c >= grid[0].length) continue;
        for (let r = rowTop; r <= rowBot; r++) {
          if (this.getTileAt(c, r, grid) === TILE.LADDER) {
            ladderCol = c;
            break;
          }
        }
        if (ladderCol >= 0) break;
      }
    }

    if (ladderCol >= 0) {
      const targetX = ladderCol * TILE_SIZE + (TILE_SIZE - this.width) / 2;
      this.x += (targetX - this.x) * 0.3;
    }
  }

  checkLanding(grid, prevBottom) {
    const bottom = this.y + this.height;
    const left = this.x + 2;
    const right = this.x + this.width - 2;
    const colL = Math.floor(left / TILE_SIZE);
    const colR = Math.floor(right / TILE_SIZE);
    const row = Math.floor(bottom / TILE_SIZE);

    for (let c = colL; c <= colR; c++) {
      const tile = this.getTileAt(c, row, grid);
      if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
        const tileTop = row * TILE_SIZE;
        if (prevBottom <= tileTop + 1 && bottom > tileTop) {
          return { tileTop };
        }
        if (bottom > tileTop && bottom <= tileTop + 2) {
          return { tileTop };
        }
      }
    }

    if (row > 0) {
      const rowAbove = row - 1;
      for (let c = colL; c <= colR; c++) {
        const tile = this.getTileAt(c, rowAbove, grid);
        if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
          const tileTop = rowAbove * TILE_SIZE;
          if (bottom >= tileTop && bottom <= tileTop + 2) {
            return { tileTop };
          }
        }
      }
    }

    return null;
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
        if (bottom >= tileTop && bottom <= tileTop + 2) {
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
