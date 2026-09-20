const state = {
  registry: null,
  sources: [],
  query: '',
  level: 'all',
  auth: 'all',
  category: 'Semua',
  explorerSelected: new Set(),
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = new Intl.NumberFormat('id-ID');

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusLabel(v) {
  return ({
    up: 'Aktif', blocked: 'Terbatas', auth_required: 'Perlu autentikasi',
    down: 'Tidak aktif', dns_dead: 'DNS mati', unknown: 'Belum dicek'
  })[v] || v || 'Belum dicek';
}

function authLabel(v) {
  return ({
    none: 'Tanpa auth', 'api-key': 'API key', 'oauth2-client-credentials': 'OAuth 2.0',
    restricted: 'Restricted', mixed: 'Campuran'
  })[v] || v || '—';
}

function browserLabel(v) {
  return ({
    direct: 'Direct', blocked: 'Diblok', 'key-required': 'Perlu key',
    'may-block': 'CORS/WAF mungkin', 'server-only': 'Server-side'
  })[v] || v || '—';
}

function levelLabel(v) { return v === 'daerah' ? 'Daerah' : 'Pusat'; }
function statusClass(v) { return `status-${v || 'unknown'}`; }

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Disalin ke clipboard');
}

function navigate(route) {
  const valid = ['dashboard', 'catalog', 'explorer', 'status'];
  if (!valid.includes(route)) route = 'dashboard';
  if (location.hash !== `#${route}`) location.hash = route;
  else applyRoute();
}

function applyRoute() {
  const route = location.hash.replace('#', '') || 'dashboard';
  const safeRoute = ['dashboard', 'catalog', 'explorer', 'status'].includes(route) ? route : 'dashboard';
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === safeRoute));
  $$('[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === safeRoute));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initTheme() {
  const saved = localStorage.getItem('nusaapi-theme');
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = saved || (dark ? 'dark' : 'light');
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('nusaapi-theme', next);
}

