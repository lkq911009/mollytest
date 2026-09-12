const questions = [
  {
    type: "MATERIAL / 材质关",
    shoe: "cream",
    q: "日常白色皮革球鞋，最适合用哪种方式清洁？",
    answers: ["直接放进洗衣机强洗", "软布蘸中性清洁剂轻擦", "用热水长时间浸泡"],
    correct: 1,
    why: "中性清洁剂配合软布更温和，可以减少皮面开裂和变形。",
  },
  {
    type: "FIT / 尺码关",
    shoe: "silver",
    q: "下午试穿球鞋通常比清晨更合理，为什么？",
    answers: ["下午脚部会轻微膨胀", "下午鞋底会自动变软", "下午鞋码会变小"],
    correct: 0,
    why: "活动一天后脚部通常会轻微膨胀，此时试穿更接近日常真实状态。",
  },
  {
    type: "ROTATION / 轮换关",
    shoe: "olive",
    q: "为什么不建议连续很多天只穿同一双运动鞋？",
    answers: ["颜色会自动变深", "鞋底必须每天换方向", "需要时间散湿并恢复缓震"],
    correct: 2,
    why: "轮换穿着能给鞋内散湿和中底材料恢复的时间，也更利于延长寿命。",
  },
];
const drops = [
  { id: "silver-ribbon", name: "银缎丝带", image: "drop-silver.jpg" },
  { id: "red-suede", name: "赤红麂皮", image: "drop-red.jpg" },
  { id: "woven-cream", name: "奶油编织", image: "drop-woven.jpg" },
  { id: "white-navy", name: "白蓝复古", image: "drop-white-blue.jpg" },
];
const sizes = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
const drawStates = ["PENDING", "GOT ’EM", "NOT THIS TIME"];
const accuracyValues = [0, 33, 67, 100];
const couponValues = [5, 8, 12, 20];
const $ = (s) => document.querySelector(s);
const machine = $("#machine"),
  lever = $("#lever");
let step = 0,
  score = 0,
  answers = [],
  phase = "intro",
  spinning = false,
  soundOn = true;
let timers = [],
  stops = [],
  selectedDrop = 0,
  selectedSize = 7,
  drawWon = false,
  drawResult = null,
  entertainmentMode = false;
let audioContext;
let stopReceiptFollow = () => {};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function later(callback, delay) {
  const timer = setTimeout(callback, delay);
  stops.push(timer);
  return timer;
}

try {
  entertainmentMode = Boolean(localStorage.getItem("soleSignalClaim"));
} catch {}

