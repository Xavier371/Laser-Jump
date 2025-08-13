const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const instructionsButton = document.getElementById('instructionsButton');
const instructionsModal = document.getElementById('instructionsModal');
const closeButton = document.getElementById('closeButton');

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Game constants
const gameResolution = 500;
const gridSize = 25; // The size of each grid cell
const tileCount = 20; // The number of tiles in the grid
canvas.width = canvas.height = gameResolution; // Set internal resolution

// Player
let player = {
    x: 10, // grid x position
    y: 10, // grid y position
    radius: gridSize / 2,
    color: 'blue',
    isJumping: false,
    jumpStartTime: 0,
    jumpDuration: 500, // ms
};

// Lasers
let lasers = [
    { y: 50, vy: 1.5, height: 5, color: 'red' }, // Horizontal
    { x: 50, vx: 1.5, width: 5, color: 'red' }   // Vertical
];

// Coin
let coin = {
    x: 15, // grid x position
    y: 15, // grid y position
    radius: gridSize / 2,
    color: 'gold'
};

let score = 0;
let gameOver = false;
let paused = false;
let lastMoveTime = 0;
const moveDelay = 100; // ms

function resetGame() {
    player.x = 10;
    player.y = 10;
    player.isJumping = false;
    player.color = 'blue';

    lasers[0].y = 50;
    lasers[0].vy = 1.5;
    lasers[1].x = 50;
    lasers[1].vx = 1.5;

    score = 0;
    gameOver = false;
    
    spawnCoin();
    restartButton.style.display = 'none';
    update();
}

restartButton.addEventListener('click', resetGame);

function spawnCoin() {
    do {
        coin.x = Math.floor(Math.random() * tileCount);
        coin.y = Math.floor(Math.random() * tileCount);
    } while (coin.x === player.x && coin.y === player.y);
}

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', e => {
    if (gameOver) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            resetGame();
        }
        return;
    }

    if (e.key in keys) {
        keys[e.key] = true;
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
        if (!player.isJumping) {
            player.isJumping = true;
            player.jumpStartTime = Date.now();
            player.color = 'lightblue';
        }
    }

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});

document.addEventListener('keyup', e => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

function togglePause() {
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) {
        update();
    }
}

pauseButton.addEventListener('click', togglePause);
instructionsButton.addEventListener('click', () => {
    paused = true;
    pauseButton.textContent = 'Resume';
    instructionsModal.style.display = 'block';
});
closeButton.addEventListener('click', () => {
    instructionsModal.style.display = 'none';
    togglePause(); // Resume game
});

let touchStartX = null;
let touchStartY = null;
let isMoving = false;
let touchTimer = null;
const tapThreshold = 200; // ms

function scaleTouchCoordinates(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameOver || paused) return;

    if (e.touches.length === 1) {
        const touch = scaleTouchCoordinates(e.touches[0]);
        const rect = canvas.getBoundingClientRect();
        
        if (touch.x < canvas.width / 2) { // Left side for movement
            touchStartX = touch.x;
            touchStartY = touch.y;
            isMoving = true;
        } else { // Right side for jump
            if (!player.isJumping) {
                player.isJumping = true;
                player.jumpStartTime = Date.now();
                player.color = 'lightblue';
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (gameOver || paused || !isMoving || e.touches.length !== 1) return;

    const touch = scaleTouchCoordinates(e.touches[0]);
    
    const dx = touch.x - touchStartX;
    const dy = touch.y - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        keys.ArrowRight = dx > 0;
        keys.ArrowLeft = dx < 0;
        keys.ArrowUp = keys.ArrowDown = false;
    } else {
        keys.ArrowDown = dy > 0;
        keys.ArrowUp = dy < 0;
        keys.ArrowLeft = keys.ArrowRight = false;
    }

}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    isMoving = false;
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
}, { passive: false });


function checkCollisions() {
    // Player and coin
    if (player.x === coin.x && player.y === coin.y) {
        score++;
        spawnCoin();
    }

    if (player.isJumping) return;

    const playerPixelX = player.x * gridSize + player.radius;
    const playerPixelY = player.y * gridSize + player.radius;

    // Player and horizontal laser
    const hLaser = lasers[0];
    if (playerPixelY + player.radius > hLaser.y && playerPixelY - player.radius < hLaser.y + hLaser.height) {
        gameOver = true;
    }

    // Player and vertical laser
    const vLaser = lasers[1];
    if (playerPixelX + player.radius > vLaser.x && playerPixelX - player.radius < vLaser.x + vLaser.width) {
        gameOver = true;
    }
}

function update() {
    if (paused) {
        return;
    }
    if (gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Press Enter or Space to restart', canvas.width / 2, canvas.height / 2 + 40);
        restartButton.style.display = 'block';
        return;
    }

    // Player movement
    if (Date.now() - lastMoveTime > moveDelay) {
        if (keys.ArrowUp && player.y > 0) {
            player.y--;
            lastMoveTime = Date.now();
        } else if (keys.ArrowDown && player.y < tileCount - 1) {
            player.y++;
            lastMoveTime = Date.now();
        } else if (keys.ArrowLeft && player.x > 0) {
            player.x--;
            lastMoveTime = Date.now();
        } else if (keys.ArrowRight && player.x < tileCount - 1) {
            player.x++;
            lastMoveTime = Date.now();
        }
    }

    // Move horizontal laser
    lasers[0].y += lasers[0].vy;
    if (lasers[0].y + lasers[0].height > canvas.height || lasers[0].y < 0) {
        lasers[0].vy *= -1;
    }

    // Move vertical laser
    lasers[1].x += lasers[1].vx;
    if (lasers[1].x + lasers[1].width > canvas.width || lasers[1].x < 0) {
        lasers[1].vx *= -1;
    }

    // Handle jump
    if (player.isJumping && Date.now() - player.jumpStartTime > player.jumpDuration) {
        player.isJumping = false;
        player.color = 'blue';
    }

    checkCollisions();
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    const playerPixelX = player.x * gridSize + player.radius;
    const playerPixelY = player.y * gridSize + player.radius;
    ctx.arc(playerPixelX, playerPixelY, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw lasers
    ctx.fillStyle = lasers[0].color;
    ctx.fillRect(0, lasers[0].y, canvas.width, lasers[0].height); // Horizontal
    ctx.fillStyle = lasers[1].color;
    ctx.fillRect(lasers[1].x, 0, lasers[1].width, canvas.height); // Vertical

    // Draw coin
    ctx.fillStyle = coin.color;
    ctx.beginPath();
    const coinPixelX = coin.x * gridSize + coin.radius;
    const coinPixelY = coin.y * gridSize + coin.radius;
    ctx.arc(coinPixelX, coinPixelY, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 25);
}

resetGame();
