/* 永旭智慧財產事務所 — main.js */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 導覽列：漢堡選單 ── */
  const toggle = document.querySelector('.navbar-toggle');
  const nav    = document.querySelector('.navbar-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('open'))
    );
  }

  /* ── 導覽列：標示目前頁面 ── */
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop().split('#')[0];
    if (href === page) a.classList.add('active');
  });

  /* ── 滾動時 navbar 加深 ── */
  const navbar = document.getElementById('navbar') || document.querySelector('.navbar');
  if (navbar) {
    const setNavBg = () => {
      navbar.style.background = window.scrollY > 60
        ? 'rgba(8,18,40,1)'
        : 'rgba(13,32,64,.97)';
    };
    window.addEventListener('scroll', setNavBg, { passive: true });
  }

  /* ── 數字計數動畫 ── */
  if ('IntersectionObserver' in window) {
    const countObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let cur = 0;
        const step = Math.max(1, Math.floor(target / 55));
        const tick = () => {
          cur = Math.min(cur + step, target);
          el.textContent = cur + suffix;
          if (cur < target) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(c => countObs.observe(c));
  }

  /* ── Fade-up 進場動畫 ── */
  if ('IntersectionObserver' in window) {
    const fadeObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        fadeObs.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => fadeObs.observe(el));
  } else {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
  }

  /* ── FAQ 手風琴 ── */
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      // 關閉所有
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      // 切換目前
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── 聯絡表單靜態示範 ── */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> 詢問已送出，我們將盡快回覆';
      btn.disabled = true;
      btn.style.cssText += ';background:#2E7D32;border-color:#2E7D32;cursor:default';
    });
  }

  /* ── 平滑錨點捲動（修正 fixed navbar 偏移） ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const offset = 88;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

});
