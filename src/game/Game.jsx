import { useEffect, useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE, TILE_SIZE, PLAYER_STATE, GRID_ROWS } from './constants';
import { levels, parseLevel } from './levels';
import { Player } from './Player';
import { Enemy, checkCollision } from './Enemy';
import { render } from './renderer';

const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  DEAD: 'dead',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  WIN: 'win',
};

export default function Game() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const game = {
      state: GAME_STATE.MENU,
      score: 0,
      lives: 3,
      level: 0,
      grid: [],
      player: null,
      enemies: [],
      goldPositions: [],
      exitPos: null,
      allGoldCollected: false,
      dugHoles: [],
      frame: 0,
      keys: {
        left: false, right: false, up: false, down: false,
        digLeft: false, digRight: false,
      },
      deathTimer: 0,
      levelCompleteTimer: 0,
    };
    gameRef.current = game;

    // ---- Level init ----
    function initLevel(levelIndex) {
      const levelData = levels[levelIndex];
      if (!levelData) return;
      const { grid, goldPositions, enemySpawns, playerSpawn, exitPos } = parseLevel(levelData);
      const mutableGrid = grid.map(row => [...row]);
      const player = new Player(playerSpawn.x, playerSpawn.y);
      const enemies = enemySpawns.map(spawn => new Enemy(spawn.x, spawn.y));

      game.grid = mutableGrid;
      game.goldPositions = goldPositions;
      game.enemies = enemies;
      game.player = player;
      game.exitPos = exitPos;
      game.allGoldCollected = false;
      game.dugHoles = [];
      game.level = levelIndex;

      // Snap player to the nearest solid surface below spawn
      let row = Math.floor((player.y + player.height) / TILE_SIZE);
      let found = false;
      while (row < game.grid.length) {
        const col = Math.floor((player.x + player.width / 2) / TILE_SIZE);
        const tile = game.grid[row] ? game.grid[row][col] : TILE.BRICK;
        if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
          player.y = row * TILE_SIZE - player.height;
          player.onGround = true;
          player.state = PLAYER_STATE.RUNNING;
          player.vy = 0;
          found = true;
          break;
        }
        row++;
      }
      // Fallback: if no solid found below, try the current row
      if (!found) {
        player.y = Math.floor(player.y / TILE_SIZE) * TILE_SIZE;
        player.onGround = false;
        player.state = PLAYER_STATE.FALLING;
      }

      // Snap each enemy to the nearest solid surface below
      for (const enemy of enemies) {
        let erow = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
        while (erow < game.grid.length) {
          const ecol = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
          const tile = game.grid[erow] ? game.grid[erow][ecol] : TILE.BRICK;
          if (tile === TILE.BRICK || tile === TILE.DIGGABLE) {
            enemy.y = erow * TILE_SIZE - enemy.height;
            enemy.vy = 0;
            break;
          }
          erow++;
        }
      }
    }

    function startGame() {
      game.score = 0;
      game.lives = 3;
      initLevel(0);
      game.state = GAME_STATE.PLAYING;
    }

    function nextLevel() {
      const nextIdx = game.level + 1;
      if (nextIdx >= levels.length) {
        game.state = GAME_STATE.WIN;
      } else {
        initLevel(nextIdx);
        game.state = GAME_STATE.PLAYING;
      }
    }

    // ---- Key handlers ----
    function handleKeyDown(e) {
      const code = e.code;

      // Movement keys
      if (code === 'ArrowLeft' || code === 'KeyA') game.keys.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') game.keys.right = true;
      if (code === 'ArrowUp' || code === 'KeyW') game.keys.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') game.keys.down = true;
      if (code === 'KeyQ' || code === 'KeyZ') game.keys.digLeft = true;
      if (code === 'KeyE' || code === 'KeyX') game.keys.digRight = true;

      // Action keys
      const isSpace = code === 'Space';
      const isEnter = code === 'Enter';

      if (isSpace || isEnter) {
        e.preventDefault();
        e.stopPropagation();

        const state = game.state;
        if (state === GAME_STATE.MENU) {
          startGame();
        } else if (state === GAME_STATE.GAME_OVER) {
          startGame();
        } else if (state === GAME_STATE.WIN) {
          startGame();
        } else if (state === GAME_STATE.DEAD && game.deathTimer <= 0) {
          if (game.lives > 0) {
            initLevel(game.level);
            game.state = GAME_STATE.PLAYING;
          } else {
            game.state = GAME_STATE.GAME_OVER;
          }
        } else if (state === GAME_STATE.LEVEL_COMPLETE && game.levelCompleteTimer <= 0) {
          nextLevel();
        }
      }

      // Prevent page scroll on arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
    }

    function handleKeyUp(e) {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') game.keys.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') game.keys.right = false;
      if (code === 'ArrowUp' || code === 'KeyW') game.keys.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') game.keys.down = false;
      if (code === 'KeyQ' || code === 'KeyZ') game.keys.digLeft = false;
      if (code === 'KeyE' || code === 'KeyX') game.keys.digRight = false;
    }

    // Attach to window for reliable key capture
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ---- Game update ----
    function updateGame() {
      const { player, enemies, grid, goldPositions, exitPos } = game;
      if (!player || !player.alive) return;

 // Update dug holes (regenerate after timer)
 game.dugHoles = game.dugHoles.filter(hole => {
 hole.timer--;
 if (hole.timer <= 0) {
 // Check if player is standing in the hole that's about to be filled
 const holeX = hole.x * TILE_SIZE;
 const holeY = hole.y * TILE_SIZE;
 const px = player.x + player.width / 2;
 const py = player.y + player.height / 2;
 const playerCol = Math.floor(px / TILE_SIZE);
 const playerRow = Math.floor(py / TILE_SIZE);
 const playerBottomRow = Math.floor((player.y + player.height - 1) / TILE_SIZE);

 // If player's center or feet are in this hole column/row, they get trapped
 if (playerCol === hole.x && (playerRow === hole.y || playerBottomRow === hole.y)) {
 player.alive = false;
 game.lives--;
 game.state = GAME_STATE.DEAD;
 game.deathTimer = 60;
 }

 if (grid[hole.y] && grid[hole.y][hole.x] === TILE.EMPTY) {
 grid[hole.y][hole.x] = hole.originalTile;
 }
 return false;
 }
 return true;
 });

      // Player dig callback
      const onDig = (digX, digY) => {
        if (digY >= 0 && digY < grid.length && digX >= 0 && digX < grid[0].length) {
          const originalTile = grid[digY][digX];
          grid[digY][digX] = TILE.EMPTY;
          game.dugHoles.push({ x: digX, y: digY, timer: 270, originalTile });
          game.score += 10;
        }
      };

      // Update player
      player.update(game.keys, grid, onDig);

  // Safety: if player falls below the map, respawn
  if (player.y > CANVAS_HEIGHT + TILE_SIZE) {
    player.alive = false;
    game.lives--;
    game.state = GAME_STATE.DEAD;
    game.deathTimer = 60;
    return;
  }

  // Check if player is stuck in a dug hole at the bottom row
  // (can't go down any further, no way to escape)
  if (player.onGround && player.state === PLAYER_STATE.RUNNING) {
    const playerBottom = player.y + player.height;
    const bottomRow = Math.floor(playerBottom / TILE_SIZE);
    const playerColL = Math.floor((player.x + 2) / TILE_SIZE);
    const playerColR = Math.floor((player.x + player.width - 2) / TILE_SIZE);
    const playerCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);

    // Check if player is in a hole (surrounded by solid on left, right, and above)
    const leftSolid = playerColL > 0 && (grid[bottomRow][playerColL - 1] === TILE.BRICK || grid[bottomRow][playerColL - 1] === TILE.DIGGABLE);
    const rightSolid = playerColR < grid[0].length - 1 && (grid[bottomRow][playerColR + 1] === TILE.BRICK || grid[bottomRow][playerColR + 1] === TILE.DIGGABLE);

    // Check if there's a solid tile directly above the player (ceiling)
    const topRow = Math.floor(player.y / TILE_SIZE);
    const ceilingSolid = topRow >= 0 && (grid[topRow][playerCol] === TILE.BRICK || grid[topRow][playerCol] === TILE.DIGGABLE);

    // Check if there's a ladder nearby (escape route)
    const hasLadder = player.isTouchingLadder(grid);

    // Check if this is the bottom row (row 12 = above the floor)
    // or if the tile below the current standing tile is the bottom floor
    const isBottomArea = bottomRow >= GRID_ROWS - 2;

    // If stuck in a hole at the bottom with walls on both sides, no ladder, and ceiling above
    if (leftSolid && rightSolid && ceilingSolid && !hasLadder && isBottomArea) {
      player.alive = false;
      game.lives--;
      game.state = GAME_STATE.DEAD;
      game.deathTimer = 60;
      return;
    }
  }

      // Check gold collection
      goldPositions.forEach(gold => {
        if (gold.collected) return;
        const goldX = gold.x * TILE_SIZE;
        const goldY = gold.y * TILE_SIZE;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.sqrt((px - goldX - TILE_SIZE / 2) ** 2 + (py - goldY - TILE_SIZE / 2) ** 2);
        if (dist < TILE_SIZE * 0.8) {
          gold.collected = true;
          game.score += 100;
          grid[gold.y][gold.x] = TILE.EMPTY;
        }
      });

      // Check if all gold collected
      game.allGoldCollected = goldPositions.length > 0 && goldPositions.every(g => g.collected);

      // Check exit
      if (game.allGoldCollected && exitPos) {
        const exitX = exitPos.x * TILE_SIZE;
        const exitY = exitPos.y * TILE_SIZE;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.sqrt((px - exitX - TILE_SIZE / 2) ** 2 + (py - exitY - TILE_SIZE / 2) ** 2);
        if (dist < TILE_SIZE * 0.8) {
          game.state = GAME_STATE.LEVEL_COMPLETE;
          game.levelCompleteTimer = 60;
          game.score += 500;
          return;
        }
      }

      // Update enemies
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.update(grid, player.x + player.width / 2, player.y + player.height / 2);

        // Check collision with player
        if (player.alive && checkCollision(player, enemy)) {
          player.alive = false;
          game.lives--;
          game.state = GAME_STATE.DEAD;
          game.deathTimer = 60;
          return;
        }

        // Check if enemy falls into a dug hole
        for (const hole of game.dugHoles) {
          const ecol = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
          const erow = Math.floor((enemy.y + enemy.height - 1) / TILE_SIZE);
          if (ecol === hole.x && erow === hole.y) {
            enemy.alive = false;
            game.score += 200;
          }
        }
      }
    }

    // ---- Drawing ----
    function drawMenu(frame) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 48px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOAD RUNNER', CANVAS_WIDTH / 2, 120);

      ctx.fillStyle = '#ecf0f1';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('A Classic Platformer', CANVAS_WIDTH / 2, 170);

      // Decorative gold bars
      for (let i = 0; i < 5; i++) {
        const gx = 100 + i * 150;
        const gy = 220 + Math.sin(frame * 0.03 + i) * 8;
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(gx - 12, gy - 6, 24, 12);
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(gx - 10, gy - 5, 10, 4);
      }

      const alpha = 0.5 + 0.5 * Math.sin(frame * 0.06);
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillText('Press ENTER or SPACE', CANVAS_WIDTH / 2, 300);

      ctx.fillStyle = '#bdc3c7';
      ctx.font = '14px "Courier New", monospace';
      const controls = [
        'Arrow Keys / WASD - Move & Climb',
        'Q / Z - Dig Left',
        'E / X - Dig Right',
        '',
        'Collect all gold, then reach the exit!',
        'Avoid enemies or dig holes to trap them!',
      ];
      controls.forEach((line, i) => {
        ctx.fillText(line, CANVAS_WIDTH / 2, 360 + i * 22);
      });
    }

    function drawOverlay(title, subtitle, frame) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

      ctx.fillStyle = '#ecf0f1';
      ctx.font = '20px "Courier New", monospace';
      ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

      const alpha = 0.5 + 0.5 * Math.sin(frame * 0.06);
      ctx.fillStyle = `rgba(189, 195, 199, ${alpha})`;
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('Press ENTER or SPACE to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    }

    function drawGame() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      switch (game.state) {
        case GAME_STATE.MENU:
          drawMenu(game.frame);
          break;
        case GAME_STATE.PLAYING:
          render(ctx, game);
          break;
        case GAME_STATE.DEAD:
          render(ctx, game);
          drawOverlay('YOU DIED!', `Lives: ${game.lives}`, game.frame);
          break;
        case GAME_STATE.LEVEL_COMPLETE:
          render(ctx, game);
          drawOverlay(`LEVEL ${game.level + 1} COMPLETE!`, `Score: ${game.score}`, game.frame);
          break;
        case GAME_STATE.GAME_OVER:
          drawOverlay('GAME OVER', `Final Score: ${game.score}`, game.frame);
          break;
        case GAME_STATE.WIN:
          drawOverlay('YOU WIN!', `Final Score: ${game.score}`, game.frame);
          break;
      }
    }

    // ---- Main loop ----
    let animId;
    function loop() {
      game.frame++;

      if (game.state === GAME_STATE.PLAYING) {
        try {
          updateGame();
        } catch (err) {
          console.error('[LoadRunner] Update error:', err);
        }
      } else if (game.state === GAME_STATE.DEAD) {
        game.deathTimer--;
      } else if (game.state === GAME_STATE.LEVEL_COMPLETE) {
        game.levelCompleteTimer--;
      }

      drawGame();
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />
      <div className="controls-hint">
        <span>Arrow/WASD: Move</span>
        <span>Q/Z: Dig Left</span>
        <span>E/X: Dig Right</span>
        <span>ENTER/SPACE: Start</span>
      </div>
    </div>
  );
}
