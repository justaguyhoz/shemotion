document.addEventListener('DOMContentLoaded', function () {

  function setupReadMore(buttonId, contentId) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);

    if (!button || !content) return;

    button.addEventListener('click', function () {
      content.classList.toggle('open');

      if (content.classList.contains('open')) {
        button.textContent = 'Read Less';
      } else {
        button.textContent = 'Read More';
      }
    });
  }

  setupReadMore('readMoreBtn', 'aboutMoreText');
  setupReadMore('readMoreBtnCoach', 'aboutCoachMoreText');


  const reveals = document.querySelectorAll('.reveal');

  function revealOnScroll() {
    const trigger = window.innerHeight - 80;

    reveals.forEach(el => {
      if (el.getBoundingClientRect().top < trigger) {
        el.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll();
});
