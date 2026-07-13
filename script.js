/* Ambient canvas background. */
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

const themeToggle = document.querySelector(".theme-toggle");
const themeRail = document.querySelector(".theme-rail");
const themeTicks = document.querySelectorAll(".theme-track span");
const savedTheme = localStorage.getItem("andres-prias-theme") || "dark";
const themePositions = {
  dark: 18,
  light: 82
};
let themeDragState = {
  active: false,
  pointerId: null,
  startX: 0,
  moved: false,
  startedOnToggle: false,
  ignoreNextClick: false
};
let revealObserver = null;
let activeGame = false;
let score = 0;
let timeLeft = 40;
let gameFrameId = null;
let gameState = null;
const gameKeys = new Set();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (activeGame && ["arrowleft", "arrowright", "a", "d"].includes(key)) {
    event.preventDefault();
    gameKeys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  gameKeys.delete(event.key.toLowerCase());
});

function getThemePosition() {
  const railPosition = themeRail?.style.getPropertyValue("--theme-position") || "";
  const parsedPosition = Number.parseFloat(railPosition);
  if (Number.isFinite(parsedPosition)) return parsedPosition;

  return document.body.dataset.theme === "light" ? themePositions.light : themePositions.dark;
}

function setThemeKnobPosition(position) {
  if (!themeRail) return;

  const safePosition = Math.min(88, Math.max(12, position));
  themeRail.style.setProperty("--theme-position", `${safePosition.toFixed(2)}%`);
}

function getThemePositionFromPointer(pointerX) {
  if (!themeRail) return getThemePosition();

  const railBox = themeRail.getBoundingClientRect();
  const rawPosition = ((pointerX - railBox.left) / railBox.width) * 100;
  return Math.min(88, Math.max(12, rawPosition));
}

function pointerXFromThemePosition(position) {
  if (!themeRail) return null;

  const railBox = themeRail.getBoundingClientRect();
  return railBox.left + railBox.width * (position / 100);
}

/* Theme switch rail: tick heights react to knob or pointer proximity. */
function setThemeTickHeights(pointerX = null) {
  if (!themeRail || !themeTicks.length) return;

  const railBox = themeRail.getBoundingClientRect();
  const visibleTicks = Array.from(themeTicks);
  const activePointerX = pointerX ?? pointerXFromThemePosition(getThemePosition());

  visibleTicks.forEach((tick, index) => {
    const tickCenter = tick.getBoundingClientRect().left + tick.getBoundingClientRect().width / 2;
    const wave = Math.sin((index / Math.max(visibleTicks.length - 1, 1)) * Math.PI);
    const stagger = index % 2 === 0 ? 0 : 7;
    const baseHeight = 10 + wave * 22 + stagger;
    let height = baseHeight;

    if (activePointerX !== null) {
      const distance = Math.abs(activePointerX - tickCenter);
      const influence = Math.max(0, 1 - distance / (railBox.width * 0.16));
      height += influence * 38;
      tick.style.setProperty("--tick-scale", (1 + influence * 0.12).toFixed(2));
    }

    tick.style.setProperty("--tick-height", height.toFixed(1));
    tick.style.opacity = String(0.36 + Math.min(height / 70, 1) * 0.64);
  });
}

function applyTheme(theme, options = {}) {
  const { syncKnob = true, persist = true } = options;
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "light"));
    themeToggle.setAttribute("aria-label", nextTheme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro");
  }

  if (syncKnob) {
    setThemeKnobPosition(themePositions[nextTheme]);
    setThemeTickHeights();
  }

  if (persist) {
    localStorage.setItem("andres-prias-theme", nextTheme);
  }
}

applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (themeDragState.ignoreNextClick) {
      event.preventDefault();
      themeDragState.ignoreNextClick = false;
      return;
    }

    applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
  });
}

