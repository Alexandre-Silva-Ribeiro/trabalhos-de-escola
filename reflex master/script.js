let scoreElement = null;
let highScoreElement = null;
let timeLeftElement = null;
let startButton = null;
let gameArea = null;
let hintText = null;
let statusElement = null;

const HIGH_SCORE_KEY = "reflex_master_high_score";
const INITIAL_SPAWN_TIME = 1400;
const SPEED_MULTIPLIER = 0.95;
const MIN_SPAWN_TIME = 300;
const GAME_OVER_RESET_DELAY = 1700;
const TARGET_RESPAWN_DELAY = 30;
const TIMER_CRITICAL_MS = 450;

let score = 0;
let highScore = 0;
let spawnTime = INITIAL_SPAWN_TIME;
let gameRunning = false;
let currentTarget = null;
let missTimerId = null;
let spawnTimerId = null;
let resetTimerId = null;
let timerIntervalId = null;
let roundEndAt = 0;
let isInitialized = false;

const stickerOptions = [
  { label: "GO", backgroundColor: "#ffd979", textColor: "#1a1a1a" },
  { label: "HIT", backgroundColor: "#9fd8ff", textColor: "#142135" },
  { label: "NOW", backgroundColor: "#b9efb1", textColor: "#163419" },
  { label: "TAP", backgroundColor: "#f8b6c9", textColor: "#3f1122" },
  { label: "FAST", backgroundColor: "#d2c4ff", textColor: "#261846" },
  { label: "CLICK", backgroundColor: "#ffcfb5", textColor: "#402211" }
].map((sticker) => ({
  ...sticker,
  imageSrc: createSticker(sticker.label, sticker.backgroundColor, sticker.textColor)
}));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame, { once: true });
}

initGame();
window.addEventListener("load", initGame, { once: true });

function initGame() {
  if (isInitialized) {
    return true;
  }

  scoreElement = document.getElementById("score");
  highScoreElement = document.getElementById("high-score");
  timeLeftElement = document.getElementById("time-left");
  startButton = document.getElementById("start-btn");
  gameArea = document.getElementById("game-area");
  hintText = document.getElementById("hint");
  statusElement = document.getElementById("status");

  if (
    !scoreElement ||
    !highScoreElement ||
    !timeLeftElement ||
    !startButton ||
    !gameArea ||
    !hintText ||
    !statusElement
  ) {
    if (document.readyState === "complete") {
      console.error("Reflex Master: elementos HTML obrigatorios nao foram encontrados.");
    }
    return false;
  }

  highScore = loadHighScore();
  highScoreElement.textContent = String(highScore);
  updateTimerDisplay(INITIAL_SPAWN_TIME);

  startButton.addEventListener("click", startGame);
  gameArea.addEventListener("click", handleGameAreaClick);
  window.addEventListener("resize", keepTargetInsideArea);

  isInitialized = true;
  return true;
}

function startGame() {
  if (gameRunning) {
    return;
  }

  if (!isInitialized && !initGame()) {
    return;
  }

  clearAllTimers();
  removeCurrentTarget();

  score = 0;
  spawnTime = INITIAL_SPAWN_TIME;
  roundEndAt = 0;
  gameRunning = true;

  updateScore();
  updateTimerDisplay(spawnTime);
  updateStatus("Jogo em andamento. Clique no sticker!");
  startButton.disabled = true;
  startButton.textContent = "Jogando...";
  hintText.style.display = "none";

  gameArea.style.backgroundColor = randomAreaColor();
  spawnTarget();
}

function spawnTarget() {
  if (!gameRunning) {
    return;
  }

  removeCurrentTarget();

  const sticker = randomSticker();
  const target = document.createElement("button");
  target.type = "button";
  target.className = "target";
  target.setAttribute("aria-label", "Sticker de reflexo");
  target.textContent = sticker.label;
  target.style.backgroundColor = sticker.backgroundColor;
  target.style.color = sticker.textColor;

  const image = document.createElement("img");
  image.alt = `Sticker ${sticker.label}`;
  image.src = sticker.imageSrc;
  image.addEventListener("load", () => {
    if (currentTarget !== target || !target.isConnected) {
      return;
    }

    target.textContent = "";
    target.appendChild(image);
  });

  gameArea.appendChild(target);
  currentTarget = target;

  // Aguarda render para evitar calculo com tamanho zerado.
  schedulePosition(() => {
    if (currentTarget === target) {
      positionTarget(target);
    }
  });

  target.addEventListener("click", handleTargetClick, { once: true });

  clearRoundTimer();
  roundEndAt = Date.now() + spawnTime;
  startRoundTimer();

  missTimerId = window.setTimeout(() => {
    endGame();
  }, spawnTime);
}

function handleTargetClick(event) {
  if (!gameRunning) {
    return;
  }

  if (missTimerId) {
    clearTimeout(missTimerId);
    missTimerId = null;
  }

  const clickedTarget = event.currentTarget;
  if (clickedTarget instanceof HTMLElement) {
    clickedTarget.remove();
  }
  currentTarget = null;

  score += 1;
  spawnTime = Math.max(MIN_SPAWN_TIME, Math.floor(spawnTime * SPEED_MULTIPLIER));

  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
    highScoreElement.textContent = String(highScore);
  }

  updateScore();
  updateTimerDisplay(spawnTime);
  updateStatus("Boa! Continue clicando.");

  gameArea.style.backgroundColor = randomAreaColor();

  clearRoundTimer();
  roundEndAt = 0;
  spawnTimerId = window.setTimeout(spawnTarget, TARGET_RESPAWN_DELAY);
}

