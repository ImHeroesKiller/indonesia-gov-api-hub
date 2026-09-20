const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={
  registry:null,
  sources:[],
  weather:null,
  latestQuake:null,
  m5:[],
  felt:[],
  quakeTab:'m5',
  datasetCache:{jakarta:[],nasional:[]},
  liveStatus:null
};

const LIVE={
  weather:'./live/weather-kemayoran.json',
  latest:'./live/earthquake-latest.json',
  m5:'./live/earthquake-m5.json',
  felt:'./live/earthquake-felt.json',
  jakarta:'./live/datasets-jakarta.json',
  nasional:'./live/datasets-nasional.json',
  status:'./live/status.json'
};

const esc=v=>String(v??'')
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;')
  .replaceAll("'","&#039;");

const num=v=>new Intl.NumberFormat('id-ID').format(Number(v)||0);

function toast(m){
  const e=$('#toast');
  e.textContent=m;
  e.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>e.classList.remove('show'),2200);
}

function route(){
  const requested=location.hash.slice(1)||'dashboard';
  const valid=['dashboard','weather','earthquake','datasets','sources'];
  const r=valid.includes(requested)?requested:'dashboard';
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===r));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
  window.scrollTo({top:0});
}

function nav(r){location.hash=r}

function setTheme(){
  const v=localStorage.getItem('nusadata-theme')||
    (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=v;
}

function toggleTheme(){
  const v=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=v;
  localStorage.setItem('nusadata-theme',v);
}

async function json(url,timeout=12000){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),timeout);
  try{
    const sep=url.includes('?')?'&':'?';
    const r=await fetch(url+sep+'_ts='+Date.now(),{
      signal:c.signal,
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(t)}
}

async function directJson(url,timeout=12000){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{
      signal:c.signal,
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(t)}
}

function clock(){
  const d=new Date();
  $('#liveClock').textContent=d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';
}

function weatherRows(payload){
  const d=payload?.data?.[0]?.cuaca||[];
  return d.flat(Infinity).filter(x=>x&&typeof x==='object'&&('t'in x||'weather_desc'in x));
}

function weatherLoc(payload){
  return payload?.lokasi||payload?.data?.[0]?.lokasi||{};
}

function parseLocalTime(v=''){
  const s=String(v).replace(' ','T');
  const d=new Date(s);
  return Number.isNaN(d.getTime())?null:d;
}

function nextForecast(rows){
  const now=Date.now();
  return rows.find(x=>{
    const d=parseLocalTime(x.local_datetime||x.datetime);
    return d&&d.getTime()>=now-30*60*1000;
  })||rows[0];
}

function weatherIcon(desc=''){
  const x=desc.toLowerCase();
  if(x.includes('petir'))return'⛈';
  if(x.includes('hujan'))return'🌧';
  if(x.includes('berawan'))return'☁';
  if(x.includes('cerah'))return'☀';
  if(x.includes('kabut'))return'🌫';
  return'🌤';
}

function timeLabel(v){
  const d=parseLocalTime(v);
  return d?d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'—';
}

function fullTimeLabel(v){
  const d=parseLocalTime(v);
  return d?d.toLocaleString('id-ID',{
    weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
  }):'—';
}

function renderWeather(payload,full=false){
  const rows=weatherRows(payload);
  const loc=weatherLoc(payload);
  const now=nextForecast(rows);
  if(!now) throw new Error('Format data cuaca tidak dikenali');

  if(!full){
    $('#weatherNow').classList.remove('skeleton-block');
    $('#weatherNow').innerHTML=
      '<div class="weather-icon">'+weatherIcon(now.weather_desc)+'</div>'+
      '<div><strong>'+esc(now.t)+'°</strong>'+
      '<span>'+esc(now.weather_desc||'—')+'</span>'+
      '<small>'+esc(loc.desa||loc.kecamatan||'Kemayoran')+', '+esc(loc.kotkab||loc.provinsi||'DKI Jakarta')+'</small></div>'+
      '<div class="weather-facts"><span>💧 '+esc(now.hu)+'%</span><span>↝ '+esc(now.ws)+' km/j</span></div>';

    $('#weatherMini').innerHTML=rows.slice(0,5).map(x=>
      '<div><span>'+timeLabel(x.local_datetime||x.datetime)+'</span>'+
      '<b>'+weatherIcon(x.weather_desc)+' '+esc(x.t)+'°</b></div>'
    ).join('');

    $('#weatherStatus').textContent='Live snapshot';
  }else{
    $('#weatherLocation').innerHTML=
      '<strong>'+esc(loc.desa||'Kemayoran')+'</strong>'+
      '<span>'+esc([loc.kecamatan,loc.kotkab,loc.provinsi].filter(Boolean).join(' · '))+'</span>';

    $('#weatherDetail').innerHTML=rows.slice(0,24).map(x=>
      '<article class="forecast-item">'+
      '<time>'+fullTimeLabel(x.local_datetime||x.datetime)+'</time>'+
      '<div class="forecast-icon">'+weatherIcon(x.weather_desc)+'</div>'+
      '<strong>'+esc(x.t)+'°C</strong>'+
      '<span>'+esc(x.weather_desc||'—')+'</span>'+
      '<small>Kelembapan '+esc(x.hu)+'% · Angin '+esc(x.ws)+' km/j</small>'+
      '</article>'
    ).join('');
  }
}

function quakeObj(p){return p?.Infogempa?.gempa}

function quakeCard(q){
  return '<article class="quake-row">'+
    '<div class="mag">M<strong>'+esc(q.Magnitude)+'</strong></div>'+
    '<div class="quake-copy"><strong>'+esc(q.Wilayah)+'</strong>'+
    '<span>'+esc(q.Tanggal)+' · '+esc(q.Jam)+' · Kedalaman '+esc(q.Kedalaman)+'</span>'+
    '<small>'+esc(q.Potensi||q.Dirasakan||'')+'</small></div>'+
  '</article>';
}

function renderLatestQuake(q){
  if(!q) throw new Error('Data gempa kosong');

  $('#latestQuake').classList.remove('skeleton-block');
  $('#latestQuake').innerHTML=
    '<div class="magnitude"><span>M</span><strong>'+esc(q.Magnitude)+'</strong></div>'+
    '<div class="quake-copy"><strong>'+esc(q.Wilayah)+'</strong>'+
    '<span>'+esc(q.Tanggal)+' · '+esc(q.Jam)+'</span>'+
    '<small>Kedalaman '+esc(q.Kedalaman)+' · '+esc(q.Potensi||'')+'</small></div>';

  $('#quakeStatus').textContent='Live snapshot';

  $('#quakeHero').innerHTML=
    '<div class="magnitude big"><span>M</span><strong>'+esc(q.Magnitude)+'</strong></div>'+
    '<div><span class="kicker">GEMPA TERBARU</span>'+
    '<h2>'+esc(q.Wilayah)+'</h2>'+
    '<p>'+esc(q.Tanggal)+' · '+esc(q.Jam)+' · Kedalaman '+esc(q.Kedalaman)+'</p>'+
    '<div class="tag-line"><span>'+esc(q.Potensi||'')+'</span>'+
    (q.Dirasakan?'<span>Dirasakan: '+esc(q.Dirasakan)+'</span>':'')+
    '</div></div>';
}

function renderQuakeList(){
  const a=state.quakeTab==='felt'?state.felt:state.m5;
  $('#quakeList').innerHTML=a.length
    ?a.map(quakeCard).join('')
    :'<div class="empty-inline">Data belum tersedia pada snapshot terakhir.</div>';
}

function unavailableBox(message){
  return '<div class="error-box">'+esc(message)+'</div>';
}

async function loadLiveStatus(){
  try{
    const s=await json(LIVE.status,8000);
    state.liveStatus=s;
    if(s.generated_at){
      const d=new Date(s.generated_at);
      if(!Number.isNaN(d.getTime())){
        const label='Diperbarui '+d.toLocaleString('id-ID',{
          day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',
          timeZone:'Asia/Jakarta'
        })+' WIB';
        $('#weatherStatus').title=label;
        $('#quakeStatus').title=label;
      }
    }
  }catch{}
}

async function loadBMKG(){
  const tasks=await Promise.allSettled([
    json(LIVE.weather),
    json(LIVE.latest),
    json(LIVE.m5),
    json(LIVE.felt)
  ]);

  if(tasks[0].status==='fulfilled'&&!tasks[0].value?.unavailable){
    state.weather=tasks[0].value;
    try{
      renderWeather(state.weather);
      renderWeather(state.weather,true);
    }catch(e){
      $('#weatherStatus').textContent='Format error';
      $('#weatherNow').classList.remove('skeleton-block');
      $('#weatherNow').innerHTML=unavailableBox(e.message);
    }
  }else{
    $('#weatherStatus').textContent='Belum tersedia';
    $('#weatherNow').classList.remove('skeleton-block');
    $('#weatherNow').innerHTML=unavailableBox(
      'Snapshot cuaca belum berhasil diambil. Data akan dicoba lagi pada refresh otomatis berikutnya.'
    );
    $('#weatherDetail').innerHTML=unavailableBox('Data cuaca belum tersedia.');
  }

  if(tasks[1].status==='fulfilled'&&!tasks[1].value?.unavailable){
    state.latestQuake=quakeObj(tasks[1].value);
    try{renderLatestQuake(state.latestQuake)}
    catch(e){
      $('#quakeStatus').textContent='Format error';
      $('#latestQuake').classList.remove('skeleton-block');
      $('#latestQuake').innerHTML=unavailableBox(e.message);
    }
  }else{
    $('#quakeStatus').textContent='Belum tersedia';
    $('#latestQuake').classList.remove('skeleton-block');
    $('#latestQuake').innerHTML=unavailableBox('Snapshot gempa terbaru belum tersedia.');
    $('#quakeHero').innerHTML=unavailableBox('Data gempa terbaru belum tersedia.');
  }

  if(tasks[2].status==='fulfilled'&&!tasks[2].value?.unavailable){
    const v=quakeObj(tasks[2].value);
    state.m5=Array.isArray(v)?v:(v?[v]:[]);
  }else state.m5=[];

  if(tasks[3].status==='fulfilled'&&!tasks[3].value?.unavailable){
    const v=quakeObj(tasks[3].value);
    state.felt=Array.isArray(v)?v:(v?[v]:[]);
  }else state.felt=[];

  $('#dashboardQuakes').innerHTML=state.m5.slice(0,6).map(quakeCard).join('')||
    '<div class="empty-inline">Snapshot daftar gempa belum tersedia.</div>';
  renderQuakeList();
}

async function loadCustomWeather(){
  const code=$('#adm4Input').value.trim();
  if(!code){toast('Masukkan kode ADM4');return}

  if(code==='31.71.03.1001'){
    if(state.weather){
      renderWeather(state.weather,true);
      toast('Menampilkan snapshot Kemayoran');
    }else{
      await loadBMKG();
    }
    return;
  }

  $('#weatherLocation').innerHTML='<strong>Memuat wilayah '+esc(code)+'…</strong>';
  $('#weatherDetail').innerHTML='<div class="empty-inline">Mencoba koneksi langsung ke BMKG.</div>';

  try{
    const data=await directJson(
      'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4='+encodeURIComponent(code),
      12000
    );
    renderWeather(data,true);
    toast('Data wilayah berhasil dimuat');
  }catch{
    $('#weatherLocation').innerHTML='<strong>Wilayah kustom belum dapat dimuat</strong>';
    $('#weatherDetail').innerHTML=unavailableBox(
      'Browser memblokir akses langsung ke endpoint ini. Snapshot otomatis saat ini tersedia untuk Kemayoran.'
    );
  }
}

function sourceName(k){
  return k==='jakarta'?'Satu Data Jakarta':'Satu Data Indonesia';
}

function normalizeDatasetPayload(payload){
  if(payload?.unavailable) return [];
  const list=payload?.result?.results;
  return Array.isArray(list)?list:[];
}

function datasetCard(d,source){
  const org=d.organization?.title||d.maintainer||sourceName(source);
  const date=d.metadata_modified
    ?new Date(d.metadata_modified).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
    :'';
  const url=source==='jakarta'
    ?'https://satudata.jakarta.go.id/open-data'
    :'https://data.go.id/dataset/'+encodeURIComponent(d.name||'');

  return '<article class="dataset-card panel">'+
    '<div class="dataset-top"><span>'+esc(sourceName(source))+'</span><small>'+esc(date)+'</small></div>'+
    '<h3>'+esc(d.title||d.name||'Dataset')+'</h3>'+
    '<p>'+esc((d.notes||'').replace(/<[^>]*>/g,'').slice(0,180)||'Dataset publik pemerintah.')+'</p>'+
    '<div class="dataset-foot"><span>'+esc(org)+'</span>'+
    '<a href="'+esc(url)+'" target="_blank" rel="noopener">Buka sumber ↗</a></div>'+
  '</article>';
}

async function loadDatasetSnapshots(){
  const calls=await Promise.allSettled([json(LIVE.jakarta),json(LIVE.nasional)]);

  if(calls[0].status==='fulfilled'){
    state.datasetCache.jakarta=normalizeDatasetPayload(calls[0].value);
  }
  if(calls[1].status==='fulfilled'){
    state.datasetCache.nasional=normalizeDatasetPayload(calls[1].value);
  }

  const combined=[
    ...state.datasetCache.jakarta.slice(0,3).map(d=>({d,source:'jakarta'})),
    ...state.datasetCache.nasional.slice(0,3).map(d=>({d,source:'nasional'}))
  ];

  $('#dashboardDatasets').innerHTML=combined.length
    ?combined.map(x=>datasetCard(x.d,x.source)).join('')
    :'<div class="empty-inline">Snapshot dataset belum berhasil diambil dari portal pemerintah.</div>';
}

function searchableText(d){
  return [
    d.title,d.name,d.notes,d.maintainer,
    d.organization?.title,
    ...(d.tags||[]).map(t=>t.display_name||t.name)
  ].filter(Boolean).join(' ').toLowerCase();
}

function searchDatasets(){
  const q=$('#datasetQuery').value.trim().toLowerCase();
  const sel=$('#datasetSource').value;
  const box=$('#datasetResults');

  if(!q){toast('Masukkan kata kunci');return}

  const keys=sel==='all'?['jakarta','nasional']:[sel];
  const items=keys.flatMap(key=>
    state.datasetCache[key]
      .filter(d=>searchableText(d).includes(q))
      .map(d=>({d,source:key}))
  );

  $('#datasetMeta').textContent=
    num(items.length)+' hasil dari snapshot lokal · '+keys.length+' sumber dipilih';

  box.innerHTML=items.length
    ?items.map(x=>datasetCard(x.d,x.source)).join('')
    :'<div class="empty-state panel"><strong>Tidak ada hasil pada snapshot saat ini</strong>'+
     '<span>Coba kata kunci lain. Snapshot katalog diperbarui otomatis.</span></div>';
}

function renderSources(){
  const ids=[
    'bmkg-weather','bmkg-earthquake','satudata-indonesia',
    'jakarta-ckan','bps-webapi','bank-indonesia','satusehat-fhir'
  ];
  const publicSources=state.sources.filter(s=>ids.includes(s.id));

  $('#activeSourceCount').textContent=publicSources.length||'—';

  $('#sourceGrid').innerHTML=publicSources.map(s=>
    '<article class="source-card panel">'+
      '<div class="source-head"><span class="source-level">'+esc(s.level==='daerah'?'Daerah':'Pusat')+'</span>'+
      '<span class="status-dot status-'+esc(s.portalStatus||'unknown')+'"></span></div>'+
      '<h3>'+esc(s.name)+'</h3>'+
      '<p>'+esc(s.description)+'</p>'+
      '<div class="source-meta"><span>'+esc(s.agency)+'</span>'+
      '<span>'+esc(s.auth==='none'?'Publik':'Perlu autentikasi')+'</span></div>'+
      '<a href="'+esc(s.portalUrl)+'" target="_blank" rel="noopener">Buka sumber resmi ↗</a>'+
    '</article>'
  ).join('');
}

async function loadRegistry(){
  try{
    state.registry=await json('./data/apis.json');
    state.sources=state.registry.sources||[];
    renderSources();
  }catch{
    state.sources=[];
    $('#activeSourceCount').textContent='—';
  }
}

async function reloadAll(){
  $('#weatherStatus').textContent='Memuat…';
  $('#quakeStatus').textContent='Memuat…';
  await Promise.allSettled([loadLiveStatus(),loadBMKG(),loadDatasetSnapshots()]);
  toast('Data dimuat ulang');
}

function bind(){
  $$('[data-route]').forEach(b=>b.onclick=()=>nav(b.dataset.route));
  addEventListener('hashchange',route);

  $('#themeToggle').onclick=toggleTheme;
  $('#refreshAll').onclick=reloadAll;

  $('#loadWeather').onclick=loadCustomWeather;
  $('#useKemayoran').onclick=()=>{
    $('#adm4Input').value='31.71.03.1001';
    if(state.weather) renderWeather(state.weather,true);
    else loadBMKG();
  };

  $$('[data-quake-tab]').forEach(b=>b.onclick=()=>{
    state.quakeTab=b.dataset.quakeTab;
    $$('[data-quake-tab]').forEach(x=>x.classList.toggle('active',x===b));
    renderQuakeList();
  });

  $('#searchDatasets').onclick=searchDatasets;
  $('#datasetQuery').onkeydown=e=>{
    if(e.key==='Enter') searchDatasets();
  };
}

async function init(){
  setTheme();
  bind();
  route();
  clock();
  setInterval(clock,30000);

  await loadRegistry();
  await Promise.allSettled([loadLiveStatus(),loadBMKG(),loadDatasetSnapshots()]);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

init();
