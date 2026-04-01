document.addEventListener('DOMContentLoaded', function () {
  function setupReadMore(buttonId, contentId) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);

    if (!button || !content) return;

    button.addEventListener('click', function () {
      const isHidden = content.hasAttribute('hidden');

      if (isHidden) {
        content.removeAttribute('hidden');
        button.textContent = 'Read Less';
        button.setAttribute('aria-expanded', 'true');
      } else {
        content.setAttribute('hidden', '');
        button.textContent = 'Read More';
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }

  setupReadMore('readMoreBtn', 'aboutMoreText');
  setupReadMore('readMoreBtnCoach', 'aboutCoachMoreText');
});