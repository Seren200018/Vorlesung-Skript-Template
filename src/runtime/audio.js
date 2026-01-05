export function createAudioFeature(ctx) {
  const { sheetAudio, audioRegistry, body, sheets, audioDefaults } = ctx;
  let audioMode = (body.dataset.audioMode || audioDefaults.mode || "manual").toLowerCase();

  const requestAudioUpdate = (() => {
    let pending = null;
    return () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = null;
        updateAutoplayFocus();
      });
    };
  })();

  function initAudioControls() {
    sheetAudio.length = 0;
    sheets.forEach((sheet) => {
      const src = (sheet.dataset.audioSrc || "").trim();
      if (!src) return;
      const title = (sheet.dataset.audioTitle || sheet.querySelector("[data-toc]")?.textContent || "Audio").trim();
      sheetAudio.push({ sheet, src, title });
    });

    const radios = Array.from(document.querySelectorAll('input[name="audio-mode"]'));
    if (radios.length) {
      const stored = (localStorage.getItem("sheetAudioMode") || "").toLowerCase();
      if (stored === "manual" || stored === "autoplay") {
        audioMode = stored;
      } else {
        audioMode = "manual";
        localStorage.setItem("sheetAudioMode", audioMode);
      }
      radios.forEach((r) => {
        r.checked = r.value.toLowerCase() === audioMode;
        r.addEventListener("change", (e) => {
          const val = (e.target.value || "manual").toLowerCase();
          audioMode = val;
          localStorage.setItem("sheetAudioMode", audioMode);
          renderSheetAudio();
        });
      });
    }

    renderSheetAudio();
  }

  function renderSheetAudio() {
    // Remove previous injected audio blocks
    audioRegistry.forEach(({ audio }) => audio.pause());
    audioRegistry.length = 0;
    document.querySelectorAll(".sheet-audio").forEach((node) => node.remove());
    document.querySelectorAll(".sheet-audio__progress").forEach((node) => node.remove());
    if (audioMode === "off") return;

    const createControls = (targetFooter, entry) => {
      targetFooter.classList.add("has-audio");
      const wrap = document.createElement("div");
      wrap.className = "sheet-audio sheet-audio--footer";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "sheet-audio__button";
      const icon = document.createElement("span");
      icon.className = "sheet-audio__icon";
      button.appendChild(icon);

      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = entry.src;
      audio.setAttribute("title", entry.title);
      audio.className = "sheet-audio__hidden";
      if (audioMode === "autoplay") {
        audio.autoplay = true;
      }

      const progressBar = document.createElement("div");
      progressBar.className = "sheet-audio__progress";
      targetFooter.prepend(progressBar);

      const syncProgress = () => {
        if (!audio.duration || Number.isNaN(audio.duration)) return;
        const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
        targetFooter.style.setProperty("--audio-progress", `${pct}%`);
      };

      audio.addEventListener("timeupdate", syncProgress);
      audio.addEventListener("loadedmetadata", syncProgress);
      audio.addEventListener("ended", () => {
        button.classList.remove("is-playing");
        targetFooter.style.setProperty("--audio-progress", "0%");
      });

      audio.addEventListener("play", () => {
        audioRegistry.forEach(({ audio: other }) => {
          if (other !== audio) other.pause();
        });
      });

      progressBar.addEventListener("click", (e) => {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.min(1, Math.max(0, x / rect.width));
        if (audio.duration && !Number.isNaN(audio.duration)) {
          audio.currentTime = pct * audio.duration;
        }
        targetFooter.style.setProperty("--audio-progress", `${pct * 100}%`);
      });

      button.addEventListener("click", () => {
        if (audio.paused) {
          audio.play().catch(() => {});
          button.classList.add("is-playing");
        } else {
          audio.pause();
          button.classList.remove("is-playing");
        }
      });

      wrap.append(button, audio);
      targetFooter.appendChild(wrap);

      const container = targetFooter.closest(".sub-page-sheet") || targetFooter.closest(".sheet");
      audioRegistry.push({ audio, container });
    };

    sheetAudio.forEach((entry) => {
      const footers = [];
      // Prefer the sheet-level footer; avoid grabbing sub-sheet footers first.
      const mainFooter = entry.sheet.querySelector(":scope > .page-footer") || entry.sheet.querySelector(".page-footer");
      if (mainFooter) footers.push(mainFooter);
      entry.sheet.querySelectorAll(":scope .sub-page-sheet .page-footer").forEach((f) => footers.push(f));
      footers.forEach((footer) => createControls(footer, entry));
    });

    requestAudioUpdate();
  }

  function pickAudioCandidates(preferPanel) {
    const inPanel = audioRegistry.filter(({ container }) => container?.closest("#subsheet-content"));
    const inMain = audioRegistry.filter(({ container }) => !container?.closest("#subsheet-content"));
    if (preferPanel && inPanel.length) return inPanel;
    if (!preferPanel && inMain.length) return inMain;
    return inPanel.length ? inPanel : inMain;
  }

  function chooseActiveAudio() {
    const preferPanel = document.body.classList.contains("panel-open");
    let focus = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (preferPanel) {
      const centerTarget = document.getElementById("subsheet-content");
      const centerRect = centerTarget?.getBoundingClientRect();
      if (centerRect) {
        focus = {
          x: centerRect.left + centerRect.width / 2,
          y: centerRect.top + centerRect.height / 2,
        };
      }
    }

    const candidates = pickAudioCandidates(preferPanel);
    if (!candidates.length) return null;

    let best = null;
    let bestDist = Infinity;
    let foundInside = false;

    candidates.forEach((item) => {
      const rect = item.container?.getBoundingClientRect();
      if (!rect) return;
      const inside =
        focus.x >= rect.left && focus.x <= rect.right && focus.y >= rect.top && focus.y <= rect.bottom;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - focus.x, cy - focus.y);
      if (inside && !foundInside) {
        best = item;
        bestDist = dist;
        foundInside = true;
        return;
      }
      if (inside && dist < bestDist) {
        best = item;
        bestDist = dist;
        return;
      }
      if (!foundInside && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
    });

    return best?.audio || null;
  }

  function updateAutoplayFocus() {
    if (audioMode !== "autoplay") return;
    const active = chooseActiveAudio();
    audioRegistry.forEach(({ audio }) => {
      if (audio !== active) audio.pause();
    });
    if (audioMode === "autoplay" && active) {
      active.play().catch(() => {});
    }
  }

  return {
    initAudioControls,
    renderSheetAudio,
    requestAudioUpdate,
    updateAutoplayFocus,
  };
}
