/**
 * Click-to-enlarge lightbox for PCCM flowchart / table diagrams.
 */
function ensureLightbox() {
  let root = document.getElementById('pccm-zoom-lightbox');
  if (root) {
    return root;
  }

  root = document.createElement('div');
  root.id = 'pccm-zoom-lightbox';
  root.className = 'pccm-zoom-lightbox';
  root.hidden = true;
  root.innerHTML = `
    <button type="button" class="pccm-zoom-lightbox__close" aria-label="Close">×</button>
    <img class="pccm-zoom-lightbox__img" alt="" />
  `;
  document.body.appendChild(root);

  const close = () => {
    root.hidden = true;
    root.classList.remove('is-open');
    document.body.classList.remove('pccm-zoom-open');
  };

  root.addEventListener('click', (event) => {
    if (
      event.target === root ||
      event.target.classList.contains('pccm-zoom-lightbox__close')
    ) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-open')) {
      close();
    }
  });

  return root;
}

function openLightbox(src, alt) {
  const root = ensureLightbox();
  const img = root.querySelector('.pccm-zoom-lightbox__img');
  img.src = src;
  img.alt = alt || '';
  root.hidden = false;
  root.classList.add('is-open');
  document.body.classList.add('pccm-zoom-open');
}

function bindZoomLinks(root = document) {
  root.querySelectorAll('[data-pccm-zoom-src]').forEach((el) => {
    if (el.dataset.pccmZoomBound === '1') {
      return;
    }
    el.dataset.pccmZoomBound = '1';
    el.addEventListener('click', (event) => {
      event.preventDefault();
      const src = el.getAttribute('data-pccm-zoom-src');
      if (!src) {
        return;
      }
      const img = el.querySelector('img');
      openLightbox(src, img ? img.alt : '');
    });
  });
}

export function onRouteDidUpdate() {
  bindZoomLinks();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bindZoomLinks());
  } else {
    bindZoomLinks();
  }
}
