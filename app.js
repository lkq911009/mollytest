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
  entertainmentMode = false;

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
}
function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(id).classList.remove("hidden");
}
function beep(freq = 220, duration = 0.07) {
  if (!soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
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
}

function start() {
  phase = "quiz";
  step = 0;
  score = 0;
  answers = [];
  lever.classList.add("locked");
  machine.classList.remove("reward");
  $("#couponPanel").classList.add("hidden");
  $("#machineTitle").textContent = "售卖机资格挑战";
  $("#statusText").textContent = "ENTRY LOCKED · START CHALLENGE";
  $("#stageDisplay").textContent = "LEVEL 01";
  renderQuestion();
  renderMap();
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
  if (answers[step] !== undefined) return;
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
  $("#feedbackIcon").style.color = ok ? "#26a957" : "#e54e39";
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
  if (answers[step] === undefined) return;
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
    `货道：${String(selectedDrop + 1).padStart(2, "0")} · ${drops[selectedDrop].name}，尺码 ${sizes[selectedSize]}。¥${value} 优惠券小票已锁定，验证结果不会改变券额。`;
  $("#machineTitle").textContent = "限量发售验证终端";
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
    .map((off) => `<div class="reel-item">${reelCell(col, center + off)}</div>`)
    .join("");
}
function renderReels(indices = [0, 3, 0]) {
  $("#reels").innerHTML = indices
    .map(
      (n, col) =>
        `<div class="reel" data-reel="${col}"><div class="reel-items">${[-1, 0, 1].map((off) => `<div class="reel-item">${reelCell(col, n + off)}</div>`).join("")}</div></div>`,
    )
    .join("");
}
function clearSpin() {
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
  $("#statusText").textContent = "VALIDATING ENTRY · DRAWING...";
  drawWon = Math.random() < 0.25;
  const current = [0, 0, 0],
    targets = [selectedDrop, selectedSize, drawWon ? 1 : 2];
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
}
function stopReel(col, target) {
  clearInterval(timers[col]);
  const reel = document.querySelector(`[data-reel="${col}"]`);
  reel.classList.remove("spinning");
  setReel(col, target);
  beep(300 + col * 100, 0.14);
  if (col === 2) showCoupon();
}
function skipSpin() {
  if (!spinning) return;
  clearSpin();
  [selectedDrop, selectedSize, drawWon ? 1 : 2].forEach((target, col) => {
    const reel = document.querySelector(`[data-reel="${col}"]`);
    reel.classList.remove("spinning");
    setReel(col, target);
  });
  showCoupon();
}
function showCoupon() {
  clearSpin();
  spinning = false;
  phase = "done";
  lever.classList.remove("pulled");
  machine.classList.add("reward");
  const value = couponFor(score),
    pct = accuracyFor(score);
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("soleSignalClaim"));
  } catch {}
  if (saved) entertainmentMode = true;
  const code = `SOLE${value}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  if (!saved && !entertainmentMode) {
    saved = {
      value,
      code,
      score,
      shoe: drops[selectedDrop].id,
      size: sizes[selectedSize],
      drawWon,
      date: new Date().toISOString(),
    };
    localStorage.setItem("soleSignalClaim", JSON.stringify(saved));
  }
  $("#couponValue").textContent = entertainmentMode ? value : saved.value;
  $("#couponCode").textContent = entertainmentMode
    ? `DEMO-${value}-${code.slice(-5)}`
    : saved.code;
  const modeCopy = entertainmentMode ? " · 娱乐模式不重复发券" : "";
  $("#resultSummary").textContent = drawWon
    ? `${drops[selectedDrop].name} ${sizes[selectedSize]} 码模拟中签 · ¥${value} 优惠券同时到账${modeCopy}`
    : `本次未获得模拟购买资格 · ¥${value} 保底优惠券已经到账${modeCopy}`;
  $("#couponRarity").textContent = drawWon
    ? "GOT ’EM · PURCHASE ACCESS"
    : "NOT THIS TIME · COUPON SECURED";
  $("#resultTitle").textContent = drawWon ? "模拟中签！" : "保底奖励已到账";
  $("#rewardShoe").src = dropPath(drops[selectedDrop]);
  $("#rewardShoeName").textContent = `${drops[selectedDrop].name} · ${sizes[selectedSize]} 码`;
  $("#drawResultBadge").textContent = drawWon
    ? "GOT ’EM · 模拟购买资格"
    : "NOT THIS TIME · 本次未中签";
  $("#drawResultBadge").className = `draw-result-badge ${drawWon ? "won" : "lost"}`;
  $("#statusText").textContent = "DRAW COMPLETE · COUPON SECURED";
  $("#machineTitle").textContent = "小票打印完成";
  $("#stageDisplay").textContent = "CLEARED";
  lever.classList.add("locked");
  $("#couponPanel").classList.remove("hidden");
  renderMap();
  setTimeout(
    () =>
      $("#couponPanel").scrollIntoView({ behavior: "smooth", block: "center" }),
    350,
  );
  beep(score === 3 ? 760 : 560, 0.35);
}

$("#startBtn").onclick = start;
$("#nextBtn").onclick = next;
lever.onclick = spin;
$("#skipBtn").onclick = skipSpin;
document.querySelectorAll("#dropChoices button").forEach((button, index) => {
  button.onclick = () => {
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
    selectedSize = index;
    document
      .querySelectorAll("#sizeChoices button")
      .forEach((item) => item.classList.toggle("selected", item === button));
    updateEntry();
    beep(410, 0.06);
  };
});
$("#replayBtn").onclick = () => {
  entertainmentMode = Boolean(localStorage.getItem("soleSignalClaim"));
  $("#claimNote").textContent = entertainmentMode
    ? "娱乐模式：首次奖励已经锁定，本次成绩不会再次生成优惠券。"
    : $("#claimNote").textContent;
  phase = "intro";
  score = 0;
  step = 0;
  answers = [];
  machine.classList.remove("reward");
  lever.classList.add("locked");
  $("#couponPanel").classList.add("hidden");
  $("#machineTitle").textContent = "球鞋限量发售售卖机";
  $("#statusText").textContent = "SELECT A DROP · CHOOSE YOUR SIZE";
  $("#machineScore").textContent = "READY";
  $("#stageDisplay").textContent = "ENTRY";
  showView("#welcomeView");
  renderMap();
  window.scrollTo({ top: $(".journey").offsetTop - 15, behavior: "smooth" });
};
$("#copyBtn").onclick = () =>
  navigator.clipboard.writeText($("#couponCode").textContent).then(() => {
    const toast = $("#toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  });

if (entertainmentMode) {
  $("#claimNote").textContent =
    "娱乐模式：首次奖励已经锁定，本局只展示模拟券，不会再次发券。";
}
$("#soundBtn").onclick = () => {
  soundOn = !soundOn;
  $("#soundBtn").textContent = soundOn ? "SOUND ON" : "SOUND OFF";
};
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat && phase === "unlock") {
    e.preventDefault();
    spin();
  }
});
renderMap();
renderReels();
