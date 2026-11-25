(function () {
  'use strict';

  if (window.__rigimaPreloaderInit) return;
  window.__rigimaPreloaderInit = true;

  const loaderEl = document.getElementById('site-loader');
  if (!loaderEl) return;

  const canvas = document.getElementById('loader-canvas');
  const brandStage = loaderEl.querySelector('.loader-brand-stage');
  const progressFill = loaderEl.querySelector('.loader-progress-fill');
  const percentEl = loaderEl.querySelector('.loader-percent');
  const statusTextEl = loaderEl.querySelector('.loader-status-text');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const TIMELINE_MS = prefersReducedMotion ? 750 : 5000;
  const MAX_WAIT_MS = 8500;
  const startTime = performance.now();

  let rafId = null;
  let disposed = false;
  let assetsReady = false;
  let assetRatio = 0.08;
  let targetAssetRatio = 0.08;
  let cleanupFns = [];

  // Easing utilities
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  };
  const easeOutQuart = (t) => 1 - Math.pow(1 - clamp01(t), 4);
  const easeInOutCubic = (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const easeOutBack = (t) => {
    const x = clamp01(t);
    const c1 = 1.45;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };

  // Real asset readiness tracker (fonts, DOM images, critical CSS background images, videos, window load)
  function initAssetTracker() {
    const tasks = [];
    let completed = 0;

    const markDone = () => {
      completed += 1;
      if (tasks.length > 0) {
        targetAssetRatio = Math.max(targetAssetRatio, completed / tasks.length);
      }
    };

    const trackPromise = (promise, timeoutMs = 4000) => {
      tasks.push(promise);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        markDone();
      };
      Promise.resolve(promise).then(done, done);
      setTimeout(done, timeoutMs);
    };

    // 1. Document load
    trackPromise(
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
      5500
    );

    // 2. Web fonts
    if (document.fonts && document.fonts.ready) {
      trackPromise(document.fonts.ready, 3200);
    }

    // 3. DOM images
    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return;
      trackPromise(
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
        3500
      );
    });

    // 4. Critical visual background assets used above/near fold
    const bgAssets = [
      'assets/logo.png',
      'assets/land .png',
      'assets/homer.png',
      'assets/image copy.png'
    ];
    bgAssets.forEach((src) => {
      trackPromise(
        new Promise((resolve) => {
          const probe = new Image();
          probe.onload = resolve;
          probe.onerror = resolve;
          probe.src = src;
        }),
        3500
      );
    });

    // 5. Video metadata / first-frame readiness (soft cap 3.5s so slow networks never stall)
    document.querySelectorAll('video').forEach((video) => {
      if (video.readyState >= 2) return;
      trackPromise(
        new Promise((resolve) => {
          video.addEventListener('loadeddata', resolve, { once: true });
          video.addEventListener('canplay', resolve, { once: true });
          video.addEventListener('error', resolve, { once: true });
        }),
        3500
      );
    });

    Promise.all(
      tasks.map(
        (p) =>
          new Promise((resolve) => {
            let done = false;
            const finish = () => {
              if (!done) {
                done = true;
                resolve();
              }
            };
            Promise.resolve(p).then(finish, finish);
            setTimeout(finish, 5500);
          })
      )
    ).then(() => {
      targetAssetRatio = 1;
      assetsReady = true;
    });

    // Absolute safety guarantee so loader never blocks indefinitely (even if tab is backgrounded and rAF pauses)
    setTimeout(() => {
      targetAssetRatio = 1;
      assetsReady = true;
      if (!disposed) {
        if (progressFill) progressFill.style.transform = 'scaleX(1)';
        if (percentEl) percentEl.textContent = '100%';
        if (statusTextEl) statusTextEl.textContent = 'Welcome';
        brandStage?.classList.add('is-revealed');
        setTimeout(finishAndDispose, 280);
      }
    }, MAX_WAIT_MS);
  }

  // Procedural terrain height function: rolling topographical periphery + flat central township plateau
  function getTerrainHeight(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    const plateauMask = smoothstep(5.4, 13.5, dist);
    const undulation =
      Math.sin(x * 0.28) * Math.cos(z * 0.25) * 1.15 +
      Math.sin(x * 0.55 + z * 0.35) * 0.48 +
      Math.cos(z * 0.72 - x * 0.22) * 0.28;
    return undulation * plateauMask + (1 - plateauMask) * 0.04;
  }

  // Build WebGL Three.js Cinematic Land-to-Township Scene
  function initThreeScene() {
    if (!window.THREE || !canvas) return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (_err) {
      return null;
    }

    const gl = renderer.getContext();
    if (!gl) {
      renderer.dispose();
      return null;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isMobile;
    if (!isMobile) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080b10);
    scene.fog = new THREE.FogExp2(0x080b10, 0.026);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 90);
    camera.position.set(0, 14.5, 23);

    // Architectural studio lighting
    const hemiLight = new THREE.HemisphereLight(0xc9d5e2, 0x161920, 0.55);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe6b3, 1.35);
    keyLight.position.set(14, 22, 12);
    if (!isMobile) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 52;
      keyLight.shadow.camera.left = -14;
      keyLight.shadow.camera.right = 14;
      keyLight.shadow.camera.top = 14;
      keyLight.shadow.camera.bottom = -14;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4c7c9b, 0.55);
    rimLight.position.set(-16, 10, -14);
    scene.add(rimLight);

    const warmCoreLight = new THREE.PointLight(0xdbb94d, 0, 18, 1.6);
    warmCoreLight.position.set(0, 3.2, 0);
    scene.add(warmCoreLight);

    // 1. Topographical Terrain Surface
    const terrainSegs = isMobile ? 28 : 54;
    const terrainGeo = new THREE.PlaneGeometry(38, 38, terrainSegs, terrainSegs);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.92,
      metalness: 0.08
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isMobile;
    scene.add(terrainMesh);

    // Subtle topographical contour wireframe overlay
    const contourMat = new THREE.MeshBasicMaterial({
      color: 0x9c7938,
      wireframe: true,
      transparent: true,
      opacity: 0
    });
    const contourMesh = new THREE.Mesh(terrainGeo, contourMat);
    contourMesh.position.y = 0.018;
    scene.add(contourMesh);

    // 2. Golden Land Parcel Boundary & Survey Grid Lines (Scene 1)
    const boundaryPoints = [];
    const buildRectLoop = (halfSize, y, stepsPerSide) => {
      const pts = [];
      const corners = [
        [-halfSize, -halfSize],
        [halfSize, -halfSize],
        [halfSize, halfSize],
        [-halfSize, halfSize],
        [-halfSize, -halfSize]
      ];
      for (let s = 0; s < 4; s++) {
        const [x0, z0] = corners[s];
        const [x1, z1] = corners[s + 1];
        for (let k = 0; k < stepsPerSide; k++) {
          const f = k / stepsPerSide;
          const x = lerp(x0, x1, f);
          const z = lerp(z0, z1, f);
          pts.push(new THREE.Vector3(x, getTerrainHeight(x, z) + y, z));
        }
      }
      pts.push(new THREE.Vector3(corners[0][0], getTerrainHeight(corners[0][0], corners[0][1]) + y, corners[0][1]));
      return pts;
    };

    const outerPts = buildRectLoop(6.8, 0.06, 18);
    const outerBoundaryGeo = new THREE.BufferGeometry().setFromPoints(outerPts);
    outerBoundaryGeo.setDrawRange(0, 0);
    const outerBoundaryMat = new THREE.LineBasicMaterial({
      color: 0xe5c768,
      transparent: true,
      opacity: 0.95
    });
    const outerBoundaryLine = new THREE.Line(outerBoundaryGeo, outerBoundaryMat);
    scene.add(outerBoundaryLine);

    const innerPts = buildRectLoop(4.4, 0.06, 14);
    const innerBoundaryGeo = new THREE.BufferGeometry().setFromPoints(innerPts);
    innerBoundaryGeo.setDrawRange(0, 0);
    const innerBoundaryMat = new THREE.LineBasicMaterial({
      color: 0xb68b3e,
      transparent: true,
      opacity: 0.85
    });
    const innerBoundaryLine = new THREE.Line(innerBoundaryGeo, innerBoundaryMat);
    scene.add(innerBoundaryLine);

    // Survey corner beacons
    const beaconGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xdbb94d,
      emissive: 0xdbb94d,
      emissiveIntensity: 0.65,
      metalness: 0.6,
      roughness: 0.3
    });
    const beacons = [];
    [
      [-6.8, -6.8],
      [6.8, -6.8],
      [6.8, 6.8],
      [-6.8, 6.8]
    ].forEach(([bx, bz]) => {
      const mesh = new THREE.Mesh(beaconGeo, beaconMat);
      mesh.position.set(bx, getTerrainHeight(bx, bz) + 0.25, bz);
      mesh.scale.set(1, 0.001, 1);
      scene.add(mesh);
      beacons.push(mesh);
    });

    // 3. Township Masterplan Roads & Central Plaza (Scene 2)
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f28,
      roughness: 0.78,
      metalness: 0.15
    });
    const goldStripMat = new THREE.MeshBasicMaterial({
      color: 0xdbb94d,
      transparent: true,
      opacity: 0
    });

    const avenueX = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.08, 0.92), roadMat);
    avenueX.position.set(0, 0.05, 0);
    avenueX.receiveShadow = !isMobile;

    const avenueZ = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 13.4), roadMat);
    avenueZ.position.set(0, 0.05, 0);
    avenueZ.receiveShadow = !isMobile;

    const plazaRing = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.1, 32), roadMat);
    plazaRing.position.set(0, 0.06, 0);
    plazaRing.receiveShadow = !isMobile;

    const plazaGoldRim = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.34, 40), goldStripMat);
    plazaGoldRim.rotation.x = -Math.PI / 2;
    plazaGoldRim.position.set(0, 0.115, 0);

    const medianX = new THREE.Mesh(new THREE.PlaneGeometry(13.0, 0.05), goldStripMat);
    medianX.rotation.x = -Math.PI / 2;
    medianX.position.set(0, 0.1, 0);

    const medianZ = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 13.0), goldStripMat);
    medianZ.rotation.x = -Math.PI / 2;
    medianZ.position.set(0, 0.1, 0);

    roadGroup.add(avenueX, avenueZ, plazaRing, plazaGoldRim, medianX, medianZ);
    roadGroup.position.y = -0.18;
    roadGroup.scale.set(0.92, 1, 0.92);

    // 4. Modern Residential Towers & Villas (Scene 2)
    const buildings = [];
    const towerBodyMat = new THREE.MeshStandardMaterial({
      color: 0x262f3b,
      roughness: 0.42,
      metalness: 0.35
    });
    const villaBodyMat = new THREE.MeshStandardMaterial({
      color: 0xded7c6,
      roughness: 0.65,
      metalness: 0.08
    });
    const bronzeTrimMat = new THREE.MeshStandardMaterial({
      color: 0xc29946,
      roughness: 0.32,
      metalness: 0.72
    });
    const windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0x28231b,
      emissive: 0xe6be63,
      emissiveIntensity: 0,
      roughness: 0.25,
      metalness: 0.4
    });

    function addArchitecturalBuilding(x, z, w, d, h, isTower, delay) {
      const group = new THREE.Group();
      const baseGeo = new THREE.BoxGeometry(w, h, d);
      const baseMesh = new THREE.Mesh(baseGeo, isTower ? towerBodyMat : villaBodyMat);
      baseMesh.position.y = h / 2;
      if (!isMobile) {
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
      }
      group.add(baseMesh);

      if (isTower) {
        // Architectural upper setback & champagne bronze parapet crown
        const crownH = h * 0.22;
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, crownH, d * 0.72), towerBodyMat);
        crown.position.y = h + crownH / 2;
        if (!isMobile) crown.castShadow = true;

        const parapet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.08, d * 0.76), bronzeTrimMat);
        parapet.position.y = h + crownH + 0.04;

        // Warm illuminated horizontal architectural window bands
        const bands = Math.max(2, Math.floor(h * 1.4));
        for (let b = 1; b <= bands; b++) {
          const bandY = (b / (bands + 1)) * h;
          const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.055, d + 0.03), windowGlowMat);
          band.position.y = bandY;
          group.add(band);
        }
        group.add(crown, parapet);
      } else {
        // Contemporary villa roof overhang + warm interior strip
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, 0.09, d * 1.12), bronzeTrimMat);
        roof.position.y = h + 0.045;
        const glassStrip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.14, d * 0.55), windowGlowMat);
        glassStrip.position.y = h * 0.52;
        group.add(roof, glassStrip);
      }

      const groundY = getTerrainHeight(x, z) + 0.04;
      group.position.set(x, groundY, z);
      group.scale.set(1, 0.001, 1);
      group.visible = false;
      scene.add(group);
      buildings.push({ group, groundY, delay });
    }

    // Central high-rise / mid-rise cluster
    const towerSpecs = [
      [-2.1, -2.1, 1.15, 1.15, 3.1, 0.0],
      [2.1, -2.0, 1.25, 1.05, 3.55, 0.08],
      [-2.0, 2.2, 1.1, 1.25, 2.75, 0.16],
      [2.2, 2.1, 1.2, 1.2, 3.25, 0.12],
      [-3.5, -1.9, 0.95, 1.1, 2.1, 0.22],
      [3.5, 1.9, 1.0, 0.95, 2.35, 0.26]
    ];
    towerSpecs.forEach(([x, z, w, d, h, delay]) => addArchitecturalBuilding(x, z, w, d, h, true, delay));

    // Outer quadrant villas & low-rise bungalows
    const villaSpecs = [
      [-5.2, -1.9, 0.85, 0.72, 0.52, 0.3],
      [-5.2, -3.5, 0.78, 0.8, 0.48, 0.35],
      [-3.6, -5.0, 0.88, 0.72, 0.54, 0.38],
      [-1.9, -5.1, 0.82, 0.75, 0.5, 0.42],
      [2.0, -5.0, 0.84, 0.78, 0.52, 0.34],
      [3.8, -4.9, 0.9, 0.74, 0.56, 0.4],
      [5.2, -3.4, 0.78, 0.82, 0.5, 0.44],
      [5.2, 3.4, 0.84, 0.78, 0.52, 0.36],
      [3.6, 5.1, 0.88, 0.74, 0.54, 0.42],
      [1.9, 5.1, 0.82, 0.76, 0.5, 0.46],
      [-2.0, 5.0, 0.85, 0.74, 0.52, 0.38],
      [-3.7, 5.0, 0.88, 0.78, 0.54, 0.44],
      [-5.1, 3.3, 0.78, 0.82, 0.48, 0.48],
      [5.1, -1.8, 0.82, 0.74, 0.5, 0.46]
    ];
    const activeVillas = isMobile ? villaSpecs.slice(0, 8) : villaSpecs;
    activeVillas.forEach(([x, z, w, d, h, delay]) => addArchitecturalBuilding(x, z, w, d, h, false, delay));

    // 5. Landscaped Greenery (Scene 2)
    const trees = [];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 0.9 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2e4c39, roughness: 0.85 });
    const trunkGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.26, 6);
    const canopyGeo = new THREE.IcosahedronGeometry(0.22, 1);

    const treePositions = [];
    for (let i = -5.6; i <= 5.6; i += 1.6) {
      if (Math.abs(i) < 1.8) continue;
      treePositions.push([i, 0.78], [i, -0.78], [0.78, i], [-0.78, i]);
    }
    treePositions.push(
      [-2.9, -3.3], [-4.4, -2.8], [2.9, -3.4], [4.5, -2.6],
      [-3.0, 3.4], [-4.5, 2.5], [2.9, 3.5], [4.6, 2.4]
    );
    const activeTrees = isMobile ? treePositions.filter((_, idx) => idx % 2 === 0) : treePositions;
    activeTrees.forEach(([tx, tz], idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.13;
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = 0.34;
      if (!isMobile) canopy.castShadow = true;
      tree.add(trunk, canopy);
      tree.position.set(tx, getTerrainHeight(tx, tz) + 0.04, tz);
      tree.scale.set(0.001, 0.001, 0.001);
      tree.visible = false;
      scene.add(tree);
      trees.push({ tree, delay: (idx % 10) * 0.05, scaleVar: 0.85 + (idx % 3) * 0.14 });
    });

    // 6. Golden Avenue Street Lights (Scene 2 -> 3)
    const lamps = [];
    const lampBulbGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const lampBulbMat = new THREE.MeshBasicMaterial({
      color: 0xffdf85,
      transparent: true,
      opacity: 0
    });
    const lampCoords = [
      [-4.8, 0.6], [-2.6, 0.6], [2.6, 0.6], [4.8, 0.6],
      [-4.8, -0.6], [-2.6, -0.6], [2.6, -0.6], [4.8, -0.6],
      [0.6, -4.4], [0.6, 4.4], [-0.6, -4.4], [-0.6, 4.4]
    ];
    const activeLamps = isMobile ? lampCoords.filter((_, idx) => idx % 2 === 0) : lampCoords;
    activeLamps.forEach(([lx, lz]) => {
      const bulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
      bulb.position.set(lx, getTerrainHeight(lx, lz) + 0.34, lz);
      scene.add(bulb);
      lamps.push(bulb);
    });

    // Resize listener
    const handleResize = () => {
      if (disposed) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    };
    window.addEventListener('resize', handleResize);
    cleanupFns.push(() => window.removeEventListener('resize', handleResize));

    // WebGL resource cleanup
    cleanupFns.push(() => {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    });

    const outerCount = outerPts.length;
    const innerCount = innerPts.length;

    return {
      render(elapsedSec) {
        if (disposed) return;

        // Scene phases
        const pLand = clamp01(elapsedSec / 1.5);
        const pDev = clamp01((elapsedSec - 1.5) / 2.0);
        const pReveal = clamp01((elapsedSec - 3.5) / 1.5);

        // Camera choreography: Land approach -> Township orbit -> Center brand push-in
        let camX = 0;
        let camY = 14.5;
        let camZ = 23;
        let lookY = 0.4;

        if (elapsedSec <= 1.5) {
          const e = easeInOutCubic(pLand);
          camX = lerp(0, 1.2, e);
          camY = lerp(14.5, 9.8, e);
          camZ = lerp(23.0, 16.0, e);
          lookY = lerp(0.2, 0.6, e);
        } else if (elapsedSec <= 3.5) {
          const e = easeInOutCubic(pDev);
          camX = lerp(1.2, 3.2, Math.sin(e * Math.PI * 0.7));
          camY = lerp(9.8, 6.4, e);
          camZ = lerp(16.0, 11.2, e);
          lookY = lerp(0.6, 1.25, e);
        } else {
          const e = easeInOutCubic(pReveal);
          camX = lerp(2.58, 0, e);
          camY = lerp(6.4, 4.1, e);
          camZ = lerp(11.2, 6.4, e);
          lookY = lerp(1.25, 1.55, e);
        }

        camera.position.set(camX, camY, camZ);
        camera.lookAt(0, lookY, 0);

        // Scene 1: Terrain contour & golden boundary tracing
        contourMat.opacity = smoothstep(0.05, 0.6, elapsedSec) * 0.11 * (1 - smoothstep(3.5, 4.5, elapsedSec) * 0.6);

        const traceOuter = easeInOutCubic(clamp01((elapsedSec - 0.15) / 1.15));
        outerBoundaryGeo.setDrawRange(0, Math.floor(traceOuter * outerCount));

        const traceInner = easeInOutCubic(clamp01((elapsedSec - 0.45) / 1.05));
        innerBoundaryGeo.setDrawRange(0, Math.floor(traceInner * innerCount));

        const beaconGrow = easeOutQuart(clamp01((elapsedSec - 0.5) / 0.8));
        beacons.forEach((b) => {
          b.scale.y = Math.max(0.001, beaconGrow);
        });

        // Scene 2: Roads emerge, greenery grows, buildings rise, golden lights illuminate
        const roadGrow = easeOutQuart(clamp01((elapsedSec - 1.45) / 0.8));
        roadGroup.position.y = lerp(-0.18, 0.0, roadGrow);
        roadGroup.scale.set(lerp(0.92, 1, roadGrow), 1, lerp(0.92, 1, roadGrow));
        goldStripMat.opacity = smoothstep(1.65, 2.35, elapsedSec) * 0.85;

        buildings.forEach((b) => {
          const local = clamp01((elapsedSec - (1.75 + b.delay)) / 1.05);
          if (local > 0) {
            b.group.visible = true;
            const e = easeOutQuart(local);
            b.group.scale.y = Math.max(0.001, e);
            b.group.position.y = b.groundY - (1 - e) * 0.15;
          }
        });

        trees.forEach((t) => {
          const local = clamp01((elapsedSec - (1.85 + t.delay)) / 0.75);
          if (local > 0) {
            t.tree.visible = true;
            const s = easeOutBack(local) * t.scaleVar;
            t.tree.scale.set(s, s, s);
          }
        });

        const lightLevel = smoothstep(2.35, 3.45, elapsedSec);
        windowGlowMat.emissiveIntensity = lightLevel * 0.9;
        lampBulbMat.opacity = lightLevel * 0.95;
        warmCoreLight.intensity = lightLevel * 1.15;

        // Scene 3: Fade 3D canvas gracefully into dark luxury brand stage
        const canvasFade = 1 - smoothstep(3.55, 4.45, elapsedSec) * 0.84;
        canvas.style.opacity = canvasFade.toFixed(3);

        renderer.render(scene, camera);
      }
    };
  }

  // Lightweight 2D Canvas architectural fallback when WebGL is unavailable
  function initFallback2DScene() {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const resize = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    cleanupFns.push(() => window.removeEventListener('resize', resize));

    const skyline = [
      { x: -0.22, w: 0.045, h: 0.14 },
      { x: -0.15, w: 0.055, h: 0.22 },
      { x: -0.07, w: 0.06, h: 0.28 },
      { x: 0.02, w: 0.055, h: 0.25 },
      { x: 0.10, w: 0.05, h: 0.19 },
      { x: 0.18, w: 0.045, h: 0.13 }
    ];

    return {
      render(elapsedSec) {
        if (disposed) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        const horizonY = h * 0.64;
        const fadeOut = 1 - smoothstep(3.55, 4.45, elapsedSec) * 0.85;
        ctx.save();
        ctx.globalAlpha = fadeOut;

        // Subtle perspective grid
        ctx.strokeStyle = 'rgba(182, 139, 62, 0.24)';
        ctx.lineWidth = 1;
        const gridProgress = smoothstep(0.1, 1.3, elapsedSec);
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.5 + i * w * 0.035, horizonY);
          ctx.lineTo(w * 0.5 + i * w * 0.11, h * (0.64 + 0.34 * gridProgress));
          ctx.stroke();
        }

        // Golden parcel boundary line
        const lineProgress = easeInOutCubic(clamp01(elapsedSec / 1.4));
        ctx.strokeStyle = '#e5c768';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - w * 0.32 * lineProgress, horizonY);
        ctx.lineTo(w * 0.5 + w * 0.32 * lineProgress, horizonY);
        ctx.stroke();

        // Architectural silhouettes rising in Scene 2
        const rise = easeOutQuart(clamp01((elapsedSec - 1.5) / 1.6));
        skyline.forEach((b) => {
          const bx = w * (0.5 + b.x);
          const bw = w * b.w;
          const bh = h * b.h * rise;
          ctx.fillStyle = '#1b232e';
          ctx.fillRect(bx - bw / 2, horizonY - bh, bw, bh);
          ctx.strokeStyle = 'rgba(219, 185, 77, 0.45)';
          ctx.strokeRect(bx - bw / 2, horizonY - bh, bw, bh);
        });

        ctx.restore();
      }
    };
  }

  function finishAndDispose() {
    if (disposed) return;
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);

    loaderEl.classList.add('is-done');
    document.body.classList.remove('is-loading');

    setTimeout(() => {
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (_e) {
          // Ignore cleanup errors
        }
      });
      cleanupFns = [];
      loaderEl.remove();
    }, 760);
  }

  initAssetTracker();

  const sceneController = prefersReducedMotion
    ? null
    : initThreeScene() || initFallback2DScene();

  if (prefersReducedMotion && brandStage) {
    brandStage.classList.add('is-revealed');
  }

  let brandShown = prefersReducedMotion;
  let completionTriggered = false;

  function tick(now) {
    if (disposed) return;

    const elapsedMs = now - startTime;
    const elapsedSec = elapsedMs / 1000;

    if (sceneController) {
      sceneController.render(elapsedSec);
    }

    // Smoothly approach real asset ratio
    assetRatio += (targetAssetRatio - assetRatio) * 0.12;

    // Scene 3 Brand Reveal trigger at 3.5s
    if (!brandShown && elapsedSec >= 3.5) {
      brandShown = true;
      brandStage?.classList.add('is-revealed');
    }

    const timelineProgress = clamp01(elapsedMs / TIMELINE_MS);
    const readyNow = timelineProgress >= 1 && assetsReady;
    const displayRatio = readyNow
      ? 1
      : Math.min(0.99, Math.min(timelineProgress * 0.99, assetRatio * 0.99 + 0.04));

    const pct = Math.round(displayRatio * 100);
    if (progressFill) progressFill.style.transform = `scaleX(${displayRatio})`;
    if (percentEl) percentEl.textContent = `${pct}%`;

    if (readyNow && !completionTriggered) {
      completionTriggered = true;
      if (progressFill) progressFill.style.transform = 'scaleX(1)';
      if (percentEl) percentEl.textContent = '100%';
      if (statusTextEl) statusTextEl.textContent = 'Welcome';
      setTimeout(finishAndDispose, 320);
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
})();
