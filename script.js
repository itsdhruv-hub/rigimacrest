const siteLoader = document.getElementById('site-loader');
const hideLoader = () => {
  if (!siteLoader || siteLoader.classList.contains('is-done')) return;
  siteLoader.classList.add('is-done');
  document.body.classList.remove('is-loading');
};

if (siteLoader) {
  const minShow = new Promise((resolve) => setTimeout(resolve, 1150));
  const pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  Promise.all([minShow, pageLoaded]).then(hideLoader);
  setTimeout(hideLoader, 2600);
}

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const scrollProgress = document.getElementById('scroll-progress');
const updateScrollProgress = () => {
  if (!scrollProgress) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  scrollProgress.style.transform = `scaleX(${ratio})`;
};
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

document.querySelectorAll('.glance-grid, .owners-grid, .work-areas-subgrid, .project-grid, .atlas-corridors, .trust-strip').forEach((group) => {
  [...group.children].forEach((child, idx) => {
    child.style.setProperty('--stagger', `${idx * 65}ms`);
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const canHover3D = window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-tilt]').forEach((card) => {
  const isSoft = card.hasAttribute('data-tilt-soft');
  const maxX = isSoft ? 4.5 : 8;
  const maxY = isSoft ? 5.5 : 9;
  const lift = isSoft ? -4 : -8;
  const scale = isSoft ? 1.008 : 1.018;

  card.addEventListener('mouseenter', () => {
    if (!canHover3D) return;
    card.classList.add('is-tilting');
  });

  card.addEventListener('mousemove', (event) => {
    if (!canHover3D) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - py) * (maxX * 2);
    const rotateY = (px - 0.5) * (maxY * 2);

    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    card.style.transform = `perspective(1050px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, ${lift}px, 0) scale3d(${scale}, ${scale}, 1)`;
  });

  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-tilting');
    card.style.transform = '';
  });
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.project-card').forEach((project, index) => {
      const show = filter === 'all' || project.dataset.category === filter;
      project.classList.toggle('hidden', !show);
      if (show) {
        project.classList.remove('is-filtering');
        void project.offsetWidth;
        project.style.animationDelay = `${index * 45}ms`;
        project.classList.add('is-filtering');
      }
    });
  });
});

document.querySelectorAll('[data-spotlight]').forEach((card) => {
  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });
});

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.site-nav a:not(.nav-call)')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach((section) => sectionObserver.observe(section));

const aboutVideo = document.querySelector('.about-media-video');
const aboutPlayBtn = document.querySelector('.about-play');

aboutPlayBtn?.addEventListener('click', () => {
  if (!aboutVideo) return;
  if (aboutVideo.paused) {
    aboutVideo.play();
    aboutPlayBtn.textContent = '❚❚';
    aboutPlayBtn.setAttribute('aria-label', 'Pause showcase video');
  } else {
    aboutVideo.pause();
    aboutPlayBtn.textContent = '▶';
    aboutPlayBtn.setAttribute('aria-label', 'Play showcase video');
  }
});

const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-form-status');

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const email = String(data.get('email') || '').trim();
  const interest = String(data.get('interest') || 'Land & Townships').trim();
  const message = String(data.get('message') || '').trim();

  if (!name || !phone) {
    contactStatus.classList.add('is-error');
    contactStatus.textContent = 'Please enter your name and phone number.';
    return;
  }

  contactStatus.classList.remove('is-error');
  const waText = encodeURIComponent(
    `Hello Rigima Crest Infra LLP,\nName: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}\nInterest: ${interest}${message ? `\nMessage: ${message}` : ''}`
  );
  contactStatus.innerHTML = `Thank you, ${name.replace(/[<>&"']/g, '')}. Ready to connect: <a href="https://wa.me/918866119598?text=${waText}" target="_blank" rel="noopener noreferrer">Send via WhatsApp ↗</a>`;
  contactForm.reset();
});
