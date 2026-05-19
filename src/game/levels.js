import { TILE, GRID_ROWS, GRID_COLS } from './constants';

// Level 1 - Tutorial level
// Main ladder at col 8 connects to rope section
// Top floor extends right to reach the ladder
// Gold positioned near center of screen
const level1 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 0 - ceiling
  [1,5,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,1], // row 1 - top floor, spawn + gold near center
  [1,1,8,1,1,1,1,1,2,0,0,0,0,0,0,0,8,1,1,1], // row 2 - floor extends to col8 (ladder at col 8)
  [0,0,0,0,0,0,0,0,2,3,3,3,3,3,0,0,0,0,0,0], // row 3 - rope section starts at col8 (connected to ladder!)
  [0,4,0,0,0,0,0,0,2,0,0,0,0,0,0,0,4,0,0,0], // row 4 - gold
  [1,1,1,8,1,1,0,0,2,0,0,0,0,0,8,1,1,0,0,0], // row 5 - floor (ladder at col 8)
  [0,0,0,0,0,0,0,0,2,0,4,0,0,0,0,0,0,0,0,0], // row 6 - gold
  [0,0,0,0,0,0,0,0,2,0,0,0,3,3,3,0,0,0,0,0], // row 7 - rope section
  [0,4,0,0,0,0,0,0,2,0,0,0,0,0,0,0,4,0,0,0], // row 8 - gold
  [1,1,1,1,8,0,0,0,2,0,0,0,0,0,0,1,8,1,1,0], // row 9 - floor
  [0,0,0,0,0,0,0,0,2,0,4,0,0,0,0,0,0,0,0,0], // row 10 - gold
  [0,0,0,0,0,0,0,0,2,0,0,0,0,0,7,0,0,4,0,0], // row 11 - enemy spawn + gold
  [0,0,0,0,0,0,0,0,2,4,4,0,0,0,0,0,1,1,6,1], // row 12 - gold + exit
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 13 - bottom floor
];

// Level 2 - Two ladders, more complex paths
const level2 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 0
  [1,5,0,4,0,0,2,0,0,0,0,0,0,0,2,0,0,4,0,1], // row 1 - spawn + gold, 2 ladders
  [1,1,8,1,1,0,2,0,0,0,0,0,0,0,2,0,8,1,1,1], // row 2 - floor
  [0,0,0,0,0,0,2,0,3,3,3,3,3,0,2,0,0,0,0,0], // row 3 - ropes
  [0,4,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,4,0,0], // row 4 - gold
  [1,1,8,1,1,0,2,0,0,0,4,0,0,0,2,0,1,8,1,0], // row 5 - floor + gold
  [0,0,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0], // row 6
  [0,0,0,4,0,0,2,0,0,0,0,0,0,0,2,0,0,0,4,0], // row 7 - gold
  [1,1,1,1,8,0,2,0,0,0,0,0,0,0,2,1,1,8,1,1], // row 8 - floor
  [0,0,0,0,0,0,2,0,4,0,0,0,0,0,2,0,0,0,0,0], // row 9 - gold
  [0,0,4,0,0,0,2,0,0,0,0,3,3,3,2,0,0,4,0,0], // row 10 - gold + rope
  [0,0,0,0,0,0,2,0,0,0,0,0,0,0,2,0,7,0,0,0], // row 11 - enemy spawn
  [0,0,0,0,0,0,2,4,4,0,0,0,4,0,2,4,1,1,6,1], // row 12 - gold + exit
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 13
];

// Level 3 - Hard: 3 ladders, multiple enemies
const level3 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 0
  [1,5,0,0,2,0,4,0,0,0,0,0,0,2,0,4,0,0,0,1], // row 1 - 3 ladders
  [1,8,1,1,2,0,0,0,7,0,0,0,0,2,0,0,0,8,1,1], // row 2 - floor + enemy
  [0,0,0,0,2,0,0,3,3,3,3,3,3,2,0,0,0,0,0,0], // row 3 - ropes
  [0,4,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,4,0,0], // row 4 - gold
  [1,1,8,1,2,0,0,0,0,4,0,0,0,0,2,1,8,1,0,0], // row 5 - floor + gold
  [0,0,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0], // row 6
  [0,0,4,0,2,0,0,0,0,0,0,0,0,0,2,0,0,4,0,0], // row 7 - gold
  [1,1,1,8,2,0,0,0,0,0,0,0,0,0,2,1,1,8,1,1], // row 8 - floor
  [0,0,0,0,2,0,0,4,0,0,0,0,4,0,2,0,0,0,0,0], // row 9 - gold
  [0,0,0,0,2,0,0,0,0,0,3,3,3,0,2,0,4,0,0,0], // row 10 - rope + gold
  [0,0,0,0,2,0,0,0,0,7,0,0,0,0,2,0,0,0,0,0], // row 11 - enemy
  [0,4,4,0,2,4,4,0,0,0,0,4,0,0,2,4,1,1,6,1], // row 12 - gold + exit
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 13
];

export const levels = [level1, level2, level3];

export function parseLevel(levelData) {
  const goldPositions = [];
  const enemySpawns = [];
  let playerSpawn = { x: 1, y: 1 };
  let exitPos = null;

  const grid = levelData.map((row, y) =>
    row.map((cell, x) => {
      switch (cell) {
        case TILE.GOLD:
          goldPositions.push({ x, y, collected: false });
          return TILE.GOLD;
        case TILE.SPAWN:
          playerSpawn = { x, y };
          return TILE.EMPTY;
        case TILE.EXIT:
          exitPos = { x, y };
          return TILE.EXIT;
        case TILE.ENEMY_SPAWN:
          enemySpawns.push({ x, y });
          return TILE.EMPTY;
        default:
          return cell;
      }
    })
  );

  return { grid, goldPositions, enemySpawns, playerSpawn, exitPos };
}
