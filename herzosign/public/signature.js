'use strict';
/* רכיב חתימה: ציור באצבע/עכבר/עט, או חתימה מוקלדת (חלופה נגישה למקלדת ולקוראי מסך). */
(function () {
  const W = 600, H = 170;

  function createSignaturePad({ name = '', id = 'sig' } = {}) {
    let method = 'drawn';
    let hasInk = false;

    const root = document.createElement('div');
    root.className = 'sig';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-labelledby', `${id}-title`);

    const title = document.createElement('div');
    title.id = `${id}-title`;
    title.className = 'label';
    title.style.fontWeight = '600';
    title.style.marginBottom = '.4rem';
    title.innerHTML = 'חתימה <span class="req" aria-hidden="true">*</span>';
    root.append(title);

    const tabs = document.createElement('div');
    tabs.className = 'sig-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'אופן החתימה');
    const tabDraw = mkTab('✍️ ציור חתימה', 'drawn');
    const tabType = mkTab('⌨️ הקלדת שם', 'typed');
    tabs.append(tabDraw, tabType);
    root.append(tabs);

    // ── ציור ──
    const drawPanel = document.createElement('div');
    drawPanel.id = `${id}-panel-drawn`;
    drawPanel.setAttribute('role', 'tabpanel');
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'משטח חתימה. ניתן לחתום באצבע, בעט או בעכבר. משתמשי מקלדת יכולים לבחור "הקלדת שם".');
    const ctx = canvas.getContext('2d');
    const line = document.createElement('div');
    line.className = 'sig-line';
    line.textContent = 'חתמו בתוך המסגרת';
    drawPanel.append(canvas, line);

    // ── הקלדה ──
    const typePanel = document.createElement('div');
    typePanel.id = `${id}-panel-typed`;
    typePanel.setAttribute('role', 'tabpanel');
    typePanel.hidden = true;
    const typeLabel = document.createElement('label');
    typeLabel.htmlFor = `${id}-typed`;
    typeLabel.textContent = 'הקלידו את שמכם המלא כחתימה';
    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.id = `${id}-typed`;
    typeInput.value = name;
    typeInput.autocomplete = 'name';
    const preview = document.createElement('canvas');
    preview.width = W * 2; preview.height = H * 2;
    preview.setAttribute('aria-hidden', 'true');
    preview.style.marginTop = '.5rem';
    preview.style.cursor = 'default';
    const typeHelp = document.createElement('div');
    typeHelp.className = 'help';
    typeHelp.textContent = 'חתימה מוקלדת מתועדת יחד עם זהות המשתמש המחובר, השעה וכתובת ה-IP.';
    typePanel.append(typeLabel, typeInput, preview, typeHelp);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn small';
    clearBtn.textContent = 'ניקוי חתימה';
    clearBtn.style.marginTop = '.5rem';
    clearBtn.addEventListener('click', clear);

    root.append(drawPanel, typePanel, clearBtn);

    function mkTab(text, m) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn small';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', `${id}-panel-${m}`);
      b.setAttribute('aria-selected', m === 'drawn' ? 'true' : 'false');
      b.textContent = text;
      b.addEventListener('click', () => select(m));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); select(m === 'drawn' ? 'typed' : 'drawn', true); }
      });
      return b;
    }

    function select(m, focus) {
      method = m;
      tabDraw.setAttribute('aria-selected', String(m === 'drawn'));
      tabType.setAttribute('aria-selected', String(m === 'typed'));
      tabDraw.tabIndex = m === 'drawn' ? 0 : -1;
      tabType.tabIndex = m === 'typed' ? 0 : -1;
      drawPanel.hidden = m !== 'drawn';
      typePanel.hidden = m !== 'typed';
      if (m === 'typed') renderTyped();
      if (focus) (m === 'drawn' ? tabDraw : tabType).focus();
    }
    tabType.tabIndex = -1;

    function setupCtx(c) {
      c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0b2a4a';
    }
    setupCtx(ctx);

    let drawing = false, last = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true; last = pos(e);
      ctx.beginPath(); ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#0b2a4a'; ctx.fill();
      hasInk = true;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    const end = () => { drawing = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function renderTyped() {
      const c = preview.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, preview.width, preview.height);
      c.fillStyle = '#0b2a4a';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.direction = 'rtl';
      c.font = 'italic 600 96px "Segoe Script", "Brush Script MT", "Guttman Yad-Brush", "Times New Roman", serif';
      const text = typeInput.value.trim();
      c.fillText(text, preview.width / 2, preview.height / 2, preview.width - 60);
      c.strokeStyle = '#9aa7ab'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(60, preview.height - 50); c.lineTo(preview.width - 60, preview.height - 50); c.stroke();
    }
    typeInput.addEventListener('input', renderTyped);

    function clear() {
      if (method === 'drawn') { ctx.clearRect(0, 0, canvas.width, canvas.height); hasInk = false; }
      else { typeInput.value = ''; renderTyped(); typeInput.focus(); }
    }

    function exportCanvas(src) {
      // רקע לבן + הקטנה לגודל סביר
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const o = out.getContext('2d');
      o.fillStyle = '#fff'; o.fillRect(0, 0, W, H);
      o.drawImage(src, 0, 0, W, H);
      return out.toDataURL('image/png');
    }

    return {
      el: root,
      getValue() {
        if (method === 'drawn') return hasInk ? { method, image: exportCanvas(canvas) } : null;
        if (typeInput.value.trim().length < 2) return null;
        renderTyped();
        return { method, image: exportCanvas(preview) };
      },
      focus() { (method === 'drawn' ? tabDraw : typeInput).focus(); },
    };
  }

  window.createSignaturePad = createSignaturePad;
})();