function shoePath(id) {
  return `assets/shoes/${id}.png`;
}
function dropPath(drop) {
  return `assets/shoes/${drop.image}`;
}
function couponFor(n) {
  return couponValues[n];
}
function accuracyFor(n) {
  return accuracyValues[n];
}
function wrap(index, length) {
  return ((index % length) + length) % length;
}
function updateEntry() {
  $("#entryShoeName").textContent = drops[selectedDrop].name;
  $("#entrySize").textContent = sizes[selectedSize];
  document.querySelectorAll("#dropChoices button").forEach((button, index) => {
    button.classList.toggle("selected", index === selectedDrop);
    button.setAttribute("aria-pressed", String(index === selectedDrop));
    button.disabled = phase !== "intro";
  });
  document.querySelectorAll("#sizeChoices button").forEach((button, index) => {
    button.classList.toggle("selected", index === selectedSize);
    button.setAttribute("aria-pressed", String(index === selectedSize));
    button.disabled = phase !== "intro";
  });
}
function syncMachine() {
  machine.dataset.phase = phase;
  $("#startBtn").classList.toggle("hidden", phase !== "intro");
  lever.classList.toggle("hidden", !["unlock", "reel"].includes(phase));
  lever.disabled = phase !== "unlock";
  lever.classList.toggle("locked", lever.disabled);
  $("#actionNote").classList.toggle("hidden", !["quiz", "printing", "done"].includes(phase));
  $("#actionNote").textContent = phase === "quiz"
    ? "请在上方屏幕选择答案 ↑"
    : phase === "printing" ? "正在出纸，请稍候 ↓" : "好礼已送达，请收好你的小票 ↓";
  $("#bannerText").textContent = {
    intro: "下一双心动，从这里开始。",
    quiz: "多答对一题，好礼升一级。",
    unlock: "你的好礼，准备就绪。",
    reel: "一点好运，正在发生。",
    printing: "正在为你打印好礼。",
    done: "谢谢参与，下次再来。",
  }[phase];
}
function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(id).classList.remove("hidden");
}
function beep(freq = 220, duration = 0.07) {
  if (!soundOn) return;
  try {
    const ctx = audioContext ||= new (window.AudioContext || window.webkitAudioContext)(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch {}
}

function renderMap() {
  $("#levelMap").innerHTML = questions
    .map((_, i) => {
      let state = "";
      if (i === step && phase === "quiz") state = "active";
      if (answers[i] === true) state = "correct";
      if (answers[i] === false) state = "wrong";
      return `<div class="level-node ${state}"><b>${answers[i] === true ? "✓" : answers[i] === false ? "×" : `0${i + 1}`}</b><span>LEVEL</span></div>`;
    })
    .join("");
  $("#scoreLabel").textContent = `正确 ${score} / 3`;
  $("#journeyLabel").textContent =
    phase === "intro"
      ? "挑战尚未开始"
      : phase === "quiz"
        ? `正在挑战第 ${step + 1} 关`
        : phase === "unlock"
          ? "三关完成 · 奖励档位已锁定"
          : phase === "printing"
            ? "正在打印奖励小票"
            : phase === "reel" ? "正在揭晓发售签"
            : "优惠券已经领取";
  document
    .querySelectorAll("#tiers>div")
    .forEach((x) =>
      x.classList.toggle("active", Number(x.dataset.min) === score),
    );
  document
    .querySelectorAll("#charge i")
    .forEach((x, i) => x.classList.toggle("on", i < answers.length));
  updateEntry();
  syncMachine();
}

function start() {
  if (phase !== "intro") return;
  phase = "quiz";
  step = 0;
  score = 0;
  answers = [];
  lever.classList.add("locked");
  machine.classList.remove("reward");
  $("#couponPanel").classList.add("hidden");
  $("#machineTitle").textContent = "球鞋知识挑战";
  $("#statusText").textContent = "ENTRY LOCKED · START CHALLENGE";
  $("#stageDisplay").textContent = "LEVEL 01";
  renderQuestion();
  renderMap();
  $(".screen-housing").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
}
function renderQuestion() {
  const q = questions[step];
  showView("#questionView");
  $("#questionLevel").textContent = `LEVEL 0${step + 1} / 03`;
  $("#questionType").textContent = q.type;
  $("#questionText").textContent = q.q;
  $("#answers").innerHTML = q.answers
    .map(
      (a, i) =>
        `<button data-i="${i}"><b>${String.fromCharCode(65 + i)}</b><span>${a}</span><i>↗</i></button>`,
    )
    .join("");
  $("#feedback").classList.add("hidden");
  $("#statusText").textContent = `LEVEL 0${step + 1} · CHOOSE ONE`;
  $("#machineScore").textContent = `${score} CORRECT`;
  $("#stageDisplay").textContent = `LEVEL 0${step + 1}`;
  document
    .querySelectorAll("#answers button")
    .forEach((b) => (b.onclick = () => answer(Number(b.dataset.i))));
  renderMap();
}
function answer(choice) {
  if (phase !== "quiz" || answers[step] !== undefined) return;
  const q = questions[step],
    ok = choice === q.correct;
  answers[step] = ok;
  if (ok) score++;
  document.querySelectorAll("#answers button").forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add("correct");
    else if (i === choice) b.classList.add("wrong");
  });
  $("#feedbackIcon").textContent = ok ? "✓" : "×";
  $("#feedbackIcon").style.color = ok ? "#50603d" : "#934c3b";
  $("#feedbackTitle").textContent = ok
    ? "回答正确 · 奖励升级"
    : "差一点 · 继续闯关";
  $("#feedbackText").textContent = q.why;
  $("#nextBtn").innerHTML =
    step === 2 ? "完成挑战 <span>→</span>" : "下一关 <span>→</span>";
  $("#feedback").classList.remove("hidden");
  $("#statusText").textContent = ok
    ? "CORRECT · COUPON UPGRADED"
    : "KEEP GOING · REWARD GUARANTEED";
  $("#machineScore").textContent = `${score} CORRECT`;
  beep(ok ? 520 : 150, 0.13);
  renderMap();
}
function next() {
  if (phase !== "quiz" || answers[step] === undefined) return;
  if (step < 2) {
    step++;
    renderQuestion();
  } else unlock();
}
function unlock() {
  phase = "unlock";
  showView("#unlockView");
  const pct = accuracyFor(score),
    value = couponFor(score);
  $("#unlockPercent").textContent = `${pct}%`;
  $("#unlockCopy").textContent =
    `已锁定 ¥${value} 优惠券。接下来揭晓 ${drops[selectedDrop].name} · ${sizes[selectedSize]} 码的发售签，中签与否都不影响券额。`;
  $("#machineTitle").textContent = "挑战完成 · 好礼已锁定";
  $("#statusText").textContent = "ENTRY READY · SUBMIT THE DRAW";
  $("#machineScore").textContent = `¥${value} LOCKED`;
  $("#stageDisplay").textContent = "REVEAL";
  lever.classList.remove("locked");
  renderMap();
  beep(620, 0.25);
}

