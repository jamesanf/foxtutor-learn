(() => {
  document.documentElement.dataset.learnReady = "true";

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  let activeLink = null;
  let activeLength = -1;
  document.querySelectorAll("nav a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || (pathname !== href && !pathname.startsWith(`${href}/`))) return;
    if (href.length > activeLength) {
      activeLink?.removeAttribute("aria-current");
      activeLink = link;
      activeLength = href.length;
    }
  });
  activeLink?.setAttribute("aria-current", "page");

  document.querySelectorAll("[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      const message = form.getAttribute("data-confirm");
      if (message && !window.confirm(message)) event.preventDefault();
    });
  });

  document.querySelectorAll(".copy-link").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      const target = targetId ? document.querySelector(`.${targetId}`) : null;
      if (!(target instanceof HTMLInputElement)) return;
      const original = button.textContent;
      const showCopied = () => {
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1600);
      };
      if (!navigator.clipboard) {
        target.focus();
        target.select();
        button.textContent = "Select and copy";
        return;
      }
      navigator.clipboard.writeText(target.value).then(showCopied).catch(() => {
        target.focus();
        target.select();
        button.textContent = "Select and copy";
      });
    });
  });
})();
