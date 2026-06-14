const canvas = document.querySelector("#ambientCanvas");
const context = canvas.getContext("2d");
const pointer = { x: 0.5, y: 0.5 };
let width = 0;
let height = 0;
let points = [];

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.max(42, Math.floor((width * height) / 24000));
  points = Array.from({ length: count }, (_, index) => ({
    x: (index * 193) % width,
    y: (index * 127) % height,
    vx: Math.sin(index) * 0.22,
    vy: Math.cos(index * 1.7) * 0.22,
    size: 1 + (index % 3) * 0.35
  }));
}

function drawCanvas() {
  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;

  points.forEach((point, index) => {
    const driftX = (pointer.x - 0.5) * 0.18;
    const driftY = (pointer.y - 0.5) * 0.18;
    point.x += point.vx + driftX;
    point.y += point.vy + driftY;

    if (point.x < -20) point.x = width + 20;
    if (point.x > width + 20) point.x = -20;
    if (point.y < -20) point.y = height + 20;
    if (point.y > height + 20) point.y = -20;

    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const next = points[nextIndex];
      const distance = Math.hypot(point.x - next.x, point.y - next.y);

      if (distance < 135) {
        const opacity = (1 - distance / 135) * 0.16;
        context.strokeStyle = `rgba(165, 226, 255, ${opacity})`;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(next.x, next.y);
        context.stroke();
      }
    }

    const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 9);
    gradient.addColorStop(0, "rgba(128, 242, 177, 0.6)");
    gradient.addColorStop(1, "rgba(128, 242, 177, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, 8 * point.size, 0, Math.PI * 2);
    context.fill();
  });

  requestAnimationFrame(drawCanvas);
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

document.querySelectorAll("[data-reveal]").forEach((element) => {
  revealObserver.observe(element);
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / Math.max(window.innerWidth, 1);
  pointer.y = event.clientY / Math.max(window.innerHeight, 1);
});

resizeCanvas();
drawCanvas();

const gameArena = document.querySelector("#gameArena");
const gameTimer = document.querySelector("#gameTimer");
const gameScore = document.querySelector("#gameScore");
const gameBest = document.querySelector("#gameBest");
const startGame = document.querySelector("#startGame");
const clearRanking = document.querySelector("#clearRanking");
const rankingList = document.querySelector("#rankingList");
const playerName = document.querySelector("#playerName");
const arenaMessage = document.querySelector("#arenaMessage");

const rankingKey = "andres-prias-bug-hunter-ranking";
let activeGame = false;
let score = 0;
let timeLeft = 30;
let timerId = null;
let spawnId = null;

function readRanking() {
  try {
    return JSON.parse(localStorage.getItem(rankingKey)) || [];
  } catch {
    return [];
  }
}

function writeRanking(entries) {
  localStorage.setItem(rankingKey, JSON.stringify(entries.slice(0, 5)));
}

function renderRanking() {
  const ranking = readRanking();
  rankingList.innerHTML = "";
  gameBest.textContent = ranking[0]?.score || 0;

  if (!ranking.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<span>Sin partidas</span><strong>0</strong>";
    rankingList.append(empty);
    return;
  }

  ranking.forEach((entry, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${index + 1}. ${entry.name}</span><strong>${entry.score}</strong>`;
    rankingList.append(item);
  });
}

function clearBugs() {
  gameArena.querySelectorAll(".bug-target").forEach((bug) => bug.remove());
}

function setMessage(title, detail, visible = true) {
  arenaMessage.querySelector("span").textContent = title;
  arenaMessage.querySelector("strong").textContent = detail;
  arenaMessage.classList.toggle("is-hidden", !visible);
}

function spawnBug() {
  if (!activeGame) return;

  const bug = document.createElement("button");
  const core = document.createElement("span");
  const bounds = gameArena.getBoundingClientRect();
  const size = 46;
  const maxX = Math.max(bounds.width - size - 16, 24);
  const maxY = Math.max(bounds.height - size - 16, 24);

  bug.type = "button";
  bug.className = "bug-target";
  bug.setAttribute("aria-label", "Capturar bug");
  bug.style.left = `${12 + Math.random() * maxX}px`;
  bug.style.top = `${12 + Math.random() * maxY}px`;
  core.className = "bug-core";
  bug.append(core);

  bug.addEventListener("click", () => {
    score += 10;
    gameScore.textContent = score;
    bug.remove();
  });

  gameArena.append(bug);
  window.setTimeout(() => bug.remove(), 1250);
}

function finishGame() {
  activeGame = false;
  window.clearInterval(timerId);
  window.clearInterval(spawnId);
  clearBugs();

  const name = playerName.value.trim() || "Andres";
  const ranking = readRanking();
  ranking.push({ name, score, date: new Date().toISOString() });
  ranking.sort((a, b) => b.score - a.score);
  writeRanking(ranking);
  renderRanking();

  startGame.textContent = "Iniciar";
  setMessage("Partida finalizada", `Puntuacion final: ${score}.`);
}

function runGame() {
  activeGame = true;
  score = 0;
  timeLeft = 30;
  gameScore.textContent = score;
  gameTimer.textContent = timeLeft;
  startGame.textContent = "Reiniciar";
  clearBugs();
  setMessage("Bug Hunter", "Caza todos los bugs posibles.", false);

  window.clearInterval(timerId);
  window.clearInterval(spawnId);
  spawnBug();
  spawnId = window.setInterval(spawnBug, 650);
  timerId = window.setInterval(() => {
    timeLeft -= 1;
    gameTimer.textContent = timeLeft;
    if (timeLeft <= 0) finishGame();
  }, 1000);
}

startGame.addEventListener("click", runGame);
clearRanking.addEventListener("click", () => {
  localStorage.removeItem(rankingKey);
  renderRanking();
  setMessage("Ranking limpio", "Inicia una nueva partida para registrar tu puntuacion.");
});

renderRanking();
