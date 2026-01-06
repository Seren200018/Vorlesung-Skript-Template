export function createVideoFeature(ctx) {
  const { videoEntries, sheets } = ctx;

  let ytReady;

  function ensureYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
    return ytReady;
  }

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
      frame.appendChild(buildVideoPlaceholder({ url, title, shareUrl, iframeId: `yt-embed-${videoId}-${number}` }));
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

  function buildVideoIframe(url, title, iframeId) {
    const iframe = document.createElement("iframe");
    const sep = url.includes("?") ? "&" : "?";
    iframe.src = `${url}${sep}enablejsapi=1&rel=0&playsinline=1`;
    iframe.title = title || "YouTube Video";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    if (iframeId) iframe.id = iframeId;
    return iframe;
  }

  function wrapIframe(iframe) {
    const iframeWrap = document.createElement("div");
    iframeWrap.className = "video-embed";
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

  function buildVideoPlaceholder({ url, title, shareUrl, iframeId }) {
    const placeholder = document.createElement("div");
    placeholder.className = "video-placeholder";
    const info = document.createElement("div");
    info.className = "video-placeholder__info";
    info.textContent = title || "Video";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "video-placeholder__btn";
    btn.textContent = "Video anzeigen";
    btn.addEventListener("click", () => {
      const iframe = buildVideoIframe(url, title, iframeId);
      placeholder.replaceWith(wrapIframe(iframe));
      initStopAfterFirstRun(iframe);
    });
    placeholder.append(info, btn);
    return placeholder;
  }

  function initStopAfterFirstRun(iframe) {
    if (!iframe) return;
    ensureYouTubeAPI()
      .then(() => {
        if (!window.YT?.Player) return;
        // eslint-disable-next-line no-new
        new window.YT.Player(iframe, {
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
          },
          events: {
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.ENDED) {
                try {
                  e.target.stopVideo();
                } catch (err) {
                  // ignore stop errors
                }
              }
            },
          },
        });
      })
      .catch(() => {});
  }
}
