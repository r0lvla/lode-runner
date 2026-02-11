// Lode Runner - ZX Spectrum Clone
// Крюк 🪝 для Романа

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ZX Spectrum palette (bright)
const COLORS = {
    BLACK: '#000000',
    BLUE: '#0000D7',
    RED: '#D70000',
    MAGENTA: '#D700D7',
    GREEN: '#00D700',
    CYAN: '#00D7D7',
    YELLOW: '#D7D700',
    WHITE: '#D7D7D7',
    BRICK: '#8B4513',
    GOLD: '#FFD700',
    LADDER: '#FFFF00',
    BAR: '#00FFFF',
    PLAYER: '#00FF00',
    GUARD: '#FF0000',
    HOLE: '#4a2500'
};

// Game constants
const TILE_SIZE = 8;
const SCALE = 3; // Повышенное разрешение
const SCALED_TILE = TILE_SIZE * SCALE;
const LEVEL_WIDTH = 32;
const LEVEL_HEIGHT = 24;

// Timing - ещё медленнее на 10%
const MOVE_DELAY = 182; // ms между движениями (было 165, +10%)
const FALL_DELAY = 97; // ms при падении (было 88, +10%)
const GUARD_MOVE_DELAY = 290; // ms между движениями охранника (было 242, +20%)
const ANIMATION_SPEED = 10; // скорость анимации (медленнее = плавнее)
const HOLE_CLOSE_TIME = 2500; // время закрытия ямы (было 5000, теперь в 2 раза быстрее)

// Tile types
const EMPTY = 0;
const BRICK = 1;
const SOLID = 2;
const LADDER = 3;
const BAR = 4;
const GOLD = 5;
const TRAP = 6;
const HIDDEN_LADDER = 7;

// Game state
let level = [];
let player = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    smoothX: 0, smoothY: 0, // для плавного движения
    moving: false,
    facing: 1, // 1 = right, -1 = left
    onLadder: false,
    onBar: false,
    falling: false,
    animFrame: 0,
    lastMoveTime: 0
};
let guards = [];
let goldCount = 0;
let goldCollected = 0;
let lives = 3;
let currentLevel = 1;
let gameOver = false;
let levelComplete = false;
let hiddenLaddersRevealed = false;
let holes = [];
let gameTime = 0;
let lastTime = 0;

// Input
const keys = {};

// Level 1 - классический Lode Runner с выходом через скрытые лестницы
const LEVEL1 = [
    "################################",
    "#                              #",
    "#  L                        L  #",  // Скрытые лестницы - появятся после сбора золота
    "#  L                        L  #",
    "#  HHHHHHHHHHHHHHHHHHHHHHHHHH  #",  // Обычная лестница
    "#        H              H      #",
    "#   $    H    $$$ $$$   H   $  #",
    "#        H              H      #",
    "#        H   --------   H      #",
    "#   $    H              H   $  #",
    "#        H              H      #",
    "#        H   --------   H      #",
    "#   $    H              H   $  #",
    "#        H              H      #",
    "#        H    $$$ $$$   H      #",
    "#   $    H              H   $  #",
    "#        H              H      #",
    "#        H   --------   H      #",
    "#   $    H              H   $  #",
    "#        H              H      #",
    "#   P    HHHHHHHHHHHHHHHH    G #",
    "#        H              H      #",
    "################################",
    "################################"
];

// Level 2 - больше врагов, сложнее
const LEVEL2 = [
    "################################",
    "#                              #",
    "#     L                    L   #",
    "#     L                    L   #",
    "#  HHHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#     H                  H     #",
    "#  $  H   $$$$$$$$$$     H  $  #",
    "#     H                  H     #",
    "#     H  ----------      H     #",
    "#     H              H   H     #",
    "#     H   $$$$   $$   H   H    #",
    "#     H              H   H     #",
    "#  HHHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#        H          H          #",
    "#  $     H   ----   H     $    #",
    "#        H          H          #",
    "#  HHHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#     H                  H     #",
    "#  $  H    $$    $$     H  $   #",
    "#     H                  H     #",
    "#  P  HHHHHHHHHHHHHHHHHHHHH G G#",
    "#     H                  H     #",
    "################################",
    "################################"
];

