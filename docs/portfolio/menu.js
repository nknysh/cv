// Phone menu and theme switch. Without JavaScript the menu stays open and the theme follows the device.
const root = document.documentElement;
root.classList.add('js');

function storedTheme(value) {
  try {
    if (value) localStorage.setItem('theme', value);
    return localStorage.getItem('theme');
  } catch {
    return value ?? null; // storage can be blocked; the theme then lasts for this page only
  }
}

const saved = storedTheme();
if (saved) root.dataset.theme = saved;

function setMenuOpen(open) {
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', String(open));
  document.querySelector('#menu').classList.toggle('open', open);
}

document.addEventListener('click', (event) => {
  const menuToggle = event.target.closest('.menu-toggle');
  if (menuToggle) setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');

  if (event.target.closest('.theme-toggle')) {
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = storedTheme(isDark ? 'light' : 'dark');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuOpen(false);
});
