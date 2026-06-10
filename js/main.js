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
  const sprint = document.getElementById('pipeline-sprint');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (sprint) {
    function revealSprint() {
      sprint.classList.add('is-visible');
    }

    if (reducedMotion) {
      revealSprint();
    } else {
      const sprintObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              revealSprint();
              sprintObserver.unobserve(sprint);
            }
          });
        },
        { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }
      );

      sprintObserver.observe(sprint);
    }
  }

  if (!journey) {
    return;
  }
  const journeyContainer = journey.querySelector('.journey__canvas');
  const routeSvg = journey.querySelector('.journey__route-svg');
  const routePath = journey.querySelector('.journey__route-svg path');
  const dots = Array.from(journey.querySelectorAll('[data-journey-anchor]'));
  const CONTROL_OFFSET = 20;
  let resizeTimer;

  function getDotPoints() {
    if (!journeyContainer) {
      return [];
    }

    const containerRect = journeyContainer.getBoundingClientRect();

    return dots.map(function (dot) {
      const rect = dot.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top - 6,
      };
    });
  }

  function buildRoutePath(points) {
    if (points.length < 2) return '';
    let d = 'M ' + points[0].x + ' ' + points[0].y;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      d += ' C ' + midX + ' ' + prev.y + ', ' + midX + ' ' + curr.y + ', ' + curr.x + ' ' + curr.y;
    }
    return d;
  }

  function updateJourneyRoute() {
    if (!journeyContainer || !routeSvg || !routePath) {
      return;
    }

    const containerRect = journeyContainer.getBoundingClientRect();

    if (containerRect.width === 0 || containerRect.height === 0) {
      return;
    }

    routeSvg.setAttribute('viewBox', '0 0 ' + containerRect.width + ' ' + containerRect.height);
    routePath.setAttribute('d', buildRoutePath(getDotPoints()));
  }

  function initJourneyRoute() {
    requestAnimationFrame(function () {
      requestAnimationFrame(updateJourneyRoute);
    });
  }

  function revealJourney() {
    journey.classList.add('is-visible');
    updateJourneyRoute();
  }

  if (reducedMotion) {
    revealJourney();
  } else {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            revealJourney();
            observer.unobserve(journey);
          }
        });
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(journey);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJourneyRoute);
  } else {
    initJourneyRoute();
  }

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(updateJourneyRoute, 120);
  });
})();