// Level 3 - лабиринт
const LEVEL3 = [
    "################################",
    "#                              #",
    "#L                            L#",
    "#L                            L#",
    "#HHHHHHHHHHH    HHHHHHHHHHHHHH #",
    "#    -----H    H---------------#",
    "# $$$$$   H----H   $$$$$$$$$   #",
    "#         H    H               #",
    "##########H    H###########    #",
    "#         H    H        $$     #",
    "# $$$$$   H    H   $$$$        #",
    "#         H    H               #",
    "#HHHHHHHHHH    HHHHHHHHHHHHHHH #",
    "#              H               #",
    "# $$$$$$       H    $$$$$$$$$  #",
    "#              H               #",
    "#HHHHHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#         H          H         #",
    "# $$$$$   H   ----   H   $$$   #",
    "#         H          H         #",
    "# P   HHHHHHHHHHHHHHHHHHH  G   #",
    "#         H          H         #",
    "################################",
    "################################"
];

// Level 4 - много перекладин
const LEVEL4 = [
    "################################",
    "#                              #",
    "#   L                      L   #",
    "#   L                      L   #",
    "#   HHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#         H          H         #",
    "#   $$    H----------H   $$    #",
    "#         H          H         #",
    "#   HHHHHHHHHHHHHHHHHHHHHHHH   #",
    "#         H          H         #",
    "#   $$$   H----------H  $$$    #",
    "#         H          H         #",
    "#   HHHHHHHHHHHHHHHHHHHHHHHHH  #",
    "#         H          H         #",
    "#   $$    H----------H   $$    #",
    "#         H          H         #",
    "#   HHHHHHHHHHHHHHHHHHHHHHHH   #",
    "#         H          H         #",
    "#   $$$$$ H----------H $$$$$   #",
    "#         H          H         #",
    "# P   HHHHHHHHHHHHHHHHHHH G    #",
    "#         H          H         #",
    "################################",
    "################################"
];

// Level 5 - финальный, много врагов
const LEVEL5 = [
    "################################",
    "#                              #",
    "#L                            L#",
    "#L                            L#",
    "#HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH#",
    "#H       H          H        H #",
    "#H  $$$  H----------H  $$$   H #",
    "#H       H          H        H #",
    "#HHHHHHHHH          HHHHHHHHHH #",
    "#H       H          H        H #",
    "#H  $$$$ H----------H $$$$$  H #",
    "#H       H          H        H #",
    "#HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH#",
    "#H       H          H        H #",
    "#H  $$$  H----------H  $$$   H #",
    "#H       H          H        H #",
    "#HHHHHHHHH          HHHHHHHHHH #",
    "#H       H          H        H #",
    "#H  $$$$ H----------H $$$$$  H #",
    "#H       H          H        H #",
    "#HP  HHHHHHHHHHHHHHHHHHHHH  GGG#",
    "#H       H          H        H #",
    "################################",
    "################################"
];

const LEVELS = [LEVEL1, LEVEL2, LEVEL3, LEVEL4, LEVEL5];

function parseLevel(levelData) {
    level = [];
    goldCount = 0;
    guards = [];

    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        level[y] = [];
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            const char = levelData[y][x];
            switch (char) {
                case '#':
                    level[y][x] = BRICK;
                    break;
                case 'H':
                    level[y][x] = LADDER;
                    break;
                case '-':
                    level[y][x] = BAR;
                    break;
                case '$':
                    level[y][x] = GOLD;
                    goldCount++;
                    break;
                case 'S':
                    level[y][x] = SOLID;
                    break;
                case 'T':
                    level[y][x] = TRAP;
                    break;
                case 'L':
                    level[y][x] = HIDDEN_LADDER;
                    break;
                case 'P':
                    level[y][x] = EMPTY;
                    player.x = player.targetX = player.smoothX = x;
                    player.y = player.targetY = player.smoothY = y;
                    break;
                case 'G':
                    level[y][x] = EMPTY;
                    guards.push({
                        x: x, y: y,
                        targetX: x, targetY: y,
                        moving: false,
                        facing: -1,
                        hasGold: false,
                        goldTimer: 0,
                        inHole: false,
                        holeTimer: 0,
                        dead: false,
                        animFrame: 0,
                        lastMoveTime: 0
                    });
                    break;
                default:
                    level[y][x] = EMPTY;
            }
        }
    }

    hiddenLaddersRevealed = false;
    goldCollected = 0;
    holes = [];
    levelComplete = false;
    gameOver = false;
}

