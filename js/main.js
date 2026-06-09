(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const journey = document.getElementById('invitation-journey');

  if (!journey) {
    return;
  }

  const milestones = Array.from(journey.querySelectorAll('.journey__milestone'));
  const pathTrack = journey.querySelector('.journey__path-track');
  const pathDraw = journey.querySelector('.journey__path-draw');
  const pathSvg = journey.querySelector('.journey__path-svg');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PATH_PAD = 14;
  const SAMPLE_STEP = 0.04;

  function getCanvas() {
    return journey.querySelector('.journey__canvas');
  }

  function rectInCanvas(rect, canvasRect) {
    return {
      left: rect.left - canvasRect.left,
      top: rect.top - canvasRect.top,
      right: rect.right - canvasRect.left,
      bottom: rect.bottom - canvasRect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function getJourneyLayout() {
    const canvas = getCanvas();
    const canvasRect = canvas.getBoundingClientRect();

    return milestones.map(function (milestone) {
      const anchor = milestone.querySelector('[data-journey-anchor]');
      const content = milestone.querySelector('.journey__content');
      const textEls = milestone.querySelectorAll(
        '.journey__num, .journey__step-title, .journey__step-text'
      );
      const anchorRect = anchor.getBoundingClientRect();
      const contentRect = rectInCanvas(content.getBoundingClientRect(), canvasRect);
      const textRects = Array.from(textEls).map(function (el) {
        return rectInCanvas(el.getBoundingClientRect(), canvasRect);
      });

      return {
        point: {
          x: anchorRect.left + anchorRect.width / 2 - canvasRect.left,
          y: anchorRect.top + anchorRect.height / 2 - canvasRect.top,
        },
        contentRect: contentRect,
        textRects: textRects,
        contentHeight: contentRect.height,
      };
    });
  }

  function getTextObstaclesInXRange(layout, xMin, xMax) {
    const paddedMin = xMin - PATH_PAD;
    const paddedMax = xMax + PATH_PAD;
    const obstacles = [];

    layout.forEach(function (step) {
      step.textRects.forEach(function (rect) {
        if (rect.right >= paddedMin && rect.left <= paddedMax) {
          obstacles.push(rect);
        }
      });
    });

    return obstacles;
  }

  function cubicPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    };
  }

  function pointInsideRect(point, rect, pad) {
    return (
      point.x >= rect.left - pad &&
      point.x <= rect.right + pad &&
      point.y >= rect.top - pad &&
      point.y <= rect.bottom + pad
    );
  }

  function segmentHitsObstacles(p0, p1, p2, p3, obstacles) {
    for (let t = SAMPLE_STEP; t < 1; t += SAMPLE_STEP) {
      const sample = cubicPoint(p0, p1, p2, p3, t);

      for (let i = 0; i < obstacles.length; i += 1) {
        if (pointInsideRect(sample, obstacles[i], PATH_PAD)) {
          return true;
        }
      }
    }

    return false;
  }

  function buildSegmentControls(prevStep, currStep, layout) {
    const p0 = prevStep.point;
    const p3 = currStep.point;
    const xMin = Math.min(p0.x, p3.x);
    const xMax = Math.max(p0.x, p3.x);
    const obstacles = getTextObstaclesInXRange(layout, xMin, xMax);
    const minOffset = Math.max(prevStep.contentHeight, currStep.contentHeight, 40);
    const goingDown = p3.y > p0.y + 2;
    const goingUp = p3.y < p0.y - 2;
    const dip = goingDown || (!goingUp && p3.y >= p0.y);

    let cpY;

    if (dip) {
      cpY = Math.max(p0.y, p3.y) + minOffset;
      obstacles.forEach(function (rect) {
        cpY = Math.max(cpY, rect.bottom + PATH_PAD);
      });
    } else {
      cpY = Math.min(p0.y, p3.y) - minOffset;
      obstacles.forEach(function (rect) {
        cpY = Math.min(cpY, rect.top - PATH_PAD);
      });
    }

    const cp1 = {
      x: p0.x + (p3.x - p0.x) * 0.33,
      y: cpY,
    };
    const cp2 = {
      x: p0.x + (p3.x - p0.x) * 0.67,
      y: cpY,
    };

    let attempts = 0;

    while (segmentHitsObstacles(p0, cp1, cp2, p3, obstacles) && attempts < 16) {
      if (dip) {
        cpY += minOffset * 0.2;
      } else {
        cpY -= minOffset * 0.2;
      }

      cp1.y = cpY;
      cp2.y = cpY;
      attempts += 1;
    }

    return { cp1: cp1, cp2: cp2 };
  }

  function buildAnchorPath(layout) {
    if (layout.length < 2) {
      return '';
    }

    let d = 'M ' + layout[0].point.x + ' ' + layout[0].point.y;

    for (let i = 1; i < layout.length; i += 1) {
      const prevStep = layout[i - 1];
      const currStep = layout[i];
      const controls = buildSegmentControls(prevStep, currStep, layout);
      const p3 = currStep.point;

      d +=
        ' C ' +
        controls.cp1.x +
        ' ' +
        controls.cp1.y +
        ', ' +
        controls.cp2.x +
        ' ' +
        controls.cp2.y +
        ', ' +
        p3.x +
        ' ' +
        p3.y;
    }

    return d;
  }

  function updateJourneyPath() {
    const canvas = getCanvas();

    if (!canvas || !pathSvg || !pathTrack || !pathDraw) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();

    if (canvasRect.width === 0 || canvasRect.height === 0) {
      return;
    }

    pathSvg.setAttribute('viewBox', '0 0 ' + canvasRect.width + ' ' + canvasRect.height);
    pathSvg.setAttribute('preserveAspectRatio', 'none');

    const routeD = buildAnchorPath(getJourneyLayout());
    pathTrack.setAttribute('d', routeD);
    pathDraw.setAttribute('d', routeD);

    const length = pathDraw.getTotalLength();
    pathDraw.style.strokeDasharray = String(length);
    pathDraw.style.strokeDashoffset = reducedMotion || journey.classList.contains('is-visible')
      ? '0'
      : String(length);
  }

  function prepareJourneyPath() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          updateJourneyPath();
          resolve();
        });
      });
    });
  }

  function revealJourney() {
    journey.classList.add('is-visible');
    updateJourneyPath();

    if (!reducedMotion && pathDraw) {
      const length = pathDraw.getTotalLength();
      pathDraw.style.strokeDasharray = String(length);
      pathDraw.style.strokeDashoffset = String(length);
      requestAnimationFrame(function () {
        pathDraw.style.strokeDashoffset = '0';
      });
    }
  }

  if (reducedMotion) {
    prepareJourneyPath().then(revealJourney);
  } else {
    updateJourneyPath();

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            prepareJourneyPath().then(revealJourney);
            observer.unobserve(journey);
          }
        });
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(journey);
  }

  let resizeTimer;

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(updateJourneyPath, 120);
  });
})();
