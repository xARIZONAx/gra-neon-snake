
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const levelElement = document.getElementById("level");
const statusElement = document.getElementById("game-status");
const overlay = document.getElementById("overlay");
const overlayIcon = document.getElementById("overlay-icon");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-btn");
const difficultySelect = document.getElementById("difficulty");

const SIZE = 24;
const CELL = canvas.width / SIZE;

const COLORS = {
    background: "#080d18",
    grid: "rgba(104, 133, 170, 0.09)",
    snake: "#52f7db",
    snakeDark: "#16a994",
    food: "#ff6ba8",
    foodGlow: "rgba(255, 76, 155, 0.28)"
};

const SPEEDS = {
    easy: 155,
    normal: 115,
    hard: 80
};

let snake = [];
let food = { x: 15, y: 12 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

let score = 0;
let best = loadBest();
let level = 1;
let state = "ready";

let lastTime = 0;
let accumulator = 0;
let particles = [];
let animationId = null;

// Sterowanie dotykowe
let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;

bestElement.textContent = formatScore(best);

function loadBest() {
    try {
        return Number(localStorage.getItem("neonSnakeBest")) || 0;
    } catch {
        return 0;
    }
}

function saveBest() {
    try {
        localStorage.setItem("neonSnakeBest", String(best));
    } catch {
        // Gra działa również wtedy, gdy zapis jest niedostępny.
    }
}

function formatScore(value) {
    return String(value).padStart(4, "0");
}

function resetGame() {
    snake = [
        { x: 8, y: 12 },
        { x: 7, y: 12 },
        { x: 6, y: 12 },
        { x: 5, y: 12 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    score = 0;
    level = 1;
    particles = [];
    accumulator = 0;
    lastTime = 0;

    scoreElement.textContent = formatScore(score);
    levelElement.textContent = String(level).padStart(2, "0");

    spawnFood();
    draw();
}

function spawnFood() {
    const freeCells = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const occupied = snake.some(
                segment => segment.x === x && segment.y === y
            );

            if (!occupied) {
                freeCells.push({ x, y });
            }
        }
    }

    if (freeCells.length === 0) {
        state = "over";
        showOverlay(
            "🏆",
            "Wygrana!",
            "Wypełniłeś całą planszę!",
            "ZAGRAJ PONOWNIE"
        );
        statusElement.textContent = "WYGRANA";
        return;
    }

    food = freeCells[Math.floor(Math.random() * freeCells.length)];
}

function startGame() {
    if (state === "over") {
        resetGame();
    }

    state = "running";
    overlay.classList.add("hidden");
    statusElement.textContent = "W GRZE";
    lastTime = 0;
    accumulator = 0;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (state !== "running") return;

    state = "paused";
    statusElement.textContent = "PAUZA";

    showOverlay(
        "Ⅱ",
        "Chwila przerwy",
        "Twój wąż czeka na dalsze instrukcje.",
        "WRÓĆ DO GRY"
    );
}

function resumeGame() {
    if (state !== "paused") return;

    state = "running";
    overlay.classList.add("hidden");
    statusElement.textContent = "W GRZE";
    lastTime = 0;
    accumulator = 0;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    state = "over";
    statusElement.textContent = "KONIEC GRY";

    if (score > best) {
        best = score;
        bestElement.textContent = formatScore(best);
        saveBest();
    }

    showOverlay(
        "✦",
        "Game Over",
        `Twój wynik: ${score} punktów. Spróbujesz ponownie?`,
        "ZAGRAJ PONOWNIE"
    );

    if (snake.length > 0) {
        createBurst(
            snake[0].x * CELL + CELL / 2,
            snake[0].y * CELL + CELL / 2,
            COLORS.food,
            24
        );
    }

    draw();
}

function showOverlay(icon, title, message, buttonText) {
    overlayIcon.textContent = icon;
    overlayTitle.textContent = title;
    overlayText.textContent = message;

    startButton.querySelector("span:first-child").textContent = buttonText;
    overlay.classList.remove("hidden");
}

function changeDirection(x, y) {
    if (state === "ready" || state === "over") {
        startGame();
    }

    if (state !== "running") return;

    // Nie pozwalaj na natychmiastowe zawrócenie.
    if (x === -direction.x && y === -direction.y) return;

    nextDirection = { x, y };
}

function handleInput(event) {
    const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyR",
        "Escape"
    ];

    if (keys.includes(event.code)) {
        event.preventDefault();
    }

    switch (event.code) {
        case "ArrowUp":
        case "KeyW":
            changeDirection(0, -1);
            break;

        case "ArrowDown":
        case "KeyS":
            changeDirection(0, 1);
            break;

        case "ArrowLeft":
        case "KeyA":
            changeDirection(-1, 0);
            break;

        case "ArrowRight":
        case "KeyD":
            changeDirection(1, 0);
            break;

        case "Space":
            if (state === "running") {
                pauseGame();
            } else if (state === "paused") {
                resumeGame();
            } else {
                startGame();
            }
            break;

        case "KeyR":
            resetGame();
            startGame();
            break;

        case "Escape":
            pauseGame();
            break;
    }
}

