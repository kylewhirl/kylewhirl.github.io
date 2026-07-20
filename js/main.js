(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const progressBar = document.querySelector(".page-progress span");
  const hero = document.querySelector(".hero");
  const layers = [...document.querySelectorAll(".scene-layer")];
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const soundToggle = document.querySelector(".sound-toggle");
  const soundLabel = document.querySelector(".sound-toggle__label");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const depth = [22, 32, 43, 58, 75, 98];
  const drift = [2, 4, 6, 8, 10, 13];
  let pointerX = 0;
  let pointerY = 0;
  let ticking = false;

  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  const updateScene = () => {
    const scrollY = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
    const heroProgress = Math.min(1.25, Math.max(0, scrollY / Math.max(window.innerHeight, 1)));

    header.classList.toggle("is-scrolled", scrollY > 70);
    progressBar.style.transform = `scaleX(${pageHeight > 0 ? scrollY / pageHeight : 0})`;

    if (!reduceMotion.matches && heroProgress < 1.3) {
      layers.forEach((layer, index) => {
        const x = pointerX * drift[index];
        const y = heroProgress * depth[index] + pointerY * drift[index];
        layer.style.setProperty("--move-x", `${x.toFixed(2)}px`);
        layer.style.setProperty("--move-y", `${y.toFixed(2)}px`);
      });
    }

    ticking = false;
  };

  const requestSceneUpdate = () => {
    if (!ticking) {
      requestAnimationFrame(updateScene);
      ticking = true;
    }
  };

  window.addEventListener("scroll", requestSceneUpdate, { passive: true });
  window.addEventListener("resize", requestSceneUpdate, { passive: true });

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reduceMotion.matches) return;
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    requestSceneUpdate();
  });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    requestSceneUpdate();
  });

  const closeMenu = () => {
    body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.querySelector(".sr-only").textContent = "Open menu";
    mobileMenu.setAttribute("aria-hidden", "true");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.querySelector(".sr-only").textContent = isOpen ? "Close menu" : "Open menu";
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) closeMenu();
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    revealObserver.observe(element);
  });

  const notesImage = document.querySelector(".notes-image");
  const locationLabel = document.querySelector("[data-note-location]");
  const coordinateLabel = document.querySelector("[data-note-coordinate]");
  const notes = [...document.querySelectorAll(".note")];

  const noteObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      notes.forEach((note) => note.classList.toggle("is-active", note === entry.target));
      notesImage.dataset.scene = entry.target.dataset.note;
      locationLabel.textContent = entry.target.dataset.location;
      coordinateLabel.textContent = entry.target.dataset.coordinate;
    });
  }, { rootMargin: "-35% 0px -45%", threshold: 0 });

  notes.forEach((note) => noteObserver.observe(note));

  let audio = null;

  const startSoundscape = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      soundLabel.textContent = "Audio unavailable";
      soundToggle.disabled = true;
      return;
    }

    const context = new AudioContext();
    const master = context.createGain();
    const lowpass = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.23, context.currentTime + 2.8);
    lowpass.type = "lowpass";
    lowpass.frequency.value = 720;
    lowpass.Q.value = 0.65;
    lowpass.connect(master);
    master.connect(context.destination);

    lfo.type = "sine";
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    lfo.start();

    const voices = [55, 82.41, 110].map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 1 ? -7 : index === 2 ? 4 : 0;
      gain.gain.value = index === 2 ? 0.018 : 0.035;
      oscillator.connect(gain);
      gain.connect(lowpass);
      oscillator.start();
      return oscillator;
    });

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noiseData.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      noiseData[i] = last * 2.2;
    }

    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseGain.gain.value = 0.03;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 510;
    noiseFilter.Q.value = 0.4;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(lowpass);
    noise.start();

    if (context.state === "suspended") await context.resume();
    audio = { context, master, voices, noise, lfo };
  };

  const stopSoundscape = () => {
    if (!audio) return;
    const { context, master } = audio;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    window.setTimeout(() => context.close(), 1250);
    audio = null;
  };

  soundToggle.addEventListener("click", async () => {
    const shouldPlay = soundToggle.getAttribute("aria-pressed") !== "true";
    soundToggle.setAttribute("aria-pressed", String(shouldPlay));
    body.classList.toggle("sound-playing", shouldPlay);
    soundLabel.textContent = shouldPlay ? "Quiet the room" : "Begin soundscape";
    if (shouldPlay) await startSoundscape();
    else stopSoundscape();
  });

  document.addEventListener("visibilitychange", () => {
    if (!audio) return;
    if (document.hidden) audio.context.suspend();
    else audio.context.resume();
  });

  updateScene();
})();
