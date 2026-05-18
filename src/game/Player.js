import { TILE_SIZE, GRAVITY, PLAYER_SPEED, CLIMB_SPEED, PLAYER_STATE, DIRECTION, TILE } from './constants';

export class Player {
  constructor(gridX, gridY) {
    this.x = gridX * TILE_SIZE;
    this.y = gridY * TILE_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.prevY = this.y;
    this.width = TILE_SIZE * 0.75;
    this.height = TILE_SIZE * 0.9;
    this.state = PLAYER_STATE.FALLING;
    this.direction = DIRECTION.RIGHT;
    this.onGround = false;
    this.digTimer = 0;
    this.digTarget = null;
    this.frame = 0;
    this.frameTimer = 0;
    this.alive = true;
  }

  update(keys, grid, onDig) {
    if (!this.alive) return;

    // Save previous position for landing detection
    this.prevY = this.y;

    // Handle digging
    if (this.digTimer > 0) {
      this.digTimer--;
      if (this.digTimer === 0 && this.digTarget) {
        const { x, y } = this.digTarget;
        if (grid[y] && (grid[y][x] === TILE.BRICK || grid[y][x] === TILE.DIGGABLE)) {
          onDig(x, y);
        }
        this.digTarget = null;
      }
    }

    // Determine state
    const onLadder = this.isTouchingLadder(grid);
    const onRope = this.isOnRope(grid);

    // State transitions
    if (onLadder && (keys.up || keys.down)) {
      this.state = PLAYER_STATE.CLIMBING;
    } else if (onRope && this.vy >= 0) {
      this.state = PLAYER_STATE.ON_ROPE;
    } else if (this.onGround) {
      this.state = PLAYER_STATE.RUNNING;
    } else if (!this.onGround) {
      this.state = PLAYER_STATE.FALLING;
    }

    // Movement based on state
    switch (this.state) {
      case PLAYER_STATE.RUNNING:
        this.handleRunning(keys, grid);
        break;
      case PLAYER_STATE.CLIMBING:
        this.handleClimbing(keys, grid);
        break;
      case PLAYER_STATE.ON_ROPE:
        this.handleRope(keys, grid);
        break;
      case PLAYER_STATE.FALLING:
        this.handleFalling(keys, grid);
        break;
    }

    // Dig left/right
    if (keys.digLeft && this.digTimer === 0 && this.onGround) {
      this.startDig(-1, grid, onDig);
    }
    if (keys.digRight && this.digTimer === 0 && this.onGround) {
      this.startDig(1, grid, onDig);
    }

    // Animation
    this.frameTimer++;
    if (this.frameTimer > 8) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 4;
    }
  }

  handleRunning(keys, grid) {
    this.vx = 0;
    this.vy = 0;

    if (keys.left) {
      this.vx = -PLAYER_SPEED;
      this.direction = DIRECTION.LEFT;
    }
    if (keys.right) {
      this.vx = PLAYER_SPEED;
      this.direction = DIRECTION.RIGHT;
    }
    if (keys.up) {
      if (this.isTouchingLadder(grid)) {
        this.state = PLAYER_STATE.CLIMBING;
        return;
      }
    }

    // Apply horizontal movement with collision
    this.x += this.vx;
    this.resolveHorizontalCollision(grid);

    // Ground check - if no solid below, start falling
    if (!this.isOnSolid(grid)) {
      this.state = PLAYER_STATE.FALLING;
      this.onGround = false;
      this.vy = 0;
    }
  }

  handleClimbing(keys, grid) {
    this.vx = 0;
    this.vy = 0;

    if (keys.up) this.vy = -CLIMB_SPEED;
    if (keys.down) this.vy = CLIMB_SPEED;
    if (keys.left) {
      this.vx = -PLAYER_SPEED * 0.5;
      this.direction = DIRECTION.LEFT;
    }
    if (keys.right) {
      this.vx = PLAYER_SPEED * 0.5;
      this.direction = DIRECTION.RIGHT;
    }

    // While climbing up/down with no horizontal input, center on the ladder
    if (!keys.left && !keys.right && (keys.up || keys.down)) {
      this.snapToLadderCenter(grid);
    }

    this.x += this.vx;
    this.y += this.vy;

    this.resolveHorizontalCollision(grid);

    // Check if still on ladder
    if (!this.isTouchingLadder(grid) && !keys.up && !keys.down) {
      if (this.isOnSolid(grid)) {
        this.state = PLAYER_STATE.RUNNING;
        this.onGround = true;
        this.vy = 0;
      } else {
        this.state = PLAYER_STATE.FALLING;
        this.onGround = false;
      }
    }

    // Reached top of ladder — landing on platform above
    if (this.vy < 0 && this.isOnSolid(grid)) {
      this.state = PLAYER_STATE.RUNNING;
      this.onGround = true;
      this.vy = 0;
      this.snapToGround(grid);
    }

    // Landed on ground while climbing down
    if (this.isOnSolid(grid) && this.vy >= 0) {
      this.state = PLAYER_STATE.RUNNING;
      this.onGround = true;
      this.vy = 0;
      this.snapToGround(grid);
    }
  }

  // Snap player to the center of the ladder tile they are on
  snapToLadderCenter(grid) {
    const centerX = this.x + this.width / 2;
    const topY = this.y + 2;
    const bottomY = this.y + this.height - 2;
    const col = Math.floor(centerX / TILE_SIZE);
    const rowTop = Math.floor(topY / TILE_SIZE);
    const rowBot = Math.floor(bottomY / TILE_SIZE);

    // Find the ladder column the player is currently on
    let ladderCol = -1;
    // First check the player's current column
    for (let r = rowTop; r <= rowBot; r++) {
      if (this.getTileAt(col, r, grid) === TILE.LADDER) {
        ladderCol = col;
        break;
      }
    }
    // If not on current column, check neighbors
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
      // Center the player horizontally on the ladder tile
      const targetX = ladderCol * TILE_SIZE + (TILE_SIZE - this.width) / 2;
      // Smooth interpolation toward center
      this.x += (targetX - this.x) * 0.3;
    }
  }

  handleRope(keys, grid) {
    this.vy = 0;
    this.vx = 0;

    if (keys.left) {
      this.vx = -PLAYER_SPEED;
      this.direction = DIRECTION.LEFT;
    }
    if (keys.right) {
      this.vx = PLAYER_SPEED;
      this.direction = DIRECTION.RIGHT;
    }
    if (keys.down) {
      this.state = PLAYER_STATE.FALLING;
      this.onGround = false;
      return;
    }
    if (keys.up && this.isTouchingLadder(grid)) {
      this.state = PLAYER_STATE.CLIMBING;
      return;
    }

    this.x += this.vx;
    this.resolveHorizontalCollision(grid);

    // Check if still on rope
    if (!this.isOnRope(grid)) {
      this.state = PLAYER_STATE.FALLING;
      this.onGround = false;
    }
  }

  handleFalling(keys, grid) {
    this.vy += GRAVITY;
    if (this.vy > 8) this.vy = 8;

    if (keys.left) {
      this.vx = -PLAYER_SPEED * 0.7;
      this.direction = DIRECTION.LEFT;
    } else if (keys.right) {
      this.vx = PLAYER_SPEED * 0.7;
      this.direction = DIRECTION.RIGHT;
    } else {
      this.vx *= 0.9;
    }

    // Grab ladder while falling
    if (keys.up && this.isTouchingLadder(grid)) {
      this.state = PLAYER_STATE.CLIMBING;
      this.vy = 0;
      return;
    }

    const prevBottom = this.prevY + this.height;
    this.x += this.vx;
    this.y += this.vy;

    this.resolveHorizontalCollision(grid);

    // Landing check using previous position for reliable detection
    const landingResult = this.checkLanding(grid, prevBottom);
    if (landingResult) {
      this.y = landingResult.tileTop - this.height;
      this.state = PLAYER_STATE.RUNNING;
      this.onGround = true;
      this.vy = 0;
    }

    // Check for rope grab
    if (this.isOnRope(grid) && this.vy > 0) {
      this.state = PLAYER_STATE.ON_ROPE;
      this.vy = 0;
    }
  }

  // Reliable landing detection: check if player crossed a solid tile top
  checkLanding(grid, prevBottom) {
    const bottom = this.y + this.height;
    const left = this.x + 2;
    const right = this.x + this.width - 2;
    const colL = Math.floor(left / TILE_SIZE);
    const colR = Math.floor(right / TILE_SIZE);

    // Check the row where the bottom now is
    const row = Math.floor(bottom / TILE_SIZE);

    for (let c = colL; c <= colR; c++) {
      const tile = this.getTileAt(c, row, grid);
      if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
        const tileTop = row * TILE_SIZE;
        // Previous bottom was at or above tile top, now below it
        if (prevBottom <= tileTop + 1 && bottom > tileTop) {
          return { tileTop };
        }
        // Also catch the case where player is within small tolerance
        if (bottom > tileTop && bottom <= tileTop + 2) {
          return { tileTop };
        }
      }
    }

    // Check one row above too (in case we're exactly at boundary)
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

  startDig(dir, grid, onDig) {
    const col = Math.floor((this.x + this.width / 2) / TILE_SIZE) + dir;
    const row = Math.floor((this.y + this.height - 1) / TILE_SIZE) + 1;

    if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
      const tile = grid[row][col];
      if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
        this.digTimer = 15;
        this.digTarget = { x: col, y: row };
      }
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
        // Player bottom must be very close to tile top (standing on it)
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

    // Left collision
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

    // Right collision
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

    // Keep in bounds
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
