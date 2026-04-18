document.addEventListener('DOMContentLoaded', function () {

  // =========================
  // Read More (smooth expand)
  // =========================
  function setupReadMore(buttonId, contentId) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);

    if (!button || !content) return;

    button.addEventListener('click', function () {
      const isOpen = content.classList.contains('open');

      if (!isOpen) {
        content.classList.add('open');
        button.textContent = 'Read Less';
        button.setAttribute('aria-expanded', 'true');
      } else {
        content.classList.remove('open');
        button.textContent = 'Read More';
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }

  setupReadMore('readMoreBtn', 'aboutMoreText');
  setupReadMore('readMoreBtnCoach', 'aboutCoachMoreText');


  // =========================
  // Gentle fade-in on scroll
  // =========================
  const reveals = document.querySelectorAll('.reveal');

  function revealOnScroll() {
    const windowHeight = window.innerHeight;

    reveals.forEach(el => {
      const elementTop = el.getBoundingClientRect().top;

      if (elementTop < windowHeight - 80) {
        el.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // trigger on load


  // =========================
  // Smooth scroll handling (performance)
  // =========================
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        revealOnScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.removeEventListener('scroll', revealOnScroll);
  window.addEventListener('scroll', onScroll);

});
