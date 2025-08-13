const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const instructionsButton = document.getElementById('instructionsButton');
const difficultyButton = document.getElementById('difficultyButton');
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
    x: gameResolution / 2,
    y: gameResolution / 2,
    speed: 3,
    radius: gridSize / 2,
    color: 'blue',
    isJumping: false,
    jumpStartTime: 0,
    jumpDuration: 500, // ms
};

// Lasers
let lasers = [];

// Coin
let coin = {
    x: 0,
    y: 0,
    radius: gridSize / 2,
    color: 'gold'
};

let score = 0;
let gameOver = false;
let paused = false;
let hardMode = true;
let lastMoveTime = 0;
const moveDelay = 100; // ms

function resetGame() {
    player.x = gameResolution / 2;
    player.y = gameResolution / 2;
    player.isJumping = false;
    player.color = 'blue';

    lasers = [
        { y: 50, vy: 1.5, height: 5, color: 'red' }, // Horizontal
        { x: 50, vx: 1.5, width: 5, color: 'red' }   // Vertical
    ];

    score = 0;
    gameOver = false;
    paused = false;
    
    spawnCoin();
    restartButton.style.display = 'none';
    pauseButton.textContent = 'Pause';
    // update(); // Removed to allow for countdown
}

restartButton.addEventListener('click', () => {
    resetGame();
    startGame();
});

difficultyButton.addEventListener('click', () => {
    hardMode = !hardMode;
    difficultyButton.textContent = `Mode: ${hardMode ? 'Hard' : 'Easy'}`;
});

window.addEventListener('click', e => {
    if (e.target === instructionsModal) {
        instructionsModal.style.display = 'none';
        if (paused) {
            togglePause();
        }
    }
});

function startGame() {
    update();
}

function runCountdown() {
    let count = 3;
    function tick() {
        draw(); // Draw the initial game board
        
        if (count > 0) {
            ctx.fillStyle = 'black';
            ctx.font = '120px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count, canvas.width / 2, canvas.height / 2);
            
            count--;
            setTimeout(tick, 700); // Faster countdown
        } else {
            ctx.textBaseline = 'alphabetic'; // Reset for score drawing
            startGame();
        }
    }
    tick();
}

function spawnCoin() {
    const padding = coin.radius * 2;
    coin.x = padding + Math.random() * (canvas.width - padding * 2);
    coin.y = padding + Math.random() * (canvas.height - padding * 2);
}

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', e => {
    if (gameOver) {
        if (e.key === 'Enter') {
            resetGame();
            startGame();
        }
        return;
    }

    if (keys.hasOwnProperty(e.key)) {
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

if (isMobile) {
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (gameOver || paused) return;

        if (e.touches.length > 1) { // Multi-touch for jumping
            if (!player.isJumping) {
                player.isJumping = true;
                player.jumpStartTime = Date.now();
                player.color = 'lightblue';
            }
            isMoving = false;
            return;
        }

        if (e.touches.length === 1) {
            const touch = scaleTouchCoordinates(e.touches[0]);
            if (isMoving) { // Tap while dragging to jump
                if (!player.isJumping) {
                    player.isJumping = true;
                    player.jumpStartTime = Date.now();
                    player.color = 'lightblue';
                }
            } else {
                touchStartX = touch.x;
                touchStartY = touch.y;
                isMoving = true;
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (gameOver || paused || !isMoving || e.touches.length !== 1) return;

        const touch = scaleTouchCoordinates(e.touches[0]);
        const dx = touch.x - touchStartX;
        const dy = touch.y - touchStartY;
        const angle = Math.atan2(dy, dx);
        
        keys.ArrowRight = Math.cos(angle) > 0.5;
        keys.ArrowLeft = Math.cos(angle) < -0.5;
        keys.ArrowDown = Math.sin(angle) > 0.5;
        keys.ArrowUp = Math.sin(angle) < -0.5;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (isMoving && e.touches.length === 0) {
            isMoving = false;
            keys.ArrowUp = false;
            keys.ArrowDown = false;
            keys.ArrowLeft = false;
            keys.ArrowRight = false;
        }
    }, { passive: false });
}

function checkCollisions() {
    // Player and coin
    const dx = player.x - coin.x;
    const dy = player.y - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.radius + coin.radius) {
        score++;
        spawnCoin();
        
        if (hardMode) {
            // Add a new laser
            if (score % 2 !== 0) { // Add horizontal laser
                lasers.push({ 
                    y: player.y < canvas.height / 2 ? canvas.height - 5 : 0,
                    vy: 1.5 * (Math.random() > 0.5 ? 1 : -1), 
                    height: 5, 
                    color: 'red' 
                });
            } else { // Add vertical laser
                lasers.push({ 
                    x: player.x < canvas.width / 2 ? canvas.width - 5 : 0,
                    vx: 1.5 * (Math.random() > 0.5 ? 1 : -1), 
                    width: 5, 
                    color: 'red' 
                });
            }
        }
    }

    if (player.isJumping) return;

    const playerPixelX = player.x;
    const playerPixelY = player.y;

    lasers.forEach(laser => {
        if (gameOver) return;

        if (laser.hasOwnProperty('vy')) { // Horizontal laser
            if (playerPixelY + player.radius > laser.y && playerPixelY - player.radius < laser.y + laser.height) {
                gameOver = true;
            }
        } else if (laser.hasOwnProperty('vx')) { // Vertical laser
            if (playerPixelX + player.radius > laser.x && playerPixelX - player.radius < laser.x + laser.width) {
                gameOver = true;
            }
        }
    });
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
        ctx.fillText('Press Enter to restart', canvas.width / 2, canvas.height / 2 + 40);
        restartButton.style.display = 'block';
        return;
    }

    // Player movement
    if (keys.ArrowUp && player.y - player.radius > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y + player.radius < canvas.height) player.y += player.speed;
    if (keys.ArrowLeft && player.x - player.radius > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x + player.radius < canvas.width) player.x += player.speed;


    // Move lasers
    lasers.forEach(laser => {
        if (laser.hasOwnProperty('vy')) { // It's a horizontal laser
            laser.y += laser.vy;
            if (laser.y + laser.height > canvas.height || laser.y < 0) {
                laser.vy *= -1;
            }
        } else if (laser.hasOwnProperty('vx')) { // It's a vertical laser
            laser.x += laser.vx;
            if (laser.x + laser.width > canvas.width || laser.x < 0) {
                laser.vx *= -1;
            }
        }
    });

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
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw lasers
    lasers.forEach(laser => {
        ctx.fillStyle = laser.color;
        if (laser.hasOwnProperty('vy')) { // Horizontal
            ctx.fillRect(0, laser.y, canvas.width, laser.height);
        } else if (laser.hasOwnProperty('vx')) { // Vertical
            ctx.fillRect(laser.x, 0, laser.width, canvas.height);
        }
    });

    // Draw coin
    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 25);
}

resetGame();
runCountdown();
