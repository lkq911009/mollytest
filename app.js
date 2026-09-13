const questions = [
  {
    type: "MATERIAL / 材质关",
    shoe: "cream",
    q: "皮革球鞋应该怎么清洁？",
    answers: ["直接放进洗衣机强洗", "软布蘸中性清洁剂轻擦", "用热水长时间浸泡"],
    correct: 1,
    why: "中性清洁剂配合软布更温和，可以减少皮面开裂和变形。",
  },
  {
    type: "FIT / 尺码关",
    shoe: "silver",
    q: "为什么建议下午试穿球鞋？",
    answers: ["下午脚部会轻微膨胀", "下午鞋底会自动变软", "下午鞋码会变小"],
    correct: 0,
    why: "活动一天后脚部通常会轻微膨胀，此时试穿更接近日常真实状态。",
  },
  {
    type: "ROTATION / 轮换关",
    shoe: "olive",
    q: "为什么建议球鞋轮换着穿？",
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
  spinning = false;
let timers = [],
  stops = [],
  selectedDrop = 0,
  selectedSize = 7,
  drawWon = false,
  drawResult = null,
  entertainmentMode = false;
let memoryClaim = null,
  claimPersisted = false,
  claimStorageUnavailable = false,
  toastTimer;
const dialogOpeners = new WeakMap();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function later(callback, delay) {
  const timer = setTimeout(callback, delay);
  stops.push(timer);
  return timer;
}

function isValidClaim(claim) {
  return Boolean(
    claim && typeof claim === "object" && !Array.isArray(claim) &&
    Number.isInteger(claim.score) && claim.score >= 0 && claim.score < couponValues.length &&
    claim.value === couponValues[claim.score] &&
    typeof claim.code === "string" && /^[A-Z0-9-]{6,80}$/.test(claim.code) &&
    drops.some((drop) => drop.id === claim.shoe) && sizes.includes(claim.size) &&
    typeof claim.drawWon === "boolean" &&
    (claim.accessCode === undefined || (typeof claim.accessCode === "string" && claim.accessCode.length <= 80)) &&
    typeof claim.date === "string" && Number.isFinite(Date.parse(claim.date)),
  );
}
function readStoredClaim() {
  try {
    const claim = JSON.parse(localStorage.getItem("soleSignalClaim"));
    if (isValidClaim(claim)) {
      claimPersisted = true;
      return claim;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) claimStorageUnavailable = true;
  }
  return null;
}
function rememberClaim(claim) {
  memoryClaim = claim;
  try {
    localStorage.setItem("soleSignalClaim", JSON.stringify(claim));
    claimPersisted = true;
    claimStorageUnavailable = false;
  } catch {
    claimPersisted = false;
    claimStorageUnavailable = true;
  }
}
function updateClaimNotice() {
  const temporary = memoryClaim && !claimPersisted;
  if (temporary) {
    $("#claimNote").textContent = "本次奖励仅在当前页面保留，刷新或关闭后可能丢失。再次挑战不重复发券，请先复制编号。";
  } else if (entertainmentMode) {
    $("#claimNote").textContent = "再次挑战仅供娱乐，不重复发券。购买资格及券码需经活动方确认后使用。";
  } else if (claimStorageUnavailable) {
    $("#claimNote").textContent = "当前浏览器无法保存领取记录，完成后请及时复制编号。购买资格及券码需经活动方确认后使用。";
  }
  $(".claim-lock").textContent = temporary
    ? "仅在当前页面保留，请先复制编号；再次挑战不会重复发券。"
    : "首次奖励已记录。再次挑战仅供娱乐，不会重复发券。";
}
memoryClaim = readStoredClaim();
entertainmentMode = Boolean(memoryClaim);

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
  $("#startBtn").disabled = phase !== "intro";
  $("#nextBtn").classList.toggle("hidden", phase !== "quiz");
  $("#nextBtn").disabled = phase !== "quiz" || answers[step] === undefined;
  lever.classList.toggle("hidden", !["unlock", "reel"].includes(phase));
  lever.disabled = phase !== "unlock";
  lever.classList.toggle("locked", lever.disabled);
  $("#receiptDetailsBtn").classList.toggle("hidden", !["printing", "done"].includes(phase));
  $("#receiptDetailsBtn").disabled = phase !== "done";
  $("#receiptActionLabel").textContent = phase === "printing" ? "正在出票" : "查看好礼";
  $("#stubOpenBtn").disabled = phase !== "done";
  $("#stubOpenBtn").classList.toggle("hidden", phase !== "done");
  $("#actionNote").classList.toggle("hidden", !["quiz", "printing", "done"].includes(phase));
  $("#actionNote").textContent = phase === "quiz"
    ? answers[step] === undefined ? "请在上方屏幕选择答案 ↑" : "看完解析，按下按钮继续"
    : phase === "printing" ? "好礼正在出纸，请稍候 ↓" : "小票已送达，点击查看好礼";
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
  clearSpin();
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
  $("#questionView").classList.remove("has-feedback");
  $("#questionLevel").textContent = `LEVEL 0${step + 1} / 03`;
  $("#questionType").textContent = q.type;
  $("#questionText").textContent = q.q;
  $("#answers").innerHTML = q.answers
    .map(
      (a, i) =>
        `<button type="button" data-i="${i}"><b>${String.fromCharCode(65 + i)}</b><span>${a}</span><i>↗</i></button>`,
    )
    .join("");
  $("#feedback").classList.add("hidden");
  $("#nextBtn").innerHTML = step === questions.length - 1
    ? "完成挑战 <span>→</span>" : "下一关 <span>→</span>";
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
  $("#questionView").classList.add("has-feedback");
  $("#statusText").textContent = ok
    ? "CORRECT · COUPON UPGRADED"
    : "KEEP GOING · REWARD GUARANTEED";
  $("#machineScore").textContent = `${score} CORRECT`;
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
    `¥${value} 优惠券已锁定，中签与否都能领。`;
  $("#machineTitle").textContent = "挑战完成 · 好礼已锁定";
  $("#statusText").textContent = "ENTRY READY · SUBMIT THE DRAW";
  $("#machineScore").textContent = `¥${value} LOCKED`;
  $("#stageDisplay").textContent = "REVEAL";
  lever.classList.remove("locked");
  renderMap();
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
    value = couponFor(score);
  const saved = readStoredClaim() || memoryClaim;
  if (saved) memoryClaim = saved;
  const replaying = entertainmentMode || Boolean(saved);
  const code = `SOLE${value}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const accessCode = result.won
    ? `PASS-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    : "";
  if (!replaying) {
    rememberClaim({
      value,
      code,
      score,
      shoe: resultDrop.id,
      size: resultSize,
      drawWon: result.won,
      accessCode,
      date: new Date().toISOString(),
    });
  }
  $("#couponValue").textContent = value;
  $("#couponCode").textContent = replaying
    ? `PLAY-${value}-${code.slice(-5)}`
    : code;
  const modeCopy = replaying ? " · 娱乐模式不重复发券" : "";
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
    $("#accessCode").textContent = replaying
      ? `PREVIEW-${accessCode.slice(-11)}`
      : accessCode;
    $("#accessProduct").textContent = `${resultDrop.name} · ${resultSize} 码`;
  } else {
    $("#accessCode").textContent = "";
    $("#accessProduct").textContent = "";
  }
  const resultTitle = result.won ? "恭喜中签！" : "好礼已到账";
  const resultShoe = `${resultDrop.name} · ${resultSize} 码`;
  $("#stubTitle").textContent = resultTitle;
  $("#stubShoe").textContent = resultShoe;
  $("#stubValue").textContent = `¥${value}`;
  $("#screenResultTitle").textContent = resultTitle;
  $("#screenResultShoe").textContent = resultShoe;
  $("#screenCouponValue").textContent = `¥${value}`;
  showView("#doneView");
  $("#statusText").textContent = "PRINTING REWARD RECEIPT...";
  $("#machineTitle").textContent = "正在打印奖励小票";
  $("#stageDisplay").textContent = "PRINTING";
  lever.classList.add("locked");
  entertainmentMode = true;
  const panel = $("#couponPanel");
  const feed = $("#receiptFeed");
  const stub = $("#receiptStub");
  feed.classList.remove("hidden", "printing", "printed", "complete");
  stub.classList.remove("printing", "printed");
  panel.classList.remove("hidden", "printing", "printed");
  updateClaimNotice();
  renderMap();
  // Reveal the hanging ticket inside the fixed cabinet without changing page height.
  $(".slot-mouth").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "nearest" });
  later(() => {
    feed.classList.add("printing");
    stub.classList.add("printing");
    later(() => {
      phase = "done";
      panel.classList.add("printed");
      feed.classList.remove("printing");
      feed.classList.add("printed");
      stub.classList.remove("printing");
      stub.classList.add("printed");
      $("#statusText").textContent = "RECEIPT READY · COUPON SECURED";
      $("#machineTitle").textContent = "小票打印完成";
      $("#stageDisplay").textContent = "CLEARED";
      renderMap();
    }, reducedMotion.matches ? 50 : 2200);
  }, 30);
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
  };
});
$("#replayBtn").onclick = () => {
  if (phase !== "done") return;
  closeDialog("#rewardDialog", false);
  closeDialog("#rulesDialog", false);
  clearSpin();
  spinning = false;
  memoryClaim ||= readStoredClaim();
  entertainmentMode ||= Boolean(memoryClaim);
  updateClaimNotice();
  phase = "intro";
  score = 0;
  step = 0;
  answers = [];
  drawResult = null;
  drawWon = false;
  machine.classList.remove("reward");
  lever.classList.add("locked");
  lever.classList.remove("pulled");
  $("#couponPanel").classList.add("hidden");
  $("#couponPanel").classList.remove("printing", "printed");
  $("#receiptFeed").classList.add("hidden");
  $("#receiptFeed").classList.remove("printing", "printed", "complete");
  $("#receiptStub").classList.remove("printing", "printed");
  $("#stubTitle").textContent = "";
  $("#stubShoe").textContent = "";
  $("#stubValue").textContent = "";
  $("#accessBtn").classList.add("hidden");
  $("#accessBtn").setAttribute("aria-expanded", "false");
  $("#purchaseAccess").classList.add("hidden");
  $("#questionView").classList.remove("has-feedback");
  $("#machineTitle").textContent = "选择心仪球鞋";
  $("#statusText").textContent = "SELECT A DROP · CHOOSE YOUR SIZE";
  $("#machineScore").textContent = "READY";
  $("#stageDisplay").textContent = "ENTRY";
  showView("#welcomeView");
  renderMap();
  $("#startBtn").focus({ preventScroll: true });
  machine.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
};