function init() {
    parseLevel(LEVELS[currentLevel - 1]);
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Drawing functions
function drawTile(x, y, type) {
    const px = x * SCALED_TILE;
    const py = y * SCALED_TILE;

    const hole = holes.find(h => h.x === x && h.y === y);
    if (hole && level[y][x] === BRICK) {
        ctx.fillStyle = COLORS.BRICK;
        ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
        const holeSize = (hole.stage / 5) * SCALED_TILE;
        ctx.fillStyle = COLORS.BLACK;
        ctx.fillRect(px + (SCALED_TILE - holeSize) / 2, py, holeSize, SCALED_TILE);
        return;
    }

    switch (type) {
        case BRICK:
            ctx.fillStyle = COLORS.BRICK;
            ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
            ctx.fillStyle = COLORS.BLACK;
            ctx.fillRect(px, py + SCALED_TILE - 2, SCALED_TILE, 2);
            ctx.fillRect(px + SCALED_TILE/2 - 1, py, 2, SCALED_TILE/2);
            ctx.fillRect(px, py + SCALED_TILE/2 - 1, SCALED_TILE/2, 2);
            ctx.fillRect(px + SCALED_TILE/2, py + SCALED_TILE - 3, SCALED_TILE/2, 2);
            break;

        case SOLID:
            ctx.fillStyle = COLORS.WHITE;
            ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
            ctx.fillStyle = COLORS.BLACK;
            ctx.fillRect(px + 2, py + 2, SCALED_TILE - 4, SCALED_TILE - 4);
            break;

        case LADDER:
            ctx.fillStyle = COLORS.LADDER;
            ctx.fillRect(px + 1, py, 2, SCALED_TILE);
            ctx.fillRect(px + SCALED_TILE - 3, py, 2, SCALED_TILE);
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(px + 2, py + 2 + i * 3, SCALED_TILE - 4, 2);
            }
            break;

        case HIDDEN_LADDER:
            if (hiddenLaddersRevealed) {
                ctx.fillStyle = COLORS.LADDER;
                ctx.fillRect(px + 1, py, 2, SCALED_TILE);
                ctx.fillRect(px + SCALED_TILE - 3, py, 2, SCALED_TILE);
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(px + 2, py + 2 + i * 3, SCALED_TILE - 4, 2);
                }
            }
            break;

        case BAR:
            ctx.fillStyle = COLORS.BAR;
            ctx.fillRect(px, py + SCALED_TILE/2 - 1, SCALED_TILE, 3);
            ctx.fillRect(px, py + SCALED_TILE/2 - 3, 3, 7);
            ctx.fillRect(px + SCALED_TILE - 3, py + SCALED_TILE/2 - 3, 3, 7);
            break;

        case GOLD:
            // Яркое манящее золото
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(px + 1, py + 1, SCALED_TILE - 2, SCALED_TILE - 2);
            // Блеск
            ctx.fillStyle = '#FFEC8B';
            ctx.fillRect(px + 2, py + 2, SCALED_TILE - 4, SCALED_TILE - 4);
            // Яркий блик
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px + 3, py + 3, 3, 3);
            break;
    }
}

