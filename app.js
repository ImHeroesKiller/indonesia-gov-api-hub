const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={
  sources:{institutions:[]},
  model:{factors:[]},
  summary:{},
  industry:{available:false,themes:{},items:[]},
  energy:{well_count:0,working_area_count:0,well_samples:[],working_areas:[]},
  status:{}
};

const LIVE={
  sources:'./data/investment-sources.json',
  model:'./data/investment-model.json',
  summary:'./live/investment-summary.json',
  industry:'./live/investment-industry.json',
  energy:'./live/investment-energy.json',
  status:'./live/investment-status.json'
};

const esc=v=>String(v??'')
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;')
  .replaceAll("'","&#039;");
const fmt=v=>new Intl.NumberFormat('id-ID').format(Number(v)||0);

async function json(url,timeout=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const sep=url.includes('?')?'&':'?';
    const r=await fetch(url+sep+'_ts='+Date.now(),{
      signal:controller.signal,
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(timer)}
}

function toast(message){
  const el=$('#toast'); if(!el)return;
  el.textContent=message; el.classList.add('show');
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200);
}
function setTheme(){
  const value=localStorage.getItem('nusadata-theme')||
    (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=value;
}
function toggleTheme(){
  const value=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=value;
  localStorage.setItem('nusadata-theme',value);
}
function route(){
  const valid=['overview','macro','trade','energy','sources'];
  const requested=location.hash.slice(1);
  const current=valid.includes(requested)?requested:'overview';
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===current));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===current));
  scrollTo({top:0});
}
function nav(value){location.hash=value}
function clock(){
  const el=$('#liveClock');
  if(el)el.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';
}
function snapshotLabel(value){
  if(!value)return'Snapshot belum tersedia';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return'Snapshot belum tersedia';
  return 'Snapshot '+d.toLocaleString('id-ID',{
    day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'
  })+' WIB';
}

function statusClass(status){
  if(status==='active')return'ready';
  if(status==='probing')return'probing';
  return'blocked';
}
function statusLabel(status){
  return ({
    active:'ACTIVE REST',
    probing:'PROBING',
    unreachable:'TEMP UNREACHABLE',
    auth_required:'AUTH REQUIRED',
    access_request:'ACCESS REQUEST',
    non_rest_public_service:'NON-REST PUBLIC'
  })[status]||String(status||'UNKNOWN').toUpperCase();
}
function sourceCard(source){
  return '<article class="investment-source-card '+statusClass(source.status)+'">'+
    '<div class="investment-source-head"><span>'+esc(source.role)+'</span><b>'+esc(statusLabel(source.status))+'</b></div>'+
    '<h3>'+esc(source.name)+'</h3>'+
    '<p>'+esc(source.investment_use||'')+'</p>'+
    '<div class="source-targets">'+(source.target_data||[]).slice(0,5).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
    (source.note?'<small>'+esc(source.note)+'</small>':'')+
    '<a href="'+esc(source.official_url)+'" target="_blank" rel="noopener">Sumber resmi ↗</a>'+
  '</article>';
}
function renderInstitutions(){
  const all=state.sources.institutions||[];
  $('#macroInstitutions').innerHTML=all
    .filter(x=>['kemenkeu','djp','bi','kemendagri'].includes(x.id))
    .map(sourceCard).join('');
  $('#tradeInstitutions').innerHTML=all
    .filter(x=>['kemendag','djbc','kemenperin'].includes(x.id))
    .map(sourceCard).join('');
  $('#sourceMatrix').innerHTML=all.map(sourceCard).join('');
}