function endGame() {
  if (!gameRunning) {
    return;
  }

  gameRunning = false;
  clearAllTimers();
  removeCurrentTarget();

  roundEndAt = 0;
  updateTimerDisplay(0);
  updateStatus(`Game Over! Pontuacao final: ${score}.`, true);
  startButton.disabled = true;
  startButton.textContent = "Reiniciando...";

  resetTimerId = window.setTimeout(() => {
    resetToIdleState();
  }, GAME_OVER_RESET_DELAY);
}

function resetToIdleState() {
  score = 0;
  spawnTime = INITIAL_SPAWN_TIME;
  roundEndAt = 0;

  updateScore();
  updateTimerDisplay(INITIAL_SPAWN_TIME);
  updateStatus("Pronto para jogar novamente.");

  gameArea.style.backgroundColor = "";
  hintText.style.display = "grid";

  startButton.disabled = false;
  startButton.textContent = "Iniciar jogo";
}

function updateScore() {
  scoreElement.textContent = String(score);
}

function updateTimerDisplay(remainingMs) {
  const safeRemaining = Math.max(0, remainingMs);
  timeLeftElement.textContent = `${(safeRemaining / 1000).toFixed(2)}s`;
  timeLeftElement.classList.toggle("is-critical", gameRunning && safeRemaining <= TIMER_CRITICAL_MS);
}

function updateStatus(message, isDanger = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("is-danger", isDanger);
}

function handleGameAreaClick(event) {
  if (!gameRunning) {
    return;
  }

  if (event.target === gameArea) {
    endGame();
  }
}

function startRoundTimer() {
  clearRoundTimer();
  tickRoundTimer();
  timerIntervalId = window.setInterval(tickRoundTimer, 33);
}

function tickRoundTimer() {
  if (!gameRunning || roundEndAt <= 0) {
    clearRoundTimer();
    return;
  }

  const remainingMs = Math.max(0, roundEndAt - Date.now());
  updateTimerDisplay(remainingMs);

  if (remainingMs <= 0) {
    clearRoundTimer();
    return;
  }

}

function clearRoundTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function schedulePosition(callback) {
  requestFrame(callback);
}

function requestFrame(callback) {
  if (typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(callback, 16);
}

function cancelFrame(frameId) {
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(frameId);
    return;
  }

  clearTimeout(frameId);
}

function clearAllTimers() {
  if (missTimerId) {
    clearTimeout(missTimerId);
  }
  if (spawnTimerId) {
    clearTimeout(spawnTimerId);
  }
  if (resetTimerId) {
    clearTimeout(resetTimerId);
  }

  clearRoundTimer();

  missTimerId = null;
  spawnTimerId = null;
  resetTimerId = null;
}

function removeCurrentTarget() {
  if (currentTarget && currentTarget.parentElement) {
    currentTarget.remove();
  }

  currentTarget = null;
}

function positionTarget(target) {
  const areaWidth = gameArea.clientWidth;
  const areaHeight = gameArea.clientHeight;
  const targetRect = target.getBoundingClientRect();
  const targetWidth = targetRect.width || target.offsetWidth || 74;
  const targetHeight = targetRect.height || target.offsetHeight || 74;

  const maxX = Math.max(0, areaWidth - targetWidth);
  const maxY = Math.max(0, areaHeight - targetHeight);

  target.style.left = `${Math.floor(Math.random() * (maxX + 1))}px`;
  target.style.top = `${Math.floor(Math.random() * (maxY + 1))}px`;
}

function keepTargetInsideArea() {
  if (!currentTarget || !gameRunning) {
    return;
  }

  const maxX = Math.max(0, gameArea.clientWidth - currentTarget.offsetWidth);
  const maxY = Math.max(0, gameArea.clientHeight - currentTarget.offsetHeight);
  const currentX = parseInt(currentTarget.style.left || "0", 10);
  const currentY = parseInt(currentTarget.style.top || "0", 10);

  currentTarget.style.left = `${Math.min(currentX, maxX)}px`;
  currentTarget.style.top = `${Math.min(currentY, maxY)}px`;
}

function randomAreaColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 45 + Math.floor(Math.random() * 20);
  const lightness = 84 + Math.floor(Math.random() * 8);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function randomSticker() {
  const index = Math.floor(Math.random() * stickerOptions.length);
  return stickerOptions[index];
}

function createSticker(label, backgroundColor, textColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74">
      <rect width="74" height="74" rx="8" fill="${backgroundColor}" />
      <rect x="4" y="4" width="66" height="66" rx="6" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" />
      <text x="37" y="42" text-anchor="middle" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="17" font-weight="700" fill="${textColor}">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch (error) {
    console.warn("Nao foi possivel carregar o recorde do localStorage.", error);
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch (error) {
    console.warn("Nao foi possivel salvar o recorde no localStorage.", error);
  }
}

window.startGame = startGame;
