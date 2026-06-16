class LocalSwup {
  constructor(options = {}) {
    this.containers = options.containers || ["#swup"];
    this.animationSelector = options.animationSelector || ".transition-main";
    this.hooks = {
      callbacks: {},
      on: (eventName, callback) => {
        this.hooks.callbacks[eventName] = this.hooks.callbacks[eventName] || [];
        this.hooks.callbacks[eventName].push(callback);
      }
    };

    document.addEventListener("click", (event) => this.handleClick(event));
    window.addEventListener("popstate", () => this.loadPage(location.href, { history: false }));
  }

  emit(eventName) {
    (this.hooks.callbacks[eventName] || []).forEach((callback) => callback());
  }

  shouldHandleLink(link) {
    if (!link || link.target || link.hasAttribute("download")) return false;

    const url = new URL(link.href, location.href);
    const isSameOrigin = url.origin === location.origin;
    const isPage = /\.(html)?$/.test(url.pathname) || url.pathname.endsWith("/");
    return isSameOrigin && isPage;
  }

  handleClick(event) {
    const link = event.target.closest("a");
    if (!this.shouldHandleLink(link)) return;

    event.preventDefault();
    this.loadPage(link.href, { history: true });
  }

  async loadPage(url, options = {}) {
    if (url === location.href && options.history) return;

    document.documentElement.classList.add("is-changing", "is-animating");
    await this.wait(260);

    const response = await fetch(url);
    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, "text/html");

    this.containers.forEach((selector) => {
      const current = document.querySelector(selector);
      const next = nextDocument.querySelector(selector);
      if (current && next) current.innerHTML = next.innerHTML;
    });

    document.title = nextDocument.title;
    if (options.history) history.pushState({}, "", url);

    document.documentElement.classList.remove("is-animating");
    this.emit("page:view");
    await this.wait(80);
    document.documentElement.classList.remove("is-changing");
  }

  wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}

if (!window.Swup) {
  window.Swup = LocalSwup;
}
