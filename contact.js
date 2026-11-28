(function () {
  'use strict';

  // 0. Animated 3D Project Showcase Deck in Hero
  const slides = [...document.querySelectorAll('.ct-slide')];
  const dots = [...document.querySelectorAll('.ct-sdot')];
  const slideBar = document.getElementById('ct-slide-bar');
  const nextBtn = document.getElementById('ct-slide-next');
  const showcaseEl = document.querySelector('.ct-showcase');
  let activeSlide = 0;
  let slideTimer = null;

  function renderSlide(idx) {
    if (!slides.length) return;
    activeSlide = ((idx % slides.length) + slides.length) % slides.length;
    const nextIdx = (activeSlide + 1) % slides.length;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === activeSlide);
      s.classList.toggle('is-next', i === nextIdx);
    });
    dots.forEach((d, i) => d.classList.toggle('is-active', i === activeSlide));
    if (slideBar) slideBar.style.width = `${((activeSlide + 1) / slides.length) * 100}%`;
  }

  const startSlideTimer = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || slides.length < 2) return;
    clearInterval(slideTimer);
    slideTimer = setInterval(() => renderSlide(activeSlide + 1), 3600);
  };

  nextBtn?.addEventListener('click', () => {
    renderSlide(activeSlide + 1);
    startSlideTimer();
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      renderSlide(Number(dot.dataset.slide || 0));
      startSlideTimer();
    });
  });

  showcaseEl?.addEventListener('mouseenter', () => clearInterval(slideTimer));
  showcaseEl?.addEventListener('mouseleave', startSlideTimer);
  renderSlide(0);
  startSlideTimer();

  // 1. Copy-to-clipboard quick buttons
  document.querySelectorAll('.ct-copy-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = btn.dataset.copy;
      if (!text) return;
      navigator.clipboard?.writeText(text).catch(() => {});
      const original = btn.textContent;
      btn.classList.add('is-copied');
      btn.textContent = 'Copied ✓';
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.textContent = original;
      }, 1800);
    });
  });

  // 2. Interactive Consultation Builder (Area of Interest)
  let selectedPurpose = 'Bulk Land / Township Partnership';

  const briefTextEl = document.getElementById('ct-brief-text');
  const formPurposeInput = document.getElementById('ct-hidden-purpose');

  function updateBrief() {
    if (briefTextEl) briefTextEl.textContent = selectedPurpose;
    if (formPurposeInput) formPurposeInput.value = selectedPurpose;
  }

  document.querySelectorAll('.ct-chip[data-group="purpose"]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.ct-chip[data-group="purpose"]').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      selectedPurpose = chip.dataset.val || selectedPurpose;
      updateBrief();
    });
  });
  updateBrief();

  // 3. Consultation Form Submit (WhatsApp & Email)
  const form = document.getElementById('ct-consultation-form');
  const statusEl = document.getElementById('ct-form-status');
  const emailBtn = document.getElementById('ct-send-email');

  function buildPayload() {
    const data = new FormData(form);
    return {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      city: String(data.get('city') || '').trim(),
      notes: String(data.get('notes') || '').trim(),
      brief: String(data.get('brief') || '').trim()
    };
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = buildPayload();
    if (!p.name || !p.phone) {
      statusEl.classList.add('is-error');
      statusEl.textContent = 'Please enter your name and phone / WhatsApp number.';
      return;
    }
    statusEl.classList.remove('is-error');
    const waMsg = encodeURIComponent(
      `Hello Rigima Crest Infra LLP,\nName: ${p.name}\nPhone: ${p.phone}${p.email ? `\nEmail: ${p.email}` : ''}${p.city ? `\nCity: ${p.city}` : ''}\nConsultation Brief: ${p.brief}${p.notes ? `\nNotes: ${p.notes}` : ''}`
    );
    const waUrl = `https://wa.me/918866119598?text=${waMsg}`;
    statusEl.innerHTML = `Consultation brief prepared for ${p.name.replace(/[<>&"']/g, '')}. <a href="${waUrl}" target="_blank" rel="noopener noreferrer">Open WhatsApp Inquiry ↗</a>`;
    form.reset();
    updateBrief();
  });

  emailBtn?.addEventListener('click', () => {
    const p = buildPayload();
    if (!p.name || !p.phone) {
      statusEl.classList.add('is-error');
      statusEl.textContent = 'Please enter your name and phone number before opening email.';
      return;
    }
    statusEl.classList.remove('is-error');
    const subject = encodeURIComponent(`Rigima Crest Inquiry: ${selectedPurpose}`);
    const body = encodeURIComponent(
      `Name: ${p.name}\nPhone: ${p.phone}\nEmail: ${p.email}\nCity: ${p.city}\nBrief: ${p.brief}\nNotes: ${p.notes}`
    );
    const mailUrl = `mailto:rigimacrestinfra9598@gmail.com?subject=${subject}&body=${body}`;
    statusEl.innerHTML = `Email draft ready for ${p.name.replace(/[<>&"']/g, '')}. <a href="${mailUrl}">Launch Email Client ↗</a>`;
  });

  // 4. Story-Wise Video & Animated Regional Cinema Stage
  const stories = [
    {
      kicker: 'CHAPTER 01 / 03 · AHMEDABAD HQ',
      title: 'Executive Consultation & Strategy Desk',
      desc: 'Planning Gujarat townships from Rigima Crest Infra LLP, 203, Parshwa Tower, Near Pakvan Restaurant, SG Highway, Bodakdev, Ahmedabad — 380015.',
      tags: ['Bodakdev', 'SG Highway', 'Ahmedabad', '₹2 Cr – ₹100 Cr'],
      coord: '23.0405° N, 72.5126° E · Corporate HQ',
      addr: '203, Parshwa Tower, Near Pakvan Restaurant, SG Highway, Bodakdev, Ahmedabad — 380015',
      map: 'https://maps.google.com/?q=Parshwa+Tower+Near+Pakvan+Restaurant+SG+Highway+Bodakdev+Ahmedabad+380015'
    },
    {
      kicker: 'CHAPTER 02 / 03 · LOTHAL & DHOLERA SIR',
      title: 'From Raw Land to Active Townships',
      desc: 'Live development momentum across Ganeshpura, Memar, Pachcham, Gamph, Tagdi, Fedra & Aakru.',
      tags: ['Ganeshpura', 'Memar', 'Pachcham', 'Dholera SIR', 'Lothal'],
      coord: '22.4265° N, 72.2484° E · Active Belt',
      addr: 'Lothal Area & Around Dholera SIR Growth Corridor',
      map: 'https://maps.google.com/?q=Dholera+SIR+Gujarat'
    },
    {
      kicker: 'CHAPTER 03 / 03 · 1991 ORIGINS TO DWARKA',
      title: '40+ Years Across Saurashtra & Coast',
      desc: 'Roots in Porbandar, Chaya, Pipliya, Ranavav, Junagadh & Keshod — expanding into Dwarka.',
      tags: ['Porbandar', 'Junagadh', 'Dwarka', '35+ Townships'],
      coord: '21.6417° N, 69.6293° E · Coastal Legacy',
      addr: 'Porbandar, Junagadh, Keshod & Dwarka, Gujarat',
      map: 'https://maps.google.com/?q=Dwarka+Gujarat'
    }
  ];

  const deskCards = [...document.querySelectorAll('.ct-desk-card')];
  const storyScenes = [...document.querySelectorAll('.ct-story-scene')];
  const storySegs = [...document.querySelectorAll('.ct-story-seg')];
  const storyBars = [0, 1, 2].map((i) => document.getElementById(`ct-bar-${i}`));
  const storyKicker = document.getElementById('ct-story-kicker');
  const storyTitle = document.getElementById('ct-story-title');
  const storyDesc = document.getElementById('ct-story-desc');
  const storyTags = document.getElementById('ct-story-tags');
  const storyCoord = document.getElementById('ct-story-coord');
  const storyAddr = document.getElementById('ct-story-addr');
  const storyMapLink = document.getElementById('ct-story-map-link');
  const storyCaption = document.querySelector('.ct-cinema-caption');
  const storyToggleBtn = document.getElementById('ct-story-toggle');
  const storyNextBtn = document.getElementById('ct-story-next');

  const STORY_DURATION = 5200;
  let activeStory = 0;
  let storyPlaying = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storyStartTime = performance.now();
  let storyRaf = null;

  function applyStory(idx) {
    activeStory = ((idx % stories.length) + stories.length) % stories.length;
    storyStartTime = performance.now();
    const s = stories[activeStory];

    deskCards.forEach((c, i) => c.classList.toggle('is-active', i === activeStory));
    storySegs.forEach((seg, i) => seg.classList.toggle('is-active', i === activeStory));
    storyScenes.forEach((scene, i) => {
      const active = i === activeStory;
      scene.classList.toggle('is-active', active);
      const vid = scene.querySelector('video');
      if (vid) {
        if (active) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });

    storyBars.forEach((bar, i) => {
      if (!bar) return;
      bar.style.transform = i < activeStory ? 'scaleX(1)' : 'scaleX(0)';
    });

    if (storyCaption) {
      storyCaption.classList.remove('is-updating');
      void storyCaption.offsetWidth;
      storyCaption.classList.add('is-updating');
    }

    if (storyKicker) storyKicker.textContent = s.kicker;
    if (storyTitle) storyTitle.textContent = s.title;
    if (storyDesc) storyDesc.textContent = s.desc;
    if (storyTags) storyTags.innerHTML = s.tags.map((t) => `<span>${t}</span>`).join('');
    if (storyCoord) storyCoord.textContent = s.coord;
    if (storyAddr) storyAddr.textContent = s.addr;
    if (storyMapLink) storyMapLink.href = s.map;
  }

  function tickStory(now) {
    if (storyPlaying && storyBars[activeStory]) {
      const elapsed = now - storyStartTime;
      const ratio = Math.min(1, elapsed / STORY_DURATION);
      storyBars[activeStory].style.transform = `scaleX(${ratio})`;
      if (ratio >= 1) {
        applyStory(activeStory + 1);
      }
    }
    storyRaf = requestAnimationFrame(tickStory);
  }

  deskCards.forEach((card) => {
    const idx = Number(card.dataset.story || 0);
    card.addEventListener('click', () => applyStory(idx));
    card.addEventListener('mouseenter', () => applyStory(idx));
  });

  storySegs.forEach((seg) => {
    seg.addEventListener('click', () => applyStory(Number(seg.dataset.story || 0)));
  });

  storyNextBtn?.addEventListener('click', () => applyStory(activeStory + 1));

  storyToggleBtn?.addEventListener('click', () => {
    storyPlaying = !storyPlaying;
    storyToggleBtn.textContent = storyPlaying ? '❚❚' : '▶';
    storyToggleBtn.setAttribute('aria-label', storyPlaying ? 'Pause story reel' : 'Play story reel');
    const activeVid = storyScenes[activeStory]?.querySelector('video');
    if (activeVid) {
      if (storyPlaying) activeVid.play().catch(() => {});
      else activeVid.pause();
    }
    if (storyPlaying) storyStartTime = performance.now();
  });

  if (storyScenes.length) {
    applyStory(0);
    storyRaf = requestAnimationFrame(tickStory);
  }

  // 5. FAQ Accordion
  const faqItems = [...document.querySelectorAll('.ct-faq-item')];
  faqItems.forEach((item) => {
    item.querySelector('.ct-faq-btn')?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      faqItems.forEach((f) => f.classList.remove('is-open'));
      if (!wasOpen) item.classList.add('is-open');
    });
  });
})();