if (themeRail) {
  const updateThemeDrag = (event) => {
    const nextPosition = getThemePositionFromPointer(event.clientX);
    const nextTheme = nextPosition >= 50 ? "light" : "dark";
    setThemeKnobPosition(nextPosition);
    applyTheme(nextTheme, { syncKnob: false, persist: false });
    setThemeTickHeights(event.clientX);
  };

  const resetThemeDrag = () => {
    window.removeEventListener("pointermove", handleThemeDragMove);
    window.removeEventListener("pointerup", finishThemeDrag);
    window.removeEventListener("pointercancel", cancelThemeDrag);
    themeDragState.active = false;
    themeDragState.pointerId = null;
    themeDragState.startedOnToggle = false;
  };

  const handleThemeDragMove = (event) => {
    if (!themeDragState.active || event.pointerId !== themeDragState.pointerId) return;

    if (Math.abs(event.clientX - themeDragState.startX) > 4) {
      themeDragState.moved = true;
    }

    updateThemeDrag(event);
  };

  const finishThemeDrag = (event) => {
    if (!themeDragState.active || event.pointerId !== themeDragState.pointerId) return;

    themeRail.classList.remove("is-dragging");
    themeRail.classList.add("is-settling");

    if (themeDragState.moved || !themeDragState.startedOnToggle) {
      const nextTheme = getThemePosition() >= 50 ? "light" : "dark";
      applyTheme(nextTheme);
    } else {
      applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
    }

    if (themeDragState.startedOnToggle) {
      themeDragState.ignoreNextClick = true;
    }

    window.setTimeout(() => {
      themeRail.classList.remove("is-settling");
      themeDragState.ignoreNextClick = false;
    }, 480);

    resetThemeDrag();
  };

  const cancelThemeDrag = () => {
    themeRail.classList.remove("is-dragging");
    applyTheme(document.body.dataset.theme);
    resetThemeDrag();
  };

  themeRail.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    const startedOnToggle = Boolean(event.target.closest(".theme-toggle"));
    themeDragState = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
      startedOnToggle,
      ignoreNextClick: themeDragState.ignoreNextClick
    };
    themeRail.classList.add("is-dragging");
    themeRail.classList.remove("is-settling");

    try {
      themeRail.setPointerCapture(event.pointerId);
    } catch {
      // Window-level listeners below keep the drag stable if capture is unavailable.
    }

    window.addEventListener("pointermove", handleThemeDragMove);
    window.addEventListener("pointerup", finishThemeDrag);
    window.addEventListener("pointercancel", cancelThemeDrag);

    if (!startedOnToggle) {
      updateThemeDrag(event);
    }
  });

  themeRail.addEventListener("pointermove", (event) => {
    if (themeDragState.active) return;

    themeRail.classList.add("is-tracking");
    setThemeTickHeights(event.clientX);
  });

  themeRail.addEventListener("pointerleave", () => {
    if (themeDragState.active) return;
    themeRail.classList.remove("is-tracking");
    setThemeTickHeights();
  });
}

setThemeTickHeights();

function initReveal() {
  if (revealObserver) {
    revealObserver.disconnect();
  }

  revealObserver = new IntersectionObserver((entries) => {
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
}

/* About tabs. */
function initAboutTabs() {
  const aboutTabs = document.querySelectorAll("[data-about-tab]");
  const aboutPanels = document.querySelectorAll("[data-about-panel]");

  aboutTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selectedPanel = tab.dataset.aboutTab;

      aboutTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      aboutPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.aboutPanel === selectedPanel);
      });
    });
  });
}

function initAboutScene() {
  document.querySelectorAll("[data-about-scene]").forEach((scene) => {
    scene.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;

      const box = scene.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width - 0.5) * 12;
      const y = ((event.clientY - box.top) / box.height - 0.5) * 12;
      scene.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
      scene.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
    });

    scene.addEventListener("pointerleave", () => {
      scene.style.setProperty("--scene-x", "0px");
      scene.style.setProperty("--scene-y", "0px");
    });
  });
}

/* Header menu and mobile bottom navigation. */
const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#mainNav");
let lastScrollY = window.scrollY;
let scrollTicking = false;
let lastTouchY = 0;

function setMenuOpen(isOpen) {
  siteHeader.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
}

function setMobileNavVisible(isVisible) {
  document.body.classList.toggle("is-mobile-nav-visible", isVisible);
  mainNav.classList.toggle("is-mobile-visible", isVisible);
}

function updateMobileNavByScroll() {
  if (window.innerWidth > 900) {
    setMobileNavVisible(false);
    lastScrollY = window.scrollY;
    return;
  }

  const currentScrollY = window.scrollY;
  const delta = currentScrollY - lastScrollY;

  if (currentScrollY < 40) {
    setMobileNavVisible(true);
  } else if (delta > 8) {
    setMobileNavVisible(false);
  } else if (delta < -8) {
    setMobileNavVisible(true);
  }

  lastScrollY = Math.max(currentScrollY, 0);
}

