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

// Game constants - ZX Spectrum 256x192 scaled 2x
const TILE_SIZE = 8;
const SCALE = 2;
const SCALED_TILE = TILE_SIZE * SCALE;
const LEVEL_WIDTH = 32;
const LEVEL_HEIGHT = 24;

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
let player = { x: 0, y: 0, vx: 0, vy: 0, digging: false, digTimer: 0, digX: -1, digY: -1 };
let guards = [];
let goldCount = 0;
let goldCollected = 0;
let lives = 3;
let currentLevel = 1;
let gameOver = false;
let levelComplete = false;
let hiddenLaddersRevealed = false;
let holes = []; // {x, y, timer, stage}

// Input
const keys = {};

// Level 1 - classic layout
const LEVEL1 = [
    "################################",
    "#                              #",
    "#                              #",
    "#  $   $   $   $   $           #",
    "#  #####  HHHHHHHHHH  #####    #",
    "#        H            H        #",
    "#  ##### H  $   $   $ H #####  #",
    "#        H HHHHHHHHHH H        #",
    "#  ##### H            H #####  #",
    "#        H   ######## H        #",
    "#  ##### H   #      # H #####  #",
    "#        H   # $$$$ # H        #",
    "#  ##### H   # #### # H #####  #",
    "#        H   #      # H        #",
    "#  ##### H   ######## H #####  #",
    "#        H              H      #",
    "#  ##### HHHHHHHHHHHHHHH ##### #",
    "#        H              H      #",
    "#  ##### H    HHHH     H ##### #",
    "#        H    H    $   H       #",
    "#  HHHHHHH    H HHHHHH HHHHHHH #",
    "#             H        H       #",
    "#    P        HHHHHHHHHH   G   #",
    "################################"
];

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
                    player.x = x;
                    player.y = y;
                    break;
                case 'G':
                    level[y][x] = EMPTY;
                    guards.push({ 
                        x: x, y: y, 
                        vx: 0, vy: 0,
                        hasGold: false,
                        goldTimer: 0,
                        inHole: false,
                        holeTimer: 0,
                        dead: false,
                        direction: 1
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
}

function init() {
    parseLevel(LEVEL1);
    gameLoop();
}

// Drawing functions
function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALED_TILE, y * SCALED_TILE, w * SCALED_TILE, h * SCALED_TILE);
}

function drawTile(x, y, type) {
    const px = x * SCALED_TILE;
    const py = y * SCALED_TILE;
    
    // Check if there's an active hole at this position
    const hole = holes.find(h => h.x === x && h.y === y);
    if (hole && level[y][x] === BRICK) {
        // Draw partially dug brick
        const stage = hole.stage;
        ctx.fillStyle = COLORS.BRICK;
        ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
        
        // Draw hole animation (gets bigger)
        const holeSize = (stage / 5) * SCALED_TILE;
        ctx.fillStyle = COLORS.BLACK;
        ctx.fillRect(px + (SCALED_TILE - holeSize) / 2, py, holeSize, SCALED_TILE);
        return;
    }
    
    switch (type) {
        case BRICK:
            ctx.fillStyle = COLORS.BRICK;
            ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
            // Brick pattern
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
            // Side rails
            ctx.fillRect(px + 1, py, 2, SCALED_TILE);
            ctx.fillRect(px + SCALED_TILE - 3, py, 2, SCALED_TILE);
            // Rungs
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
            // Ends
            ctx.fillRect(px, py + SCALED_TILE/2 - 3, 3, 7);
            ctx.fillRect(px + SCALED_TILE - 3, py + SCALED_TILE/2 - 3, 3, 7);
            break;
            
        case GOLD:
            ctx.fillStyle = COLORS.GOLD;
            ctx.fillRect(px + 2, py + 2, SCALED_TILE - 4, SCALED_TILE - 4);
            ctx.fillStyle = COLORS.YELLOW;
            ctx.fillRect(px + 3, py + 3, SCALED_TILE - 6, SCALED_TILE - 6);
            break;
            
        case TRAP:
            // Looks like brick but player falls through
            ctx.fillStyle = COLORS.BRICK;
            ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
            // Hidden indicator (subtle)
            ctx.fillStyle = 'rgba(255,0,0,0.2)';
            ctx.fillRect(px + 2, py + 2, 4, 4);
            break;
    }
}

function drawPlayer() {
    const px = player.x * SCALED_TILE;
    const py = player.y * SCALED_TILE;
    
    // Body
    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(px + 2, py + 2, SCALED_TILE - 4, SCALED_TILE - 2);
    // Head
    ctx.fillRect(px + 3, py, SCALED_TILE - 6, 3);
    // Arms (animated based on movement)
    if (player.vx !== 0) {
        const armOffset = Math.floor(Date.now() / 100) % 2 === 0 ? 1 : -1;
        ctx.fillRect(px + (player.vx > 0 ? SCALED_TILE - 2 : 0), py + 3 + armOffset, 2, 3);
    }
}

