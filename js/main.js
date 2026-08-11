(() => {
  "use strict";

  const year = document.querySelector("[data-year]");
  const cursorLight = document.querySelector(".cursor-light");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  year.textContent = new Date().getFullYear();

  if (!reduceMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      cursorLight.style.left = `${event.clientX}px`;
      cursorLight.style.top = `${event.clientY}px`;
    }, { passive: true });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: .08 });

  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
    observer.observe(element);
  });
})();
