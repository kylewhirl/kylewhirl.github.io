const symbols = [
  { id: "course", label: "Golf Course", glyph: "⛳️" },
  { id: "ball", label: "Premium Ball", glyph: "⚪" },
  { id: "tee", label: "Golf Tee", glyph: "🔸" },
  { id: "driver", label: "Golfer", glyph: "🏌️" },
  { id: "putter", label: "Putter", glyph: "🟩" },
  { id: "glove", label: "Golf Glove", glyph: "🧤" },
  { id: "trophy", label: "Trophy", glyph: "🏆" },
  { id: "cart", label: "Golf Cart", glyph: "🛺" },
  { id: "rangefinder", label: "Rangefinder", glyph: "🔭" },
  { id: "sad", label: "Sad Golf Ball", glyph: "😵" }
];

const riggedSpinPlan = [
  { type: "smallWin", delta: 40, message: "Okay okay... birthday luck is real.", result: ["tee", "tee", "tee"] },
  { type: "jackpotNearMiss", delta: -20, message: "Two golf courses and the golfer parked between them. That was disgusting.", result: ["course", "course", "driver"], betweenReels: [2] },
  { type: "loss", delta: -15, message: "That one leaked into the right rough.", result: ["ball", "tee", "cart"] },
  { type: "tinyWin", delta: 10, message: "A pity birdie keeps the dream alive.", result: ["ball", "ball", "ball"] },
  { type: "nearMiss", delta: -25, message: "SO close. One rangefinder away.", result: ["rangefinder", "rangefinder", "ball"] },
  { type: "smallWin", delta: 15, message: "A little back. The machine respects you just enough.", result: ["glove", "glove", "glove"] },
  { type: "loss", delta: -25, message: "The house just read your handicap.", result: ["driver", "glove", "tee"] },
  { type: "tinyWin", delta: 5, message: "Tiny rebate. Suspiciously generous.", result: ["putter", "putter", "putter"] },
  { type: "loss", delta: -25, message: "Cart path bounce. Financially devastating.", result: ["cart", "putter", "glove"] },
  { type: "loss", delta: -20, message: "Golf Mart sends its regards.", result: ["tee", "driver", "rangefinder"] },
  { type: "loss", delta: -25, message: "That spin went directly into the water.", result: ["ball", "cart", "glove"] },
  { type: "loss", delta: -15, message: "A clean strike with terrible financial consequences.", result: ["putter", "tee", "driver"] },
  { type: "loss", delta: -25, message: "The machine just ordered another glove on your behalf.", result: ["glove", "rangefinder", "cart"] },
  { type: "finalBust", delta: -25, message: "You gambled it all the way down to $0.", result: ["sad", "sad", "sad"] }
];

const STORAGE_KEY = "backNineSlotsGiftCardState:v3";

const defaultGameState = {
  startingBalance: 150,
  maxBalance: 200,
  balance: 150,
  betAmount: 25,
  spinIndex: 0,
  isSpinning: false,
  isGameOver: false,
  cashedOut: false,
  lastResult: "The $150 is intact. For now.",
  lastKicker: "Awaiting terrible decision",
  finalHeadline: "The machine keeps score.",
  finalCopy: "Cash out before the balance hits $0, or the birthday casino wins.",
  finalVisible: false,
  reels: ["course", "driver", "trophy"],
  betweenReels: []
};

const gameState = loadGameState();

const $ = (selector) => document.querySelector(selector);
const reelEls = [$("#reel0"), $("#reel1"), $("#reel2")];
const balanceValue = $("#balanceValue");
const betValue = $("#betValue");
const spinValue = $("#spinValue");
const resultText = $("#resultText");
const resultKicker = $("#resultKicker");
const slotMachine = $("#slotMachine");
const finalReveal = $("#finalReveal");
const lever = $("#lever");

function formatMoney(value) {
  return `$${Math.max(0, value).toFixed(0)}`;
}

function getSymbol(id) {
  return symbols.find((symbol) => symbol.id === id) || symbols[0];
}

function buildReelCells(centerId, options = {}) {
  if (options.between) {
    return [randomSymbolId(), "course", centerId, "course", randomSymbolId()];
  }

  return [randomSymbolId(), randomSymbolId(), centerId, randomSymbolId(), randomSymbolId()];
}

