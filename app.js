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
const rewardShoes = [
  "cream",
  "sand",
  "lilac",
  "olive",
  "silver",
  "cobalt",
  "orange",
  "black",
  "lime",
];
const shoeNames = [
  "纯白低帮",
  "沙丘经典",
  "紫雾复古",
  "苔原漫游",
  "银翼未来",
  "钴蓝脉冲",
  "烈焰街头",
  "暗影高帮",
  "荧光加速",
];
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
  finalShoe = 0,
  entertainmentMode = false;

function shoePath(id) {
  return `assets/shoes/${id}.png`;
}
function couponFor(n) {
  return couponValues[n];
}
function accuracyFor(n) {
  return accuracyValues[n];
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
}

function start() {
  phase = "quiz";
  step = 0;
  score = 0;
  answers = [];
  lever.classList.add("locked");
  machine.classList.remove("reward");
  $("#couponPanel").classList.add("hidden");
  $("#machineTitle").textContent = "球鞋知识挑战";
  $("#stageDisplay").textContent = "LEVEL 01";
  renderQuestion();
  renderMap();
}
function renderQuestion() {
  const q = questions[step];
  showView("#questionView");
  $("#questionLevel").textContent = `LEVEL 0${step + 1} / 03`;
  $("#questionType").textContent = q.type;
  $("#questionImage").src = shoePath(q.shoe);
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
    `你答对了 ${score} 题，¥${value} 优惠券已经锁定。摇杆只负责揭晓，不会改变券额。`;
  $("#machineTitle").textContent = "通关奖励舱";
  $("#statusText").textContent = "REWARD LOCKED · OPEN THE CHAMBER";
  $("#machineScore").textContent = `¥${value} LOCKED`;
  $("#stageDisplay").textContent = "REVEAL";
  lever.classList.remove("locked");
  renderMap();
  beep(620, 0.25);
}

function reelCell(col, index) {
  if (col === 0)
    return `<div class="reel-number">${accuracyValues[(index + 4) % 4]}%</div>`;
  if (col === 1)
    return `<img src="${shoePath(rewardShoes[(index + 9) % 9])}" alt="">`;
  return `<div class="reel-coupon">¥${couponValues[(index + 4) % 4]}</div>`;
}
function setReel(col, center) {
  const track = document.querySelector(`[data-reel="${col}"] .reel-items`);
  track.innerHTML = [-1, 0, 1]
    .map((off) => `<div class="reel-item">${reelCell(col, center + off)}</div>`)
    .join("");
}
function renderReels(indices = [0, 4, 0]) {
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
  $("#statusText").textContent = "REVEALING YOUR LOCKED REWARD...";
  finalShoe = Math.min(8, score * 2 + Math.floor(Math.random() * 3));
  const current = [0, 4, 0],
    targets = [score, finalShoe, score];
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
  [score, finalShoe, score].forEach((target, col) => {
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
  const code =
    saved?.code ||
    `SOLE${value}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  if (!saved && !entertainmentMode) {
    saved = { value, code, score, date: new Date().toISOString() };
    localStorage.setItem("soleSignalClaim", JSON.stringify(saved));
  }
  $("#couponValue").textContent = saved?.value ?? value;
  $("#couponCode").textContent = saved?.code ?? code;
  $("#resultSummary").textContent = entertainmentMode
    ? `娱乐模式成绩：正确率 ${pct}% · 本次不重复发券`
    : `正确率 ${pct}% · 答对 ${score}/3 题 · 优惠券 100% 到手`;
  $("#couponRarity").textContent =
    score === 3
      ? "★ PERFECT CLEAR · MAX REWARD"
      : "CHALLENGE COMPLETE · REWARD CLAIMED";
  $("#rewardShoe").src = shoePath(rewardShoes[finalShoe]);
  $("#rewardShoeName").textContent = shoeNames[finalShoe];
  $("#statusText").textContent = "REWARD CHAMBER OPENED";
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
$("#replayBtn").onclick = () => {
  entertainmentMode = Boolean(localStorage.getItem("soleSignalClaim"));
  $("#claimNote").textContent = entertainmentMode
    ? "娱乐模式：首次奖励已经锁定，本次成绩不会再次生成优惠券。"
    : $("#claimNote").textContent;
  window.scrollTo({ top: $(".journey").offsetTop - 15, behavior: "smooth" });
  setTimeout(start, 350);
};
$("#copyBtn").onclick = () =>
  navigator.clipboard.writeText($("#couponCode").textContent).then(() => {
    const toast = $("#toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  });
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
