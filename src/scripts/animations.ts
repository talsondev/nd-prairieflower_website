import { animate, inView } from "motion";

const teardownFns: VoidFunction[] = [];

function teardown() {
  for (const stop of teardownFns) stop();
  teardownFns.length = 0;
}

function nextFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = () => {
      count -= 1;
      if (count <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function resetIntro(introRoot: HTMLElement, stage: HTMLElement) {
  introRoot.hidden = false;
  stage.removeAttribute("style");
}

async function runLogoIntro(): Promise<void> {
  const introRoot = document.querySelector<HTMLElement>("#logo-intro");
  const stage = introRoot?.querySelector<HTMLElement>(".logo-intro-stage");
  const header = document.querySelector<HTMLElement>("#header-logo-link");

  if (!introRoot || !stage || !header) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    introRoot.hidden = true;
    stage.removeAttribute("style");
    header.classList.remove("header-logo-link--pending");
    return;
  }

  resetIntro(introRoot, stage);
  stage.style.opacity = "0";

  document.body.classList.add("logo-intro-active");
  header.classList.add("header-logo-link--pending");

  try {
    await document.fonts.ready.catch(() => undefined);
    await nextFrames(2);

    await animate(stage, { opacity: [0, 1] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] })
      .finished;

    const from = stage.getBoundingClientRect();
    const to = header.getBoundingClientRect();

    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;
    const tx = to.left + to.width / 2;
    const ty = to.top + to.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    const scale =
      from.width > 0 && from.height > 0
        ? Math.min(to.width / from.width, to.height / from.height)
        : 1;

    await animate(
      stage,
      { x: [0, dx], y: [0, dy], scale: [1, scale] },
      { duration: 0.78, ease: [0.25, 0.1, 0.25, 1] }
    ).finished;
  } finally {
    introRoot.hidden = true;
    stage.removeAttribute("style");
    document.body.classList.remove("logo-intro-active");
    header.classList.remove("header-logo-link--pending");
  }
}

function setupScrollReveals() {
  const ease = [0.22, 1, 0.36, 1] as const;

  const stopSections = inView(
    "section.motion-fade",
    (element) => {
      animate(element, { opacity: 1, y: 0 }, { duration: 0.65, ease });
    },
    { amount: 0.28 }
  );
  teardownFns.push(stopSections);

  const stopCard = inView(
    "#contact #card.motion-fade",
    (element) => {
      animate(element, { opacity: 1, y: 0 }, { duration: 0.55, ease });

      const heading = element.querySelector(":scope > h2");
      const lede = element.querySelector<HTMLElement>(":scope > .contact-lede");
      const columnSteps = element.querySelectorAll<HTMLElement>(
        ":scope .contact-columns .fade-up"
      );

      if (heading) {
        animate(heading, { opacity: 1, y: 0 }, { duration: 0.48, delay: 0.08, ease });
      }
      if (lede) {
        animate(lede, { opacity: 1, y: 0 }, { duration: 0.48, delay: 0.14, ease });
      }

      columnSteps.forEach((node, index) => {
        animate(node, { opacity: 1, y: 0 }, {
          duration: 0.45,
          delay: 0.3 + index * 0.08,
          ease,
        });
      });
    },
    { amount: 0.32 }
  );
  teardownFns.push(stopCard);
}

let astroSwapBound = false;

export function initPageMotion() {
  teardown();

  const hasIntro = Boolean(document.querySelector("#logo-intro"));

  const startScroll = () => {
    setupScrollReveals();
  };

  if (hasIntro) {
    void runLogoIntro().then(startScroll);
  } else {
    startScroll();
  }
}

export function ensureAstroSwapMotion() {
  if (astroSwapBound) return;
  astroSwapBound = true;
  document.addEventListener("astro:after-swap", initPageMotion);
}