function renderSymbol(el, id, options = {}) {
  const symbol = getSymbol(id);
  el.innerHTML = buildReelCells(id, options)
    .map((cellId) => `<span>${getSymbol(cellId).glyph}</span>`)
    .join("");
  el.classList.toggle("in-between", Boolean(options.between));
  el.setAttribute("aria-label", symbol.label);
}

function updateDisplays() {
  balanceValue.textContent = formatMoney(gameState.balance);
  betValue.textContent = formatMoney(gameState.betAmount);
  spinValue.textContent = String(gameState.spinIndex);
}

function loadGameState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return { ...defaultGameState };
    return { ...defaultGameState, ...stored, isSpinning: false };
  } catch {
    return { ...defaultGameState };
  }
}

function saveGameState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...gameState, isSpinning: false }));
}

function computeNextBalance(delta) {
  return Math.min(gameState.maxBalance, Math.max(0, gameState.balance + delta));
}

function restoreGameState() {
  gameState.reels.forEach((id, index) => {
    renderSymbol(reelEls[index], id, { between: gameState.betweenReels.includes(index) });
  });
  resultKicker.textContent = gameState.lastKicker;
  resultText.textContent = gameState.lastResult;
  updateDisplays();

  if (gameState.finalVisible || gameState.isGameOver || gameState.cashedOut) {
    finalReveal.classList.remove("hidden");
    $("#finalHeadline").textContent = gameState.finalHeadline;
    $("#finalCopy").textContent = gameState.finalCopy;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomSymbolId() {
  return symbols[Math.floor(Math.random() * (symbols.length - 1))].id;
}

async function animateReel(index, targetId, duration, options = {}) {
  const reel = reelEls[index].parentElement;
  const started = performance.now();
  reel.classList.add("spinning");
  reelEls[index].classList.remove("in-between");

  while (performance.now() - started < duration) {
    renderSymbol(reelEls[index], randomSymbolId());
    await sleep(70 + index * 16);
  }

  renderSymbol(reelEls[index], targetId, options);
  reel.classList.remove("spinning");
}

async function spinReels(plan) {
  const isNear = plan.type === "nearMiss" || plan.type === "jackpotNearMiss";
  const extra = plan.type === "jackpotNearMiss" ? 1350 : isNear ? 520 : 0;
  await Promise.all([
    animateReel(0, plan.result[0], 1050),
    animateReel(1, plan.result[1], 1320),
    animateReel(2, plan.result[2], 1620 + extra, { between: plan.betweenReels?.includes(2) })
  ]);
}

function animateBalance(delta) {
  const start = gameState.balance;
  const end = computeNextBalance(delta);
  const steps = 18;
  let step = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      step += 1;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      gameState.balance = Math.round(start + (end - start) * eased);
      updateDisplays();

      if (step >= steps) {
        gameState.balance = end;
        updateDisplays();
        clearInterval(interval);
        resolve();
      }
    }, 24);
  });
}

function setMachineMood(type, delta) {
  slotMachine.classList.remove("win", "loss", "near", "bust");
  void slotMachine.offsetWidth;

  if (type === "finalBust") {
    slotMachine.classList.add("bust");
  } else if (type === "nearMiss" || type === "jackpotNearMiss") {
    slotMachine.classList.add("near", "loss");
  } else if (delta > 0) {
    slotMachine.classList.add("win");
    balanceValue.classList.add("balance-pulse");
    setTimeout(() => balanceValue.classList.remove("balance-pulse"), 650);
  } else {
    slotMachine.classList.add("loss");
  }

  setTimeout(() => slotMachine.classList.remove("win", "loss", "near"), 1300);
}