function getSpeed() {
    const base = SPEEDS[difficultySelect.value] || SPEEDS.normal;
    return Math.max(45, base - (level - 1) * 5);
}

function update() {
    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Kolizja ze ścianą.
    if (
        head.x < 0 ||
        head.x >= SIZE ||
        head.y < 0 ||
        head.y >= SIZE
    ) {
        endGame();
        return;
    }

    const eating = head.x === food.x && head.y === food.y;

    // Jeśli nie jesz, ogon zwolni swoje pole w tym ruchu.
    const bodyToCheck = eating ? snake : snake.slice(0, -1);

    // Kolizja z własnym ciałem.
    if (
        bodyToCheck.some(
            segment => segment.x === head.x && segment.y === head.y
        )
    ) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (eating) {
        score += 10;
        level = Math.floor(score / 100) + 1;

        scoreElement.textContent = formatScore(score);
        levelElement.textContent = String(level).padStart(2, "0");

        createBurst(
            food.x * CELL + CELL / 2,
            food.y * CELL + CELL / 2,
            COLORS.food,
            15
        );

        if (score > best) {
            best = score;
            bestElement.textContent = formatScore(best);
            saveBest();
        }

        spawnFood();
    } else {
        snake.pop();
    }
}

function createBurst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 110;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.45 + Math.random() * 0.45,
            maxLife: 0.9,
            size: 1.5 + Math.random() * 3,
            color
        });
    }
}

function updateParticles(dt) {
    for (const particle of particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
    }

    particles = particles.filter(particle => particle.life > 0);
}

function drawBackground() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    for (let i = 0; i <= SIZE; i++) {
        const position = i * CELL;

        ctx.beginPath();
        ctx.moveTo(position, 0);
        ctx.lineTo(position, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, position);
        ctx.lineTo(canvas.width, position);
        ctx.stroke();
    }

    const glow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        10,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7
    );

    glow.addColorStop(0, "rgba(32, 111, 111, 0.08)");
    glow.addColorStop(1, "rgba(8, 13, 24, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFood(time) {
    const x = food.x * CELL + CELL / 2;
    const y = food.y * CELL + CELL / 2;
    const pulse = 1 + Math.sin(time / 180) * 0.13;
    const radius = CELL * 0.27 * pulse;

    ctx.save();

    ctx.shadowColor = COLORS.food;
    ctx.shadowBlur = 22;

    ctx.fillStyle = COLORS.foodGlow;
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.46 * pulse, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(
        x - 2, y - 2, 1,
        x, y, radius
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.35, "#ffb4d3");
    gradient.addColorStop(1, COLORS.food);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const padding = index === 0 ? 1.5 : 2.2;
        const x = segment.x * CELL + padding;
        const y = segment.y * CELL + padding;
        const size = CELL - padding * 2;
        const radius = index === 0 ? 5 : 4;

        ctx.save();

        if (index === 0) {
            ctx.shadowColor = COLORS.snake;
            ctx.shadowBlur = 17;
        }

        const gradient = ctx.createLinearGradient(
            x, y, x + size, y + size
        );

        gradient.addColorStop(
            0,
            index === 0 ? "#b4fff3" : COLORS.snake
        );

        gradient.addColorStop(
            1,
            index === 0 ? COLORS.snake : COLORS.snakeDark
        );

        ctx.fillStyle = gradient;
        roundedRect(ctx, x, y, size, size, radius);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = index === 0 ? 0.65 : 0.22;
        ctx.fillStyle = "#ffffff";

        roundedRect(ctx, x + 2, y + 2, size - 4, 2, 1);
        ctx.fill();

        ctx.restore();
    });

    drawEyes();
}

