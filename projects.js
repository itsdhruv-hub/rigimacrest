(function () {
  'use strict';

  // 1. Expanding Panorama Cards
  const panoCards = [...document.querySelectorAll('.pj-pano-card')];
  panoCards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      panoCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
    });
    card.addEventListener('click', () => {
      panoCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
    });
  });

  // 2. Interactive Current Project Village Selectors
  const villageButtons = [...document.querySelectorAll('.pj-village-btn')];
  villageButtons.forEach((btn) => {
    const activate = () => {
      const group = btn.dataset.group;
      const title = btn.dataset.title;
      const desc = btn.dataset.desc;
      document.querySelectorAll(`.pj-village-btn[data-group="${group}"]`).forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const box = document.getElementById(`village-detail-${group}`);
      if (box) {
        const strong = box.querySelector('strong');
        const span = box.querySelector('span');
        if (strong && title) strong.textContent = title;
        if (span && desc) span.textContent = desc;
      }
    };
    btn.addEventListener('click', activate);
    btn.addEventListener('mouseenter', activate);
  });

  // 3. Real Interactive Leaflet Map of Gujarat + Corridor Fly-To Sync
  const filterTabs = [...document.querySelectorAll('.pj-tab')];
  const locTiles = [...document.querySelectorAll('.pj-loc-tile')];
  const mapCityReadout = document.getElementById('map-city-readout');
  const radarActiveLabel = document.getElementById('radar-active-zone');
  const mapEl = document.getElementById('gujarat-map');
  const resetBtn = document.getElementById('map-reset-btn');

  const zoneNames = {
    porbandar: 'Porbandar & Origins Belt',
    saurashtra: 'Saurashtra & Dwarka Coast',
    urban: 'Ahmedabad & Surat Metro Hubs',
    frontier: 'Lothal & Dholera SIR Frontier'
  };

  let gujaratMap = null;
  const markersByCity = new Map();
  const GUJARAT_CENTER = [22.25, 70.95];
  const GUJARAT_ZOOM = 7;

  if (mapEl && window.L) {
    gujaratMap = L.map(mapEl, {
      center: GUJARAT_CENTER,
      zoom: GUJARAT_ZOOM,
      scrollWheelZoom: false,
      zoomControl: true
    });

    const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri'
    });

    const satBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Imagery &copy; Esri'
    });
    const satLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18
    });
    const satGroup = L.layerGroup([satBaseLayer, satLabelsLayer]);

    streetLayer.addTo(gujaratMap);

    const btnStreet = document.getElementById('map-layer-street');
    const btnSat = document.getElementById('map-layer-sat');
    btnStreet?.addEventListener('click', () => {
      if (!gujaratMap.hasLayer(streetLayer)) {
        gujaratMap.removeLayer(satGroup);
        streetLayer.addTo(gujaratMap);
      }
      btnStreet.classList.add('is-active');
      btnSat?.classList.remove('is-active');
    });
    btnSat?.addEventListener('click', () => {
      if (!gujaratMap.hasLayer(satGroup)) {
        gujaratMap.removeLayer(streetLayer);
        satGroup.addTo(gujaratMap);
      }
      btnSat.classList.add('is-active');
      btnStreet?.classList.remove('is-active');
    });

    // Animated Gujarat corridor routes
    const mainCorridorCoords = [
      [22.2442, 68.9685], // Dwarka
      [21.8940, 69.3167], // Lambabandar
      [21.6417, 69.6293], // Porbandar
      [21.3005, 70.2496], // Keshod
      [21.5222, 70.4579], // Junagadh
      [22.2475, 72.1930], // Dholera SIR
      [22.5215, 72.2493], // Lothal
      [23.0225, 72.5714], // Ahmedabad
      [21.1702, 72.8311]  // Surat
    ];
    L.polyline(mainCorridorCoords, {
      color: '#072b48',
      weight: 3.5,
      opacity: 0.45
    }).addTo(gujaratMap);
    L.polyline(mainCorridorCoords, {
      color: '#dbb94d',
      weight: 2.2,
      opacity: 0.95,
      dashArray: '8 8',
      className: 'gj-live-route'
    }).addTo(gujaratMap);

    locTiles.forEach((tile) => {
      const lat = Number(tile.dataset.lat);
      const lng = Number(tile.dataset.lng);
      const city = tile.dataset.city;
      const coords = tile.dataset.coords || '';
      const tag = tile.querySelector('small')?.textContent || '';
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const icon = L.divIcon({
        className: `gj-marker${tile.classList.contains('is-selected') ? ' is-active' : ''}`,
        html: '<div class="gj-marker-wrap"><span class="gj-marker-pulse"></span><span class="gj-marker-dot"></span></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(gujaratMap);
      marker.bindPopup(
        `<div class="gj-popup-inner"><small>${tag}</small><strong>${city}</strong><span>${coords}</span></div>`,
        { className: 'gj-popup', closeButton: false, offset: [0, -8] }
      );
      marker.on('click', () => focusLocation(tile, false));
      markersByCity.set(city, marker);
    });
  }

  function focusLocation(tile, shouldFly = true) {
    if (!tile) return;
    const { zone, city, coords } = tile.dataset;
    const lat = Number(tile.dataset.lat);
    const lng = Number(tile.dataset.lng);

    locTiles.forEach((t) => t.classList.remove('is-selected'));
    tile.classList.add('is-selected');

    if (mapCityReadout && city) {
      mapCityReadout.textContent = coords ? `${city} (${coords})` : city;
    }
    if (radarActiveLabel && zoneNames[zone]) {
      radarActiveLabel.textContent = zoneNames[zone];
    }

    markersByCity.forEach((marker, mCity) => {
      const el = marker.getElement();
      if (el) el.classList.toggle('is-active', mCity === city);
    });

    if (gujaratMap && Number.isFinite(lat) && Number.isFinite(lng)) {
      if (shouldFly) {
        gujaratMap.flyTo([lat, lng], 10, { duration: 1.05, easeLinearity: 0.25 });
      }
      markersByCity.get(city)?.openPopup();
    }
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const filter = tab.dataset.filter;
      const visibleBounds = [];
      let firstVisible = null;

      locTiles.forEach((tile) => {
        const match = filter === 'all' || tile.dataset.group === filter;
        tile.classList.toggle('is-hidden', !match);
        if (match) {
          if (!firstVisible) firstVisible = tile;
          const lat = Number(tile.dataset.lat);
          const lng = Number(tile.dataset.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) visibleBounds.push([lat, lng]);
        }
      });

      if (gujaratMap && visibleBounds.length > 0) {
        if (filter === 'all') {
          gujaratMap.flyTo(GUJARAT_CENTER, GUJARAT_ZOOM, { duration: 1.0 });
        } else {
          gujaratMap.flyToBounds(visibleBounds, { padding: [46, 46], maxZoom: 10, duration: 1.0 });
        }
      }
      if (firstVisible) focusLocation(firstVisible, false);
    });
  });

  let hoverFlyTimer = null;
  locTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      clearTimeout(hoverFlyTimer);
      focusLocation(tile, true);
    });
    tile.addEventListener('mouseenter', () => {
      clearTimeout(hoverFlyTimer);
      hoverFlyTimer = setTimeout(() => focusLocation(tile, true), 120);
    });
    tile.addEventListener('mouseleave', () => clearTimeout(hoverFlyTimer));
  });

  resetBtn?.addEventListener('click', () => {
    if (gujaratMap) {
      gujaratMap.closePopup();
      gujaratMap.flyTo(GUJARAT_CENTER, GUJARAT_ZOOM, { duration: 0.9 });
    }
  });

  // 4. Interactive 7 Categories & ₹2 Cr - ₹100 Cr Scale Readout
  const catBtns = [...document.querySelectorAll('.pj-cat-btn')];
  const scaleTag = document.getElementById('scale-tag');
  const scaleTitle = document.getElementById('scale-title');
  const scaleDesc = document.getElementById('scale-desc');
  const scaleBar = document.getElementById('scale-bar');
  const scaleLabel = document.getElementById('scale-value-label');

  catBtns.forEach((btn) => {
    const selectCat = () => {
      catBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (scaleTag) scaleTag.textContent = btn.dataset.tag || '';
      if (scaleTitle) scaleTitle.textContent = btn.dataset.title || '';
      if (scaleDesc) scaleDesc.textContent = btn.dataset.desc || '';
      if (scaleBar) scaleBar.style.width = `${btn.dataset.fill || 70}%`;
      if (scaleLabel) scaleLabel.textContent = btn.dataset.range || '₹2 Cr – ₹100 Cr';
    };
    btn.addEventListener('click', selectCat);
    btn.addEventListener('mouseenter', selectCat);
  });

  // 5. Upcoming Card Pre-Fill into Project Inquiry Form
  const projectSelect = document.getElementById('pj-interest-select');
  document.querySelectorAll('[data-inquire]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.inquire;
      if (projectSelect && val) {
        projectSelect.value = val;
      }
      document.getElementById('project-inquiry')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 6. Project Inquiry Form Submit
  const pjForm = document.getElementById('project-contact-form');
  const pjStatus = document.getElementById('project-form-status');
  pjForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(pjForm);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const interest = String(data.get('interest') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !phone) {
      pjStatus.classList.add('is-error');
      pjStatus.textContent = 'Please enter your name and phone number.';
      return;
    }

    pjStatus.classList.remove('is-error');
    const waText = encodeURIComponent(
      `Hello Rigima Crest Infra LLP,\nName: ${name}\nPhone: ${phone}\nProject Interest: ${interest}${message ? `\nNote: ${message}` : ''}`
    );
    pjStatus.innerHTML = `Thank you, ${name.replace(/[<>&"']/g, '')}. Ready to send: <a href="https://wa.me/918866119598?text=${waText}" target="_blank" rel="noopener noreferrer">Send via WhatsApp ↗</a>`;
    pjForm.reset();
  });
})();
