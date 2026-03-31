const readMoreBtn = document.getElementById('readMoreBtn');
const aboutMoreText = document.getElementById('aboutMoreText');

if (readMoreBtn && aboutMoreText) {
  readMoreBtn.addEventListener('click', () => {
    const isHidden = aboutMoreText.hasAttribute('hidden');

    if (isHidden) {
      aboutMoreText.removeAttribute('hidden');
      readMoreBtn.textContent = 'Read Less';
      readMoreBtn.setAttribute('aria-expanded', 'true');
    } else {
      aboutMoreText.setAttribute('hidden', '');
      readMoreBtn.textContent = 'Read More';
      readMoreBtn.setAttribute('aria-expanded', 'false');
    }
  });
}