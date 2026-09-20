const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={sources:{institutions:[]},model:{factors:[]},summary:{},industry:{themes:{},items:[]},energy:{},status:{},regional:{regions:[]}};
const LIVE={
  sources:'./data/investment-sources.json',
  model:'./data/investment-model.json',
  summary:'./live/investment-summary.json',
  industry:'./live/investment-industry.json',
  energy:'./live/investment-energy.json',
  status:'./live/investment-status.json',
  regional:'./live/regional-summary.json'
};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const fmt=v=>new Intl.NumberFormat('id-ID').format(Number(v)||0);

async function json(url,timeout=15000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const sep=url.includes('?')?'&':'?';
    const r=await fetch(url+sep+'_ts='+Date.now(),{signal:c.signal,cache:'no-store',headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(t)}
}
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}
function setTheme(){const v=localStorage.getItem('nusadata-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=v}
function toggleTheme(){const v=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=v;localStorage.setItem('nusadata-theme',v)}
function route(){
  const valid=['overview','macro','trade','energy','sources'];
  const r=valid.includes(location.hash.slice(1))?location.hash.slice(1):'overview';
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===r));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
  scrollTo({top:0});
}
function nav(r){location.hash=r}
function clock(){const e=$('#liveClock');if(e)e.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB'}
function snapshotAge(v){
  if(!v)return'Snapshot belum tersedia';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return'Snapshot belum tersedia';
  return 'Snapshot '+d.toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})+' WIB';
}
function statusClass(s){return s==='active'?'ready':s==='probing'?'probing':'blocked'}
function statusLabel(s){
  return ({active:'ACTIVE REST',probing:'PROBING',auth_required:'AUTH REQUIRED',access_request:'ACCESS REQUEST',non_rest_public_service:'NON-REST PUBLIC'})[s]||String(s||'UNKNOWN').toUpperCase()
}
function sourceCard(s){
  return '<article class="investment-source-card '+statusClass(s.status)+'">'+
    '<div class="investment-source-head"><span>'+esc(s.role)+'</span><b>'+esc(statusLabel(s.status))+'</b></div>'+
    '<h3>'+esc(s.name)+'</h3>'+
    '<p>'+esc(s.investment_use||'')+'</p>'+
    '<div class="source-targets">'+(s.target_data||[]).slice(0,5).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
    (s.note?'<small>'+esc(s.note)+'</small>':'')+
    '<a href="'+esc(s.official_url)+'" target="_blank" rel="noopener">Sumber resmi ↗</a>'+
  '</article>';
}
function renderInstitutionGroups(){
  const all=state.sources.institutions||[];
  $('#macroInstitutions').innerHTML=all.filter(x=>['kemenkeu','djp','bi','kemendagri'].includes(x.id)).map(sourceCard).join('');
  $('#tradeInstitutions').innerHTML=all.filter(x=>['kemendag','djbc','kemenperin'].includes(x.id)).map(sourceCard).join('');
  $('#sourceMatrix').innerHTML=all.map(sourceCard).join('');
}
function coverage(){
  const all=state.sources.institutions||[];
  const active=all.filter(x=>x.status==='active');
  const weight=active.reduce((s,x)=>s+(Number(x.weight)||0),0);
  return {active,total:all.length,weight,pct:Math.round(weight)};
}
function renderCoverage(){
  const c=coverage();
  $('#eligibleSources').textContent=c.active.length;
  $('#coveragePercent').textContent=c.pct+'%';
  $('#coverageMeter').style.width=Math.min(100,c.pct)+'%';
  $('#coverageLabel').textContent=c.pct>=70?'Coverage cukup untuk model':'Belum cukup untuk scoring investasi';
  $('#snapshotTime').textContent=snapshotAge(state.status.generated_at||state.summary.generated_at);
  $('#modelStatus').textContent=c.pct>=70?'READY':'HOLD';
  $('#scoreBadge').textContent=c.pct>=70?'MODEL READY':'INSUFFICIENT COVERAGE';
}
function factorAvailability(f){
  const map=Object.fromEntries((state.sources.institutions||[]).map(x=>[x.id,x]));
  const weights=(f.sources||[]).map(id=>map[id]).filter(Boolean);
  if(!weights.length)return 0;
  return weights.filter(x=>x.status==='active').length/weights.length;
}
function renderFactors(){
  const el=$('#factorGrid'); if(!el)return;
  el.innerHTML=(state.model.factors||[]).map(f=>{
    const availability=factorAvailability(f), pct=Math.round(availability*100);
    return '<article class="investment-factor">'+
      '<div><span>'+esc(f.label)+'</span><strong>'+esc(f.weight)+'%</strong></div>'+
      '<div class="factor-meter"><i style="width:'+pct+'%"></i></div>'+
      '<small>'+pct+'% source available · '+esc(f.direction||'')+'</small>'+
    '</article>';
  }).join('');
}
function renderSourceReadiness(){
  const el=$('#sourceCoverage');if(!el)return;
  el.innerHTML=(state.sources.institutions||[]).map(s=>
    '<div class="source-readiness-row">'+
      '<div><i class="'+statusClass(s.status)+'"></i><strong>'+esc(s.name)+'</strong><span>'+esc(s.role)+'</span></div>'+
      '<b>'+esc(s.weight)+'%</b>'+
      '<small>'+esc(statusLabel(s.status))+'</small>'+
    '</div>'
  ).join('');
}
function themeLabel(k){return ({nickel:'Nikel & Hilirisasi',industrial_estate:'Kawasan Industri',capacity:'Kapasitas Produksi',ev:'Kendaraan Listrik',green_industry:'Industri Hijau'})[k]||k}
function renderIndustry(){
  const themes=state.industry.themes||{};
  const total=Object.values(themes).reduce((s,x)=>s+(Number(x.count)||0),0);
  $('#industryDatasetCount').textContent=fmt(total);
  $('#industryHighlights').innerHTML=Object.entries(themes).map(([k,v])=>
    '<div><span>'+esc(themeLabel(k))+'</span><strong>'+fmt(v.count||0)+'</strong><small>dataset REST</small></div>'
  ).join('')||'<div class="empty-inline">Data Kemenperin belum tersedia.</div>';
  $('#industrialThemes').innerHTML=Object.entries(themes).map(([k,v])=>
    '<article class="industrial-theme-card"><span>'+esc(themeLabel(k))+'</span><strong>'+fmt(v.count||0)+'</strong><small>dataset relevan</small></article>'
  ).join('');
  $('#industrialFeed').innerHTML=(state.industry.items||[]).slice(0,10).map(x=>
    '<a class="feed-row" href="'+esc(x.url||'https://satudata.kemenperin.go.id/')+'" target="_blank" rel="noopener">'+
      '<div><span>KEMENPERIN · '+esc(x.theme||'industry')+'</span><strong>'+esc(x.title||x.name||'Dataset industri')+'</strong></div><b>↗</b></a>'
  ).join('');
}
function compactObject(o){
  const entries=Object.entries(o||{}).filter(([,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,5);
  return entries.map(([k,v])=>'<span><b>'+esc(k.replaceAll('_',' '))+'</b>'+esc(v)+'</span>').join('');
}
function renderEnergy(){
  const wells=Number(state.energy.well_count)||0,wk=Number(state.energy.working_area_count)||0;
  $('#wellCount').textContent=fmt(wells);$('#workingAreaCount').textContent=fmt(wk);
  $('#energyWellCount').textContent=fmt(wells);$('#energyWKCount').textContent=fmt(wk);
  $('#energyHighlights').innerHTML=
    '<div><span>Upstream footprint</span><strong>'+fmt(wells)+'</strong><small>sumur pada REST ESDM</small></div>'+
    '<div><span>WK Migas 2026</span><strong>'+fmt(wk)+'</strong><small>wilayah kerja tahap 1</small></div>'+
    '<div><span>Source</span><strong>ArcGIS REST</strong><small>official · no auth</small></div>';
  $('#workingAreaList').innerHTML=(state.energy.working_areas||[]).map(x=>'<article class="investment-detail-row">'+compactObject(x)+'</article>').join('')||'<div class="empty-inline">Detail WK belum tersedia.</div>';
  $('#wellSampleList').innerHTML=(state.energy.well_samples||[]).map(x=>'<article class="investment-detail-row">'+compactObject(x)+'</article>').join('')||'<div class="empty-inline">Sample sumur belum tersedia.</div>';
}
function regionDatasetUrl(key,name){
  const bases={
    aceh:'https://data.acehprov.go.id/id/dataset/',
    sumbar:'https://data.sumbarprov.go.id/dataset/',
    sumsel:'https://opendata.sumselprov.go.id/dataset/',
    banten:'https://data.bantenprov.go.id/dataset/',
    jateng:'https://data.jatengprov.go.id/dataset/',
    kaltim:'https://data.kaltimprov.go.id/dataset/',
    grobogan:'https://opendata.grobogan.go.id/dataset/'
  };
  return (bases[key]||'#')+(name||'');
}
function renderRegionalInvestment(){
  const all=state.regional?.regions||[];
  const provinces=all.filter(x=>x.level==='provinsi'&&x.available!==false);
  const total=provinces.reduce((s,x)=>s+(Number(x.count)||0),0);
  const pc=$('#regionalProvinceCount'),dt=$('#regionalDatasetTotal'),grid=$('#regionalInvestmentGrid');
  if(pc)pc.textContent=fmt(provinces.length)+'/38';
  if(dt)dt.textContent=fmt(total);
  if(grid)grid.innerHTML=provinces.map(r=>{
    const latest=[...(r.items||[])].sort((x,y)=>new Date(y.metadata_modified||0)-new Date(x.metadata_modified||0))[0];
    const href=latest?regionDatasetUrl(r.key,latest.name):'#';
    return '<article class="regional-coverage-card">'+
      '<div><span>'+esc(r.name)+'</span><strong>'+fmt(r.count)+'</strong></div>'+
      '<small>PROVINSI · VERIFIED REST</small>'+
      '<p>'+esc(latest?.title||'Katalog open data aktif')+'</p>'+
      (href!=='#'?'<a href="'+esc(href)+'" target="_blank" rel="noopener">Dataset terbaru ↗</a>':'')+
    '</article>';
  }).join('')||'<div class="empty-inline">Coverage provinsi belum tersedia.</div>';
}

function renderAll(){
  renderInstitutionGroups();renderCoverage();renderFactors();renderSourceReadiness();renderIndustry();renderEnergy();renderRegionalInvestment();
}
async function loadAll(){
  const tasks=await Promise.allSettled([json(LIVE.sources),json(LIVE.model),json(LIVE.summary),json(LIVE.industry),json(LIVE.energy),json(LIVE.status),json(LIVE.regional)]);
  if(tasks[0].status==='fulfilled')state.sources=tasks[0].value;
  if(tasks[1].status==='fulfilled')state.model=tasks[1].value;
  if(tasks[2].status==='fulfilled')state.summary=tasks[2].value;
  if(tasks[3].status==='fulfilled')state.industry=tasks[3].value;
  if(tasks[4].status==='fulfilled')state.energy=tasks[4].value;
  if(tasks[5].status==='fulfilled')state.status=tasks[5].value;
  if(tasks[6].status==='fulfilled')state.regional=tasks[6].value;
  renderAll();
}
async function reloadAll(){await loadAll();toast('Investment data diperbarui')}
function bind(){
  $$('[data-route]').forEach(b=>b.onclick=()=>nav(b.dataset.route));
  addEventListener('hashchange',route);
  $('#themeToggle').onclick=toggleTheme;$('#refreshAll').onclick=reloadAll;
}
async function init(){
  setTheme();bind();route();clock();setInterval(clock,30000);
  await loadAll();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();