function coverage(){
  const all=state.sources.institutions||[];
  const active=all.filter(x=>x.status==='active');
  const weight=active.reduce((sum,x)=>sum+(Number(x.weight)||0),0);
  return{active,total:all.length,weight,pct:Math.round(weight)};
}
function renderCoverage(){
  const c=coverage();
  $('#eligibleSources').textContent=fmt(c.active.length);
  $('#coveragePercent').textContent=c.pct+'%';
  $('#coverageMeter').style.width=Math.min(100,c.pct)+'%';
  $('#coverageLabel').textContent=c.pct>=70?'Coverage cukup untuk model':'Belum cukup untuk scoring investasi';
  $('#snapshotTime').textContent=snapshotLabel(state.status.generated_at||state.summary.generated_at);
  $('#modelStatus').textContent=c.pct>=70?'READY':'HOLD';
  $('#scoreBadge').textContent=c.pct>=70?'MODEL READY':'INSUFFICIENT COVERAGE';
}
function factorAvailability(factor){
  const byId=Object.fromEntries((state.sources.institutions||[]).map(x=>[x.id,x]));
  const refs=(factor.sources||[]).map(id=>byId[id]).filter(Boolean);
  if(!refs.length)return 0;
  return refs.filter(x=>x.status==='active').length/refs.length;
}
function renderFactors(){
  const el=$('#factorGrid'); if(!el)return;
  el.innerHTML=(state.model.factors||[]).map(f=>{
    const pct=Math.round(factorAvailability(f)*100);
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

function themeLabel(key){
  return ({
    nickel:'Nikel & Hilirisasi',
    industrial_estate:'Kawasan Industri',
    capacity:'Kapasitas Produksi',
    ev:'Kendaraan Listrik',
    green_industry:'Industri Hijau'
  })[key]||key;
}
function renderIndustry(){
  const themes=state.industry.themes||{};
  const total=Object.values(themes).reduce((sum,x)=>sum+(Number(x.count)||0),0);
  $('#industryDatasetCount').textContent=fmt(total);

  const unavailable=state.industry.available===false
    ?'<div class="empty-inline">Kemenperin mempunyai CKAN REST publik, tetapi feed saat ini tidak dapat dijangkau dari deployment runner. Sumber ini dikeluarkan dari scoring sampai pulih.</div>'
    :'';

  $('#industryHighlights').innerHTML=Object.keys(themes).length
    ?Object.entries(themes).map(([k,v])=>
      '<div><span>'+esc(themeLabel(k))+'</span><strong>'+fmt(v.count||0)+'</strong><small>dataset REST</small></div>'
    ).join('')
    :unavailable||'<div class="empty-inline">Data Kemenperin belum tersedia.</div>';

  $('#industrialThemes').innerHTML=Object.keys(themes).length
    ?Object.entries(themes).map(([k,v])=>
      '<article class="industrial-theme-card"><span>'+esc(themeLabel(k))+'</span><strong>'+fmt(v.count||0)+'</strong><small>dataset relevan</small></article>'
    ).join('')
    :unavailable;

  $('#industrialFeed').innerHTML=(state.industry.items||[]).length
    ?state.industry.items.slice(0,10).map(x=>
      '<a class="feed-row" href="'+esc(x.url||'https://satudata.kemenperin.go.id/')+'" target="_blank" rel="noopener">'+
        '<div><span>KEMENPERIN · '+esc(x.theme||'industry')+'</span><strong>'+esc(x.title||x.name||'Dataset industri')+'</strong></div><b>↗</b></a>'
    ).join('')
    :unavailable;
}
function compactObject(obj){
  return Object.entries(obj||{})
    .filter(([,v])=>v!==null&&v!==''&&typeof v!=='object')
    .slice(0,6)
    .map(([k,v])=>'<span><b>'+esc(k.replaceAll('_',' '))+'</b>'+esc(v)+'</span>')
    .join('');
}
function renderEnergy(){
  const wells=Number(state.energy.well_count)||0;
  const areas=Number(state.energy.working_area_count)||0;
  $('#wellCount').textContent=fmt(wells);
  $('#workingAreaCount').textContent=fmt(areas);
  $('#energyWellCount').textContent=fmt(wells);
  $('#energyWKCount').textContent=fmt(areas);

  $('#energyHighlights').innerHTML=
    '<div><span>Upstream footprint</span><strong>'+fmt(wells)+'</strong><small>sumur pada REST ESDM</small></div>'+
    '<div><span>WK Migas 2026</span><strong>'+fmt(areas)+'</strong><small>wilayah kerja tahap 1</small></div>'+
    '<div><span>Source</span><strong>ArcGIS REST</strong><small>official · no auth</small></div>';

  $('#workingAreaList').innerHTML=(state.energy.working_areas||[]).length
    ?state.energy.working_areas.map(x=>'<article class="investment-detail-row">'+compactObject(x)+'</article>').join('')
    :'<div class="empty-inline">Detail WK belum tersedia.</div>';

  $('#wellSampleList').innerHTML=(state.energy.well_samples||[]).length
    ?state.energy.well_samples.map(x=>'<article class="investment-detail-row">'+compactObject(x)+'</article>').join('')
    :'<div class="empty-inline">Sample sumur belum tersedia.</div>';
}

function renderAll(){
  renderInstitutions();
  renderCoverage();
  renderFactors();
  renderSourceReadiness();
  renderIndustry();
  renderEnergy();
}
async function loadAll(){
  const tasks=await Promise.allSettled([
    json(LIVE.sources),
    json(LIVE.model),
    json(LIVE.summary),
    json(LIVE.industry),
    json(LIVE.energy),
    json(LIVE.status)
  ]);
  if(tasks[0].status==='fulfilled')state.sources=tasks[0].value;
  if(tasks[1].status==='fulfilled')state.model=tasks[1].value;
  if(tasks[2].status==='fulfilled')state.summary=tasks[2].value;
  if(tasks[3].status==='fulfilled')state.industry=tasks[3].value;
  if(tasks[4].status==='fulfilled')state.energy=tasks[4].value;
  if(tasks[5].status==='fulfilled')state.status=tasks[5].value;
  renderAll();
}
async function reloadAll(){await loadAll();toast('Investment data diperbarui')}

function bind(){
  $$('[data-route]').forEach(b=>b.onclick=()=>nav(b.dataset.route));
  addEventListener('hashchange',route);
  $('#themeToggle').onclick=toggleTheme;
  $('#refreshAll').onclick=reloadAll;
}
async function init(){
  setTheme();bind();route();clock();setInterval(clock,30000);
  await loadAll();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();