function handleScrollIntent(deltaY) {
  if (window.innerWidth > 900) return;
  if (window.scrollY < 40) {
    setMobileNavVisible(true);
  } else if (deltaY > 4) {
    setMobileNavVisible(false);
  } else if (deltaY < -4) {
    setMobileNavVisible(true);
  }
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(!siteHeader.classList.contains("is-open"));
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
    setMobileNavVisible(false);
  });
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    setMenuOpen(false);
    setMobileNavVisible(false);
  } else {
    setMobileNavVisible(true);
  }
});
window.addEventListener("scroll", () => {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateMobileNavByScroll();
    scrollTicking = false;
  });
}, { passive: true });
window.addEventListener("wheel", (event) => {
  handleScrollIntent(event.deltaY);
}, { passive: true });
window.addEventListener("touchstart", (event) => {
  lastTouchY = event.touches[0]?.clientY || 0;
}, { passive: true });
window.addEventListener("touchmove", (event) => {
  const currentTouchY = event.touches[0]?.clientY || lastTouchY;
  handleScrollIntent(lastTouchY - currentTouchY);
  lastTouchY = currentTouchY;
}, { passive: true });
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / Math.max(window.innerWidth, 1);
  pointer.y = event.clientY / Math.max(window.innerHeight, 1);
});

resizeCanvas();
setMobileNavVisible(window.innerWidth <= 900);
drawCanvas();

/* Defensa Cósmica: arcade shooter and local browser ranking. */
const rankingKey = "andres-prias-space-defender-ranking";

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

function renderRanking(gameBest, rankingList) {
  if (!gameBest || !rankingList) return;

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
    const name = document.createElement("span");
    const points = document.createElement("strong");
    name.textContent = `${index + 1}. ${entry.name}`;
    points.textContent = entry.score;
    item.append(name, points);
    rankingList.append(item);
  });
}

function clearGameObjects(gameArena) {
  if (!gameArena) return;
  gameArena.querySelectorAll(".player-ship, .enemy-fighter, .laser-shot, .space-explosion").forEach((item) => item.remove());
  gameArena.classList.remove("is-hit");
}

function setMessage(arenaMessage, title, detail, visible = true) {
  if (!arenaMessage) return;
  arenaMessage.querySelector("span").textContent = title;
  arenaMessage.querySelector("strong").textContent = detail;
  arenaMessage.classList.toggle("is-hidden", !visible);
}

function createPlayer(gameArena) {
  const player = document.createElement("div");
  player.className = "player-ship";
  player.setAttribute("aria-hidden", "true");
  gameArena.append(player);
  return player;
}