function openDialog(selector, opener) {
  if (selector === "#rewardDialog" && phase !== "done") return;
  const dialog = $(selector);
  if (dialog.open) return;
  dialogOpeners.set(dialog, opener || document.activeElement);
  dialog.showModal();
}
function closeDialog(selector, restoreFocus = true) {
  const dialog = $(selector);
  if (!restoreFocus) dialogOpeners.delete(dialog);
  if (dialog.open) dialog.close();
}
["#rewardDialog", "#rulesDialog"].forEach((selector) => {
  $(selector).addEventListener("close", () => {
    const opener = dialogOpeners.get($(selector));
    dialogOpeners.delete($(selector));
    if (opener?.isConnected && !opener.disabled && opener.getClientRects().length) {
      opener.focus({ preventScroll: true });
    }
  });
});
$("#stubOpenBtn").onclick = (event) => openDialog("#rewardDialog", event.currentTarget);
$("#receiptDetailsBtn").onclick = (event) => openDialog("#rewardDialog", event.currentTarget);
$("#rulesBtn").onclick = (event) => openDialog("#rulesDialog", event.currentTarget);
$("#closeRewardBtn").onclick = () => closeDialog("#rewardDialog");
$("#closeRulesBtn").onclick = () => closeDialog("#rulesDialog");

function showToast(message) {
  const toast = $("#toast");
  const host = document.querySelector("dialog[open]") || document.body;
  if (toast.parentElement !== host) host.appendChild(toast);
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}
async function copyText(selector, message) {
  try {
    await navigator.clipboard.writeText($(selector).textContent);
    showToast(message);
  } catch {
    showToast("复制未成功，请长按编号手动复制");
  }
}
$("#copyBtn").onclick = () => {
  if (phase === "done") copyText("#couponCode", "券码已复制");
};
$("#accessBtn").onclick = () => {
  if (phase !== "done" || !drawResult?.won) return;
  const pass = $("#purchaseAccess");
  const expanded = pass.classList.contains("hidden");
  pass.classList.toggle("hidden", !expanded);
  $("#accessBtn").setAttribute("aria-expanded", String(expanded));
  if (expanded) pass.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "center" });
};
$("#copyAccessBtn").onclick = () => {
  if (phase === "done" && drawResult?.won) copyText("#accessCode", "资格编号已复制");
};

updateClaimNotice();
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat && phase === "unlock" && !document.querySelector("dialog[open]") && !e.target.closest("button, a, summary, input, textarea, select")) {
    e.preventDefault();
    spin();
  }
});
renderMap();
renderReels();