async function triggerSpin() {
  if (gameState.isSpinning || gameState.isGameOver || gameState.cashedOut) return;

  const plan = riggedSpinPlan[Math.min(gameState.spinIndex, riggedSpinPlan.length - 1)];
  const originalBalance = gameState.balance;
  const resolvedBalance = computeNextBalance(plan.delta);
  const resolvedSpinIndex = gameState.spinIndex + 1;

  gameState.balance = resolvedBalance;
  gameState.spinIndex = resolvedSpinIndex;
  gameState.reels = plan.result;
  gameState.betweenReels = plan.betweenReels || [];
  gameState.lastKicker = plan.delta > 0 ? `Won ${formatMoney(resolvedBalance - originalBalance)}` : `Lost ${formatMoney(originalBalance - resolvedBalance)}`;
  gameState.lastResult = plan.message;

  if (plan.type === "finalBust" || resolvedBalance <= 0) {
    gameState.balance = 0;
    gameState.isGameOver = true;
    gameState.finalVisible = true;
    gameState.finalHeadline = "$0. The house wins.";
    gameState.finalCopy = "The final balance is $0. The birthday casino thanks you for your service.";
  }

  saveGameState();

  gameState.balance = originalBalance;
  gameState.spinIndex = resolvedSpinIndex - 1;
  gameState.isGameOver = false;
  gameState.finalVisible = false;

  gameState.isSpinning = true;
  lever.classList.add("pulled");
  resultKicker.textContent = plan.type === "nearMiss" || plan.type === "jackpotNearMiss" ? "Almost..." : "Reels turning";
  resultText.textContent = "Hold your breath and your wallet.";

  await spinReels(plan);

  await animateBalance(plan.delta);
  gameState.spinIndex = resolvedSpinIndex;
  gameState.reels = plan.result;
  gameState.betweenReels = plan.betweenReels || [];
  gameState.lastKicker = plan.delta > 0 ? `Won ${formatMoney(gameState.balance - originalBalance)}` : `Lost ${formatMoney(originalBalance - gameState.balance)}`;
  gameState.lastResult = plan.message;
  resultKicker.textContent = gameState.lastKicker;
  resultText.textContent = gameState.lastResult;
  setMachineMood(plan.type, plan.delta);

  updateDisplays();
  gameState.isSpinning = false;
  setTimeout(() => lever.classList.remove("pulled"), 240);

  if (plan.type === "finalBust" || gameState.balance <= 0) {
    gameState.balance = 0;
    gameState.isGameOver = true;
    updateDisplays();
    await sleep(900);
    showFinalReveal("The final balance is $0. The birthday casino thanks you for your service.", "$0. The house wins.");
  }

  saveGameState();
}

function showFinalReveal(copy, headline = "The machine keeps score.") {
  gameState.finalVisible = true;
  gameState.finalHeadline = headline;
  gameState.finalCopy = copy;
  $("#finalHeadline").textContent = headline;
  $("#finalCopy").textContent = copy;
  finalReveal.classList.remove("hidden");
  finalReveal.scrollIntoView({ behavior: "smooth", block: "center" });
  saveGameState();
}

function cashOut() {
  if (gameState.isSpinning || gameState.isGameOver) return;
  gameState.cashedOut = true;
  gameState.isGameOver = true;
  resultKicker.textContent = "Cashed out";
  resultText.textContent = `Cashed out at ${formatMoney(gameState.balance)}. That is the gift card balance.`;
  gameState.lastKicker = "Cashed out";
  gameState.lastResult = resultText.textContent;
  showFinalReveal(`Cashed out at ${formatMoney(gameState.balance)}. That is the gift card balance.`, `Locked in ${formatMoney(gameState.balance)}.`);
}

function bindLever() {
  let startY = null;
  let pulled = false;

  const start = (clientY) => {
    if (gameState.isSpinning || gameState.isGameOver) return;
    startY = clientY;
    pulled = false;
  };

  const move = (clientY) => {
    if (startY == null) return;
    const deltaY = clientY - startY;
    const clamped = Math.max(0, Math.min(deltaY, 90));
    lever.style.setProperty("--pull", `${clamped}px`);
    lever.querySelector(".lever-handle").style.transform = `translateY(${clamped}px)`;

    if (deltaY > 60 && !pulled) {
      pulled = true;
      triggerSpin();
    }
  };

  const end = () => {
    startY = null;
    lever.querySelector(".lever-handle").style.transform = "";
  };

  lever.addEventListener("touchstart", (event) => start(event.touches[0].clientY), { passive: true });
  lever.addEventListener("touchmove", (event) => move(event.touches[0].clientY), { passive: true });
  lever.addEventListener("touchend", end);

  lever.addEventListener("mousedown", (event) => start(event.clientY));
  window.addEventListener("mousemove", (event) => move(event.clientY));
  window.addEventListener("mouseup", end);

  lever.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerSpin();
    }
  });
}

$("#keepGiftButton").addEventListener("click", () => {
  $("#heroToast").textContent = "Smart. That locks in $150 for a dangerous amount of golf stuff.";
});

$("#riskButton").addEventListener("click", () => {
  $("#slotSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#spinButton").addEventListener("click", triggerSpin);
$("#cashOutButton").addEventListener("click", cashOut);

bindLever();
restoreGameState();