function drawGuard(guard) {
    if (guard.dead) return;
    
    const px = guard.x * SCALED_TILE;
    const py = guard.y * SCALED_TILE;
    
    // Body
    ctx.fillStyle = guard.hasGold ? COLORS.GOLD : COLORS.GUARD;
    ctx.fillRect(px + 2, py + 2, SCALED_TILE - 4, SCALED_TILE - 2);
    // Head
    ctx.fillRect(px + 3, py, SCALED_TILE - 6, 3);
    
    // In hole animation
    if (guard.inHole) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px, py, SCALED_TILE, SCALED_TILE);
    }
}

function draw() {
    // Clear
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw level
    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            drawTile(x, y, level[y][x]);
        }
    }
    
    // Draw player
    drawPlayer();
    
    // Draw guards
    guards.forEach(drawGuard);
    
    // Update UI
    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    document.getElementById('gold').textContent = `Gold: ${goldCollected}/${goldCount}`;
    document.getElementById('lives').textContent = `Lives: ${lives}`;
}

// Physics and movement
function canMove(x, y) {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return false;
    const tile = level[y][x];
    return tile === EMPTY || tile === LADDER || tile === BAR || tile === GOLD || 
           tile === TRAP || (tile === HIDDEN_LADDER && hiddenLaddersRevealed);
}

function isSolid(x, y) {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return true;
    const tile = level[y][x];
    return tile === BRICK || tile === SOLID;
}

function isOnGround(x, y) {
    if (y >= LEVEL_HEIGHT - 1) return true;
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
    const digX = player.x + dir;
    const digY = player.y;
    
    // Can only dig bricks to the left or right, not below
    if (digX < 0 || digX >= LEVEL_WIDTH) return;
    if (level[digY][digX] !== BRICK) return;
    
    // Check if there's already a hole being dug there
    if (holes.find(h => h.x === digX && h.y === digY)) return;
    
    // Start digging
    holes.push({ x: digX, y: digY, timer: 0, stage: 0, digging: true });
}

function updateHoles() {
    for (let i = holes.length - 1; i >= 0; i--) {
        const hole = holes[i];
        hole.timer++;
        
        if (hole.digging) {
            // Digging animation
            if (hole.timer >= 3) {
                hole.stage++;
                hole.timer = 0;
                if (hole.stage >= 5) {
                    // Hole fully dug
                    hole.digging = false;
                    hole.stage = 5;
                    hole.timer = 0;
                    level[hole.y][hole.x] = EMPTY; // Make passable
                }
            }
        } else {
            // Hole starts to fill after time
            if (hole.timer >= 180) { // ~3 seconds at 60fps
                hole.stage--;
                hole.timer = 0;
                if (hole.stage <= 0) {
                    // Hole fully closed
                    level[hole.y][hole.x] = BRICK;
                    holes.splice(i, 1);
                    
                    // Check if player is trapped
                    if (player.x === hole.x && player.y === hole.y) {
                        playerDie();
                    }
                }
            }
        }
    }
}

function updatePlayer() {
    // Horizontal movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        if (canMove(player.x - 1, player.y) || isOnLadder(player.x, player.y)) {
            player.vx = -1;
        }
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        if (canMove(player.x + 1, player.y) || isOnLadder(player.x, player.y)) {
            player.vx = 1;
        }
    } else {
        player.vx = 0;
    }
    
    // Vertical movement (ladders)
    if (isOnLadder(player.x, player.y)) {
        if (keys['ArrowUp'] || keys['KeyW']) {
            if (canMove(player.x, player.y - 1)) {
                player.vy = -1;
            }
        } else if (keys['ArrowDown'] || keys['KeyS']) {
            if (player.y < LEVEL_HEIGHT - 1 && canMove(player.x, player.y + 1)) {
                player.vy = 1;
            }
        } else {
            player.vy = 0;
        }
    } else if (isOnBar(player.x, player.y)) {
        // Can drop from bar
        if (keys['ArrowDown'] || keys['KeyS']) {
            player.vy = 1;
        } else {
            player.vy = 0;
        }
    } else {
        // Gravity - fall if not on ground
        if (!isOnGround(player.x, player.y)) {
            player.vy = 1;
        } else {
            player.vy = 0;
        }
    }
    
    // Digging
    if ((keys['KeyZ'] || keys['Space']) && !player.digging) {
        if (keys['ArrowLeft'] || player.vx < 0) {
            digHole(-1);
        } else if (keys['ArrowRight'] || player.vx > 0) {
            digHole(1);
        } else {
            // Dig in facing direction (default right)
            digHole(1);
        }
    }
    
    // Apply movement
    if (player.vx !== 0 && canMove(player.x + player.vx, player.y)) {
        player.x += player.vx;
    }
    if (player.vy !== 0 && canMove(player.x, player.y + player.vy)) {
        player.y += player.vy;
    }
    
    // Collect gold
    if (level[player.y][player.x] === GOLD) {
        level[player.y][player.x] = EMPTY;
        goldCollected++;
        
        // Reveal hidden ladders when all gold collected
        if (goldCollected >= goldCount) {
            hiddenLaddersRevealed = true;
        }
    }
    
    // Check for escape (reached top with all gold)
    if (hiddenLaddersRevealed && player.y <= 1) {
        levelComplete = true;
    }
    
    // Fall into trap
    if (level[player.y][player.x] === TRAP) {
        level[player.y][player.x] = EMPTY;
    }
}