function reelCell(col, index) {
  if (col === 0) {
    const drop = drops[wrap(index, drops.length)];
    return `<div class="reel-drop"><img src="${dropPath(drop)}" alt=""><small>${drop.name}</small></div>`;
  }
  if (col === 1)
    return `<div class="reel-number">${sizes[wrap(index, sizes.length)]}</div>`;
  const state = drawStates[wrap(index, drawStates.length)];
  return `<div class="reel-status ${state === "GOT ’EM" ? "win" : ""}">${state}</div>`;
}
function setReel(col, center) {
  const track = document.querySelector(`[data-reel="${col}"] .reel-items`);
  track.innerHTML = [-1, 0, 1]
    .map(
      (off) =>
        `<div class="reel-item ${off === 0 ? "is-result" : ""}">${reelCell(col, center + off)}</div>`,
    )
    .join("");
}
function renderReels(indices = [0, 3, 0]) {
  $("#reels").innerHTML = indices
    .map(
      (n, col) =>
        `<div class="reel" data-reel="${col}"><div class="reel-items">${[-1, 0, 1].map((off) => `<div class="reel-item ${off === 0 ? "is-result" : ""}">${reelCell(col, n + off)}</div>`).join("")}</div></div>`,
    )
    .join("");
}
function clearSpin() {
  stopReceiptFollow();
  timers.forEach(clearInterval);
  stops.forEach(clearTimeout);
  timers = [];
  stops = [];
}
function spin() {
  if (phase !== "unlock" || spinning) return;
  spinning = true;
  phase = "reel";
  showView("#reelView");
  renderReels();
  lever.classList.add("pulled");
  $("#machineTitle").textContent = "发售签正在揭晓";
  $("#stageDisplay").textContent = "DRAWING";
  $("#statusText").textContent = "VALIDATING ENTRY · DRAWING...";
  drawWon = Math.random() < 0.25;
  drawResult = {
    dropIndex: selectedDrop,
    sizeIndex: selectedSize,
    won: drawWon,
  };
  const current = [0, 0, 0],
    targets = [drawResult.dropIndex, drawResult.sizeIndex, drawResult.won ? 1 : 2];
  document
    .querySelectorAll(".reel")
    .forEach((x) => x.classList.add("spinning"));
  current.forEach((_, col) => {
    timers[col] = setInterval(
      () => {
        current[col]++;
        setReel(col, current[col]);
        beep(100 + col * 15, 0.025);
      },
      78 + col * 13,
    );
    stops[col] = setTimeout(() => stopReel(col, targets[col]), 850 + col * 430);
  });
  renderMap();
}
function stopReel(col, target) {
  clearInterval(timers[col]);
  const reel = document.querySelector(`[data-reel="${col}"]`);
  reel.classList.remove("spinning");
  setReel(col, target);
  beep(300 + col * 100, 0.14);
  if (col === 2) {
    $("#statusText").textContent = "RESULT LOCKED · PRINTING NEXT";
    later(showCoupon, 850);
  }
}
function showCoupon() {
  clearSpin();
  spinning = false;
  phase = "printing";
  lever.classList.remove("pulled");
  machine.classList.add("reward");
  const result = drawResult || {
      dropIndex: selectedDrop,
      sizeIndex: selectedSize,
      won: drawWon,
    },
    resultDrop = drops[result.dropIndex],
    resultSize = sizes[result.sizeIndex],
    value = couponFor(score),
    pct = accuracyFor(score);
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("soleSignalClaim"));
  } catch {}
  if (saved) entertainmentMode = true;
  const code = `SOLE${value}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const accessCode = result.won
    ? `PASS-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    : "";
  if (!saved && !entertainmentMode) {
    saved = {
      value,
      code,
      score,
      shoe: resultDrop.id,
      size: resultSize,
      drawWon: result.won,
      accessCode,
      date: new Date().toISOString(),
    };
    try { localStorage.setItem("soleSignalClaim", JSON.stringify(saved)); } catch {}
  }
  $("#couponValue").textContent = entertainmentMode ? value : saved.value;
  $("#couponCode").textContent = entertainmentMode
    ? `PLAY-${value}-${code.slice(-5)}`
    : saved.code;
  const modeCopy = entertainmentMode ? " · 娱乐模式不重复发券" : "";
  $("#resultSummary").textContent = result.won
    ? `${resultDrop.name} ${resultSize} 码恭喜中签 · ¥${value} 优惠券同时到账${modeCopy}`
    : `本次未获得购买资格 · ¥${value} 保底优惠券已经到账${modeCopy}`;
  $("#couponRarity").textContent = result.won
    ? "GOT ’EM · PURCHASE ACCESS"
    : "NOT THIS TIME · COUPON SECURED";
  $("#resultTitle").textContent = result.won ? "恭喜中签！" : "保底奖励已到账";
  $("#rewardShoe").src = dropPath(resultDrop);
  $("#rewardShoeName").textContent = `${resultDrop.name} · ${resultSize} 码`;
  $("#drawResultBadge").textContent = result.won
    ? "GOT ’EM · 购买资格已锁定"
    : "NOT THIS TIME · 本次未中签";
  $("#drawResultBadge").className = `draw-result-badge ${result.won ? "won" : "lost"}`;
  $("#accessBtn").classList.toggle("hidden", !result.won);
  $("#accessBtn").setAttribute("aria-expanded", "false");
  $("#purchaseAccess").classList.add("hidden");
  if (result.won) {
    $("#accessCode").textContent = entertainmentMode
      ? `PREVIEW-${accessCode.slice(-11)}`
      : saved.accessCode || accessCode;
    $("#accessProduct").textContent = `${resultDrop.name} · ${resultSize} 码`;
  }
  $("#statusText").textContent = "PRINTING REWARD RECEIPT...";
  $("#machineTitle").textContent = "正在打印奖励小票";
  $("#stageDisplay").textContent = "PRINTING";
  lever.classList.add("locked");
  entertainmentMode = true;
  const panel = $("#couponPanel");
  const feed = $("#receiptFeed");
  feed.classList.remove("hidden", "complete");
  feed.style.height = "0px";
  panel.classList.remove("hidden", "printing", "printed");
  renderMap();
  // Move to the outlet before feeding the paper, so the motion stays in view.
  $(".slot-mouth").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
  later(() => {
    feed.style.height = `${panel.offsetHeight}px`;
    panel.classList.add("printing");
    // Follow only the emerging edge; touch or wheel input immediately takes control.
    const follow = setInterval(() => {
      const overflow = feed.getBoundingClientRect().bottom - innerHeight + 36;
      if (overflow > 0) window.scrollBy({ top: overflow, behavior: "instant" });
    }, 100);
    stopReceiptFollow = () => {
      clearInterval(follow);
      ["wheel", "touchstart", "pointerdown", "keydown"].forEach((event) => window.removeEventListener(event, stopReceiptFollow));
    };
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((event) => window.addEventListener(event, stopReceiptFollow, { passive: true }));
    later(() => {
      stopReceiptFollow();
      phase = "done";
      panel.classList.add("printed");
      feed.classList.add("complete");
      $("#statusText").textContent = "RECEIPT READY · COUPON SECURED";
      $("#machineTitle").textContent = "小票打印完成";
      $("#stageDisplay").textContent = "CLEARED";
      renderMap();
    }, reducedMotion.matches ? 50 : 2650);
  }, reducedMotion.matches ? 30 : 450);
  beep(score === 3 ? 760 : 560, 0.35);
}

