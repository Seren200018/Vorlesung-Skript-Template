export function formatDate(raw) {
  if (!raw) return "–";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function populateBuildInfo(ctx) {
  const { body, userSettings } = ctx;
  const repoUrl = (body.dataset.repoUrl || userSettings.repoUrl || "").trim() || "https://github.com/Seren200018/Vorlesung-Skript-Template";
  const repoTarget = document.querySelector("[data-build-target='repo']");
  if (repoTarget) {
    repoTarget.textContent = repoUrl;
    if (repoTarget.href !== undefined) {
      repoTarget.href = repoUrl;
    }
  }

  const dateTarget = document.querySelector("[data-build-target='date']");
  if (dateTarget) {
    dateTarget.textContent = formatDate(resolveLastModified(body, userSettings));
  }

  const authorTarget = document.querySelector("[data-build-target='author']");
  if (authorTarget) {
    authorTarget.textContent = (body.dataset.author || userSettings.author || "Autor / Dozent").trim();
  }

  const versionTarget = document.querySelector("[data-build-target='version']");
  if (versionTarget) {
    versionTarget.textContent = (body.dataset.packageVersion || userSettings.version || "unbekannt").trim();
  }

  const copyrightTarget = document.querySelector("[data-build-target='copyright']");
  if (copyrightTarget) {
    const license = (body.dataset.license || userSettings.license || "CC BY-NC 4.0").trim();
    copyrightTarget.textContent = license;
    renderCcBadges(copyrightTarget, license);
  }
}

function renderCcBadges(target, license) {
  if (!target) return;
  target.querySelector(".cc-badges")?.remove();
  const tokens = parseCcTokens(license);
  if (!tokens.length) return;
  const wrap = document.createElement("span");
  wrap.className = "cc-badges";
  tokens.forEach((tok) => {
    const span = document.createElement("span");
    span.className = "cc-badge";
    span.title = `Creative Commons ${tok}`;
    span.innerHTML = ccIconSvg(tok);
    wrap.appendChild(span);
  });
  target.appendChild(wrap);
}

function parseCcTokens(raw) {
  const upper = (raw || "").toUpperCase();
  const tokens = [];
  if (!upper.includes("CC")) return tokens;
  tokens.push("CC");
  const parts = ["BY", "SA", "ND", "NC"];
  parts.forEach((p) => {
    if (upper.includes(p)) tokens.push(p);
  });
  if (upper.includes("0") || upper.includes("ZERO")) tokens.push("0");
  return tokens;
}

function ccIconSvg(token) {
  const t = (token || "").toUpperCase();
  const commonCircle = '<circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.1"/>';
  if (t === "CC") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<text x="10" y="13" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">CC</text></svg>`;
  }
  if (t === "BY") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<circle cx="10" cy="8" r="2.4" fill="currentColor"/><rect x="7" y="11" width="6" height="4.6" rx="1" fill="currentColor"/></svg>`;
  }
  if (t === "NC") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<text x="10" y="9.5" text-anchor="middle" font-size="6.5" font-weight="700" fill="currentColor">$</text><line x1="6" y1="6" x2="14" y2="14" stroke="currentColor" stroke-width="1.4"/></svg>`;
  }
  if (t === "SA") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<path d="M12.2 6.4 15 8l-2.8 1.6V8.9c-2.5 0-4.4 1.2-4.4 4.2 0-3 1.9-5.1 4.4-5.1V6.4Z" fill="currentColor"/></svg>`;
  }
  if (t === "ND") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<rect x="5" y="8" width="10" height="1.6" rx="0.5" fill="currentColor"/><rect x="5" y="11" width="10" height="1.6" rx="0.5" fill="currentColor"/></svg>`;
  }
  if (t === "0") {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<text x="10" y="13" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">0</text></svg>`;
  }
  return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${commonCircle}<text x="10" y="13" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">${t}</text></svg>`;
}

function resolveLastModified(body, userSettings) {
  const candidates = [
    body.dataset.gitLastMod,
    body.dataset.repoModified,
    userSettings.gitLastMod,
    document.lastModified,
  ]
    .filter(Boolean)
    .map((v) => v.toString().trim())
    .filter(Boolean)
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()));

  const now = Date.now();
  const maxFuture = now + 1000 * 60 * 60 * 24; // allow slight clock skew
  const valid = candidates.filter((d) => d.getTime() <= maxFuture);
  if (!valid.length) return "";
  const latest = valid.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
  return latest.toISOString();
}