function positionGameObject(element, x, y) {
  element.dataset.x = x;
  element.dataset.y = y;
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function spawnEnemy(state, timestamp) {
  const { gameArena } = state.elements;
  const bounds = gameArena.getBoundingClientRect();
  const variant = 1 + Math.floor(Math.random() * 4);
  const enemy = document.createElement("div");
  const baseX = 8 + Math.random() * Math.max(bounds.width - 62, 20);
  const elapsed = (timestamp - state.startTime) / 1000;

  enemy.className = `enemy-fighter color-${variant}`;
  enemy.dataset.baseX = baseX;
  enemy.dataset.speed = 72 + Math.random() * 58 + elapsed * 1.8;
  enemy.dataset.phase = Math.random() * Math.PI * 2;
  enemy.dataset.sway = 8 + Math.random() * 20;
  enemy.dataset.points = 8 + variant * 4;
  enemy.setAttribute("aria-hidden", "true");
  positionGameObject(enemy, baseX, -48);
  gameArena.append(enemy);
}

function fireLaser(state) {
  const shot = document.createElement("span");
  const bounds = state.elements.gameArena.getBoundingClientRect();
  const x = state.playerX + 24;
  const y = bounds.height - 102;
  shot.className = "laser-shot";
  shot.setAttribute("aria-hidden", "true");
  positionGameObject(shot, x, y);
  state.elements.gameArena.append(shot);
}

function createExplosion(gameArena, x, y) {
  const explosion = document.createElement("span");
  explosion.className = "space-explosion";
  positionGameObject(explosion, x, y);
  gameArena.append(explosion);
  window.setTimeout(() => explosion.remove(), 340);
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function damageShield(state) {
  if (!activeGame) return;
  state.shield -= 1;
  state.elements.gameShield.textContent = state.shield;
  state.elements.gameArena.classList.remove("is-hit");
  void state.elements.gameArena.offsetWidth;
  state.elements.gameArena.classList.add("is-hit");
  window.setTimeout(() => state.elements.gameArena?.classList.remove("is-hit"), 240);

  if (state.shield <= 0) {
    finishGame(state.elements, "Escudo agotado");
  }
}

function updateEnemies(state, delta, timestamp) {
  const arenaHeight = state.elements.gameArena.clientHeight;
  const elapsed = (timestamp - state.startTime) / 1000;

  state.elements.gameArena.querySelectorAll(".enemy-fighter").forEach((enemy) => {
    if (!enemy.isConnected || !activeGame) return;
    const y = Number(enemy.dataset.y) + Number(enemy.dataset.speed) * delta;
    const baseX = Number(enemy.dataset.baseX);
    const x = baseX + Math.sin(elapsed * 2.4 + Number(enemy.dataset.phase)) * Number(enemy.dataset.sway);
    positionGameObject(enemy, x, y);

    if (y > arenaHeight + 12) {
      enemy.remove();
      damageShield(state);
    }
  });
}

function updateLasers(state, delta) {
  state.elements.gameArena.querySelectorAll(".laser-shot").forEach((shot) => {
    const y = Number(shot.dataset.y) - 560 * delta;
    positionGameObject(shot, Number(shot.dataset.x), y);
    if (y < -24) shot.remove();
  });
}

function detectHits(state) {
  const shots = Array.from(state.elements.gameArena.querySelectorAll(".laser-shot"));
  const enemies = Array.from(state.elements.gameArena.querySelectorAll(".enemy-fighter"));

  shots.forEach((shot) => {
    if (!shot.isConnected) return;
    const shotBox = { x: Number(shot.dataset.x), y: Number(shot.dataset.y), width: 4, height: 18 };

    enemies.forEach((enemy) => {
      if (!shot.isConnected || !enemy.isConnected) return;
      const enemyBox = { x: Number(enemy.dataset.x), y: Number(enemy.dataset.y), width: 46, height: 42 };

      if (rectanglesOverlap(shotBox, enemyBox)) {
        score += Number(enemy.dataset.points);
        state.elements.gameScore.textContent = score;
        createExplosion(state.elements.gameArena, enemyBox.x + 16, enemyBox.y + 12);
        shot.remove();
        enemy.remove();
      }
    });
  });
}

function gameLoop(timestamp) {
  if (!activeGame || !gameState) return;

  const state = gameState;
  const bounds = state.elements.gameArena.getBoundingClientRect();
  const delta = state.lastFrameTime ? Math.min((timestamp - state.lastFrameTime) / 1000, 0.04) : 0;
  const elapsed = (timestamp - state.startTime) / 1000;
  state.lastFrameTime = timestamp;

  if (gameKeys.has("arrowleft") || gameKeys.has("a")) state.playerX -= 290 * delta;
  if (gameKeys.has("arrowright") || gameKeys.has("d")) state.playerX += 290 * delta;
  if (state.targetX !== null) state.playerX += (state.targetX - state.playerX) * Math.min(delta * 14, 1);
  state.playerX = Math.max(4, Math.min(bounds.width - 56, state.playerX));
  state.player.style.left = `${state.playerX}px`;

  const spawnDelay = Math.max(330, 760 - elapsed * 8);
  if (timestamp - state.lastSpawnAt >= spawnDelay) {
    spawnEnemy(state, timestamp);
    state.lastSpawnAt = timestamp;
  }

  if (timestamp - state.lastShotAt >= 280) {
    fireLaser(state);
    state.lastShotAt = timestamp;
  }

  updateEnemies(state, delta, timestamp);
  if (!activeGame) return;
  updateLasers(state, delta);
  detectHits(state);

  const nextTime = Math.max(0, 40 - Math.floor(elapsed));
  if (nextTime !== timeLeft) {
    timeLeft = nextTime;
    state.elements.gameTimer.textContent = timeLeft;
  }

  if (timeLeft <= 0) {
    finishGame(state.elements, "Sector protegido");
    return;
  }

  gameFrameId = window.requestAnimationFrame(gameLoop);
}

function finishGame(elements, reason) {
  if (!activeGame) return;

  activeGame = false;
  window.cancelAnimationFrame(gameFrameId);
  gameKeys.clear();

  const name = elements.playerName.value.trim() || "Andrés";
  const ranking = readRanking();
  ranking.push({ name, score, date: new Date().toISOString() });
  ranking.sort((a, b) => b.score - a.score);
  writeRanking(ranking);
  renderRanking(elements.gameBest, elements.rankingList);
  clearGameObjects(elements.gameArena);

  elements.startGame.textContent = "Despegar";
  setMessage(elements.arenaMessage, reason, `Puntuación final: ${score}.`);
  gameState = null;
}

function runGame(elements) {
  activeGame = false;
  window.cancelAnimationFrame(gameFrameId);
  clearGameObjects(elements.gameArena);

  activeGame = true;
  score = 0;
  timeLeft = 40;
  elements.gameScore.textContent = score;
  elements.gameTimer.textContent = timeLeft;
  elements.gameShield.textContent = 3;
  elements.startGame.textContent = "Reiniciar";
  setMessage(elements.arenaMessage, "Defensa Cósmica", "Protege el sector y destruye la flota.", false);

  const player = createPlayer(elements.gameArena);
  const bounds = elements.gameArena.getBoundingClientRect();
  const now = performance.now();
  gameState = {
    elements,
    player,
    playerX: Math.max(4, bounds.width / 2 - 26),
    targetX: null,
    shield: 3,
    startTime: now,
    lastFrameTime: 0,
    lastSpawnAt: now - 500,
    lastShotAt: now - 200
  };
  player.style.left = `${gameState.playerX}px`;
  gameFrameId = window.requestAnimationFrame(gameLoop);
}

function initGame() {
  const elements = {
    gameArena: document.querySelector("#gameArena"),
    gameTimer: document.querySelector("#gameTimer"),
    gameScore: document.querySelector("#gameScore"),
    gameShield: document.querySelector("#gameShield"),
    gameBest: document.querySelector("#gameBest"),
    startGame: document.querySelector("#startGame"),
    clearRanking: document.querySelector("#clearRanking"),
    rankingList: document.querySelector("#rankingList"),
    playerName: document.querySelector("#playerName"),
    arenaMessage: document.querySelector("#arenaMessage")
  };

  if (!elements.gameArena || !elements.startGame) {
    activeGame = false;
    window.cancelAnimationFrame(gameFrameId);
    gameState = null;
    return;
  }

  elements.startGame.addEventListener("click", () => runGame(elements));
  const setTarget = (event) => {
    if (!activeGame || !gameState) return;
    const bounds = elements.gameArena.getBoundingClientRect();
    gameState.targetX = Math.max(4, Math.min(bounds.width - 56, event.clientX - bounds.left - 26));
  };
  elements.gameArena.addEventListener("pointerdown", setTarget);
  elements.gameArena.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" || event.buttons > 0) setTarget(event);
  });
  elements.clearRanking.addEventListener("click", () => {
    localStorage.removeItem(rankingKey);
    renderRanking(elements.gameBest, elements.rankingList);
    setMessage(elements.arenaMessage, "Ranking limpio", "Despega para registrar una nueva puntuación.");
  });

  renderRanking(elements.gameBest, elements.rankingList);
}