function drawPlayer() {
    // Плавная интерполяция позиции
    const lerp = 0.3;
    player.smoothX += (player.x - player.smoothX) * lerp;
    player.smoothY += (player.y - player.smoothY) * lerp;
    
    const px = player.smoothX * SCALED_TILE;
    const py = player.smoothY * SCALED_TILE;

    ctx.fillStyle = COLORS.PLAYER;

    // Более детализированный персонаж
    // Body
    ctx.fillRect(px + 3, py + 4, SCALED_TILE - 6, SCALED_TILE - 5);

    // Head
    ctx.fillRect(px + 3, py + 1, SCALED_TILE - 6, 4);
    
    // Eyes
    ctx.fillStyle = COLORS.BLACK;
    if (player.facing > 0) {
        ctx.fillRect(px + SCALED_TILE - 5, py + 2, 2, 2);
    } else {
        ctx.fillRect(px + 3, py + 2, 2, 2);
    }

    // Legs animation
    ctx.fillStyle = COLORS.PLAYER;
    if (player.moving && !player.falling && !player.onLadder) {
        const legOffset = Math.floor(player.animFrame / ANIMATION_SPEED) % 2;
        ctx.fillRect(px + 3, py + SCALED_TILE - 2, 3, 2);
        ctx.fillRect(px + SCALED_TILE - 6 + legOffset, py + SCALED_TILE - 2, 3, 2);
    } else if (player.falling) {
        // Falling pose - руки вверх
        ctx.fillRect(px + 2, py + SCALED_TILE - 2, 3, 2);
        ctx.fillRect(px + SCALED_TILE - 5, py + SCALED_TILE - 2, 3, 2);
        ctx.fillRect(px + 1, py + 2, 2, 3);
        ctx.fillRect(px + SCALED_TILE - 3, py + 2, 2, 3);
    } else {
        ctx.fillRect(px + 3, py + SCALED_TILE - 2, 3, 2);
        ctx.fillRect(px + SCALED_TILE - 6, py + SCALED_TILE - 2, 3, 2);
    }

    // Arms animation
    if (player.moving && !player.onLadder && !player.falling) {
        const armOffset = Math.floor(player.animFrame / ANIMATION_SPEED) % 2;
        ctx.fillRect(px + (player.facing > 0 ? SCALED_TILE - 2 : 0), py + 4 + armOffset, 2, 3);
    } else if (player.onLadder) {
        ctx.fillRect(px + 1, py + 5, 2, 3);
        ctx.fillRect(px + SCALED_TILE - 3, py + 5, 2, 3);
    }
}

function drawGuard(guard) {
    if (guard.dead) return;

    const px = guard.x * SCALED_TILE;
    const py = guard.y * SCALED_TILE;

    // Детализированный скелет-охранник
    ctx.fillStyle = guard.hasGold ? COLORS.GOLD : COLORS.GUARD;
    
    // Skull head
    ctx.fillRect(px + 2, py + 1, SCALED_TILE - 4, 4);
    ctx.fillStyle = COLORS.BLACK;
    // Eye sockets
    ctx.fillRect(px + 3, py + 2, 2, 2);
    ctx.fillRect(px + SCALED_TILE - 5, py + 2, 2, 2);
    // Nose hole
    ctx.fillRect(px + SCALED_TILE/2 - 1, py + 3, 2, 1);
    
    // Ribs
    ctx.fillStyle = guard.hasGold ? COLORS.GOLD : COLORS.GUARD;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + 4, py + 5 + i * 2, SCALED_TILE - 8, 1);
    }
    
    // Spine
    ctx.fillRect(px + SCALED_TILE/2 - 1, py + 5, 2, SCALED_TILE - 8);
    
    // Legs animation
    if (guard.moving) {
        const legOffset = Math.floor(guard.animFrame / ANIMATION_SPEED) % 2;
        ctx.fillRect(px + 3, py + SCALED_TILE - 2, 2, 2);
        ctx.fillRect(px + SCALED_TILE - 5 + legOffset, py + SCALED_TILE - 2, 2, 2);
    } else {
        ctx.fillRect(px + 3, py + SCALED_TILE - 2, 2, 2);
        ctx.fillRect(px + SCALED_TILE - 5, py + SCALED_TILE - 2, 2, 2);
    }

    // In hole - shake animation
    if (guard.inHole) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const shake = Math.floor(guard.animFrame / 3) % 2;
        ctx.fillRect(px + shake, py, SCALED_TILE, SCALED_TILE);
    }
}

function draw() {
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            drawTile(x, y, level[y][x]);
        }
    }

    drawPlayer();
    guards.forEach(drawGuard);

    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    document.getElementById('gold').textContent = `Gold: ${goldCollected}/${goldCount}`;
    document.getElementById('lives').textContent = `Lives: ${lives}`;
}