function updateGuards() {
    guards.forEach(guard => {
        if (guard.dead) return;
        
        // Check if in hole
        const hole = holes.find(h => h.x === guard.x && h.y === guard.y && !h.digging);
        if (hole) {
            guard.inHole = true;
            guard.holeTimer++;
            
            // Guard drops gold in hole
            if (guard.hasGold && guard.holeTimer === 10) {
                level[guard.y - 1 < 0 ? guard.y : guard.y - 1][guard.x] = GOLD;
                guard.hasGold = false;
            }
            
            // Guard climbs out after time
            if (guard.holeTimer >= 120) {
                guard.inHole = false;
                guard.holeTimer = 0;
                guard.y--;
            }
            
            // Guard dies if hole closes
            // (handled in updateHoles)
            return;
        }
        
        guard.inHole = false;
        guard.holeTimer = 0;
        
        // Simple AI: move towards player
        const dx = player.x - guard.x;
        const dy = player.y - guard.y;
        
        // Same level - chase horizontally
        if (Math.abs(dy) < 2) {
            if (dx > 0 && canMove(guard.x + 1, guard.y)) {
                guard.vx = 1;
                guard.direction = 1;
            } else if (dx < 0 && canMove(guard.x - 1, guard.y)) {
                guard.vx = -1;
                guard.direction = -1;
            }
        }
        
        // Use ladders to get closer
        if (dy > 0 && isOnLadder(guard.x, guard.y)) {
            guard.vy = 1;
        } else if (dy < 0 && isOnLadder(guard.x, guard.y)) {
            guard.vy = -1;
        } else if (!isOnLadder(guard.x, guard.y)) {
            guard.vy = 0;
        }
        
        // Gravity
        if (!isOnGround(guard.x, guard.y) && !isOnLadder(guard.x, guard.y) && !isOnBar(guard.x, guard.y)) {
            guard.vy = 1;
        }
        
        // Apply movement
        if (guard.vx !== 0 && canMove(guard.x + guard.vx, guard.y)) {
            guard.x += guard.vx;
        }
        if (guard.vy !== 0 && canMove(guard.x, guard.y + guard.vy)) {
            guard.y += guard.vy;
        }
        
        // Collect gold (guards can pick up gold)
        if (level[guard.y][guard.x] === GOLD && !guard.hasGold) {
            level[guard.y][guard.x] = EMPTY;
            guard.hasGold = true;
            guard.goldTimer = 100 + Math.floor(Math.random() * 100);
        }
        
        // Drop gold after timer
        if (guard.hasGold) {
            guard.goldTimer--;
            if (guard.goldTimer <= 0 && level[guard.y][guard.x] === EMPTY) {
                level[guard.y][guard.x] = GOLD;
                guard.hasGold = false;
            }
        }
        
        // Check collision with player
        if (guard.x === player.x && guard.y === player.y && !guard.inHole) {
            playerDie();
        }
        
        guard.vx = 0;
        guard.vy = 0;
    });
}

function playerDie() {
    lives--;
    if (lives <= 0) {
        gameOver = true;
    } else {
        // Restart level
        parseLevel(LEVEL1);
    }
}

function nextLevel() {
    currentLevel++;
    lives++;
    parseLevel(LEVEL1); // For now, same level
}

function update() {
    if (gameOver || levelComplete) return;
    
    updateHoles();
    updatePlayer();
    updateGuards();
}

function gameLoop() {
    update();
    draw();
    
    if (levelComplete) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.GOLD;
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px monospace';
        ctx.fillText('Press ENTER for next level', canvas.width / 2, canvas.height / 2 + 40);
    } else if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.RED;
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px monospace';
        ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 40);
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
    
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[keyCode] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[keyCode] = false;
        btn.classList.remove('active');
    });
    btn.addEventListener('touchcancel', (e) => {
        keys[keyCode] = false;
        btn.classList.remove('active');
    });
    
    // Mouse support for testing
    btn.addEventListener('mousedown', (e) => {
        keys[keyCode] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('mouseup', (e) => {
        keys[keyCode] = false;
        btn.classList.remove('active');
    });
    btn.addEventListener('mouseleave', (e) => {
        keys[keyCode] = false;
        btn.classList.remove('active');
    });
}

setupTouchButton('btn-up', 'ArrowUp');
setupTouchButton('btn-down', 'ArrowDown');
setupTouchButton('btn-left', 'ArrowLeft');
setupTouchButton('btn-right', 'ArrowRight');
setupTouchButton('btn-dig', 'Space');

// Tap to restart/continue on game over / level complete
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