function initProjectShowcase() {
  document.querySelectorAll("[data-project-showcase]").forEach((showcase) => {
    const mainImage = showcase.querySelector(".project-showcase-main");
    const label = showcase.querySelector("[data-showcase-label]");
    const count = showcase.querySelector("[data-showcase-count]");
    const buttons = showcase.querySelectorAll("[data-showcase-src]");

    if (!mainImage || !buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("is-active")) return;

        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });

        showcase.dataset.showcaseTheme = button.dataset.showcaseTheme;
        mainImage.classList.add("is-switching");
        window.setTimeout(() => {
          mainImage.src = button.dataset.showcaseSrc;
          mainImage.alt = button.dataset.showcaseAlt;
          if (label) label.textContent = button.dataset.showcaseLabel;
          if (count) count.textContent = button.dataset.showcaseCount;
          window.setTimeout(() => mainImage.classList.remove("is-switching"), 80);
        }, 120);
      });
    });
  });
}

function updateCurrentNav() {
  const normalizePage = (page) => {
    const cleanPage = (page || "").replace(/\.html$/i, "");
    if (!cleanPage || cleanPage === "index" || cleanPage === "sobre-mi") return "index";
    return cleanPage;
  };
  const currentPage = normalizePage(location.pathname.split("/").pop() || "index");

  document.querySelectorAll(".nav a").forEach((link) => {
    const linkPage = normalizePage(new URL(link.href, location.href).pathname.split("/").pop() || "index");
    const isCurrent = linkPage === currentPage;
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function initPage() {
  updateCurrentNav();
  initReveal();
  initAboutTabs();
  initAboutScene();
  initGame();
  initProjectShowcase();
  window.scrollTo({ top: 0, behavior: "instant" });
}

initPage();