function drawEyes() {
    const head = snake[0];
    if (!head) return;

    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const offset = CELL * 0.19;
    const forward = CELL * 0.12;

    let eyes;

    if (direction.x === 1) {
        eyes = [
            [cx + forward, cy - offset],
            [cx + forward, cy + offset]
        ];
    } else if (direction.x === -1) {
        eyes = [
            [cx - forward, cy - offset],
            [cx - forward, cy + offset]
        ];
    } else if (direction.y === -1) {
        eyes = [
            [cx - offset, cy - forward],
            [cx + offset, cy - forward]
        ];
    } else {
        eyes = [
            [cx - offset, cy + forward],
            [cx + offset, cy + forward]
        ];
    }

    ctx.fillStyle = "#06201c";

    for (const [x, y] of eyes) {
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

function drawParticles() {
    ctx.save();

    for (const particle of particles) {
        ctx.globalAlpha = Math.max(
            0,
            particle.life / particle.maxLife
        );

        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.restore();
}

function draw(time = 0) {
    drawBackground();
    drawFood(time);
    drawSnake();
    drawParticles();
}

function gameLoop(time) {
    if (state !== "running") return;

    if (!lastTime) lastTime = time;

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    accumulator += dt;

    updateParticles(dt);

    const step = getSpeed() / 1000;

    while (accumulator >= step && state === "running") {
        update();
        accumulator -= step;
    }

    draw(time);

    if (state === "running") {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Przycisk startu, pauzy i wznowienia.
startButton.addEventListener("click", () => {
    if (state === "paused") {
        resumeGame();
    } else {
        startGame();
    }
});

// Zmiana poziomu trudności.
difficultySelect.addEventListener("change", () => {
    accumulator = 0;
});

// Klawiatura.
document.addEventListener("keydown", handleInput);

// --------------------------------------------------
// STEROWANIE DOTYKOWE — POPRAWIONE
// --------------------------------------------------
const touchArea = document.querySelector(".canvas-wrap");
// Zapobiegamy przewijaniu strony przy dotykaniu planszy.
touchArea.addEventListener("touchstart", event => {
    event.preventDefault();

    const touch = event.changedTouches[0];

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;
}, { passive: false });

// Zablokuj gest przewijania podczas przesuwania palcem.
touchArea.addEventListener("touchmove", event => {
    event.preventDefault();
}, { passive: false });

// Zmiana kierunku na podstawie przesunięcia palca.
touchArea.addEventListener("touchend", event => {
    event.preventDefault();

    if (!touchActive) return;
    touchActive = false;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Ignoruj bardzo krótkie dotknięcia.
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;

    if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 1 : -1, 0);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
    }
}, { passive: false });

touchArea.addEventListener("touchcancel", () => {
    touchActive = false;
}, { passive: true });

// Obsługa myszy i rysika nie wymaga dodatkowych gestów.

// Pierwsze renderowanie gry.
resetGame();

showOverlay(
    "▶",
    "Gotowy?",
    "Twoja przygoda zaczyna się tutaj.",
    "ROZPOCZNIJ GRĘ"
);
