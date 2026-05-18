// Game Constants
export const TILE_SIZE = 40;
export const GRID_COLS = 20;
export const GRID_ROWS = 14;

export const CANVAS_WIDTH = TILE_SIZE * GRID_COLS;   // 800
export const CANVAS_HEIGHT = TILE_SIZE * GRID_ROWS;  // 560

export const GRAVITY = 0.35;
export const PLAYER_SPEED = 1.5;
export const JUMP_FORCE = -5;
export const CLIMB_SPEED = 1.25;
export const ROPE_SPEED = 1.5;

export const TILE = {
  EMPTY: 0,
  BRICK: 1,
  LADDER: 2,
  ROPE: 3,
  GOLD: 4,
  SPAWN: 5,
  EXIT: 6,
  ENEMY_SPAWN: 7,
  DIGGABLE: 8,
};

export const PLAYER_STATE = {
  RUNNING: 'running',
  CLIMBING: 'climbing',
  ON_ROPE: 'on_rope',
  FALLING: 'falling',
  DIGGING: 'digging',
};

export const DIRECTION = {
  LEFT: -1,
  RIGHT: 1,
  NONE: 0,
};