// Movement helpers
function canMove(x, y) {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return false;
    const tile = level[y][x];
    // HIDDEN_LADDER всегда проходима, но отображается только после сбора золота
    return tile === EMPTY || tile === LADDER || tile === BAR || tile === GOLD ||
           tile === TRAP || tile === HIDDEN_LADDER;
}

function isSolid(x, y) {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return true;
    const tile = level[y][x];
    return tile === BRICK || tile === SOLID;
}

function isOnGround(x, y) {
    if (y >= LEVEL_HEIGHT - 1) return true;
    
    // Check if guard in hole below - can walk on guard's head
    const guardInHole = guards.find(g => !g.dead && g.inHole && g.x === x && g.y === y + 1);
    if (guardInHole) return true;
    
    const below = level[y + 1][x];
    return below === BRICK || below === SOLID || below === LADDER;
}

function isOnLadder(x, y) {
    const tile = level[y][x];
    return tile === LADDER || (tile === HIDDEN_LADDER && hiddenLaddersRevealed);
}

function isOnBar(x, y) {
    return level[y][x] === BAR;
}

function digHole(dir) {
    // Копаем по диагонали вниз (вправо-вниз или влево-вниз)
    const digX = player.x + dir;
    const digY = player.y + 1; // Копаем на уровень ниже

    if (digX < 0 || digX >= LEVEL_WIDTH) return;
    if (digY >= LEVEL_HEIGHT) return;
    if (level[digY][digX] !== BRICK) return;
    if (holes.find(h => h.x === digX && h.y === digY)) return;

    holes.push({ x: digX, y: digY, timer: 0, stage: 0, digging: true });
}

function updateHoles(dt) {
    for (let i = holes.length - 1; i >= 0; i--) {
        const hole = holes[i];
        hole.timer += dt;

        if (hole.digging) {
            if (hole.timer >= 200) {
                hole.stage++;
                hole.timer = 0;
                if (hole.stage >= 5) {
                    hole.digging = false;
                    hole.stage = 5;
                    hole.timer = 0;
                    level[hole.y][hole.x] = EMPTY;
                }
            }
        } else {
            if (hole.timer >= HOLE_CLOSE_TIME) { // 2.5 секунды до закрытия (в 2 раза быстрее)
                hole.stage--;
                hole.timer = 0;
                if (hole.stage <= 0) {
                    level[hole.y][hole.x] = BRICK;
                    holes.splice(i, 1);

                    if (player.x === hole.x && player.y === hole.y) {
                        playerDie();
                    }

                    // Guard dies if trapped
                    guards.forEach(g => {
                        if (g.x === hole.x && g.y === hole.y && g.inHole) {
                            g.dead = true;
                            setTimeout(() => {
                                g.dead = false;
                                g.x = Math.floor(LEVEL_WIDTH / 2);
                                g.y = 1;
                                g.inHole = false;
                            }, 2000);
                        }
                    });
                }
            }
        }
    }
}

