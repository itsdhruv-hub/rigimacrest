(function () {
  'use strict';

  // 1. Compact Blueprint Stage Sync (hover, click, and gentle auto-cycle until interaction)
  const chapters = [...document.querySelectorAll('.ab-chapter')];
  const stageImages = [...document.querySelectorAll('.ab-stage-media img')];
  const stageStepEl = document.getElementById('ab-stage-step');
  const stageTitleEl = document.getElementById('ab-stage-title');
  const stageFootEl = document.getElementById('ab-stage-foot');
  const stageBarEl = document.getElementById('ab-stage-bar');

  const stageMeta = [
    { step: 'PHASE 01 / 04 · LAND IDENTIFICATION', title: 'Bulk Land Acquisition', foot: 'Raw Parcels Across Gujarat Corridors' },
    { step: 'PHASE 02 / 04 · MASTERPLANNING', title: 'Survey, Roads & Civic Greens', foot: 'End-to-End Site Infrastructure' },
    { step: 'PHASE 03 / 04 · EXECUTION', title: 'Multi-Category Development', foot: '7 Property & Construction Disciplines' },
    { step: 'PHASE 04 / 04 · VALUE REALISATION', title: 'Townships & Land Assets', foot: '₹2 Crore to ₹100 Crore Project Scale' }
  ];

  let activeStage = 0;
  let stageAutoTimer = null;

  function activateChapter(index) {
    activeStage = index;
    chapters.forEach((ch, i) => ch.classList.toggle('is-active', i === index));
    stageImages.forEach((img, i) => img.classList.toggle('is-active', i === index));
    const meta = stageMeta[index];
    if (meta) {
      if (stageStepEl) stageStepEl.textContent = meta.step;
      if (stageTitleEl) stageTitleEl.textContent = meta.title;
      if (stageFootEl) stageFootEl.textContent = meta.foot;
    }
    if (stageBarEl) {
      stageBarEl.style.width = `${((index + 1) / chapters.length) * 100}%`;
    }
  }

  const stopAutoStage = () => {
    if (stageAutoTimer) {
      clearInterval(stageAutoTimer);
      stageAutoTimer = null;
    }
  };

  chapters.forEach((chapter, idx) => {
    chapter.addEventListener('mouseenter', () => {
      stopAutoStage();
      activateChapter(idx);
    });
    chapter.addEventListener('click', () => {
      stopAutoStage();
      activateChapter(idx);
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && chapters.length > 0) {
    stageAutoTimer = setInterval(() => {
      activateChapter((activeStage + 1) % chapters.length);
    }, 3400);
  }

  // 2. Interactive Era Chronology Switcher (1991 - 2026)
  const eraData = [
    {
      label: '1991 – 1999 · SAURASHTRA FOUNDATIONS',
      title: 'Where the land-up journey began',
      body: 'Beginning in Porbandar in 1991, Arjan Odedra established a disciplined approach: acquiring bulk land directly, developing foundational road and plot infrastructure, and delivering early residential communities across Chaya, Pipliya, and Ranavav.',
      cities: ['Porbandar', 'Chaya', 'Pipliya', 'Ranavav'],
      stat: '1991',
      quote: 'Built on coastal soil — proving that well-planned townships transform regional neighbourhoods for generations.',
      tag: 'Saurashtra Coastal Origins'
    },
    {
      label: '2000 – 2009 · COASTAL & SPIRITUAL EXPANSION',
      title: 'Growing across Saurashtra & Dwarka',
      body: 'Over the second decade, development expanded into regional commercial centres and spiritual destinations — delivering plotted estates, bungalows, and tenements in Junagadh, Mendarda, Keshod, Dwarka, and Lambabandar.',
      cities: ['Junagadh', 'Mendarda', 'Keshod', 'Dwarka', 'Lambabandar'],
      stat: '35+',
      quote: 'Every town required its own sensitivity — from serene coastal retreats to growing regional trading hubs.',
      tag: 'Townships & Regional Hubs'
    },
    {
      label: '2010 – 2019 · URBAN & INDUSTRIAL SCALE',
      title: 'Surat, Ahmedabad & multi-category mastery',
      body: 'Scaling project values up to ₹100 crore, the portfolio broadened into commercial hubs, factory & industrial developments, farmhouse estates, and full-scale construction work across Gujarat’s metropolitan centres.',
      cities: ['Surat', 'Ahmedabad', 'Residential', 'Commercial', 'Industrial'],
      stat: '₹100 Cr',
      quote: 'Scaling from local residential layouts to multi-crore urban, commercial, and industrial infrastructure.',
      tag: 'Metropolitan Growth Centres'
    },
    {
      label: '2020 – 2026 · HERITAGE & DHOLERA SIR FRONTIER',
      title: 'Lothal corridor, Dholera SIR & upcoming horizons',
      body: 'Active and upcoming developments now anchor around Ganeshpura, Memar, Pachcham, Gamph, Tagdi, Fedra, Aakru, Dholera SIR, the Lothal World Heritage Project corridor, Dwarka, and Pipli (Ahmedabad).',
      cities: ['Ganeshpura', 'Memar', 'Dholera SIR', 'Lothal World Heritage Project', 'Pipli (Ahmedabad)'],
      stat: '2026',
      quote: 'Positioning land and townships right along Gujarat’s historic heritage and next-generation investment corridors.',
      tag: 'Active & Upcoming Corridors'
    }
  ];

  const eraTabs = [...document.querySelectorAll('.ab-era-tab')];
  const chronoLabel = document.getElementById('chrono-label');
  const chronoTitle = document.getElementById('chrono-title');
  const chronoBody = document.getElementById('chrono-body');
  const chronoCities = document.getElementById('chrono-cities');
  const chronoStat = document.getElementById('chrono-stat');
  const chronoQuote = document.getElementById('chrono-quote');
  const chronoTag = document.getElementById('chrono-tag');
  const chronoArcPath = document.getElementById('chrono-arc-path');
  const chronoPanel = document.getElementById('chrono-panel');

  const arcOffsets = [930, 620, 310, 0];

  function setEra(idx) {
    const d = eraData[idx];
    if (!d) return;
    eraTabs.forEach((t, i) => t.classList.toggle('is-active', i === idx));
    if (chronoArcPath) chronoArcPath.style.strokeDashoffset = String(arcOffsets[idx] ?? 0);
    if (chronoPanel) {
      chronoPanel.classList.remove('is-switching');
      void chronoPanel.offsetWidth;
      chronoPanel.classList.add('is-switching');
    }
    if (chronoLabel) chronoLabel.textContent = d.label;
    if (chronoTitle) chronoTitle.textContent = d.title;
    if (chronoBody) chronoBody.textContent = d.body;
    if (chronoCities) {
      chronoCities.innerHTML = d.cities.map((c) => `<span>${c}</span>`).join('');
    }
    if (chronoStat) chronoStat.textContent = d.stat;
    if (chronoQuote) chronoQuote.textContent = d.quote;
    if (chronoTag) chronoTag.textContent = d.tag;
  }

  eraTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => setEra(idx));
    tab.addEventListener('mouseenter', () => setEra(idx));
  });

  // 3. Expanding Leadership Accordion
  const leaderPanels = [...document.querySelectorAll('.ab-leader-panel')];
  leaderPanels.forEach((panel) => {
    panel.addEventListener('click', () => {
      leaderPanels.forEach((p) => p.classList.remove('is-active'));
      panel.classList.add('is-active');
    });
    panel.addEventListener('mouseenter', () => {
      leaderPanels.forEach((p) => p.classList.remove('is-active'));
      panel.classList.add('is-active');
    });
  });

  // 4. Hover-Preview 7 Disciplines Matrix
  const discRows = [...document.querySelectorAll('.ab-disc-row')];
  const discImg = document.getElementById('disc-preview-img');
  const discTag = document.getElementById('disc-preview-tag');
  const discDesc = document.getElementById('disc-preview-desc');

  discRows.forEach((row) => {
    const activateRow = () => {
      discRows.forEach((r) => r.classList.remove('is-active'));
      row.classList.add('is-active');
      const img = row.dataset.img;
      const tag = row.dataset.tag;
      const desc = row.dataset.desc;
      if (discImg && img && discImg.getAttribute('src') !== img) {
        discImg.style.opacity = '0.35';
        setTimeout(() => {
          discImg.src = img;
          discImg.style.opacity = '1';
        }, 120);
      }
      if (discTag && tag) discTag.textContent = tag;
      if (discDesc && desc) discDesc.textContent = desc;
    };
    row.addEventListener('mouseenter', activateRow);
    row.addEventListener('click', activateRow);
  });

  // 5. Animated Stat Counters on Scroll
  const counters = [...document.querySelectorAll('[data-count-to]')];
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.countTo || 0);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.textContent = `${prefix}${val}${suffix}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((el) => countObserver.observe(el));
})();
