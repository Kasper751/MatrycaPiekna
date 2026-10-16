/* ==========================================================================
   MATRYCA PIĘKNA — wspólny skrypt (wszystkie podstrony)
   Każdy moduł sprawdza, czy jego elementy istnieją na danej stronie.
   ========================================================================== */
'use strict';

// Jeśli w emailjs-config.js wklejono stary blok „const EMAILJS = { … }”
// (z dawnej wersji script.js), też go przyjmujemy.
try {
  if (!window.EMAILJS_CONFIG && typeof EMAILJS === 'object' && EMAILJS) window.EMAILJS_CONFIG = EMAILJS;
} catch (e) { /* brak takiej zmiennej — w porządku */ }

(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

  const CONTACT_EMAIL = 'kontakt@matrycapiekna.pl';

  /* ── 1. Rok w stopce ─────────────────────────────────────── */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ── 2. Pasek nawigacji, przycisk „do góry”, paralaksa ───── */
  const header   = $('#siteHeader');
  const toTop    = $('#toTop');
  const progress = toTop ? $('.to-top__progress', toTop) : null;
  const CIRC     = 2 * Math.PI * 22;
  let ticking    = false;

  if (progress) progress.style.strokeDasharray = CIRC;

  // Pasek: tło narasta płynnie (0 → 1) na pierwszych ~180 px zamiast
  // przeskakiwać; przy szybkim przewijaniu w dół pasek chowa się miękko,
  // a wraca przy przewijaniu w górę.
  const isInner = document.body.classList.contains('page-inner');
  const FADE_DIST = 120;
  const heroEl = document.getElementById('hero');
  let lastY = window.scrollY;
  let upTravel = 0;

  function onScroll() {
    const y = Math.max(0, window.scrollY);
    const dy = y - lastY;
    lastY = y;

    if (header) {
      // Strona główna: nad zdjęciem pasek zostaje przezroczysty; tło pojawia się
      // płynnie dopiero, gdy dolna krawędź hero dochodzi do paska.
      let hdr = 1;
      if (!isInner) {
        const start = heroEl ? heroEl.offsetTop + heroEl.offsetHeight - header.offsetHeight - FADE_DIST : 0;
        hdr = Math.min(1, Math.max(0, (y - start) / FADE_DIST));
      }
      header.style.setProperty('--hdr', hdr.toFixed(3));
      header.classList.toggle('is-scrolled', !isInner && hdr > 0.45);
      header.classList.toggle('is-compact', y > 120);
      document.body.classList.toggle('header-compact', y > 120);

      const menuOpen = document.body.classList.contains('nav-open');
      if (dy > 0) upTravel = 0; else upTravel -= dy;

      let hide = header.classList.contains('is-hidden');
      if (menuOpen || y < 220) hide = false;
      else if (dy > 6) hide = true;            // w dół: chowamy
      else if (upTravel > 40) hide = false;    // w górę o ≥ 40 px: pokazujemy

      header.classList.toggle('is-hidden', hide);
      document.body.classList.toggle('header-hidden', hide);
    }

    if (toTop) {
      // Na stronie głównej przycisk pojawia się dopiero za zdjęciem w hero
      const showAfter = !isInner && heroEl ? heroEl.offsetTop + heroEl.offsetHeight - 80 : 500;
      toTop.classList.toggle('is-visible', y > showAfter);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.strokeDashoffset = CIRC * (1 - (max > 0 ? y / max : 0));
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior }));

  /* ── 3. Menu mobilne ─────────────────────────────────────── */
  const navToggle = $('#navToggle');
  const navMenu   = $('#navMenu');

  function setMenu(open) {
    navMenu.classList.toggle('is-open', open);
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    document.body.classList.toggle('nav-open', open);
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => setMenu(!navMenu.classList.contains('is-open')));
    navMenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    // Kliknięcie poza kartą menu (w przyciemnione tło) zamyka menu
    document.addEventListener('click', e => {
      if (navMenu.classList.contains('is-open') && !navMenu.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ── 4. Podświetlanie aktywnej sekcji (tylko linki #kotwica) ── */
  const spyLinks = $$('.nav-link[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    const targets = new Map();
    spyLinks.forEach(link => {
      const section = $(link.getAttribute('href'));
      if (section) targets.set(section, link);
    });
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        spyLinks.forEach(l => l.classList.remove('is-active'));
        targets.get(entry.target)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach((_, section) => spy.observe(section));
  }

  /* ── 5. Portfolio: filtry, „pokaż więcej”, lightbox ──────── */
  const grid = $('#photoGrid');
  if (grid) {
    const cards      = $$('.photo-card', grid);
    const filterBtns = $$('.filter-btn');
    const moreBtn    = $('#showMoreBtn');
    const lessBtn    = $('#showLessBtn');
    const counter    = $('#portfolioCount');
    const INITIAL    = 6;
    const STEP       = 9;
    let filter = 'all';
    let limit  = INITIAL;

    const meta = card => {
      const cap = $('figcaption', card);
      const cat = $('span', cap)?.textContent.trim() || '';
      return { cat, title: cap.textContent.replace(cat, '').trim() };
    };

    cards.forEach(card => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Powiększ zdjęcie: ${meta(card).title}`);
    });

    filterBtns.forEach(btn => {
      const f = btn.dataset.filter;
      const n = f === 'all' ? cards.length : cards.filter(c => c.dataset.category === f).length;
      const badge = document.createElement('span');
      badge.className = 'count';
      badge.textContent = n;
      btn.append(badge);
    });

    const matching = () => cards.filter(c => filter === 'all' || c.dataset.category === filter);

    function render(animateFrom = Infinity) {
      const list = matching();
      cards.forEach(c => { c.hidden = true; c.classList.remove('is-new'); });
      list.forEach((c, i) => {
        if (i < limit) {
          c.hidden = false;
          if (i >= animateFrom) c.classList.add('is-new');
        }
      });
      const shown = Math.min(limit, list.length);
      if (counter) counter.textContent = `Wyświetlono ${shown} z ${list.length} zdjęć`;
      if (moreBtn) moreBtn.hidden = shown >= list.length;
      if (lessBtn) lessBtn.hidden = limit <= INITIAL || list.length <= INITIAL;
    }

    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      filter = btn.dataset.filter;
      limit = INITIAL;
      render(0);
    }));

    moreBtn?.addEventListener('click', () => {
      const from = limit;
      limit += STEP;
      render(from);
    });

    lessBtn?.addEventListener('click', () => {
      limit = INITIAL;
      render();
      $('#portfolio')?.scrollIntoView({ behavior: scrollBehavior });
    });

    render();

    // Lightbox
    const lb      = $('#lightbox');
    const lbImg   = $('#lightboxImg');
    const lbCap   = $('#lightboxCaption');
    const lbCount = $('#lightboxCounter');
    const lbClose = $('#lightboxClose');
    let lbList = [];
    let lbIndex = 0;
    let lastFocus = null;

    function showImage() {
      const card = lbList[lbIndex];
      const img  = $('img', card);
      const { cat, title } = meta(card);
      const src = img.currentSrc || img.src;

      if (lbImg.src !== src) {
        lbImg.classList.add('is-loading');
        lbImg.onload = () => lbImg.classList.remove('is-loading');
        lbImg.src = src;
        if (lbImg.complete) lbImg.classList.remove('is-loading');
      }
      lbImg.alt = img.alt;
      lbCap.innerHTML = '';
      const catEl = document.createElement('span');
      catEl.textContent = cat;
      lbCap.append(catEl, document.createTextNode(title));
      lbCount.textContent = `${lbIndex + 1} / ${lbList.length}`;
    }

    function openLightbox(card) {
      lbList = cards.filter(c => !c.hidden);
      lbIndex = Math.max(0, lbList.indexOf(card));
      lastFocus = document.activeElement;
      showImage();
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      lbClose.focus();
    }

    function closeLightbox() {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      lastFocus?.focus();
    }

    const step = d => { lbIndex = (lbIndex + d + lbList.length) % lbList.length; showImage(); };

    grid.addEventListener('click', e => {
      const card = e.target.closest('.photo-card');
      if (card) openLightbox(card);
    });
    grid.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('photo-card')) {
        e.preventDefault();
        openLightbox(e.target);
      }
    });

    if (lb) {
      lbClose.addEventListener('click', closeLightbox);
      $('#lightboxPrev').addEventListener('click', () => step(-1));
      $('#lightboxNext').addEventListener('click', () => step(1));
      lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

      document.addEventListener('keydown', e => {
        if (!lb.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'Tab') { // prosta pułapka fokusu
          const focusables = $$('button', lb);
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });

      let startX = 0;
      lb.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) step(diff > 0 ? 1 : -1);
      }, { passive: true });
    }
  }

  /* ── 6. Karuzela opinii ──────────────────────────────────── */
  const carousel = $('[data-carousel]');
  if (carousel) {
    const track  = $('.carousel__track', carousel);
    const slides = $$('.quote-card', carousel);
    const dotsEl = $('.carousel__dots', carousel);
    let index = 0;
    let timer = null;

    const dots = slides.map((_, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel__dot';
      b.setAttribute('aria-label', `Pokaż opinię ${n + 1}`);
      b.addEventListener('click', () => { go(n); restart(); });
      dotsEl.append(b);
      return b;
    });

    function go(n) {
      index = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== index)));
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === index);
        d.setAttribute('aria-current', k === index ? 'true' : 'false');
      });
    }
    const stop  = () => clearInterval(timer);
    const start = () => { if (reduceMotion) return; stop(); timer = setInterval(() => go(index + 1), 6500); };
    const restart = start;

    $('[data-prev]', carousel)?.addEventListener('click', () => { go(index - 1); restart(); });
    $('[data-next]', carousel)?.addEventListener('click', () => { go(index + 1); restart(); });
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    let sx = 0;
    track.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; stop(); }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) go(index + (diff > 0 ? 1 : -1));
      start();
    }, { passive: true });

    go(0);
    start();
  }

  /* ── 7. Formularze (kontakt, zapytanie o szkolenie) — EmailJS ── */
  // Dane konta wpisujesz w pliku emailjs-config.js (nie tutaj).
  const EMAILJS = { PUBLIC_KEY: '', SERVICE_ID: '', TEMPLATE_ID: '', AUTOREPLY_TEMPLATE_ID: '', DEBUG: false };
  // Przyjmujemy też inne zapisy nazw (publicKey, serviceId, template_id…)
  Object.entries(window.EMAILJS_CONFIG || {}).forEach(([key, value]) => {
    const k = key.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[-\s]/g, '_').toUpperCase();
    if (k in EMAILJS) EMAILJS[k] = value;
  });

  // Usuwa przypadkowe spacje/cudzysłowy wklejone razem z kluczami
  ['PUBLIC_KEY', 'SERVICE_ID', 'TEMPLATE_ID', 'AUTOREPLY_TEMPLATE_ID'].forEach(k => {
    EMAILJS[k] = String(EMAILJS[k] || '').trim().replace(/^["']|["']$/g, '');
  });

  // Czy w emailjs-config.js są prawdziwe klucze?
  const configOk = () =>
    ![EMAILJS.PUBLIC_KEY, EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID].some(v => !v || v.startsWith('TWOJ_'));

  function configProblem() {
    if (!window.EMAILJS_CONFIG) {
      if (!document.querySelector('script[src*="emailjs-config.js"]'))
        return 'ta podstrona nie ma linii <script src="emailjs-config.js"> — wgraj aktualny plik HTML';
      if (window.__emailjsConfigMissing)
        return 'serwer nie znalazł pliku emailjs-config.js (sprawdź, czy leży obok index.html i czy nazwa nie brzmi np. „emailjs-config.js.txt”)';
      if (window.__emailjsConfigError)
        return 'plik emailjs-config.js ma błąd zapisu' + (/^Script error/.test(window.__emailjsConfigError) ? '' : ': „' + window.__emailjsConfigError + '”') + ' — każda wartość musi być w zwykłych apostrofach \'…\' i zakończona przecinkiem';
      return 'plik emailjs-config.js wczytał się, ale nie zawiera bloku „window.EMAILJS_CONFIG = { … };” — zastąp całą jego treść wzorem z instrukcji';
    }
    const missing = ['PUBLIC_KEY', 'SERVICE_ID', 'TEMPLATE_ID'].filter(k => !EMAILJS[k] || EMAILJS[k].startsWith('TWOJ_'));
    if (missing.length) return 'w emailjs-config.js brakuje wartości: ' + missing.join(', ');
    return '';
  }
  if (configProblem()) console.warn('EmailJS nieaktywny — ' + configProblem() + '. Formularz otworzy program pocztowy.');

  // Skrypt EmailJS: jeśli nie wczytał się z <script> (np. blokada, wolne łącze),
  // próbujemy jeszcze raz w chwili wysyłki
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  let sdkPromise = null;
  function loadEmailjs() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (!sdkPromise) {
      sdkPromise = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = SDK_URL;
        tag.onload = () => window.emailjs ? resolve(window.emailjs) : reject(new Error('Failed to load EmailJS SDK'));
        tag.onerror = () => { sdkPromise = null; reject(new Error('Failed to fetch EmailJS SDK (network/blocked)')); };
        document.head.append(tag);
      });
    }
    return sdkPromise;
  }
  let emailjsInited = false;
  async function getEmailjs() {
    const ejs = await loadEmailjs();
    if (!emailjsInited) { ejs.init({ publicKey: EMAILJS.PUBLIC_KEY }); emailjsInited = true; }
    return ejs;
  }

  const ERROR_HINTS = [
    [/public key/i,               'sprawdź PUBLIC_KEY (Account → General → Public Key)'],
    [/service id/i,               'sprawdź SERVICE_ID (Email Services)'],
    [/template id/i,              'sprawdź TEMPLATE_ID (Email Templates)'],
    [/recipients address is empty|recipient/i, 'w szablonie uzupełnij pole „To Email” (adres salonu)'],
    [/insufficient|scope|gmail_api|invalid grant/i, 'połącz skrzynkę ponownie w Email Services i zaznacz zgodę na wysyłanie e-maili (Gmail)'],
    [/captcha/i,                  'wyłącz reCAPTCHA w ustawieniach szablonu (Settings) albo dodaj ją do formularza'],
    [/non-browser|origin|domain/i,'sprawdź ustawienia Account → Security (dozwolone domeny)'],
    [/limit|quota/i,              'wyczerpany miesięczny limit wiadomości w planie EmailJS'],
    [/failed to fetch|network|sdk/i, 'nie udało się połączyć z EmailJS (cdn.jsdelivr.net / api.emailjs.com) — wyłącz blokadę reklam i spróbuj ponownie']
  ];

  /**
   * Wspólna obsługa formularza wysyłanego przez EmailJS:
   * walidacja, pułapka na boty, stan „Wysyłanie…”, komunikaty, awaryjny mailto.
   * buildParams(FormData) zwraca obiekt zmiennych dla szablonu EmailJS.
   */
  function bindEmailForm(form, { buildParams, onSuccess }) {
    if (!form) return;
    const status = $('.form-status', form);
    const submitBtn = $('button[type="submit"]', form);
    const submitHTML = submitBtn ? submitBtn.innerHTML : '';

    const setStatus = (text, type) => {
      status.textContent = text;
      status.className = 'form-status' + (type ? ' is-' + type : '');
      if (type) status.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
    };
    const setSending = on => {
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.innerHTML = on
        ? 'Wysyłanie… <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>'
        : submitHTML;
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (submitBtn?.disabled) return;
      if (form.elements.website && form.elements.website.value) return;   // bot

      let firstInvalid = null;
      $$('[required]', form).forEach(field => {
        const ok = field.type === 'checkbox' ? field.checked : field.checkValidity();
        field.closest('.form-group, .form-check')?.classList.toggle('has-error', !ok);
        if (!ok && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        setStatus('Uzupełnij zaznaczone pola: imię, poprawny e-mail, wiadomość i zgodę na kontakt.', 'error');
        firstInvalid.focus();
        return;
      }

      const d = new FormData(form);
      const params = Object.assign({
        name:     String(d.get('name') || '').trim(),
        email:    String(d.get('email') || '').trim(),
        reply_to: String(d.get('email') || '').trim(),
        phone:    String(d.get('phone') || '').trim() || 'nie podano',
        sent_at:  new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })
      }, buildParams(d));

      // Awaryjnie, gdy EmailJS nie jest skonfigurowany: gotowy e-mail w programie pocztowym
      if (!configOk()) {
        console.warn('EmailJS nieaktywny — ' + configProblem());

        const body = [
          `Imię i nazwisko: ${params.name}`, `E-mail: ${params.email}`,
          `Telefon: ${params.phone}`, `Temat: ${params.topic}`, '', params.message
        ].join('\n');
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Wiadomość ze strony: ' + params.topic)}&body=${encodeURIComponent(body)}`;
        setStatus(`Otworzyliśmy Twój program pocztowy z gotową wiadomością. Jeśli się nie pojawił, napisz na ${CONTACT_EMAIL}.`, 'success');
        return;
      }

      setSending(true);
      setStatus('Wysyłamy wiadomość…', '');
      try {
        const ejs = await getEmailjs();
        await ejs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID, params);
        if (EMAILJS.AUTOREPLY_TEMPLATE_ID) {
          ejs.send(EMAILJS.SERVICE_ID, EMAILJS.AUTOREPLY_TEMPLATE_ID, params).catch(() => {});
        }
        form.reset();
        const confirmNote = EMAILJS.AUTOREPLY_TEMPLATE_ID
          ? ` Za chwilę otrzymasz e-mail z potwierdzeniem (sprawdź też folder Spam).`
          : '';
        setStatus(`Dziękujemy, ${params.name.split(' ')[0]}! Wiadomość została wysłana. Odpowiemy na adres ${params.email} najszybciej, jak to możliwe.${confirmNote}`, 'success');
        onSuccess?.(params);
      } catch (err) {
        const code = err && err.status;
        const text = (err && (err.text || err.message)) || String(err);
        console.error('EmailJS — status:', code, '| opis:', text, err);
        // Szczegóły błędu tylko w konsoli (F12), nigdy w formularzu
        const hint = (ERROR_HINTS.find(([re]) => re.test(text)) || [, ''])[1];
        if (hint) console.info('EmailJS — wskazówka:', hint);
        setStatus(`Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo napisz bezpośrednio na ${CONTACT_EMAIL} lub zadzwoń: +48 788 263 969.`, 'error');
      } finally {
        setSending(false);
      }
    });

    form.addEventListener('input', e => e.target.closest('.has-error')?.classList.remove('has-error'));
    form.addEventListener('change', e => e.target.closest('.has-error')?.classList.remove('has-error'));
  }

  // 7a. Formularz na stronie kontaktowej
  bindEmailForm($('#contactForm'), {
    buildParams: d => ({
      topic:   d.get('service') || 'Zapytanie ogólne',
      message: String(d.get('message') || '').trim()
    })
  });

  // 7b. „Zapytaj o termin” na stronie szkoleń — okno z formularzem,
  //     dane kursu uzupełniają się same na podstawie klikniętej karty
  const courseDialog = $('#courseDialog');
  const courseForm = $('#courseForm');
  if (courseDialog && courseForm && typeof courseDialog.showModal === 'function') {
    const fields = {
      course:   courseForm.elements.course,
      price:    courseForm.elements.course_price,
      duration: courseForm.elements.course_duration
    };
    const view = {
      course:   $('[data-course-name]', courseDialog),
      price:    $('[data-course-price]', courseDialog),
      duration: $('[data-course-duration]', courseDialog)
    };
    let lastTrigger = null;

    function openCourseDialog(card, trigger) {
      const name = $('h2', card)?.textContent.trim() || 'Szkolenie';
      const price = $('.hat-tag', card)?.textContent.trim() || '';
      const duration = $('.course-meta li', card)?.textContent.trim() || '';
      fields.course.value = name;   view.course.textContent = name;
      fields.price.value = price;   view.price.textContent = price;
      fields.duration.value = duration; view.duration.textContent = duration;

      const status = $('.form-status', courseForm);
      status.textContent = ''; status.className = 'form-status';
      $$('.has-error', courseForm).forEach(el => el.classList.remove('has-error'));
      $('.inquiry-dialog__form', courseDialog).hidden = false;

      lastTrigger = trigger;
      courseDialog.showModal();
      document.body.classList.add('no-scroll');
      setTimeout(() => courseForm.elements.name.focus(), 50);
    }

    $$('[data-course-inquiry]').forEach(btn => btn.addEventListener('click', e => {
      const card = btn.closest('.course-card');
      if (!card) return;
      e.preventDefault();             // bez JS link działa jako zwykły mailto
      openCourseDialog(card, btn);
    }));

    const closeDialog = () => courseDialog.close();
    $$('[data-dialog-close]', courseDialog).forEach(b => b.addEventListener('click', closeDialog));
    // Kliknięcie w przyciemnione tło (poza okienkiem) zamyka okno
    courseDialog.addEventListener('click', e => { if (e.target === courseDialog) closeDialog(); });
    courseDialog.addEventListener('close', () => {
      document.body.classList.remove('no-scroll');
      lastTrigger?.focus({ preventScroll: true });
    });

    bindEmailForm(courseForm, {
      buildParams: d => {
        const course = String(d.get('course') || '');
        const preferred = String(d.get('preferred_date') || '').trim() || 'bez preferencji';
        const question = String(d.get('message') || '').trim();
        return {
          topic: `Szkolenie: ${course}`,
          course,
          course_price: String(d.get('course_price') || ''),
          course_duration: String(d.get('course_duration') || ''),
          preferred_date: preferred,
          message: [
            `Szkolenie: ${course}`,
            `Cena: ${d.get('course_price') || '-'}`,
            `Czas trwania: ${d.get('course_duration') || '-'}`,
            `Preferowany termin: ${preferred}`,
            'Miejsce szkolenia: ul. Bażantów 24/6, Katowice',
            '',
            question
          ].join('\n')
        };
      },
      onSuccess: () => {
        // form.reset() czyści też ukryte pola kursu — przywracamy je,
        // żeby ponowna wiadomość z tego samego okna miała dane kursu
        fields.course.value = view.course.textContent;
        fields.price.value = view.price.textContent;
        fields.duration.value = view.duration.textContent;
      }
    });
  }

  /* ── 8. Status „otwarte / zamknięte” (czas w Warszawie) ──── */
  const statusEls = $$('[data-open-status]');
  if (statusEls.length) {
    // 0 = niedziela … 6 = sobota; [otwarcie, zamknięcie] w pełnych godzinach
    const HOURS = { 0: null, 1: [8, 21], 2: [8, 21], 3: [8, 21], 4: [8, 21], 5: [8, 21], 6: [8, 17] };
    const DAYS  = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    function warsawNow() {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
      const get = type => parts.find(p => p.type === type).value;
      return { day: DAYS[get('weekday')], mins: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
    }

    function update() {
      const { day, mins } = warsawNow();
      const h = HOURS[day];
      const open = Boolean(h && mins >= h[0] * 60 && mins < h[1] * 60);
      statusEls.forEach(el => {
        el.classList.toggle('is-open', open);
        el.textContent = open ? `Teraz otwarte, do ${h[1]}:00` : 'Teraz zamknięte';
      });
      $$('[data-days]').forEach(row => {
        const [a, b] = row.dataset.days.split('-').map(Number);
        const today = day >= a && day <= (b ?? a);
        row.classList.toggle('is-today', today);
        row.nextElementSibling?.classList.toggle('is-today', today);
      });
    }
    update();
    setInterval(update, 60000);
  }

  /* ── 9. Zgoda na cookies + mapa ładowana po zgodzie ──────── */
  // Wybór zapisujemy lokalnie w przeglądarce (to niezbędny zapis — bez niego
  // baner pokazywałby się przy każdej wizycie). Wersję podbij, gdy zmienisz
  // listę narzędzi zewnętrznych — wtedy wszyscy zobaczą baner ponownie.
  const CONSENT_KEY = 'mp_cookie_consent';
  const CONSENT_VERSION = 1;

  const Consent = {
    get() {
      try {
        const data = JSON.parse(localStorage.getItem(CONSENT_KEY));
        return data && data.v === CONSENT_VERSION ? data.choice : null;
      } catch { return null; }
    },
    set(choice) {
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, choice, date: new Date().toISOString() }));
      } catch { /* tryb prywatny — wybór obowiązuje do końca wizyty */ }
      Consent.current = choice;
      document.dispatchEvent(new CustomEvent('mp:consent', { detail: choice }));
    },
    current: null
  };
  Consent.current = Consent.get();

  let banner = null;
  function buildBanner() {
    banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Ustawienia cookies');
    banner.innerHTML = `
      <h2><span class="suit suit-h" aria-hidden="true"></span>Ciasteczka do herbatki?</h2>
      <p>Pliki niezbędne zapamiętują Twój wybór. Za Twoją zgodą wczytamy też mapę Google, która zapisuje własne cookies.
         Szczegóły w <a href="polityka-cookies.html">polityce cookies</a>.</p>
      <div class="cookie-banner__actions">
        <button type="button" class="btn btn--outline btn--sm" data-consent="necessary">Tylko niezbędne</button>
        <button type="button" class="btn btn--primary btn--sm" data-consent="all">Akceptuj wszystkie</button>
      </div>`;
    document.body.append(banner);
    banner.addEventListener('click', e => {
      const btn = e.target.closest('[data-consent]');
      if (!btn) return;
      Consent.set(btn.dataset.consent);
      hideBanner();
    });
  }
  function showBanner() {
    if (!banner) buildBanner();
    banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
  }
  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    setTimeout(() => { banner.hidden = true; }, reduceMotion ? 0 : 600);
  }

  if (!Consent.current) setTimeout(showBanner, 700);

  // Przycisk „Ustawienia cookies” (stopka, polityka cookies)
  $$('[data-cookie-settings]').forEach(btn => btn.addEventListener('click', () => {
    showBanner();
    $('[data-consent="necessary"]', banner)?.focus({ preventScroll: true });
  }));

  // Mapa Google: iframe powstaje dopiero po zgodzie (lub jednorazowym kliknięciu)
  $$('[data-consent-embed]').forEach(box => {
    const placeholder = $('.map-consent', box);
    const load = () => {
      if ($('iframe', box)) return;
      const frame = document.createElement('iframe');
      frame.src = box.dataset.src;
      frame.title = box.dataset.title || 'Mapa';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.allowFullscreen = true;
      box.append(frame);
      if (placeholder) placeholder.hidden = true;
    };
    const unload = () => {
      $('iframe', box)?.remove();
      if (placeholder) placeholder.hidden = false;
    };
    if (Consent.current === 'all') load();
    $('[data-embed-load]', box)?.addEventListener('click', load);
    document.addEventListener('mp:consent', e => (e.detail === 'all' ? load() : unload()));
  });

  // Aktualny stan zgody na stronie polityki cookies
  const consentState = $('[data-consent-state]');
  if (consentState) {
    const render = () => {
      consentState.textContent = Consent.current === 'all'
        ? 'Zaakceptowano wszystkie pliki cookies.'
        : Consent.current === 'necessary'
          ? 'Zaakceptowano tylko niezbędne pliki.'
          : 'Nie dokonano jeszcze wyboru.';
    };
    render();
    document.addEventListener('mp:consent', render);
  }

  /* ── 10. Cennik: wyszukiwarka i aktywna kategoria ────────── */
  const priceRoot = $('[data-pricelist]');
  if (priceRoot) {
    const sections = $$('.price-section', priceRoot);
    const pills    = $$('.category-pill[href^="#"]');
    const pillBar  = $('.category-pills');

    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const pill = pills.find(p => p.getAttribute('href') === `#${entry.target.id}`);
          if (!pill) return;
          pills.forEach(p => { p.classList.remove('is-active'); p.removeAttribute('aria-current'); });
          pill.classList.add('is-active');
          pill.setAttribute('aria-current', 'true');
          pillBar.scrollTo({
            left: pill.offsetLeft - pillBar.clientWidth / 2 + pill.clientWidth / 2,
            behavior: scrollBehavior
          });
        });
      }, { rootMargin: '-30% 0px -65% 0px' });
      sections.forEach(s => spy.observe(s));
    }

    const input   = $('#priceSearch');
    const empty   = $('#priceEmpty');
    const results = $('#priceResults');
    const norm = s => s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const rows = $$('.price-row', priceRoot).map(el => {
      const nameEl = $('.price-row__name', el);
      return { el, nameEl, name: nameEl.textContent, text: norm(el.textContent) };
    });

    const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function highlight(row, q) {
      if (!q) { row.nameEl.textContent = row.name; return; }
      const idx = norm(row.name).indexOf(q);
      if (idx === -1) { row.nameEl.textContent = row.name; return; }
      const n = row.name;
      row.nameEl.innerHTML =
        escapeHtml(n.slice(0, idx)) + '<mark>' + escapeHtml(n.slice(idx, idx + q.length)) + '</mark>' + escapeHtml(n.slice(idx + q.length));
    }

    function filterPrices() {
      const q = norm(input.value.trim());
      let total = 0;
      rows.forEach(row => {
        const hit = !q || row.text.includes(q);
        row.el.hidden = !hit;
        if (hit) total++;
        highlight(row, hit ? q : '');
      });
      sections.forEach(section => {
        $$('.price-group', section).forEach(g => { g.hidden = !$$('.price-row', g).some(r => !r.hidden); });
        section.hidden = !$$('.price-row', section).some(r => !r.hidden);
      });
      empty.hidden = total > 0;
      results.hidden = !q;
      results.textContent = q ? `Znalezione zabiegi: ${total}` : '';
      return q;
    }

    // Po wyszukaniu przewijamy do PIERWSZEGO pasującego zabiegu (tuż pod
    // przyklejonym paskiem wyszukiwarki), a po wyczyszczeniu — na początek cennika.
    const toolbar = $('.price-toolbar');
    let jumpTimer = null;

    function jumpToFirst() {
      const q = norm(input.value.trim());
      const first = q ? rows.find(r => !r.el.hidden) : null;
      const target = first ? first.el : (q ? empty : priceRoot);
      if (!target) return;

      const base = target.getBoundingClientRect().top + window.scrollY - (toolbar ? toolbar.offsetHeight : 0) - 14;
      // Przy przewijaniu w dół pasek menu się chowa, przy przewijaniu w górę wraca
      const headerWillShow = header && (base < window.scrollY || base < 220);
      const top = base - (headerWillShow ? header.offsetHeight : 0);
      window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });

      if (first) {
        rows.forEach(r => r.el.classList.remove('is-first-hit'));
        void first.el.offsetWidth;            // restart animacji
        first.el.classList.add('is-first-hit');
      }
    }

    function onSearch(immediate) {
      filterPrices();
      clearTimeout(jumpTimer);
      jumpTimer = setTimeout(jumpToFirst, immediate ? 0 : 350);
    }

    if (input) {
      input.addEventListener('input', () => onSearch(false));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); onSearch(true); }
        if (e.key === 'Escape') { input.value = ''; onSearch(true); }
      });
      input.closest('form')?.addEventListener('submit', e => { e.preventDefault(); onSearch(true); });
      $('#priceClear')?.addEventListener('click', () => { input.value = ''; onSearch(true); input.focus({ preventScroll: true }); });
    }
  }

  /* ── 12. FAQ: płynne rozwijanie odpowiedzi ───────────────── */
  $$('.faq-item').forEach(item => {
    const summary = $('summary', item);
    const body = $('.faq-item__body', item);
    if (!summary || !body || reduceMotion || !body.animate) return;
    let anim = null;

    summary.addEventListener('click', e => {
      e.preventDefault();
      anim?.cancel();
      if (item.open) {
        anim = body.animate(
          [{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 260, easing: 'ease' }
        );
        anim.onfinish = () => { item.open = false; anim = null; };
      } else {
        item.open = true;
        anim = body.animate(
          [{ height: '0px', opacity: 0 }, { height: body.offsetHeight + 'px', opacity: 1 }],
          { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
        anim.onfinish = () => { anim = null; };
      }
    });
  });

  // Otwórz pytanie wskazane w adresie, np. kontakt.html#faq-rezerwacja
  if (location.hash.startsWith('#faq-')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.tagName === 'DETAILS') target.open = true;
  }

  /* ── 11. Zastępczy obrazek, gdy plik się nie wczyta ──────── */
  const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"%3E%3Crect fill="%23f5f0e8" width="600" height="750"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="%236e5232"%3EMatryca Pi%C4%99kna%3C/text%3E%3C/svg%3E';
  $$('img').forEach(img => {
    img.addEventListener('error', function handle() {
      this.removeEventListener('error', handle);
      this.src = FALLBACK;
    });
  });
})();