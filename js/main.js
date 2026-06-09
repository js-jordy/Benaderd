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

  if (journey) {
    const paths = journey.querySelectorAll('.journey__path-draw');

    paths.forEach(function (path) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              journey.classList.add('is-visible');
              observer.unobserve(journey);
            }
          });
        },
        { threshold: 0.22, rootMargin: '0px 0px -8% 0px' }
      );

      observer.observe(journey);
    } else {
      journey.classList.add('is-visible');
    }
  }
})();
