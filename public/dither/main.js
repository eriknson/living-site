(() => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  const resetBtn = document.getElementById("reset-btn");

  const SCREEN_STEP = 5;
  const MIN_RADIUS = 1.0;
  const MAX_RADIUS = 2.6;
  const CURSOR_RADIUS = 110;
  const REPULSION_STRENGTH = 12;
  const SPRING_STIFFNESS = 0.085;
  const DAMPING = 0.78;
  const MAX_PARTICLES = 40000;
  const INTENSITY_CUTOFF = 0.07;

  const RIPPLE_SPEED = 8;
  const RIPPLE_STRENGTH = 3.5;
  const RIPPLE_BAND = 50;
  const RIPPLE_DECAY = 0.985;

  let particles = [];
  let pointers = [];
  let ripples = [];
  let animationId = null;
  let dpr = 1;
  let loadedImg = null;
  let dotColor = "#fff";

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const uploadLabel = uploadZone.querySelector(".upload-label");
  if (isTouch && uploadLabel) {
    uploadLabel.textContent = "Tap to choose a photo";
  }

  // ── Upload handling ──────────────────────────────────────────────

  uploadZone.addEventListener("click", () => fileInput.click());

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
  });

  resetBtn.addEventListener("click", () => {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    particles = [];
    ripples = [];
    loadedImg = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.remove("visible");
    resetBtn.classList.remove("visible");
    uploadZone.classList.remove("hidden");
    document.body.classList.remove("light-mode");
    fileInput.value = "";
  });

  function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        loadedImg = img;
        processImage(img, true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Image analysis ─────────────────────────────────────────────

  function analyzeImage(data, w, h) {
    let transparentCount = 0;
    const totalPixels = w * h;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 30) transparentCount++;
    }

    const hasTransparency = transparentCount / totalPixels > 0.15;

    if (hasTransparency) {
      let totalBr = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 30) continue;
        totalBr +=
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        count++;
      }
      const avgBr = count > 0 ? totalBr / count : 128;
      return {
        hasTransparency: true,
        bgR: 0,
        bgG: 0,
        bgB: 0,
        isDark: avgBr < 140,
      };
    }

    // Solid background -- detect bg color from image edges
    let edgeR = 0,
      edgeG = 0,
      edgeB = 0,
      edgeCount = 0;

    for (let x = 0; x < w; x++) {
      for (const row of [0, h - 1]) {
        const i = (row * w + x) * 4;
        if (data[i + 3] < 30) continue;
        edgeR += data[i];
        edgeG += data[i + 1];
        edgeB += data[i + 2];
        edgeCount++;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (const col of [0, w - 1]) {
        const i = (y * w + col) * 4;
        if (data[i + 3] < 30) continue;
        edgeR += data[i];
        edgeG += data[i + 1];
        edgeB += data[i + 2];
        edgeCount++;
      }
    }

    if (edgeCount === 0) edgeCount = 1;
    const bgR = edgeR / edgeCount;
    const bgG = edgeG / edgeCount;
    const bgB = edgeB / edgeCount;
    const bgBrightness = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

    return {
      hasTransparency: false,
      bgR,
      bgG,
      bgB,
      isDark: bgBrightness < 140,
    };
  }

  // ── Image sampling ─────────────────────────────────────────────

  function processImage(img, entrance) {
    resizeCanvas();

    const displayW = canvas.width / dpr;
    const displayH = canvas.height / dpr;

    const padding = Math.min(displayW, displayH) < 500 ? 0.88 : 0.82;
    const scale = Math.min(
      (displayW * padding) / img.width,
      (displayH * padding) / img.height
    );
    const offsetX = (displayW - img.width * scale) / 2;
    const offsetY = (displayH - img.height * scale) / 2;

    const offscreen = document.createElement("canvas");
    offscreen.width = img.width;
    offscreen.height = img.height;
    const offCtx = offscreen.getContext("2d");
    offCtx.drawImage(img, 0, 0);
    const imageData = offCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    const analysis = analyzeImage(data, img.width, img.height);

    if (analysis.isDark) {
      dotColor = "#fff";
      document.body.classList.remove("light-mode");
    } else {
      dotColor = "#1a1a1a";
      document.body.classList.add("light-mode");
    }

    particles = [];
    ripples = [];

    let step = GRID_STEP;
    const estCount =
      Math.ceil(img.width / step) * Math.ceil(img.height / step);
    if (estCount > MAX_PARTICLES) {
      step = Math.ceil(
        Math.sqrt((img.width * img.height) / MAX_PARTICLES)
      );
    }

    const centerX = displayW / 2;
    const centerY = displayH / 2;
    const maxColorDist = 441.67; // sqrt(255^2 * 3)

    for (let y = 0; y < img.height; y += step) {
      for (let x = 0; x < img.width; x += step) {
        const i = (y * img.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 30) continue;

        const alphaNorm = a / 255;
        let intensity;

        if (analysis.hasTransparency) {
          const brightness =
            0.299 * r + 0.587 * g + 0.114 * b;
          intensity = analysis.isDark
            ? (1 - brightness / 255) * alphaNorm
            : (brightness / 255) * alphaNorm;
        } else {
          const dr = r - analysis.bgR;
          const dg = g - analysis.bgG;
          const db = b - analysis.bgB;
          intensity =
            Math.sqrt(dr * dr + dg * dg + db * db) / maxColorDist;
        }

        if (intensity < INTENSITY_CUTOFF) continue;

        const radius = MIN_RADIUS + intensity * (MAX_RADIUS - MIN_RADIUS);
        const homeX = offsetX + x * scale;
        const homeY = offsetY + y * scale;

        let startX = homeX;
        let startY = homeY;
        if (entrance) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 200 + Math.random() * 400;
          startX = centerX + Math.cos(angle) * dist;
          startY = centerY + Math.sin(angle) * dist;
        }

        particles.push({
          homeX,
          homeY,
          x: startX,
          y: startY,
          vx: 0,
          vy: 0,
          radius,
        });
      }
    }

    uploadZone.classList.add("hidden");
    canvas.classList.add("visible");
    resetBtn.classList.add("visible");

    if (animationId) cancelAnimationFrame(animationId);
    animate();
  }

  // ── Canvas sizing ───────────────────────────────────────────────

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", () => {
    if (!loadedImg) return;
    processImage(loadedImg, false);
  });

  // ── Pointer tracking ──────────────────────────────────────────

  const MOUSE_ID = "mouse";

  canvas.addEventListener("mousemove", (e) => {
    const idx = pointers.findIndex((p) => p.id === MOUSE_ID);
    const entry = { id: MOUSE_ID, x: e.clientX, y: e.clientY };
    if (idx >= 0) pointers[idx] = entry;
    else pointers.push(entry);
  });

  canvas.addEventListener("mouseleave", () => {
    pointers = pointers.filter((p) => p.id !== MOUSE_ID);
  });

  function syncTouches(e) {
    e.preventDefault();
    const touchPointers = [];
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      touchPointers.push({
        id: "t" + t.identifier,
        x: t.clientX,
        y: t.clientY,
      });
    }
    const mousePtr = pointers.find((p) => p.id === MOUSE_ID);
    pointers = mousePtr ? [mousePtr, ...touchPointers] : touchPointers;
  }

  canvas.addEventListener("touchstart", syncTouches, { passive: false });
  canvas.addEventListener("touchmove", syncTouches, { passive: false });
  canvas.addEventListener("touchend", syncTouches, { passive: false });
  canvas.addEventListener("touchcancel", syncTouches, { passive: false });

  // ── Ripple on click / tap ─────────────────────────────────────

  canvas.addEventListener("mousedown", (e) => {
    if (particles.length === 0) return;
    ripples.push({ x: e.clientX, y: e.clientY, radius: 0, strength: RIPPLE_STRENGTH });
  });

  canvas.addEventListener("touchstart", (e) => {
    if (particles.length === 0) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      ripples.push({ x: t.clientX, y: t.clientY, radius: 0, strength: RIPPLE_STRENGTH });
    }
  });

  // ── Physics + render loop ──────────────────────────────────────

  function animate() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const maxRippleDist = Math.sqrt(w * w + h * h);

    ctx.clearRect(0, 0, w, h);

    // Advance ripples
    for (let r = ripples.length - 1; r >= 0; r--) {
      const rip = ripples[r];
      rip.radius += RIPPLE_SPEED;
      rip.strength *= RIPPLE_DECAY;
      if (rip.radius > maxRippleDist || rip.strength < 0.05) {
        ripples.splice(r, 1);
      }
    }

    const cursorR = CURSOR_RADIUS;
    const cursorR2 = cursorR * cursorR;
    const ptrLen = pointers.length;
    const ripLen = ripples.length;

    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];

      // Pointer repulsion
      for (let j = 0; j < ptrLen; j++) {
        const ptr = pointers[j];
        const dx = p.x - ptr.x;
        const dy = p.y - ptr.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < cursorR2 && dist2 > 0.01) {
          const dist = Math.sqrt(dist2);
          const t = 1 - dist / cursorR;
          const force = REPULSION_STRENGTH * t * t;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Ripple shockwaves
      for (let r = 0; r < ripLen; r++) {
        const rip = ripples[r];
        const dx = p.x - rip.x;
        const dy = p.y - rip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = Math.abs(dist - rip.radius);

        if (delta < RIPPLE_BAND && dist > 0.01) {
          const proximity = 1 - delta / RIPPLE_BAND;
          const force = rip.strength * proximity * proximity;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Spring + damping
      p.vx += (p.homeX - p.x) * SPRING_STIFFNESS;
      p.vy += (p.homeY - p.y) * SPRING_STIFFNESS;

      p.vx *= DAMPING;
      p.vy *= DAMPING;

      p.x += p.vx;
      p.y += p.vy;
    }

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];
      ctx.moveTo(p.x + p.radius, p.y);
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    animationId = requestAnimationFrame(animate);
  }
})();
