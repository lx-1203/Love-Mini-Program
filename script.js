const appConfig = {
  heroMode: "animation",
  heroVideoUrl: "",
  heroPosterUrl: "",
  heroAnimationTheme: "campus-night",
  heroTitle: "欢迎来到校园恋爱社区",
  heroSubtitle: "内容认识人，活动认识人，再把关系慢慢聊出来。",
  featureFlags: {
    chat_ai_enabled: false,
  },
};

const ticketTypeCopy = {
  feedback: {
    title: "问题反馈",
    hint: "用于提交 Bug、异常、投诉和体验问题。",
    gate: "已绑定手机号可提交",
  },
  suggestion: {
    title: "功能建议",
    hint: "用于提交产品想法、社区机制和增长建议。",
    gate: "已绑定手机号可提交",
  },
  activity_proposal: {
    title: "推荐举办活动",
    hint: "用于推荐官方活动、同城局和本校活动，默认进入运营审核队列。",
    gate: "已实名可提交，本校活动需校园认证",
  },
};

const submissionRecords = [
  {
    type: "feedback",
    title: "登录页切到视频模式后应自动回退动画",
    status: "processing",
    summary: "已确认没有素材时回退逻辑需要展示更明确的提示。",
    time: "今天 09:18",
  },
  {
    type: "suggestion",
    title: "公开问答页增加“先看高赞回答”入口",
    status: "reviewed",
    summary: "产品已收录，计划放入首页与社区联动优化中。",
    time: "昨天 18:42",
  },
  {
    type: "activity_proposal",
    title: "建议举办“图书馆南门咖啡破冰局”",
    status: "planned",
    summary: "运营已采纳，准备转活动草稿并补充报名规则。",
    time: "05.17 20:30",
  },
];

const strip = document.querySelector(".phones");
const loginHero = document.querySelector("[data-login-hero]");
const heroVideo = document.getElementById("loginHeroVideo");
const heroTitle = document.getElementById("loginHeroTitle");
const heroSubtitle = document.getElementById("loginHeroSubtitle");
const heroModeHint = document.getElementById("heroModeHint");
const modeButtons = Array.from(document.querySelectorAll("[data-hero-mode]"));

const submissionButtons = Array.from(document.querySelectorAll("[data-ticket-filter]"));
const composerTitle = document.getElementById("composerTitle");
const composerHint = document.getElementById("composerHint");
const composerGate = document.getElementById("composerGate");
const submissionHistory = document.getElementById("submissionHistory");
const profileSubmissionSummary = document.getElementById("profileSubmissionSummary");

function resetHeroVideo() {
  if (!heroVideo) {
    return;
  }

  heroVideo.pause();
  heroVideo.removeAttribute("src");
  heroVideo.removeAttribute("poster");
  heroVideo.load();
}

function renderLoginHero() {
  if (!loginHero || !heroTitle || !heroSubtitle || !heroModeHint) {
    return;
  }

  heroTitle.textContent = appConfig.heroTitle;
  heroSubtitle.textContent = appConfig.heroSubtitle;
  loginHero.dataset.theme = appConfig.heroAnimationTheme;

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.heroMode === appConfig.heroMode);
  });

  if (appConfig.heroMode === "video" && appConfig.heroVideoUrl) {
    loginHero.dataset.mediaState = "animation";
    heroModeHint.textContent = "正在尝试加载平台级视频主视觉。";
    heroVideo.poster = appConfig.heroPosterUrl;
    heroVideo.src = appConfig.heroVideoUrl;
    heroVideo.load();
    return;
  }

  resetHeroVideo();
  loginHero.dataset.mediaState = "animation";
  heroModeHint.textContent =
    appConfig.heroMode === "video"
      ? "暂无视频素材，已自动回退到动画欢迎页。"
      : "当前为动画欢迎页，后续可切换为平台级视频主视觉。";
}

function statusMeta(status) {
  switch (status) {
    case "reviewed":
      return { label: "已回复", className: "status-reviewed" };
    case "planned":
      return { label: "已采纳", className: "status-planned" };
    default:
      return { label: "处理中", className: "status-processing" };
  }
}

function ticketLabel(type) {
  return ticketTypeCopy[type]?.title || type;
}

function buildTicketRow(record) {
  const status = statusMeta(record.status);
  return `
    <article class="ticket-row">
      <div class="ticket-main">
        <strong>${record.title}</strong>
        <p>${ticketLabel(record.type)} · ${record.time}</p>
        <span>${record.summary}</span>
      </div>
      <span class="status-pill ${status.className}">${status.label}</span>
    </article>
  `;
}

function renderSubmissionHistory(filter) {
  if (!submissionHistory) {
    return;
  }

  const activeRecords = submissionRecords.filter((record) => record.type === filter);
  submissionHistory.innerHTML = activeRecords.map(buildTicketRow).join("");

  const copy = ticketTypeCopy[filter];
  if (composerTitle && composerHint && composerGate && copy) {
    composerTitle.textContent = copy.title;
    composerHint.textContent = copy.hint;
    composerGate.textContent = copy.gate;
  }

  submissionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.ticketFilter === filter);
  });
}

function renderProfileSubmissionSummary() {
  if (!profileSubmissionSummary) {
    return;
  }

  profileSubmissionSummary.innerHTML = submissionRecords.map(buildTicketRow).join("");
}

if (heroVideo) {
  heroVideo.addEventListener("canplay", () => {
    if (appConfig.heroMode !== "video" || !appConfig.heroVideoUrl || !loginHero) {
      return;
    }

    loginHero.dataset.mediaState = "video";
    if (heroModeHint) {
      heroModeHint.textContent = "当前使用平台级视频主视觉，可按配置随时切回动画模式。";
    }
  });

  heroVideo.addEventListener("error", () => {
    if (appConfig.heroMode !== "video") {
      return;
    }

    resetHeroVideo();
    if (loginHero) {
      loginHero.dataset.mediaState = "animation";
    }
    if (heroModeHint) {
      heroModeHint.textContent = "视频素材加载失败，已自动回退到动画欢迎页。";
    }
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    appConfig.heroMode = button.dataset.heroMode || "animation";
    renderLoginHero();
  });
});

submissionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderSubmissionHistory(button.dataset.ticketFilter || "feedback");
  });
});

renderLoginHero();
renderProfileSubmissionSummary();
renderSubmissionHistory("feedback");

if (strip) {
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let moved = false;

  const endDrag = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }

    strip.classList.remove("is-dragging");

    if (strip.hasPointerCapture(pointerId)) {
      strip.releasePointerCapture(pointerId);
    }

    pointerId = null;
    startX = 0;
    startScrollLeft = 0;

    if (moved) {
      event.preventDefault();
    }

    moved = false;
  };

  strip.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = strip.scrollLeft;
    moved = false;

    strip.classList.add("is-dragging");
    strip.setPointerCapture(pointerId);
  });

  strip.addEventListener("pointermove", (event) => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) > 4) {
      moved = true;
    }

    strip.scrollLeft = startScrollLeft - deltaX;
  });

  strip.addEventListener("pointerup", endDrag);
  strip.addEventListener("pointercancel", endDrag);
  strip.addEventListener("lostpointercapture", () => {
    strip.classList.remove("is-dragging");
    pointerId = null;
    moved = false;
  });

  strip.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      strip.scrollBy({
        left: event.deltaY,
      });
    },
    { passive: false }
  );
}
