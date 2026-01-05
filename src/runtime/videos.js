export function createVideoFeature(ctx) {
  const { videoEntries, sheets } = ctx;

  function initVideos() {
    const blocks = Array.from(document.querySelectorAll(".video-entry[data-video-id]"));
    if (!blocks.length) return;

    blocks.forEach((block, idx) => {
      const sheet = block.closest(".sheet");
      const page = Number(sheet?.dataset.pageNumber || idx + 1);
      const number = videoEntries.length + 1;
      const videoId = (block.dataset.videoId || "").trim();
      if (!videoId) return;
      const title = (block.dataset.videoTitle || block.querySelector("figcaption")?.textContent || `Video ${idx + 1}`).trim();
      const caption = (block.dataset.videoCaption || block.querySelector("figcaption")?.textContent || "").trim();
      const url = `https://www.youtube-nocookie.com/embed/${videoId}`;
      const shareUrl = `https://youtu.be/${videoId}`;

      let frame = block.querySelector(".video-frame");
      if (!frame) {
        frame = document.createElement("div");
        frame.className = "video-frame";
        block.prepend(frame);
      }
      frame.innerHTML = "";
      frame.appendChild(buildVideoIframe(url, title));
      frame.appendChild(buildVideoQr(shareUrl, title));

      // normalize figcaption
      let figcap = block.querySelector("figcaption");
      if (!figcap) {
        figcap = document.createElement("figcaption");
        block.appendChild(figcap);
      }
      figcap.textContent = `Video ${number}: ${caption || title}`;

      videoEntries.push({ title, caption, videoId, url, shareUrl, sheet, page, idx, number });
    });
  }

  function buildVideoList() {
    const list = document.getElementById("video-list");
    if (!list) return;
    list.innerHTML = "";

    if (!videoEntries.length) {
      const li = document.createElement("li");
      li.textContent = "(keine Videos markiert)";
      list.appendChild(li);
      return;
    }

    videoEntries.forEach((item) => {
      const li = document.createElement("li");
      li.className = "toc-item";
      li.dataset.target = item.sheet?.id || "";
      li.setAttribute("role", "button");
      li.tabIndex = 0;

      const number = document.createElement("span");
      number.className = "toc-number";
      number.textContent = `${item.number}.`;

      const label = document.createElement("span");
      label.className = "toc-title";
      label.textContent = `Video ${item.number}: ${item.title}`;

      const page = document.createElement("span");
      page.className = "toc-page";
      page.textContent = item.page;

      li.append(number, label, page);
      list.appendChild(li);
    });

    list.addEventListener("click", (event) => {
      const item = event.target.closest(".toc-item[data-target]");
      if (!item) return;
      const targetId = item.dataset.target;
      if (!targetId) return;
      const dest = document.getElementById(targetId);
      if (dest) {
        dest.scrollIntoView({ behavior: "smooth", block: "start" });
        document.body.classList.remove("panel-open");
      }
    });
  }

  function buildVideoIframe(url, title) {
    const iframeWrap = document.createElement("div");
    iframeWrap.className = "video-embed";
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = title || "YouTube Video";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframeWrap.appendChild(iframe);
    return iframeWrap;
  }

  function buildVideoQr(link, title) {
    const img = document.createElement("img");
    img.alt = title || "Video QR";
    img.className = "video-qr";
    const encoded = encodeURIComponent(link);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
    const wrapper = document.createElement("div");
    wrapper.className = "video-qr-wrapper";
    wrapper.appendChild(img);
    const linkCaption = document.createElement("div");
    linkCaption.className = "video-qr-caption";
    const linkEl = document.createElement("a");
    linkEl.href = link;
    linkEl.target = "_blank";
    linkEl.rel = "noreferrer noopener";
    linkEl.textContent = link;
    linkCaption.appendChild(linkEl);
    wrapper.appendChild(linkCaption);
    return wrapper;
  }

  return {
    initVideos,
    buildVideoList,
    buildVideoIframe,
    buildVideoQr,
  };
}