async function loadRegistry() {
  const res = await fetch('./data/apis.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  state.registry = await res.json();
  state.sources = state.registry.sources || [];
  state.sources.filter(s => s.kind === 'ckan').slice(0, 4).forEach(s => state.explorerSelected.add(s.id));
}

function renderStats() {
  const s = state.sources;
  const stats = [
    ['Sumber API', s.length, 'Registry awal terkurasi', '◎'],
    ['Pemerintah pusat', s.filter(x => x.level === 'pusat').length, 'Kementerian & lembaga', '◆'],
    ['Pemerintah daerah', s.filter(x => x.level === 'daerah').length, 'Provinsi & kota', '◇'],
    ['Tanpa autentikasi', s.filter(x => x.auth === 'none').length, 'Lebih mudah diuji', '↗'],
  ];
  $('#statsGrid').innerHTML = stats.map(([label, value, sub, icon]) => `
    <article class="stat-card panel">
      <div class="stat-top"><span>${esc(label)}</span><span class="stat-icon">${icon}</span></div>
      <div class="stat-value">${fmt.format(value)}</div><div class="stat-sub">${esc(sub)}</div>
    </article>`).join('');
}

function renderFeatured() {
  const ids = ['bmkg-weather', 'bps-webapi', 'satusehat-fhir', 'jakarta-ckan'];
  const items = ids.map(id => state.sources.find(s => s.id === id)).filter(Boolean);
  $('#featuredGrid').innerHTML = items.map(s => `
    <button class="featured-card" data-open="${esc(s.id)}">
      <div class="row"><span class="source-avatar">${esc((s.agency || s.name).slice(0,2).toUpperCase())}</span><i class="status-dot ${statusClass(s.portalStatus)}"></i></div>
      <strong>${esc(s.name)}</strong><small>${esc(s.agency)}</small>
    </button>`).join('');
  bindOpenButtons($('#featuredGrid'));
}

function renderAccessBreakdown() {
  const total = Math.max(1, state.sources.length);
  const groups = [
    ['Direct browser', state.sources.filter(s => s.browserAccess === 'direct').length],
    ['Key / OAuth', state.sources.filter(s => ['api-key','oauth2-client-credentials'].includes(s.auth)).length],
    ['CORS / WAF', state.sources.filter(s => ['blocked','may-block'].includes(s.browserAccess)).length],
    ['Server-side', state.sources.filter(s => s.browserAccess === 'server-only').length],
  ];
  $('#accessBreakdown').innerHTML = groups.map(([name, count]) => `
    <div class="access-line"><span>${esc(name)}</span><div class="bar"><i style="width:${Math.max(4, Math.round(count/total*100))}%"></i></div><strong>${count}</strong></div>`).join('');
}

function renderCategories() {
  const categories = ['Semua', ...new Set(state.sources.map(s => s.category).filter(Boolean))];
  $('#categoryChips').innerHTML = categories.map(c => `<button class="chip ${state.category === c ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  $$('#categoryChips [data-category]').forEach(btn => btn.addEventListener('click', () => {
    state.category = btn.dataset.category;
    renderCategories();
    renderCatalog();
  }));
}

function filteredSources() {
  const q = state.query.trim().toLowerCase();
  return state.sources.filter(s => {
    const searchable = [s.name, s.agency, s.region, s.category, s.protocol, s.description, ...(s.tags || [])].join(' ').toLowerCase();
    const authOk = state.auth === 'all' || (state.auth === 'none' ? s.auth === 'none' : s.auth !== 'none');
    return (!q || searchable.includes(q))
      && (state.level === 'all' || s.level === state.level)
      && authOk
      && (state.category === 'Semua' || s.category === state.category);
  });
}

function apiCard(s) {
  return `<article class="api-card" tabindex="0" role="button" data-open="${esc(s.id)}" aria-label="Detail ${esc(s.name)}">
    <div class="api-card-top"><span class="source-level ${s.level === 'daerah' ? 'daerah' : ''}">${esc(levelLabel(s.level))}</span><span class="status-pill"><i class="status-dot ${statusClass(s.portalStatus)}"></i>${esc(statusLabel(s.portalStatus))}</span></div>
    <h3>${esc(s.name)}</h3><div class="agency">${esc(s.agency)}</div>
    <p>${esc(s.description)}</p>
    <div class="tag-row">${(s.tags || []).slice(0,4).map(t => `<span class="mini-tag">${esc(t)}</span>`).join('')}</div>
    <div class="api-card-footer"><span class="auth-label">◈ ${esc(authLabel(s.auth))}</span><span>${esc(s.protocol || s.kind)}</span></div>
  </article>`;
}

function renderCatalog() {
  const items = filteredSources();
  $('#catalogCount').textContent = fmt.format(items.length);
  $('#catalogGrid').innerHTML = items.map(apiCard).join('');
  $('#emptyState').hidden = items.length !== 0;
  bindOpenButtons($('#catalogGrid'));
}

function bindOpenButtons(root = document) {
  $$('[data-open]', root).forEach(el => {
    el.addEventListener('click', () => openSource(el.dataset.open));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSource(el.dataset.open); } });
  });
}

function openSource(id) {
  const s = state.sources.find(x => x.id === id);
  if (!s) return;
  $('#dialogLevel').textContent = `${levelLabel(s.level)} · ${s.category}`;
  $('#dialogLevel').className = `source-level ${s.level === 'daerah' ? 'daerah' : ''}`;
  $('#dialogTitle').textContent = s.name;
  $('#dialogAgency').textContent = s.agency;

  const endpoints = (s.endpoints || []).map(ep => `
    <div class="endpoint">
      <div class="endpoint-top"><span class="method ${(ep.method || 'GET').toLowerCase()}">${esc(ep.method || 'GET')}</span><button class="copy-mini" data-copy="${esc(ep.url || '')}">Salin</button></div>
      <code>${esc(ep.url || '')}</code>
    </div>`).join('');

  $('#dialogBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-metric"><span>Status</span><strong><i class="status-dot ${statusClass(s.portalStatus)}"></i> ${esc(statusLabel(s.portalStatus))}</strong></div>
      <div class="detail-metric"><span>Autentikasi</span><strong>${esc(authLabel(s.auth))}</strong></div>
      <div class="detail-metric"><span>Browser</span><strong>${esc(browserLabel(s.browserAccess))}</strong></div>
    </div>
    <section class="detail-section"><h3>Ringkasan</h3><p class="detail-description">${esc(s.description)}</p></section>
    <section class="detail-section"><h3>Catatan akses</h3><p class="detail-description">${esc(s.statusNote || 'Belum ada catatan.')}</p></section>
    ${s.baseUrl ? `<section class="detail-section"><h3>Base URL</h3><div class="endpoint"><div class="endpoint-top"><span class="method">BASE</span><button class="copy-mini" data-copy="${esc(s.baseUrl)}">Salin</button></div><code>${esc(s.baseUrl)}</code></div></section>` : ''}
    ${endpoints ? `<section class="detail-section"><h3>Endpoint</h3><div class="endpoint-list">${endpoints}</div></section>` : ''}
    ${s.testUrl ? `<section class="detail-section"><h3>Live test</h3><div class="detail-actions"><button class="button secondary" id="dialogTest">Jalankan request</button><button class="button ghost" data-copy="curl -L '${esc(s.testUrl)}'">Salin cURL</button></div><div id="testResult" class="test-result" hidden><div class="test-result-head"><span id="testStatus">Request</span><span id="testTime"></span></div><pre id="testPayload"></pre></div></section>` : ''}
    <div class="detail-actions"><a class="button primary" href="${esc(s.portalUrl)}" target="_blank" rel="noopener">Buka portal ↗</a>${s.docsUrl ? `<a class="button secondary" href="${esc(s.docsUrl)}" target="_blank" rel="noopener">Dokumentasi</a>` : ''}</div>`;

  $$('[data-copy]', $('#dialogBody')).forEach(btn => btn.addEventListener('click', () => copyText(btn.dataset.copy)));
  $('#dialogTest')?.addEventListener('click', () => liveTest(s));
  $('#apiDialog').showModal();
}

async function liveTest(s) {
  const box = $('#testResult');
  const payload = $('#testPayload');
  const stat = $('#testStatus');
  const time = $('#testTime');
  if (!box || !payload) return;
  box.hidden = false;
  stat.textContent = 'Menghubungi…'; time.textContent = ''; payload.textContent = s.testUrl;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  const start = performance.now();
  try {
    const res = await fetch(s.testUrl, { signal: ctrl.signal, headers: { Accept: 'application/json, text/plain, */*' } });
    const raw = await res.text();
    let content = raw;
    try { content = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
    stat.textContent = `HTTP ${res.status}`;
    time.textContent = `${Math.round(performance.now() - start)} ms`;
    payload.textContent = content.slice(0, 10000) || '(response kosong)';
  } catch (err) {
    stat.textContent = 'Tidak terbaca dari browser';
    time.textContent = `${Math.round(performance.now() - start)} ms`;
    payload.textContent = `${err.name === 'AbortError' ? 'Timeout > 12 detik' : err.message}\n\nKemungkinan penyebab: CORS, WAF, geo-blocking, atau endpoint sedang tidak tersedia. Kegagalan browser tidak otomatis berarti API mati.`;
  } finally { clearTimeout(timer); }
}

function renderExplorerSources() {
  const candidates = state.sources.filter(s => s.kind === 'ckan');
  $('#explorerSources').innerHTML = candidates.map(s => `
    <label class="source-check"><input type="checkbox" value="${esc(s.id)}" ${state.explorerSelected.has(s.id) ? 'checked' : ''}><span><strong>${esc(s.name)}</strong><small>${esc(s.region || s.agency)}</small></span></label>`).join('');
  $$('#explorerSources input').forEach(input => input.addEventListener('change', () => {
    if (input.checked) {
      if (state.explorerSelected.size >= 6) { input.checked = false; toast('Maksimal 6 sumber'); return; }
      state.explorerSelected.add(input.value);
    } else state.explorerSelected.delete(input.value);
  }));
}

async function runExplorer() {
  const q = $('#explorerQuery').value.trim();
  if (!q) return toast('Masukkan kata kunci');
  const sources = [...state.explorerSelected].map(id => state.sources.find(s => s.id === id)).filter(Boolean).slice(0, 6);
  if (!sources.length) return toast('Pilih minimal satu sumber');

  const output = $('#explorerOutput');
  output.classList.remove('initial');
  output.innerHTML = `<div class="loading"><i class="spinner"></i>Mencari “${esc(q)}” di ${sources.length} portal…</div>`;
  $('#explorerMeta').textContent = `${sources.length} sumber`;

  const responses = await Promise.allSettled(sources.map(async s => {
    const endpoint = `${String(s.baseUrl).replace(/\/$/, '')}/package_search?q=${encodeURIComponent(q)}&rows=6`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(endpoint, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { s, results: data?.result?.results || [] };
    } finally { clearTimeout(timer); }
  }));

  let total = 0;
  output.innerHTML = responses.map((r, index) => {
    const s = sources[index];
    if (r.status === 'rejected') return `<article class="portal-result"><div class="portal-result-head"><strong>${esc(s.name)}</strong><span>Tidak terbaca</span></div><div class="portal-error">${esc(r.reason?.message || 'CORS/WAF/timeout')} · <a href="${esc(s.portalUrl)}" target="_blank" rel="noopener">buka portal ↗</a></div></article>`;
    const results = r.value.results;
    total += results.length;
    return `<article class="portal-result"><div class="portal-result-head"><strong>${esc(s.name)}</strong><span>${results.length} hasil</span></div>${results.length ? results.map(ds => {
      const res = (ds.resources || []).find(x => x.url);
      return `<div class="dataset-item"><a href="${esc(res?.url || s.portalUrl)}" target="_blank" rel="noopener">${esc(ds.title || ds.name || 'Dataset')} ↗</a><p>${esc(ds.organization?.title || ds.notes || 'Tidak ada deskripsi')}</p></div>`;
    }).join('') : `<div class="dataset-item"><p>Tidak ada hasil.</p></div>`}</article>`;
  }).join('');
  $('#explorerMeta').textContent = `${total} hasil · ${sources.length} sumber`;
}

function renderStatus() {
  const rows = [...state.sources].sort((a,b) => a.name.localeCompare(b.name));
  const groups = [
    ['Aktif', rows.filter(x => x.portalStatus === 'up').length, 'up'],
    ['Terbatas', rows.filter(x => ['blocked','auth_required'].includes(x.portalStatus)).length, 'blocked'],
    ['Bermasalah', rows.filter(x => ['down','dns_dead'].includes(x.portalStatus)).length, 'down'],
    ['Belum dicek', rows.filter(x => x.portalStatus === 'unknown').length, 'unknown'],
  ];
  $('#statusSummary').innerHTML = groups.map(([name,count,status]) => `
    <article class="stat-card panel"><div class="stat-top"><span>${esc(name)}</span><i class="status-dot ${statusClass(status)}"></i></div><div class="stat-value">${count}</div><div class="stat-sub">snapshot registry</div></article>`).join('');

  $('#statusTableBody').innerHTML = rows.map(s => `
    <tr tabindex="0" data-open="${esc(s.id)}">
      <td><strong>${esc(s.name)}</strong></td>
      <td>${esc(s.agency)}</td>
      <td>${esc(levelLabel(s.level))}</td>
      <td>${esc(authLabel(s.auth))}</td>
      <td><span class="status-chip"><i class="status-dot ${statusClass(s.portalStatus)}"></i>${esc(statusLabel(s.portalStatus))}</span></td>
      <td>${esc(browserLabel(s.browserAccess))}</td>
    </tr>`).join('');
  bindOpenButtons($('#statusTableBody'));
}

function resetFilters() {
  state.query = ''; state.level = 'all'; state.auth = 'all'; state.category = 'Semua';
  $('#catalogSearch').value = '';
  $('#levelFilter').value = 'all';
  $('#authFilter').value = 'all';
  renderCategories(); renderCatalog();
}

function bindEvents() {
  $$('[data-route]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); }));
  window.addEventListener('hashchange', applyRoute);
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#catalogSearch').addEventListener('input', e => { state.query = e.target.value; renderCatalog(); });
  $('#levelFilter').addEventListener('change', e => { state.level = e.target.value; renderCatalog(); });
  $('#authFilter').addEventListener('change', e => { state.auth = e.target.value; renderCatalog(); });
  $('#resetFilters').addEventListener('click', resetFilters);
  $('#runExplorer').addEventListener('click', runExplorer);
  $('#explorerQuery').addEventListener('keydown', e => { if (e.key === 'Enter') runExplorer(); });
  $('#dialogClose').addEventListener('click', () => $('#apiDialog').close());
  $('#apiDialog').addEventListener('click', e => { if (e.target === $('#apiDialog')) $('#apiDialog').close(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault(); navigate('catalog'); setTimeout(() => $('#catalogSearch').focus(), 60);
    }
    if (e.key === 'Escape' && $('#apiDialog').open) $('#apiDialog').close();
  });
}

function registerSW() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}

async function init() {
  initTheme();
  bindEvents();
  applyRoute();
  try {
    await loadRegistry();
    renderStats(); renderFeatured(); renderAccessBreakdown(); renderCategories(); renderCatalog(); renderExplorerSources(); renderStatus();
  } catch (err) {
    console.error(err);
    $('#catalogGrid').innerHTML = `<div class="empty-state panel"><h3>Registry gagal dimuat</h3><p>${esc(err.message)}</p></div>`;
  }
  registerSW();
}

init();