function updatePlayer(dt) {
    const now = performance.now();
    player.animFrame++;

    player.onLadder = isOnLadder(player.x, player.y);
    player.onBar = isOnBar(player.x, player.y);

    // Check falling
    if (!isOnGround(player.x, player.y) && !player.onLadder && !player.onBar) {
        player.falling = true;
        if (now - player.lastMoveTime >= FALL_DELAY) {
            if (canMove(player.x, player.y + 1)) {
                player.y++;
                player.lastMoveTime = now;
                
                // Collect gold while falling
                if (level[player.y][player.x] === GOLD) {
                    level[player.y][player.x] = EMPTY;
                    goldCollected++;
                    if (goldCollected >= goldCount) {
                        hiddenLaddersRevealed = true;
                    }
                }
            } else {
                player.falling = false;
            }
        }
        return;
    } else {
        player.falling = false;
    }

    // Movement with delay
    if (now - player.lastMoveTime < MOVE_DELAY) return;

    let moved = false;

    // Horizontal
    if (keys['ArrowLeft'] || keys['KeyA']) {
        if (canMove(player.x - 1, player.y)) {
            player.x--;
            player.facing = -1;
            moved = true;
        }
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        if (canMove(player.x + 1, player.y)) {
            player.x++;
            player.facing = 1;
            moved = true;
        }
    }

    // Vertical (ladders) - can start climbing down if ladder below
    const ladderBelow = player.y < LEVEL_HEIGHT - 1 && isOnLadder(player.x, player.y + 1);
    if (player.onLadder || ladderBelow) {
        if (keys['ArrowUp'] || keys['KeyW']) {
            if (canMove(player.x, player.y - 1)) {
                player.y--;
                moved = true;
            }
        } else if (keys['ArrowDown'] || keys['KeyS']) {
            if (player.y < LEVEL_HEIGHT - 1 && canMove(player.x, player.y + 1)) {
                player.y++;
                moved = true;
            }
        }
    }

    // Drop from bar
    if (player.onBar && (keys['ArrowDown'] || keys['KeyS'])) {
        player.y++;
        moved = true;
    }

    player.moving = moved;
    if (moved) player.lastMoveTime = now;

    // Digging
    if ((keys['KeyZ'] || keys['Space']) && !player.moving) {
        digHole(player.facing);
    }

    // Collect gold
    if (level[player.y][player.x] === GOLD) {
        level[player.y][player.x] = EMPTY;
        goldCollected++;

        if (goldCollected >= goldCount) {
            hiddenLaddersRevealed = true;
        }
    }

    // Check escape - только через скрытые лестницы после сбора всего золота
    const playerTile = level[player.y][player.x];
    if (playerTile === HIDDEN_LADDER && hiddenLaddersRevealed) {
        levelComplete = true;
    }
}

function updateGuards(dt) {
    const now = performance.now();

    guards.forEach(guard => {
        if (guard.dead) return;

        guard.animFrame++;

        const hole = holes.find(h => h.x === guard.x && h.y === guard.y && !h.digging);
        if (hole) {
            guard.inHole = true;
            guard.holeTimer += dt;

            if (guard.hasGold && guard.holeTimer > 500) {
                if (guard.y > 0 && level[guard.y - 1][guard.x] === EMPTY) {
                    level[guard.y - 1][guard.x] = GOLD;
                }
                guard.hasGold = false;
            }

            if (guard.holeTimer >= 4000) {
                guard.inHole = false;
                guard.holeTimer = 0;
                guard.y--;
            }
            return;
        }

        guard.inHole = false;
        guard.holeTimer = 0;

        if (now - guard.lastMoveTime < GUARD_MOVE_DELAY) return;

        const dx = player.x - guard.x;
        const dy = player.y - guard.y;

        const guardOnLadder = isOnLadder(guard.x, guard.y);
        const guardOnGround = isOnGround(guard.x, guard.y);

        let moved = false;

        // Fall if not on ground
        if (!guardOnGround && !guardOnLadder) {
            if (canMove(guard.x, guard.y + 1)) {
                guard.y++;
                moved = true;
            }
        }
        // Smart pathfinding - chase player including ladders
        else {
            // Try to find best direction towards player
            let bestMove = null;
            let bestDist = Infinity;
            
            // Check if can climb: already on ladder OR ladder adjacent (up or down)
            const ladderAbove = guard.y > 0 && isOnLadder(guard.x, guard.y - 1);
            const ladderBelow = guard.y < LEVEL_HEIGHT - 1 && isOnLadder(guard.x, guard.y + 1);
            const canClimbUp = isOnLadder(guard.x, guard.y) || ladderAbove;
            const canClimbDown = isOnLadder(guard.x, guard.y) || ladderBelow;
            
            // Priority 1: Go up if player is above and can climb
            if (dy < 0 && canClimbUp && guard.y > 0) {
                const targetTile = level[guard.y - 1][guard.x];
                if (targetTile === EMPTY || targetTile === LADDER || targetTile === BAR || targetTile === GOLD ||
                    (targetTile === HIDDEN_LADDER && hiddenLaddersRevealed)) {
                    const dist = Math.abs(player.x - guard.x) + Math.abs(player.y - (guard.y - 1));
                    if (dist < bestDist) {
                        bestMove = { x: guard.x, y: guard.y - 1, facing: guard.facing };
                        bestDist = dist;
                    }
                }
            }
            
            // Priority 2: Horizontal movement towards player
            if (dx > 0 && canMove(guard.x + 1, guard.y)) {
                const dist = Math.abs(player.x - (guard.x + 1)) + Math.abs(player.y - guard.y);
                if (dist < bestDist) {
                    bestMove = { x: guard.x + 1, y: guard.y, facing: 1 };
                    bestDist = dist;
                }
            } 
            if (dx < 0 && canMove(guard.x - 1, guard.y)) {
                const dist = Math.abs(player.x - (guard.x - 1)) + Math.abs(player.y - guard.y);
                if (dist < bestDist) {
                    bestMove = { x: guard.x - 1, y: guard.y, facing: -1 };
                    bestDist = dist;
                }
            }
            
            // Priority 3: Go down if player is below and can climb down
            if (dy > 0 && canClimbDown && guard.y < LEVEL_HEIGHT - 1) {
                if (canMove(guard.x, guard.y + 1)) {
                    const dist = Math.abs(player.x - guard.x) + Math.abs(player.y - (guard.y + 1));
                    if (dist < bestDist) {
                        bestMove = { x: guard.x, y: guard.y + 1, facing: guard.facing };
                        bestDist = dist;
                    }
                }
            }
            
            // Execute best move
            if (bestMove) {
                guard.x = bestMove.x;
                guard.y = bestMove.y;
                guard.facing = bestMove.facing;
                moved = true;
            }
        }

        guard.moving = moved;
        if (moved) guard.lastMoveTime = now;

        // Collect gold
        if (level[guard.y][guard.x] === GOLD && !guard.hasGold) {
            level[guard.y][guard.x] = EMPTY;
            guard.hasGold = true;
            guard.goldTimer = 150 + Math.floor(Math.random() * 100);
        }

        // Drop gold
        if (guard.hasGold) {
            guard.goldTimer--;
            if (guard.goldTimer <= 0 && level[guard.y][guard.x] === EMPTY) {
                level[guard.y][guard.x] = GOLD;
                guard.hasGold = false;
            }
        }

        // Collision with player
        if (guard.x === player.x && guard.y === player.y && !guard.inHole) {
            playerDie();
        }
    });
}

