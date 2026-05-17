/**
 * 永旭智慧財產事務所 — Main JavaScript
 * YSIPO Website Core Functionality
 */

'use strict';

/* ──────────────────────────────────────────────
   Partial Loader (Header / Footer)
   ────────────────────────────────────────────── */
async function loadPartial(selector, url, rootPath) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    let html = await res.text();
    if (rootPath !== undefined) {
      html = html.replace(/\{ROOT\}/g, rootPath);
    }
    el.innerHTML = html;
    el.dispatchEvent(new Event('partial-loaded', { bubbles: true }));
  } catch (err) {
    console.warn('[YSIPO] Partial load failed:', err.message);
  }
}

/* ──────────────────────────────────────────────
   Detect root path (works in subdirectories like /en/)
   ────────────────────────────────────────────── */
function getRootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  if (window.location.pathname.endsWith('.html')) {
    return depth > 1 ? '../' : '';
  }
  return depth > 1 ? '../' : '';
}

/* ──────────────────────────────────────────────
   Navigation: Scroll & Mobile Toggle
   ────────────────────────────────────────────── */
function initNavigation() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  // Scroll effect: transparent → solid
  const scrollThreshold = 60;
  let lastScrollY = window.scrollY;

  function handleScroll() {
    const currentY = window.scrollY;
    if (currentY > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScrollY = currentY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Run on load

  // Mobile hamburger toggle
  const menuBtn = header.querySelector('.mobile-menu-btn');
  const hamburger = header.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      if (hamburger) hamburger.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // Active nav link highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  header.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && href !== '#' && currentPath && href.includes(currentPath)) {
      link.classList.add('active');
    }
    if (currentPath === '' || currentPath === 'index.html') {
      const homeLink = header.querySelector('[href="index.html"], [href="./"], [href="/"]');
      if (homeLink) homeLink.classList.add('active');
    }
  });
}

/* ──────────────────────────────────────────────
   Scroll Animations (simple IntersectionObserver)
   ────────────────────────────────────────────── */
function initScrollAnimations() {
  const animatables = document.querySelectorAll('[data-animate]');
  if (!animatables.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('animated');
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'none';
        }, Number(delay));
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  animatables.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms`;
    observer.observe(el);
  });
}

/* ──────────────────────────────────────────────
   AOS (Animate on Scroll) — lightweight fallback
   Called after AOS CDN loads; or runs natively
   ────────────────────────────────────────────── */
function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }
}

/* ──────────────────────────────────────────────
   Accordion
   ────────────────────────────────────────────── */
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isOpen = item.classList.contains('open');

      // Close all others in same group
      const group = item.closest('[data-accordion-group]');
      if (group) {
        group.querySelectorAll('.accordion-item.open').forEach(openItem => {
          if (openItem !== item) {
            openItem.classList.remove('open');
            openItem.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
          }
        });
      }

      item.classList.toggle('open', !isOpen);
      header.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}

/* ──────────────────────────────────────────────
   Language Switch
   ────────────────────────────────────────────── */
function initLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      const currentPath = window.location.pathname;

      if (lang === 'en') {
        if (!currentPath.includes('/en/')) {
          const fileName = currentPath.split('/').pop() || 'index.html';
          window.location.href = `/en/${fileName}`;
        }
      } else {
        if (currentPath.includes('/en/')) {
          const fileName = currentPath.split('/').pop() || 'index.html';
          window.location.href = `/${fileName}`;
        }
      }
    });
  });
}

/* ──────────────────────────────────────────────
   Contact Form (basic validation + submission stub)
   ────────────────────────────────────────────── */
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '傳送中…';
    }

    // TODO: 串接實際後端或表單服務 (Formspree / Netlify Forms)
    // 目前為模擬傳送
    await new Promise(resolve => setTimeout(resolve, 1500));

    const container = form.closest('.contact-form-box') || form.parentElement;
    const successMsg = container ? container.querySelector('.form-success') : null;
    if (successMsg) {
      form.style.display = 'none';
      successMsg.style.display = 'block';
      successMsg.focus();
    } else {
      alert('感謝您的來訊！我們將盡快與您聯絡。');
      form.reset();
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '送出諮詢';
    }
  });

  // Real-time validation feedback
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      if (!field.value.trim()) {
        field.classList.add('error');
      } else {
        field.classList.remove('error');
      }
    });
    field.addEventListener('input', () => {
      if (field.value.trim()) {
        field.classList.remove('error');
      }
    });
  });
}

/* ──────────────────────────────────────────────
   Counter Animation (trust bar numbers)
   ────────────────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1800;
      const startTime = performance.now();
      const isFloat = !Number.isInteger(target);

      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ──────────────────────────────────────────────
   Smooth Scroll for anchor links
   ────────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-height-desktop') || '80'
        );
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ──────────────────────────────────────────────
   Sticky Header offset for inner-page content
   ────────────────────────────────────────────── */
function applyNavOffset() {
  const main = document.querySelector('main');
  if (!main) return;
  const isHeroPage = document.querySelector('.hero');
  if (!isHeroPage) {
    main.style.paddingTop = 'var(--nav-height-desktop)';
  }
}

/* ──────────────────────────────────────────────
   Initialize All
   ────────────────────────────────────────────── */
async function init() {
  // Route to English partials for /en/ pages, Chinese partials for all others
  const path = window.location.pathname;
  if (path.includes('/en/')) {
    await Promise.all([
      loadPartial('#site-header-placeholder', '/en/assets/partials/header.html'),
      loadPartial('#site-footer-placeholder', '/en/assets/partials/footer.html'),
    ]);
  } else {
    const root = getRootPath();
    await Promise.all([
      loadPartial('#site-header-placeholder', `${root}assets/partials/header.html`, root),
      loadPartial('#site-footer-placeholder', `${root}assets/partials/footer.html`, root),
    ]);
  }

  // After partials load, init navigation
  initNavigation();   // gracefully no-ops when .site-header not found (v20 pages)
  initLangSwitch();   // gracefully no-ops when .lang-btn not found (v20 pages)
  initV20Header();    // v20 mobile menu + active nav

  // Page-level features
  initScrollAnimations();
  initAccordions();
  initContactForm();
  initCounters();
  initSmoothScroll();
  initAOS();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ──────────────────────────────────────────────
   v20 Header — mobile menu + active nav
   ────────────────────────────────────────────── */
function initV20Header() {
  // 漢堡選單切換
  var btn = document.getElementById('ys-menu-toggle');
  var nav = document.getElementById('ys-nav');
  if (btn && nav) {
    btn.addEventListener('click', function() {
      nav.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!btn.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  // 依照當前 URL 標記 active 頁面
  var pathname = window.location.pathname;
  var page = pathname.split('/').pop().replace('.html', '');
  if (!page || page === '') page = 'index';
  document.querySelectorAll('.ys-nav a[data-page]').forEach(function(a) {
    if (a.getAttribute('data-page') === page) {
      a.classList.add('active');
    }
  });

  // 內頁 Hero 綁定對應背景圖（about/services/insights/news/contact）
  var heroPages = ['about', 'services', 'insights', 'news', 'contact'];
  if (heroPages.indexOf(page) !== -1) {
    var pageHero = document.querySelector('.page-hero');
    if (pageHero) {
      pageHero.style.backgroundImage = "url('/assets/img/hero-" + page + ".jpg')";
    }
  }
}
