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
  const dateSource = (body.dataset.gitLastMod || body.dataset.repoModified || document.lastModified || "").trim();
  if (dateTarget) {
    dateTarget.textContent = formatDate(dateSource);
  }

  const authorTarget = document.querySelector("[data-build-target='author']");
  if (authorTarget) {
    authorTarget.textContent = (body.dataset.author || userSettings.author || "Autor / Dozent").trim();
  }

  const copyrightTarget = document.querySelector("[data-build-target='copyright']");
  if (copyrightTarget) {
    const license = (body.dataset.license || userSettings.license || "CC BY-NC 4.0").trim();
    copyrightTarget.textContent = license;
  }
}
