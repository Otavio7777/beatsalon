'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Auth check: logado vai para o dashboard
    const sb = createClient()
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })


    // Mobile nav show
    const mobCta = document.getElementById('mob-cta');
    if (mobCta && window.innerWidth <= 768) mobCta.style.display = 'inline-flex';

    // Animated counters
    function animCount(el, end, prefix, suffix, dur) {
      if (!el) return;
      let v = 0; const step = end / (dur / 16);
      const t = setInterval(() => {
        v = Math.min(v + step, end);
        el.textContent = prefix + (Number.isInteger(end) ? Math.floor(v).toLocaleString('pt-BR') : v.toFixed(1)) + suffix;
        if (v >= end) clearInterval(t);
      }, 16);
    }
    setTimeout(() => animCount(document.getElementById('m1'), 2000, '', '+', 1800), 600);
    setTimeout(() => animCount(document.getElementById('m2'), 1940, 'R$ ', '', 1600), 800);
    setTimeout(() => animCount(document.getElementById('m3'), 99, '', '', 1400), 1000);

    // Scroll fade-up
    const fades = document.querySelectorAll('.fade-up');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    fades.forEach(el => io.observe(el));
    const heroMetrics = document.querySelector('.hero-metrics');
    if (heroMetrics) heroMetrics.classList.add('visible');

    // Interface tab toggle
    const tabs = document.querySelectorAll('.i-tab');
    const deskMock = document.getElementById('mockupDesktop');
    const mobMock = document.getElementById('mockupMobile');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'desktop') {
          if (deskMock) deskMock.style.display = 'block';
          if (mobMock) mobMock.style.display = 'none';
        } else {
          if (deskMock) deskMock.style.display = 'none';
          if (mobMock) mobMock.style.display = 'flex';
        }
      });
    });

    return () => io.disconnect();

  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0E1C35;
    --navy-mid: #152847;
    --navy-deep: #07111F;
    --brand: #263b7e;
    --gold: #4B7FFF;
    --gold-light: #7BA3FF;
    --gold-pale: #EEF2FF;
    --white: #FFFFFF;
    --off-white: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
    --gray-400: #9CA3AF;
    --gray-500: #6B7280;
    --gray-700: #374151;
    --green: #10B981;
    --red: #EF4444;
  }

  html { scroll-behavior: smooth; }
  body { font-family: "Inter", sans-serif; background: var(--white); color: var(--navy); overflow-x: hidden; line-height: 1.5; }

  /* ── UTILITIES ── */
  .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .section-eyebrow { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #7BA3FF; margin-bottom: 14px; }
  .section-h2 { font-size: clamp(30px, 4vw, 46px); font-weight: 900; letter-spacing: -1.5px; line-height: 1.1; color: var(--navy); }
  .section-h2.light { color: var(--white); }
  .section-p { font-size: 17px; color: var(--gray-500); line-height: 1.7; margin-top: 14px; }
  .section-p.light { color: rgba(255,255,255,.55); }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: #4B7FFF; color: var(--navy-deep); font-weight: 800; font-size: 15px;
    padding: 14px 28px; border-radius: 10px; border: none; cursor: pointer; text-decoration: none;
    transition: all .2s; box-shadow: 0 4px 18px rgba(75,127,255,.35);
  }
  .btn-primary:hover { background: var(--gold-light); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(75,127,255,.45); }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: rgba(255,255,255,.75); font-weight: 600; font-size: 15px;
    padding: 14px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,.2);
    cursor: pointer; text-decoration: none; transition: all .2s;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,.5); color: var(--white); }
  .btn-ghost-dark {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: var(--gray-700); font-weight: 600; font-size: 15px;
    padding: 14px 24px; border-radius: 10px; border: 1.5px solid var(--gray-200);
    cursor: pointer; text-decoration: none; transition: all .2s;
  }
  .btn-ghost-dark:hover { border-color: var(--navy); color: var(--navy); }

  .fade-up { opacity: 0; transform: translateY(22px); transition: opacity .65s ease, transform .65s ease; }
  .fade-up.visible { opacity: 1; transform: translateY(0); }

  /* ── NAV ── */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    height: 68px; display: flex; align-items: center;
    background: rgba(7,17,31,.92); backdrop-filter: blur(16px) saturate(1.5);
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .nav-inner {
    max-width: 1120px; margin: 0 auto; padding: 0 24px;
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 32px;
  }
  .nav-logo img { height: 38px; width: auto; filter: brightness(0) invert(1); display: block; }
  .nav-links { display: flex; gap: 28px; align-items: center; }
  .nav-links a { font-size: 14px; font-weight: 500; color: rgba(255,255,255,.6); text-decoration: none; transition: color .2s; }
  .nav-links a:hover { color: var(--white); }
  .nav-actions { display: flex; gap: 10px; align-items: center; }
  .btn-nav-ghost { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.65); text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: color .2s; }
  .btn-nav-ghost:hover { color: var(--white); }
  .btn-nav-cta {
    font-size: 14px; font-weight: 700; background: #4B7FFF; color: var(--white);
    padding: 9px 20px; border-radius: 8px; text-decoration: none; transition: all .15s;
  }
  .btn-nav-cta:hover { background: var(--gold-light); }

  /* ── HERO ── */
  .hero {
    background: var(--navy-deep);
    padding: 120px 24px 80px;
    position: relative; overflow: hidden;
    min-height: 100vh; display: flex; align-items: center;
  }
  .hero::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 60% 30%, rgba(38,59,180,.3) 0%, transparent 65%),
      radial-gradient(ellipse 50% 50% at 20% 80%, rgba(75,127,255,.06) 0%, transparent 60%);
  }
  .hero-grid {
    max-width: 1120px; margin: 0 auto; width: 100%;
    display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center;
    position: relative; z-index: 1;
  }
  .hero-tag {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(75,127,255,.1); border: 1px solid rgba(75,127,255,.25);
    border-radius: 100px; padding: 6px 14px; margin-bottom: 28px;
    font-size: 12px; font-weight: 700; color: #7BA3FF; letter-spacing: .07em; text-transform: uppercase;
  }
  .hero-tag::before { content: ""; display: none; }
  .hero h1 {
    font-size: clamp(38px, 5.5vw, 60px); font-weight: 900; line-height: 1.05;
    letter-spacing: -2px; color: var(--white); margin-bottom: 20px;
  }
  .hero h1 .hl { color: #7BA3FF; }
  .hero-sub {
    font-size: 17px; line-height: 1.7; color: rgba(255,255,255,.55); margin-bottom: 40px; max-width: 430px;
  }
  .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 40px; }
  .hero-micro { font-size: 12px; color: rgba(255,255,255,.3); display: flex; gap: 20px; flex-wrap: wrap; }
  .hero-micro span::before { content: "·"; margin-right: 6px; }
  .hero-micro span:first-child::before { content: ""; }

  /* Hero metrics */
  .hero-metrics {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.07);
    border-radius: 14px; overflow: hidden; margin-top: 48px;
  }
  .hm-cell {
    background: rgba(255,255,255,.03); padding: 18px 20px;
    transition: background .2s;
  }
  .hm-cell:hover { background: rgba(255,255,255,.06); }
  .hm-num { font-size: 30px; font-weight: 900; letter-spacing: -1px; color: var(--white); line-height: 1; }
  .hm-num .gold { color: #7BA3FF; }
  .hm-label { font-size: 11px; font-weight: 500; color: rgba(255,255,255,.35); margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }

  /* Hero visual - dashboard card */
  .hero-visual { display: flex; flex-direction: column; gap: 14px; }
  .dash-card {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
    border-radius: 18px; overflow: hidden; backdrop-filter: blur(6px);
  }
  .dash-card-header {
    padding: 16px 18px 12px; border-bottom: 1px solid rgba(255,255,255,.06);
    display: flex; align-items: center; justify-content: space-between;
  }
  .dch-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .07em; }
  .dch-live {
    display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #7BA3FF;
  }
  .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .dash-card-body { padding: 16px 18px; }

  /* Client list */
  .client-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
  .client-row:last-child { border-bottom: none; }
  .cl-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--white); flex-shrink: 0; }
  .cl-info { flex: 1; }
  .cl-name { font-size: 13px; font-weight: 700; color: var(--white); }
  .cl-meta { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 1px; }
  .cl-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
  .badge-risk { background: rgba(239,68,68,.15); color: #F87171; }
  .badge-ok { background: rgba(16,185,129,.12); color: #34D399; }
  .badge-warn { background: rgba(251,191,36,.12); color: #FCD34D; }

  /* Financeiro mini card */
  .fin-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
  .fin-row:last-child { border-bottom: none; }
  .fin-label { font-size: 12px; color: rgba(255,255,255,.4); }
  .fin-val { font-size: 14px; font-weight: 800; color: var(--white); }
  .fin-delta { font-size: 11px; font-weight: 700; }
  .up { color: var(--green); }
  .bar-wrap { height: 4px; background: rgba(255,255,255,.07); border-radius: 2px; margin-top: 6px; }
  .bar-fill { height: 4px; border-radius: 2px; background: linear-gradient(to right, #4B7FFF, #7BA3FF); }

  /* ── SOCIAL PROOF BAR ── */
  .proof-bar {
    background: #EEF2FF; border-top: 1px solid #C7D4FF; border-bottom: 1px solid #C7D4FF;
    padding: 20px 24px;
  }
  .proof-bar-inner {
    max-width: 1120px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
  }
  .proof-label { font-size: 13px; color: var(--gray-400); white-space: nowrap; }
  .proof-logos { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
  .proof-logo-item { font-size: 14px; font-weight: 700; color: var(--gray-400); letter-spacing: -.3px; }

  /* ── COMPARISON ── */
  .compare-section { background: var(--white); padding: 104px 24px; }
  .compare-header { margin-bottom: 64px; }
  .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 840px; }
  .compare-card {
    border-radius: 20px; padding: 36px 32px; border: 1.5px solid var(--gray-200);
  }
  .compare-card.is-them { background: var(--gray-100); }
  .compare-card.is-us {
    background: var(--navy); border-color: transparent;
    box-shadow: 0 20px 60px rgba(14,28,53,.2);
  }
  .compare-card-label {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
    margin-bottom: 24px; display: flex; align-items: center; gap: 8px;
  }
  .is-them .compare-card-label { color: var(--gray-400); }
  .is-us .compare-card-label { color: #7BA3FF; }
  .compare-card h3 { font-size: 22px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 24px; }
  .is-them h3 { color: var(--gray-500); }
  .is-us h3 { color: var(--white); }
  .compare-list { list-style: none; display: flex; flex-direction: column; gap: 14px; }
  .compare-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 15px; line-height: 1.45; }
  .is-them .compare-list li { color: var(--gray-500); }
  .is-us .compare-list li { color: rgba(255,255,255,.75); }
  .ci { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
  .ci-x { background: rgba(239,68,68,.12); color: var(--red); }
  .ci-check { background: rgba(75,127,255,.2); color: #7BA3FF; }

  /* ── FEATURES / CLIENTE 360 ── */
  .features-section { background: var(--navy-deep); padding: 104px 24px; }
  .features-header { text-align: center; max-width: 640px; margin: 0 auto 72px; }
  .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: rgba(255,255,255,.05); border-radius: 20px; overflow: hidden; }
  .feat-cell {
    background: rgba(255,255,255,.02); padding: 36px 30px;
    transition: background .2s;
  }
  .feat-cell:hover { background: rgba(255,255,255,.05); }
  .feat-icon svg { color: #7BA3FF; }
  .feat-icon { font-size: 28px; margin-bottom: 16px; display: block; color: #7BA3FF; }
  .feat-cell h3 { font-size: 17px; font-weight: 800; color: var(--white); margin-bottom: 10px; letter-spacing: -.3px; }
  .feat-cell p { font-size: 14px; color: rgba(255,255,255,.45); line-height: 1.65; }

  /* ── INTERFACE SECTION ── */
  .interface-section { background: var(--off-white); padding: 104px 24px; }
  .interface-header { margin-bottom: 64px; }
  .interface-tabs { display: flex; gap: 4px; background: var(--gray-200); border-radius: 10px; padding: 4px; width: fit-content; margin-bottom: 40px; }
  .i-tab {
    padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
    transition: all .2s; color: var(--gray-500); user-select: none;
  }
  .i-tab.active { background: var(--white); color: var(--navy); box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  .interface-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .interface-features { display: flex; flex-direction: column; gap: 28px; }
  .if-item { display: flex; gap: 16px; align-items: flex-start; }
  .if-dot { width: 40px; height: 40px; border-radius: 12px; background: var(--navy); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: #7BA3FF; }
  .if-text h4 { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
  .if-text p { font-size: 14px; color: var(--gray-500); line-height: 1.6; }
  .interface-mockup {
    background: var(--navy); border-radius: 20px; overflow: hidden;
    box-shadow: 0 30px 80px rgba(14,28,53,.2); position: relative;
  }
  .im-bar {
    background: rgba(255,255,255,.05); padding: 12px 18px;
    display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,.07);
  }
  .im-dot { width: 10px; height: 10px; border-radius: 50%; }
  .im-body { padding: 20px 18px; }

  /* Desktop mockup content */
  .dm-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .dm-title { font-size: 14px; font-weight: 800; color: var(--white); }
  .dm-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .dm-stat { background: rgba(255,255,255,.06); border-radius: 10px; padding: 12px; }
  .dm-stat-num { font-size: 20px; font-weight: 900; color: var(--white); letter-spacing: -.5px; }
  .dm-stat-lbl { font-size: 10px; color: rgba(255,255,255,.35); margin-top: 2px; }
  .dm-stat-delta { font-size: 10px; color: var(--green); font-weight: 700; }
  .dm-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.07); margin-bottom: 6px; }
  .dm-th { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.25); text-transform: uppercase; }
  .dm-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.04); align-items: center; }
  .dm-td { font-size: 12px; color: rgba(255,255,255,.65); }
  .dm-td.name { font-weight: 700; color: var(--white); }

  /* Mobile mockup */
  .mob-frame {
    width: 220px; margin: 0 auto;
    background: #111827; border-radius: 36px; border: 2px solid rgba(255,255,255,.1);
    overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.5);
  }
  .mob-notch { height: 24px; background: #111827; display: flex; align-items: center; justify-content: center; }
  .mob-pill { width: 56px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); }
  .mob-body { background: #0F172A; padding: 14px; }
  .mob-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .mob-hdr-title { font-size: 15px; font-weight: 900; color: var(--white); }
  .mob-hdr-badge { font-size: 9px; font-weight: 700; background: rgba(75,127,255,.2); color: #7BA3FF; padding: 3px 7px; border-radius: 5px; }
  .mob-kpi-row { display: flex; gap: 6px; margin-bottom: 10px; }
  .mob-kpi { flex: 1; background: rgba(255,255,255,.06); border-radius: 8px; padding: 9px; }
  .mob-kpi-num { font-size: 15px; font-weight: 900; color: var(--white); }
  .mob-kpi-lbl { font-size: 9px; color: rgba(255,255,255,.3); margin-top: 1px; }
  .mob-section { font-size: 9px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,.3); letter-spacing: .06em; margin-bottom: 7px; }
  .mob-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
  .mob-row:last-child { border-bottom: none; }
  .mob-av { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: var(--white); }
  .mob-name { font-size: 11px; font-weight: 700; color: var(--white); }
  .mob-sub { font-size: 9px; color: rgba(255,255,255,.3); }
  .mob-tag { font-size: 9px; font-weight: 700; border-radius: 4px; padding: 2px 5px; }

  /* ── PRICING ── */
  .pricing-section { background: var(--white); padding: 104px 24px; }
  .pricing-header { text-align: center; margin-bottom: 64px; }
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1000px; margin: 0 auto; }
  .price-card {
    border: 1.5px solid var(--gray-200); border-radius: 22px; padding: 40px 32px;
    position: relative; transition: box-shadow .2s, transform .2s;
  }
  .price-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(14,28,53,.09); }
  .price-card.featured { background: var(--navy); border-color: transparent; box-shadow: 0 24px 64px rgba(14,28,53,.22); }
  .price-card.featured:hover { transform: translateY(-6px); }
  .price-pill {
    position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: #4B7FFF; color: var(--white); font-size: 11px; font-weight: 800;
    padding: 4px 16px; border-radius: 100px; white-space: nowrap; text-transform: uppercase; letter-spacing: .06em;
  }
  .price-plan { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--gray-400); margin-bottom: 8px; }
  .price-plan.f { color: rgba(255,255,255,.4); }
  .price-amount { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
  .price-currency { font-size: 20px; font-weight: 700; color: var(--navy); margin-top: 4px; }
  .price-currency.f { color: rgba(255,255,255,.7); }
  .price-num { font-size: 52px; font-weight: 900; letter-spacing: -2px; color: var(--navy); line-height: 1; }
  .price-num.f { color: var(--white); }
  .price-period { font-size: 13px; color: var(--gray-400); margin-bottom: 32px; }
  .price-period.f { color: rgba(255,255,255,.35); }
  .price-list { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
  .price-list li { font-size: 14px; color: var(--gray-700); display: flex; align-items: flex-start; gap: 10px; line-height: 1.4; }
  .price-list li.f { color: rgba(255,255,255,.72); }
  .price-list li::before { content: "✓"; color: #4B7FFF; font-weight: 900; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
  .btn-price {
    width: 100%; padding: 13px; border-radius: 10px; font-size: 15px; font-weight: 800;
    cursor: pointer; border: none; display: block; text-align: center; text-decoration: none; transition: all .2s;
  }
  .btn-price-default { background: var(--gray-100); color: var(--navy); }
  .btn-price-default:hover { background: var(--gray-200); }
  .btn-price-featured { background: #4B7FFF; color: var(--white); }
  .btn-price-featured:hover { background: var(--gold-light); }

  /* ── TESTIMONIALS ── */
  .testi-section { background: var(--navy-deep); padding: 104px 24px; }
  .testi-header { text-align: center; margin-bottom: 56px; }
  .testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .testi-card {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px; padding: 32px; transition: border-color .2s;
  }
  .testi-card:hover { border-color: rgba(75,127,255,.3); }
  .testi-stars { color: #4B7FFF; font-size: 14px; letter-spacing: 3px; margin-bottom: 16px; }
  .testi-text { font-size: 15px; color: rgba(255,255,255,.65); line-height: 1.7; margin-bottom: 24px; font-style: italic; }
  .testi-author-name { font-size: 14px; font-weight: 700; color: var(--white); }
  .testi-author-role { font-size: 12px; color: rgba(255,255,255,.35); margin-top: 2px; }

  /* ── STATS BAND ── */
  .stats-band { background: #1a2f6e; padding: 56px 24px; }
  .stats-grid { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
  .stat-item { text-align: center; }
  .stat-num { font-size: 40px; font-weight: 900; letter-spacing: -1.5px; color: var(--white); line-height: 1; }
  .stat-lbl { font-size: 14px; color: rgba(255,255,255,.55); font-weight: 600; margin-top: 6px; }

  /* ── CTA FINAL ── */
  .cta-section {
    background: var(--navy); padding: 120px 24px; text-align: center;
    position: relative; overflow: hidden;
  }
  .cta-section::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 80% at 50% 100%, rgba(75,127,255,.08) 0%, transparent 70%);
  }
  .cta-section h2 {
    font-size: clamp(34px, 5vw, 56px); font-weight: 900; letter-spacing: -2px;
    color: var(--white); margin-bottom: 16px; line-height: 1.1; position: relative; z-index: 1;
  }
  .cta-section h2 em { color: #7BA3FF; font-style: normal; }
  .cta-section p { font-size: 17px; color: rgba(255,255,255,.5); max-width: 460px; margin: 0 auto 40px; line-height: 1.65; position: relative; z-index: 1; }
  .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
  .cta-note { font-size: 12px; color: rgba(255,255,255,.25); margin-top: 20px; position: relative; z-index: 1; }

  /* ── FOOTER ── */
  footer {
    background: var(--navy-deep); border-top: 1px solid rgba(255,255,255,.06);
    padding: 56px 24px 32px;
  }
  .footer-top {
    max-width: 1120px; margin: 0 auto;
    display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 48px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .footer-brand img { height: 36px; filter: brightness(0) invert(1); display: block; margin-bottom: 12px; }
  .footer-brand p { font-size: 13px; color: rgba(255,255,255,.35); line-height: 1.6; max-width: 220px; }
  .footer-col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.4); margin-bottom: 16px; }
  .footer-links-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .footer-links-list a { font-size: 13px; color: rgba(255,255,255,.45); text-decoration: none; transition: color .2s; }
  .footer-links-list a:hover { color: rgba(255,255,255,.8); }
  .footer-bottom { max-width: 1120px; margin: 24px auto 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .footer-copy { font-size: 12px; color: rgba(255,255,255,.2); }
  .footer-legal { display: flex; gap: 20px; }
  .footer-legal a { font-size: 12px; color: rgba(255,255,255,.25); text-decoration: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr; }
    .hero-visual { display: none; }
    .compare-grid { grid-template-columns: 1fr; max-width: 480px; }
    .feat-grid { grid-template-columns: repeat(2, 1fr); }
    .interface-grid { grid-template-columns: 1fr; gap: 40px; }
    .pricing-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
    .testi-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .footer-top { grid-template-columns: 1fr 1fr; }
    .nav-links { display: none; }
  }
  @media (max-width: 560px) {
    .feat-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .footer-top { grid-template-columns: 1fr; }
    .hero-metrics { grid-template-columns: 1fr; }
  }` }} />
      <div dangerouslySetInnerHTML={{ __html: `<!-- ── NAV ── -->
<nav>
  <div class="nav-inner">
    <a href="#" class="nav-logo">
      <img src="/logo.svg" alt="Meu Salão"/>
    </a>
    <div class="nav-links">
      <a href="#solucoes">Soluções</a>
      <a href="#clientes">Cliente 360</a>
      <a href="#interface">Interface</a>
      <a href="#precos">Preços</a>
    </div>
    <div class="nav-actions">
      <a href="/login" class="btn-nav-ghost">Entrar</a>
      <a href="#cta" class="btn-nav-cta" id="mob-cta" style="display:none">Teste grátis</a>
    </div>
  </div>
</nav>

<!-- ── HERO ── -->
<section class="hero">
  <div class="hero-grid">
    <div>
      <div class="hero-tag">A 1ª plataforma de gestão para barbearias</div>
      <h1>
        Muito mais<br>
        do que uma<br>
        <span class="hl">agenda.</span>
      </h1>
      <p class="hero-sub">
        Nós conectamos agenda, ficha de cliente, financeiro e retenção — em tempo real, em um só lugar. Clientes que voltam. Receita que cresce.
      </p>
      <div class="hero-ctas">
        <a href="#cta" class="btn-primary">Teste grátis por 14 dias →</a>
        <a href="#solucoes" class="btn-ghost">Ver demonstração</a>
      </div>
      <div class="hero-micro">
        <span>Sem cartão de crédito</span>
        <span>Migração gratuita</span>
        <span>Suporte humano</span>
      </div>
      <div class="hero-metrics fade-up">
        <div class="hm-cell">
          <div class="hm-num"><span id="m1" class="gold">0</span></div>
          <div class="hm-label">Barbearias ativas</div>
        </div>
        <div class="hm-cell">
          <div class="hm-num"><span id="m2">R$ 0</span></div>
          <div class="hm-label">Receita média por cliente</div>
        </div>
        <div class="hm-cell">
          <div class="hm-num"><span id="m3">0</span><span class="gold">%</span></div>
          <div class="hm-label">Satisfação</div>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dch-title">Cliente 360</span>
          <div class="dch-live"><span class="live-dot"></span>Ao vivo</div>
        </div>
        <div class="dash-card-body">
          <div class="client-row">
            <div class="cl-avatar" style="background:#1e3a7a">RC</div>
            <div class="cl-info">
              <div class="cl-name">Rafael Costa</div>
              <div class="cl-meta">receita por cliente R$ 1.840 · 22 visitas</div>
            </div>
            <div class="cl-badge badge-ok">Fiel</div>
          </div>
          <div class="client-row">
            <div class="cl-avatar" style="background:#7c2d12">AM</div>
            <div class="cl-info">
              <div class="cl-name">André Martins</div>
              <div class="cl-meta">Última visita: 31 dias atrás</div>
            </div>
            <div class="cl-badge badge-risk">Em risco</div>
          </div>
          <div class="client-row">
            <div class="cl-avatar" style="background:#064e3b">FS</div>
            <div class="cl-info">
              <div class="cl-name">Felipe Santos</div>
              <div class="cl-meta">Agendado · amanhã 10h30</div>
            </div>
            <div class="cl-badge badge-warn">Chamar</div>
          </div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dch-title">Financeiro</span>
          <span style="font-size:11px;color:rgba(255,255,255,.3)">Junho 2025</span>
        </div>
        <div class="dash-card-body">
          <div class="fin-row">
            <span class="fin-label">Faturamento mensal</span>
            <div style="text-align:right">
              <div class="fin-val">R$ 38.400</div>
              <div class="fin-delta up">↑ 18% mês ant.</div>
            </div>
          </div>
          <div class="fin-row">
            <span class="fin-label">Ticket médio</span>
            <div class="fin-val">R$ 184</div>
          </div>
          <div class="fin-row">
            <span class="fin-label">Comissões</span>
            <div class="fin-val">R$ 8.900</div>
          </div>
          <div class="bar-wrap" style="margin-top:12px">
            <div class="bar-fill" style="width:78%"></div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:4px">78% da meta mensal atingida</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── SOCIAL PROOF BAR ── -->
<div class="proof-bar">
  <div class="proof-bar-inner">
    <span class="proof-label">Usado por mais de 2.000 barbearias em todo o Brasil</span>
    <div class="proof-logos">
      <span class="proof-logo-item">Studio Aura</span>
      <span class="proof-logo-item">Barber Co.</span>
      <span class="proof-logo-item">Bem Estar+</span>
      <span class="proof-logo-item">Glow Beauty</span>
      <span class="proof-logo-item">Atelier Hair</span>
      <span class="proof-logo-item">Zen Spa</span>
    </div>
  </div>
</div>

<!-- ── COMPARISON ── -->
<section class="compare-section" id="solucoes">
  <div class="container">
    <div class="compare-header fade-up">
      <span class="section-eyebrow">Mais do que uma agenda</span>
      <h2 class="section-h2">Agenda é o mínimo.<br>Gestão de clientes é o<br>que muda o jogo.</h2>
      <p class="section-p" style="max-width:520px">Uma agenda guarda horários. Nós guardamos o seu negócio — cada cliente, cada retorno, cada real que entra e sai da barbearia.</p>
    </div>
    <div class="compare-grid fade-up">
      <div class="compare-card is-them">
        <div class="compare-card-label">✕ Agenda comum</div>
        <h3>Só guarda horário</h3>
        <ul class="compare-list">
          <li><span class="ci ci-x">✕</span>Apenas horários marcados</li>
          <li><span class="ci ci-x">✕</span>Cliente é um nome na lista</li>
          <li><span class="ci ci-x">✕</span>Você descobre o churn tarde demais</li>
          <li><span class="ci ci-x">✕</span>Financeiro em outra planilha</li>
          <li><span class="ci ci-x">✕</span>Sem rastreio de receita por cliente ou faturamento recorrente</li>
          <li><span class="ci ci-x">✕</span>Nenhum alerta de inatividade</li>
        </ul>
      </div>
      <div class="compare-card is-us">
        <div class="compare-card-label">Meu Salão</div>
        <h3 style="color:var(--white)">Gestão completa</h3>
        <ul class="compare-list">
          <li><span class="ci ci-check">✓</span>Agenda + ficha técnica + financeiro</li>
          <li><span class="ci ci-check">✓</span>Cliente 360 com histórico e preferências</li>
          <li><span class="ci ci-check">✓</span>Receita mensal, valor por cliente e alertas de inatividade</li>
          <li><span class="ci ci-check">✓</span>Tudo conectado, em tempo real</li>
          <li><span class="ci ci-check">✓</span>Reativação automática via WhatsApp</li>
          <li><span class="ci ci-check">✓</span>Relatórios de retenção e lucratividade</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ── CLIENTE 360 / FEATURES ── -->
<section class="features-section" id="clientes">
  <div class="container">
    <div class="features-header fade-up">
      <span class="section-eyebrow">A 1ª gestão de clientes para barbearia</span>
      <h2 class="section-h2 light">Não somos só uma agenda.<br>Mapeamos cada cliente.</h2>
      <p class="section-p light">Frequência, ticket, receita por cliente — para você decidir onde investir e quem reativar.</p>
    </div>
    <div class="feat-grid fade-up">
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>
        <h3>Ficha técnica do cliente</h3>
        <p>Nós salvamos histórico de cortes, preferências e alergias no perfil de cada cliente — acessível em segundos.</p>
      </div>
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>
        <h3>Quanto cada cliente vale para você</h3>
        <p>Nós acompanhamos receita, frequência de retorno e valor acumulado de cada cliente — automaticamente.</p>
      </div>
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
        <h3>Reativação automática</h3>
        <p>Nós enviamos a mensagem certa, na hora certa do próximo corte — você não precisa lembrar de ninguém.</p>
      </div>
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
        <h3>Financeiro completo</h3>
        <p>Nós centralizamos fluxo de caixa, comissões e fechamento por barbeiro num único painel.</p>
      </div>
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
        <h3>Agendamento online</h3>
        <p>Nós geramos seu link de agendamento para Instagram e WhatsApp, com confirmação automática.</p>
      </div>
      <div class="feat-cell">
        <span class="feat-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
        <h3>Indicadores de barbearia</h3>
        <p>Nós mostramos qual cadeira mais lucra, quem está sumindo e a taxa de retorno — por barbeiro.</p>
      </div>
    </div>
  </div>
</section>

<!-- ── UMA INTERFACE PARA CADA MOMENTO ── -->
<section class="interface-section" id="interface">
  <div class="container">
    <div class="interface-header fade-up">
      <span class="section-eyebrow">Mobile e Desktop</span>
      <h2 class="section-h2">Uma interface para cada<br>momento do seu dia.</h2>
      <p class="section-p">Gerencie tudo do computador da recepção e atenda no salão pelo celular. Os dados sincronizam em tempo real, sem perda de contexto.</p>
    </div>

    <div class="interface-tabs fade-up" id="tabBar">
      <div class="i-tab active" data-tab="desktop">Desktop</div>
      <div class="i-tab" data-tab="mobile">Mobile</div>
    </div>

    <div class="interface-grid fade-up">
      <div class="interface-features">
        <div class="if-item" id="tab-desktop">
          <div class="if-dot"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          <div class="if-text">
            <h4>Painel de gestão completo</h4>
            <p>Nós entregamos uma visão completa do negócio — agenda, relatórios, financeiro e clientes — em uma tela.</p>
          </div>
        </div>
        <div class="if-item">
          <div class="if-dot"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
          <div class="if-text">
            <h4>App mobile para o barbeiro</h4>
            <p>Nós otimizamos o mobile para o barbeiro que está no salão: próximo cliente, corte e registro em segundos.</p>
          </div>
        </div>
        <div class="if-item">
          <div class="if-dot"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <div class="if-text">
            <h4>Sincronização em tempo real</h4>
            <p>Nós sincronizamos tudo em tempo real — qualquer alteração aparece em todos os dispositivos, na hora.</p>
          </div>
        </div>
      </div>

      <!-- Desktop mockup (default) -->
      <div class="interface-mockup" id="mockupDesktop">
        <div class="im-bar">
          <div class="im-dot" style="background:#EF4444"></div>
          <div class="im-dot" style="background:#F59E0B"></div>
          <div class="im-dot" style="background:#10B981"></div>
          <span style="font-size:11px;color:rgba(255,255,255,.25);margin-left:10px">meu-salao.app/painel</span>
        </div>
        <div class="im-body">
          <div class="dm-row">
            <span class="dm-title">Painel · Segunda-feira</span>
            <span style="font-size:10px;color:rgba(255,255,255,.25)">4 agendamentos hoje</span>
          </div>
          <div class="dm-stat-row">
            <div class="dm-stat">
              <div class="dm-stat-num">R$ 42.5k</div>
              <div class="dm-stat-lbl">Faturamento</div>
              <div class="dm-stat-delta">↑ 18% vs mês ant.</div>
            </div>
            <div class="dm-stat">
              <div class="dm-stat-num">1.248</div>
              <div class="dm-stat-lbl">Clientes recorrentes</div>
              <div class="dm-stat-delta">↑ 12%</div>
            </div>
            <div class="dm-stat">
              <div class="dm-stat-num">R$ 1.940</div>
              <div class="dm-stat-lbl">Receita por cliente</div>
              <div class="dm-stat-delta">↑ 9%</div>
            </div>
          </div>
          <div class="dm-table-header">
            <div class="dm-th">Cliente</div>
            <div class="dm-th">Horário</div>
            <div class="dm-th">Serviço</div>
            <div class="dm-th">Status</div>
          </div>
          <div class="dm-table-row">
            <div class="dm-td name">João Costa</div>
            <div class="dm-td">09:00</div>
            <div class="dm-td">Degradê</div>
            <div class="dm-td" style="color:#10B981;font-weight:700">✓ Concluído</div>
          </div>
          <div class="dm-table-row" style="background:rgba(75,127,255,.05)">
            <div class="dm-td name">Pedro Rocha</div>
            <div class="dm-td">10:30</div>
            <div class="dm-td">Corte + Barba</div>
            <div class="dm-td" style="color:#7BA3FF;font-weight:700">↑ Agora</div>
          </div>
          <div class="dm-table-row">
            <div class="dm-td name">Felipe Dias</div>
            <div class="dm-td">13:00</div>
            <div class="dm-td">Barba completa</div>
            <div class="dm-td" style="color:rgba(255,255,255,.4)">Aguardando</div>
          </div>
          <div class="dm-table-row">
            <div class="dm-td name">André Lima</div>
            <div class="dm-td">14:30</div>
            <div class="dm-td">Corte social</div>
            <div class="dm-td" style="color:rgba(255,255,255,.4)">Aguardando</div>
          </div>
        </div>
      </div>

      <!-- Mobile mockup (hidden by default) -->
      <div style="display:none;justify-content:center;align-items:center" id="mockupMobile">
        <div class="mob-frame">
          <div class="mob-notch"><div class="mob-pill"></div></div>
          <div class="mob-body">
            <div class="mob-hdr">
              <div class="mob-hdr-title">Meu Salão</div>
              <div class="mob-hdr-badge">Ao vivo</div>
            </div>
            <div class="mob-kpi-row">
              <div class="mob-kpi">
                <div class="mob-kpi-num" style="color:#7BA3FF">R$ 380</div>
                <div class="mob-kpi-lbl">Hoje</div>
              </div>
              <div class="mob-kpi">
                <div class="mob-kpi-num">4</div>
                <div class="mob-kpi-lbl">Agendados</div>
              </div>
              <div class="mob-kpi">
                <div class="mob-kpi-num" style="color:#10B981">78%</div>
                <div class="mob-kpi-lbl">Retorno</div>
              </div>
            </div>
            <div class="mob-section">Hoje · 22 Jun</div>
            <div class="mob-row">
              <div class="mob-av" style="background:#1e3a7a">JC</div>
              <div style="flex:1">
                <div class="mob-name">João Costa</div>
                <div class="mob-sub">09:00 · Degradê</div>
              </div>
              <div class="mob-tag" style="background:rgba(16,185,129,.15);color:#34D399">✓</div>
            </div>
            <div class="mob-row" style="background:rgba(75,127,255,.05);border-radius:8px;padding:8px">
              <div class="mob-av" style="background:#7c2d12">PR</div>
              <div style="flex:1">
                <div class="mob-name">Pedro Rocha</div>
                <div class="mob-sub">10:30 · Corte + Barba</div>
              </div>
              <div class="mob-tag" style="background:rgba(75,127,255,.2);color:#7BA3FF">↑</div>
            </div>
            <div class="mob-row">
              <div class="mob-av" style="background:#064e3b">FD</div>
              <div style="flex:1">
                <div class="mob-name">Felipe Dias</div>
                <div class="mob-sub">13:00 · Barba completa</div>
              </div>
              <div class="mob-tag" style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.4)">·</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── STATS BAND ── -->
<div class="stats-band">
  <div class="stats-grid">
    <div class="stat-item fade-up">
      <div class="stat-num">+45%</div>
      <div class="stat-lbl">Faturamento médio</div>
    </div>
    <div class="stat-item fade-up" style="transition-delay:.1s">
      <div class="stat-num">-15h</div>
      <div class="stat-lbl">Admin por semana</div>
    </div>
    <div class="stat-item fade-up" style="transition-delay:.2s">
      <div class="stat-num">2.000+</div>
      <div class="stat-lbl">Barbearias ativas</div>
    </div>
    <div class="stat-item fade-up" style="transition-delay:.3s">
      <div class="stat-num">99%</div>
      <div class="stat-lbl">Satisfação de clientes</div>
    </div>
  </div>
</div>

<!-- ── PRICING ── -->
<section class="pricing-section" id="precos">
  <div class="container">
    <div class="pricing-header fade-up">
      <span class="section-eyebrow">Preços simples</span>
      <h2 class="section-h2">Escolha o plano ideal<br>para a sua barbearia.</h2>
      <p class="section-p">Sem fidelidade. Cancele quando quiser. Comece grátis por 14 dias.</p>
    </div>
    <div class="pricing-grid">
      <div class="price-card fade-up">
        <div class="price-plan">Essencial</div>
        <div class="price-amount">
          <span class="price-currency">R$</span>
          <span class="price-num">79</span>
        </div>
        <div class="price-period">/mês · para autônomos</div>
        <ul class="price-list">
          <li>1 profissional</li>
          <li>Agendamento online</li>
          <li>Cliente 360 básico</li>
          <li>Controle financeiro</li>
          <li>Suporte por e-mail</li>
        </ul>
        <a href="#cta" class="btn-price btn-price-default">Começar grátis</a>
      </div>

      <div class="price-card featured fade-up" style="transition-delay:.1s">
        <div class="price-pill">Mais popular</div>
        <div class="price-plan f">Profissional</div>
        <div class="price-amount">
          <span class="price-currency f">R$</span>
          <span class="price-num f">149</span>
        </div>
        <div class="price-period f">/mês · até 5 profissionais</div>
        <ul class="price-list">
          <li class="f">Tudo do Essencial</li>
          <li class="f">Cliente 360 completo</li>
          <li class="f">WhatsApp integrado</li>
          <li class="f">Relatórios de lucratividade</li>
          <li class="f">Receita e retenção em tempo real</li>
          <li class="f">Migração gratuita</li>
        </ul>
        <a href="#cta" class="btn-price btn-price-featured">Teste grátis 14 dias →</a>
      </div>

      <div class="price-card fade-up" style="transition-delay:.2s">
        <div class="price-plan">Premium</div>
        <div class="price-amount">
          <span class="price-currency">R$</span>
          <span class="price-num">289</span>
        </div>
        <div class="price-period">/mês · multi-unidade</div>
        <ul class="price-list">
          <li>Profissionais ilimitados</li>
          <li>Multi-unidade</li>
          <li>BI avançado</li>
          <li>Gerente de sucesso</li>
          <li>API e integrações</li>
        </ul>
        <a href="#cta" class="btn-price btn-price-default">Falar com vendas</a>
      </div>
    </div>
  </div>
</section>

<!-- ── TESTIMONIALS ── -->
<section class="testi-section">
  <div class="container">
    <div class="testi-header fade-up">
      <span class="section-eyebrow">Quem usa, recomenda</span>
      <h2 class="section-h2 light">Profissionais que transformaram<br>a gestão.</h2>
    </div>
    <div class="testi-grid">
      <div class="testi-card fade-up">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-text">"Em 3 meses recuperamos 38% dos clientes inativos com as automações de retorno. O Meu Salão mudou completamente a barbearia."</p>
        <div class="testi-author-name">Camila Andrade</div>
        <div class="testi-author-role">Sócia, Studio Aura · São Paulo, SP</div>
      </div>
      <div class="testi-card fade-up" style="transition-delay:.1s">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-text">"Os relatórios mostram exatamente quais serviços dão lucro. Pela primeira vez sei onde investir na barbearia."</p>
        <div class="testi-author-name">Rafael Souza</div>
        <div class="testi-author-role">Dono, Barber Co. · Rio de Janeiro, RJ</div>
      </div>
      <div class="testi-card fade-up" style="transition-delay:.2s">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-text">"Minha recepção economiza 12 horas por semana. O agendamento online sozinho já paga o sistema — e ainda fidelizo mais."</p>
        <div class="testi-author-name">Juliana Martins</div>
        <div class="testi-author-role">Gerente, Bem Estar+ · Belo Horizonte, MG</div>
      </div>
    </div>
  </div>
</section>

<!-- ── CTA FINAL ── -->
<section class="cta-section" id="cta">
  <h2>
    Pronto para transformar<br>
    <em>sua barbearia?</em>
  </h2>
  <p>Nós já ajudamos mais de 2.000 barbearias a profissionalizar a gestão e aumentar a retenção de clientes.</p>
  <div class="cta-row">
    <a href="#" class="btn-primary" style="font-size:16px;padding:16px 36px">Começar teste gratuito →</a>
    <a href="#" class="btn-ghost" style="font-size:16px;padding:16px 28px">Agendar demonstração</a>
  </div>
  <p class="cta-note">Sem cartão de crédito · Migração gratuita · Cancele quando quiser</p>
</section>

<!-- ── FOOTER ── -->
<footer>
  <div class="footer-top">
    <div class="footer-brand">
      <img src="/logo.svg" alt="Meu Salão"/>
      <p>O sistema de gestão definitivo para o mercado de beleza e bem-estar brasileiro.</p>
    </div>
    <div>
      <div class="footer-col-title">Produto</div>
      <ul class="footer-links-list">
        <li><a href="#">Funcionalidades</a></li>
        <li><a href="#">Cliente 360</a></li>
        <li><a href="#">Agendamento</a></li>
        <li><a href="#">Preços</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title">Empresa</div>
      <ul class="footer-links-list">
        <li><a href="#">Sobre</a></li>
        <li><a href="#">Blog</a></li>
        <li><a href="#">Carreiras</a></li>
        <li><a href="#">Contato</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title">Suporte</div>
      <ul class="footer-links-list">
        <li><a href="#">Central de ajuda</a></li>
        <li><a href="#">API</a></li>
        <li><a href="#">Status</a></li>
        <li><a href="#">LGPD</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span class="footer-copy">© 2025 Meu Salão Tecnologia LTDA. Todos os direitos reservados.</span>
    <div class="footer-legal">
      <a href="#">Termos de uso</a>
      <a href="#">Privacidade</a>
    </div>
  </div>
</footer>` }} />
    </>
  )
}
