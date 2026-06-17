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
let revealObserver = null;
let activeGame = false;
let score = 0;
let timeLeft = 30;
let timerId = null;
let spawnId = null;

/* Theme switch rail: tick heights react to pointer proximity. */
function setThemeTickHeights(pointerX = null) {
  if (!themeRail || !themeTicks.length) return;

  const railBox = themeRail.getBoundingClientRect();
  const visibleTicks = Array.from(themeTicks).slice(0, 9);

  visibleTicks.forEach((tick, index) => {
    const tickCenter = tick.getBoundingClientRect().left + tick.getBoundingClientRect().width / 2;
    const centerWeight = 1 - Math.min(Math.abs(index - (visibleTicks.length - 1) / 2) / 4, 1);
    const baseHeight = 16 + centerWeight * 30;
    let height = baseHeight;

    if (pointerX !== null) {
      const distance = Math.abs(pointerX - tickCenter);
      const influence = Math.max(0, 1 - distance / (railBox.width * 0.22));
      height += influence * 24;
    }

    tick.style.setProperty("--tick-height", height.toFixed(1));
    tick.style.opacity = pointerX === null ? "" : String(0.48 + Math.min(height / 58, 1) * 0.52);
  });
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "light"));
    themeToggle.setAttribute("aria-label", nextTheme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro");
  }

  localStorage.setItem("andres-prias-theme", nextTheme);
}

applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
  });
}

if (themeRail) {
  themeRail.addEventListener("pointermove", (event) => {
    themeRail.classList.add("is-tracking");
    setThemeTickHeights(event.clientX);
  });

  themeRail.addEventListener("pointerleave", () => {
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

/* Mini Juego: local score game and browser ranking. */
const rankingKey = "andres-prias-bug-hunter-ranking";

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
    item.innerHTML = `<span>${index + 1}. ${entry.name}</span><strong>${entry.score}</strong>`;
    rankingList.append(item);
  });
}

function clearBugs(gameArena) {
  if (!gameArena) return;
  gameArena.querySelectorAll(".bug-target").forEach((bug) => bug.remove());
}

function setMessage(arenaMessage, title, detail, visible = true) {
  if (!arenaMessage) return;
  arenaMessage.querySelector("span").textContent = title;
  arenaMessage.querySelector("strong").textContent = detail;
  arenaMessage.classList.toggle("is-hidden", !visible);
}

function spawnBug(gameArena, gameScore) {
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
    if (gameScore) gameScore.textContent = score;
    bug.remove();
  });

  gameArena.append(bug);
  window.setTimeout(() => bug.remove(), 1250);
}

function finishGame(elements) {
  const { gameArena, startGame, playerName, arenaMessage, gameBest, rankingList } = elements;

  activeGame = false;
  window.clearInterval(timerId);
  window.clearInterval(spawnId);
  clearBugs(gameArena);

  const name = playerName.value.trim() || "Andrés";
  const ranking = readRanking();
  ranking.push({ name, score, date: new Date().toISOString() });
  ranking.sort((a, b) => b.score - a.score);
  writeRanking(ranking);
  renderRanking(gameBest, rankingList);

  startGame.textContent = "Iniciar";
  setMessage(arenaMessage, "Partida finalizada", `Puntuacion final: ${score}.`);
}

function runGame(elements) {
  const { gameArena, gameTimer, gameScore, startGame, arenaMessage } = elements;

  activeGame = true;
  score = 0;
  timeLeft = 30;
  gameScore.textContent = score;
  gameTimer.textContent = timeLeft;
  startGame.textContent = "Reiniciar";
  clearBugs(gameArena);
  setMessage(arenaMessage, "Mini Juego", "Caza todos los bugs posibles.", false);

  window.clearInterval(timerId);
  window.clearInterval(spawnId);
  spawnBug(gameArena, gameScore);
  spawnId = window.setInterval(() => spawnBug(gameArena, gameScore), 650);
  timerId = window.setInterval(() => {
    timeLeft -= 1;
    gameTimer.textContent = timeLeft;
    if (timeLeft <= 0) finishGame(elements);
  }, 1000);
}

function initGame() {
  const elements = {
    gameArena: document.querySelector("#gameArena"),
    gameTimer: document.querySelector("#gameTimer"),
    gameScore: document.querySelector("#gameScore"),
    gameBest: document.querySelector("#gameBest"),
    startGame: document.querySelector("#startGame"),
    clearRanking: document.querySelector("#clearRanking"),
    rankingList: document.querySelector("#rankingList"),
    playerName: document.querySelector("#playerName"),
    arenaMessage: document.querySelector("#arenaMessage")
  };

  if (!elements.gameArena || !elements.startGame) {
    activeGame = false;
    window.clearInterval(timerId);
    window.clearInterval(spawnId);
    return;
  }

  elements.startGame.addEventListener("click", () => runGame(elements));
  elements.clearRanking.addEventListener("click", () => {
    localStorage.removeItem(rankingKey);
    renderRanking(elements.gameBest, elements.rankingList);
    setMessage(elements.arenaMessage, "Ranking limpio", "Inicia una nueva partida para registrar tu puntuación.");
  });

  renderRanking(elements.gameBest, elements.rankingList);
}

function updateCurrentNav() {
  const currentPage = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav a").forEach((link) => {
    const linkPage = new URL(link.href, location.href).pathname.split("/").pop() || "index.html";
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
  initGame();
  window.scrollTo({ top: 0, behavior: "instant" });
}

initPage();

if (window.Swup) {
  const swup = new Swup({
    containers: ["#swup"],
    animationSelector: '[class*="transition-"]'
  });

  swup.hooks.on("page:view", initPage);
}