$("#startBtn").onclick = start;
$("#nextBtn").onclick = next;
lever.onclick = spin;
document.querySelectorAll("#dropChoices button").forEach((button, index) => {
  button.onclick = () => {
    if (phase !== "intro") return;
    selectedDrop = index;
    document
      .querySelectorAll("#dropChoices button")
      .forEach((item) => item.classList.toggle("selected", item === button));
    updateEntry();
    beep(360, 0.08);
  };
});
document.querySelectorAll("#sizeChoices button").forEach((button, index) => {
  button.onclick = () => {
    if (phase !== "intro") return;
    selectedSize = index;
    document
      .querySelectorAll("#sizeChoices button")
      .forEach((item) => item.classList.toggle("selected", item === button));
    updateEntry();
    beep(410, 0.06);
  };
});
$("#replayBtn").onclick = () => {
  clearSpin();
  spinning = false;
  try { entertainmentMode ||= Boolean(localStorage.getItem("soleSignalClaim")); } catch {}
  $("#claimNote").textContent = entertainmentMode
    ? "再次挑战仅供娱乐，不重复发券。购买资格及券码需经活动方确认后使用。"
    : $("#claimNote").textContent;
  phase = "intro";
  score = 0;
  step = 0;
  answers = [];
  drawResult = null;
  machine.classList.remove("reward");
  lever.classList.add("locked");
  $("#couponPanel").classList.add("hidden");
  $("#couponPanel").classList.remove("printing", "printed");
  $("#receiptFeed").classList.add("hidden");
  $("#receiptFeed").classList.remove("complete");
  $("#receiptFeed").style.height = "0px";
  $("#accessBtn").classList.add("hidden");
  $("#purchaseAccess").classList.add("hidden");
  $("#machineTitle").textContent = "选择心仪球鞋";
  $("#statusText").textContent = "SELECT A DROP · CHOOSE YOUR SIZE";
  $("#machineScore").textContent = "READY";
  $("#stageDisplay").textContent = "ENTRY";
  showView("#welcomeView");
  renderMap();
  machine.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
};
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
}
async function copyText(selector, message) {
  try {
    await navigator.clipboard.writeText($(selector).textContent);
    showToast(message);
  } catch {
    showToast("复制未成功，请长按编号手动复制");
  }
}
$("#copyBtn").onclick = () => copyText("#couponCode", "券码已复制");
$("#accessBtn").onclick = () => {
  const pass = $("#purchaseAccess");
  const expanded = pass.classList.contains("hidden");
  pass.classList.toggle("hidden", !expanded);
  $("#accessBtn").setAttribute("aria-expanded", String(expanded));
  if (expanded) pass.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "center" });
};
$("#copyAccessBtn").onclick = () => copyText("#accessCode", "资格编号已复制");

if (entertainmentMode) {
  $("#claimNote").textContent =
    "再次挑战仅供娱乐，不重复发券。购买资格及券码需经活动方确认后使用。";
}
$("#soundBtn").onclick = () => {
  soundOn = !soundOn;
  $("#soundBtn").textContent = soundOn ? "声音 开" : "声音 关";
  $("#soundBtn").setAttribute("aria-pressed", String(soundOn));
};
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat && phase === "unlock" && !e.target.closest("button, a, summary, input, textarea, select")) {
    e.preventDefault();
    spin();
  }
});
renderMap();
renderReels();
