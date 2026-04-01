document.querySelectorAll('.read-more-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('aria-controls');
    const content = document.getElementById(targetId);

    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

    content.hidden = isExpanded;
    btn.setAttribute('aria-expanded', !isExpanded);
    btn.textContent = isExpanded ? 'Read More' : 'Read Less';
  });
});