export function initPythonDemos() {
  const blocks = Array.from(document.querySelectorAll(".python-script-block"));
  if (!blocks.length) return;

  const highlightPython = (codeNode) => {
    if (!codeNode) return;
    const raw = codeNode.textContent || codeNode.innerText || "";
    const escapeHtml = (str) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const patterns = [
      { type: "comment", regex: /#[^\n]*/g },
      { type: "string", regex: /(\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g },
      { type: "number", regex: /\b\d+(?:\.\d+)?\b/g },
      {
        type: "keyword",
        regex: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g,
      },
      {
        type: "builtin",
        regex: /\b(print|len|range|enumerate|dict|list|set|tuple|float|int|str|Path|open|sum|min|max|zip|map|filter|all|any|sorted)\b/g,
      },
    ];

    let html = escapeHtml(raw);
    patterns.forEach(({ type, regex }) => {
      html = html.replace(regex, (m) => `<span class="code-token ${type}">${escapeHtml(m)}</span>`);
    });
    codeNode.innerHTML = html;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-500px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (err2) {
        console.warn("Copy failed", err2);
        return false;
      }
    }
  };

  blocks.forEach((block) => {
    const fullNode = block.querySelector(".code-full");
    const previewNode = block.querySelector(".code-preview");
    if (!fullNode) return;
    const fullText = (fullNode.textContent || "").trim();
    if (!fullText) return;

    highlightPython(fullNode.querySelector("code") || fullNode);
    if (previewNode) highlightPython(previewNode.querySelector("code") || previewNode);

    const actions = document.createElement("div");
    actions.className = "code-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Ganzes Skript kopieren";
    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(fullText);
      const label = ok ? "Kopiert!" : "Kopieren fehlgeschlagen";
      const prev = copyBtn.textContent;
      copyBtn.textContent = label;
      setTimeout(() => {
        copyBtn.textContent = prev;
      }, 1800);
    });

    let expanded = false;
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary";
    const applyState = () => {
      fullNode.hidden = !expanded;
      fullNode.classList.toggle("is-expanded", expanded);
      block.classList.toggle("is-expanded", expanded);
      toggleBtn.textContent = expanded ? "Vollständiges Skript ausblenden" : "Vollständiges Skript anzeigen";
      const sheet = block.closest(".sheet");
      if (sheet) {
        sheet.classList.toggle("is-code-expanded", expanded);
      }
    };
    applyState();
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      applyState();
    });

    actions.append(copyBtn, toggleBtn);
    block.appendChild(actions);
  });
}
