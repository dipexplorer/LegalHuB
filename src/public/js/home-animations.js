// Home page animations: reveal-on-scroll, mock-card subtle parallax and hero badge float
(function () {
  // Reveal on scroll using IntersectionObserver
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal, .hero-animate, .animated-card, .lawyer-card.reveal, .cta-pulse').forEach((el) => {
      revealObserver.observe(el);
    });

    // Mock card parallax by mouse movement
    const mock = document.querySelector('.mock-card');
    if (mock) {
      mock.addEventListener('mousemove', (e) => {
        const rect = mock.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (y * 6).toFixed(2);
        const rotateY = (x * -8).toFixed(2);
        mock.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
      });
      mock.addEventListener('mouseleave', () => {
        mock.style.transform = '';
      });
    }

    // Make hero badge float (CSS handles it) — add class to badge
    const badge = document.querySelector('.hero-top__badge');
    if (badge) badge.classList.add('float-badge');

    // Slight delay reveal for cards for staggered feel
    document.querySelectorAll('.lawyer-card').forEach((card, i) => {
      card.classList.add('reveal');
      card.classList.add(`delay-${(i % 3) + 1}`);
    });

    // CTA subtle pulse when it becomes visible
    const cta = document.querySelector('.cta-primary');
    if (cta) cta.classList.add('cta-pulse');
  });
})();