function playerDie() {
    lives--;
    if (lives <= 0) {
        gameOver = true;
    } else {
        parseLevel(LEVELS[currentLevel - 1]);
    }
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > LEVELS.length) {
        // Победа! Прошли все уровни
        currentLevel = 1;
        lives = 3;
    } else {
        lives++;
    }
    parseLevel(LEVELS[currentLevel - 1]);
}

function update(dt) {
    if (gameOver || levelComplete) return;

    updateHoles(dt);
    updatePlayer(dt);
    updateGuards(dt);
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    gameTime += dt;

    update(dt);
    draw();

    if (levelComplete) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.GOLD;
        ctx.font = '28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('Tap to continue', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.RED;
        ctx.font = '28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 20);
    }

    requestAnimationFrame(gameLoop);
}

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Enter' && levelComplete) {
        nextLevel();
    }
    if (e.code === 'KeyR' && gameOver) {
        gameOver = false;
        lives = 3;
        currentLevel = 1;
        parseLevel(LEVEL1);
    }

    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Touch controls
function setupTouchButton(id, keyCode) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const activate = (e) => {
        e.preventDefault();
        keys[keyCode] = true;
        btn.classList.add('active');
    };

    const deactivate = (e) => {
        e.preventDefault();
        keys[keyCode] = false;
        btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', activate, { passive: false });
    btn.addEventListener('touchend', deactivate, { passive: false });
    btn.addEventListener('touchcancel', deactivate, { passive: false });

    btn.addEventListener('mousedown', activate);
    btn.addEventListener('mouseup', deactivate);
    btn.addEventListener('mouseleave', deactivate);
}

setupTouchButton('btn-up', 'ArrowUp');
setupTouchButton('btn-down', 'ArrowDown');
setupTouchButton('btn-left', 'ArrowLeft');
setupTouchButton('btn-right', 'ArrowRight');
setupTouchButton('btn-dig', 'Space');

canvas.addEventListener('click', () => {
    if (levelComplete) {
        nextLevel();
    } else if (gameOver) {
        gameOver = false;
        lives = 3;
        currentLevel = 1;
        parseLevel(LEVEL1);
    }
});

// Start game
init();
