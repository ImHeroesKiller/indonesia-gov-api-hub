const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={
  sources:[],
  weather:null,
  latestQuake:null,
  m5:[],
  felt:[],
  quakeTab:'m5',
  bigCount:0,
  bigSamples:[],
  catalogs:{banten:{count:0,items:[]},grobogan:{count:0,items:[]}},
  catalogTab:'banten',
  foodstation:[],
  pamComplaints:[],
  waskita:[],
  status:null
};

const LIVE={
  weather:'./live/weather-kemayoran.json',
  latest:'./live/earthquake-latest.json',
  m5:'./live/earthquake-m5.json',
  felt:'./live/earthquake-felt.json',
  bigCount:'./live/big-village-count.json',
  bigSample:'./live/big-village-sample.json',
  banten:'./live/banten-datasets.json',
  grobogan:'./live/grobogan-datasets.json',
  foodstation:'./live/foodstation-products.json',
  pamjaya:'./live/pamjaya-complaints.json',
  waskita:'./live/waskita-posts.json',
  status:'./live/status.json'
};

const esc=v=>String(v??'')
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;')
  .replaceAll("'","&#039;");

const fmt=v=>new Intl.NumberFormat('id-ID').format(Number(v)||0);

function toast(m){
  const e=$('#toast');
  e.textContent=m;
  e.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>e.classList.remove('show'),2200);
}

function route(){
  const requested=location.hash.slice(1)||'dashboard';
  const valid=['dashboard','weather','earthquake','data','sources'];
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
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const sep=url.includes('?')?'&':'?';
    const r=await fetch(url+sep+'_ts='+Date.now(),{
      signal:c.signal,
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{
    clearTimeout(t);
  }
}

function clock(){
  const d=new Date();
  $('#liveClock').textContent=d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';
}

function parseLocalTime(v=''){
  const d=new Date(String(v).replace(' ','T'));
  return Number.isNaN(d.getTime())?null:d;
}

function weatherRows(p){
  const d=p?.data?.[0]?.cuaca||[];
  return d.flat(Infinity).filter(x=>x&&typeof x==='object'&&('t'in x||'weather_desc'in x));
}

function weatherLoc(p){
  return p?.lokasi||p?.data?.[0]?.lokasi||{};
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
    weekday:'short',
    day:'numeric',
    month:'short',
    hour:'2-digit',
    minute:'2-digit'
  }):'—';
}

function renderWeather(p,full=false){
  const rows=weatherRows(p),loc=weatherLoc(p),now=nextForecast(rows);
  if(!now)throw new Error('Format data cuaca tidak dikenali');

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

    $('#weatherStatus').textContent='Verified';
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
    '<div class="quake-copy">'+
    '<strong>'+esc(q.Wilayah)+'</strong>'+
    '<span>'+esc(q.Tanggal)+' · '+esc(q.Jam)+' · Kedalaman '+esc(q.Kedalaman)+'</span>'+
    '<small>'+esc(q.Potensi||q.Dirasakan||'')+'</small>'+
    '</div>'+
  '</article>';
}

function renderLatestQuake(q){
  if(!q)throw new Error('Data gempa kosong');

  $('#latestQuake').classList.remove('skeleton-block');
  $('#latestQuake').innerHTML=
    '<div class="magnitude"><span>M</span><strong>'+esc(q.Magnitude)+'</strong></div>'+
    '<div class="quake-copy">'+
      '<strong>'+esc(q.Wilayah)+'</strong>'+
      '<span>'+esc(q.Tanggal)+' · '+esc(q.Jam)+'</span>'+
      '<small>Kedalaman '+esc(q.Kedalaman)+' · '+esc(q.Potensi||'')+'</small>'+
    '</div>';

  $('#quakeStatus').textContent='Verified';

  $('#quakeHero').innerHTML=
    '<div class="magnitude big"><span>M</span><strong>'+esc(q.Magnitude)+'</strong></div>'+
    '<div><span class="kicker">GEMPA TERBARU</span>'+
      '<h2>'+esc(q.Wilayah)+'</h2>'+
      '<p>'+esc(q.Tanggal)+' · '+esc(q.Jam)+' · Kedalaman '+esc(q.Kedalaman)+'</p>'+
      '<div class="tag-line"><span>'+esc(q.Potensi||'')+'</span>'+
      (q.Dirasakan?'<span>Dirasakan: '+esc(q.Dirasakan)+'</span>':'')+
      '</div>'+
    '</div>';
}

function renderQuakeList(){
  const a=state.quakeTab==='felt'?state.felt:state.m5;
  $('#quakeList').innerHTML=a.length
    ?a.map(quakeCard).join('')
    :'<div class="empty-inline">Data belum tersedia.</div>';
}

function errorBox(m){
  return '<div class="error-box">'+esc(m)+'</div>';
}

async function loadStatus(){
  try{
    const s=await json(LIVE.status,8000);
    state.status=s;
    if(s.generated_at){
      const d=new Date(s.generated_at);
      const label='Snapshot '+d.toLocaleString('id-ID',{
        day:'numeric',
        month:'short',
        hour:'2-digit',
        minute:'2-digit',
        timeZone:'Asia/Jakarta'
      })+' WIB';
      $('#weatherStatus').title=label;
      $('#quakeStatus').title=label;
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

  if(tasks[0].status==='fulfilled'){
    state.weather=tasks[0].value;
    try{
      renderWeather(state.weather);
      renderWeather(state.weather,true);
    }catch(e){
      $('#weatherStatus').textContent='Invalid';
      $('#weatherNow').classList.remove('skeleton-block');
      $('#weatherNow').innerHTML=errorBox(e.message);
    }
  }else{
    $('#weatherStatus').textContent='Unavailable';
    $('#weatherNow').classList.remove('skeleton-block');
    $('#weatherNow').innerHTML=errorBox('Snapshot REST cuaca belum tersedia.');
    $('#weatherDetail').innerHTML=errorBox('Data cuaca belum tersedia.');
  }

  if(tasks[1].status==='fulfilled'){
    state.latestQuake=quakeObj(tasks[1].value);
    try{
      renderLatestQuake(state.latestQuake);
    }catch(e){
      $('#quakeStatus').textContent='Invalid';
      $('#latestQuake').classList.remove('skeleton-block');
      $('#latestQuake').innerHTML=errorBox(e.message);
    }
  }else{
    $('#quakeStatus').textContent='Unavailable';
    $('#latestQuake').classList.remove('skeleton-block');
    $('#latestQuake').innerHTML=errorBox('Snapshot gempa belum tersedia.');
    $('#quakeHero').innerHTML=errorBox('Data gempa terbaru belum tersedia.');
  }

  const m5=tasks[2].status==='fulfilled'?quakeObj(tasks[2].value):[];
  const felt=tasks[3].status==='fulfilled'?quakeObj(tasks[3].value):[];

  state.m5=Array.isArray(m5)?m5:(m5?[m5]:[]);
  state.felt=Array.isArray(felt)?felt:(felt?[felt]:[]);

  $('#dashboardQuakes').innerHTML=state.m5.slice(0,6).map(quakeCard).join('')||
    '<div class="empty-inline">Data gempa belum tersedia.</div>';

  renderQuakeList();
}

function renderBIG(){
  $('#bigSummaryCount').textContent=fmt(state.bigCount);
  $('#bigCount').textContent=fmt(state.bigCount);
  $('#bigSampleCount').textContent=fmt(state.bigSamples.length);

  $('#bigSamples').innerHTML=state.bigSamples.length
    ?state.bigSamples.map(x=>{
      const a=x.attributes||{};
      return '<article class="region-row">'+
        '<div><strong>'+esc(a.WADMKD||a.NAMOBJ||'—')+'</strong>'+
        '<span>'+esc([a.WADMKC,a.WADMKK,a.WADMPR].filter(Boolean).join(' · '))+'</span></div>'+
        '<code>'+esc(a.KDEPUM||'—')+'</code>'+
      '</article>';
    }).join('')
    :'<div class="empty-inline">Data contoh wilayah belum tersedia.</div>';
}

function cleanText(v=''){
  return String(v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}

function catalogName(key){
  return key==='banten'?'Satu Data Banten':'Open Data Grobogan';
}

function catalogBase(key){
  return key==='banten'
    ?'https://data.bantenprov.go.id/dataset/'
    :'https://opendata.grobogan.go.id/dataset/';
}

function datasetCard(d,key){
  const org=d.organization?.title||d.author||'Instansi pemerintah';
  const modified=d.metadata_modified
    ?new Date(d.metadata_modified).toLocaleDateString('id-ID',{
      day:'numeric',month:'short',year:'numeric'
    })
    :'';
  const formats=[...new Set((d.resources||[]).map(r=>r.format).filter(Boolean))].slice(0,4);

  return '<article class="dataset-card panel">'+
    '<div class="dataset-top"><span>'+esc(catalogName(key))+'</span><small>'+esc(modified)+'</small></div>'+
    '<h3>'+esc(d.title||d.name||'Dataset')+'</h3>'+
    '<p>'+esc(cleanText(d.notes||'').slice(0,180)||'Dataset publik pemerintah daerah.')+'</p>'+
    '<div class="format-row">'+formats.map(f=>'<span>'+esc(f)+'</span>').join('')+'</div>'+
    '<div class="dataset-foot"><span>'+esc(org)+'</span>'+
    '<a href="'+esc(catalogBase(key)+(d.name||''))+'" target="_blank" rel="noopener">Buka dataset ↗</a></div>'+
  '</article>';
}

function renderCatalog(){
  const key=state.catalogTab;
  const c=state.catalogs[key];

  $$('[data-catalog-tab]').forEach(b=>b.classList.toggle('active',b.dataset.catalogTab===key));

  $('#catalogMeta').textContent=
    fmt(c.count)+' dataset publik · '+catalogName(key)+' · snapshot terbaru';

  $('#catalogGrid').innerHTML=c.items.length
    ?c.items.map(d=>datasetCard(d,key)).join('')
    :'<div class="empty-inline">Dataset belum tersedia pada snapshot ini.</div>';
}

function renderCatalogSummary(){
  const b=state.catalogs.banten;
  const g=state.catalogs.grobogan;

  $('#bantenSummaryCount').textContent=fmt(b.count);
  $('#groboganSummaryCount').textContent=fmt(g.count);

  $('#bantenLatest').textContent=b.items[0]
    ?'Terbaru: '+(b.items[0].title||b.items[0].name)
    :'Belum ada snapshot dataset.';

  $('#groboganLatest').textContent=g.items[0]
    ?'Terbaru: '+(g.items[0].title||g.items[0].name)
    :'Belum ada snapshot dataset.';
}

async function loadAdditionalData(){
  const tasks=await Promise.allSettled([
    json(LIVE.bigCount),
    json(LIVE.bigSample),
    json(LIVE.banten),
    json(LIVE.grobogan)
  ]);

  if(tasks[0].status==='fulfilled'){
    state.bigCount=Number(tasks[0].value?.count)||0;
  }

  if(tasks[1].status==='fulfilled'){
    state.bigSamples=Array.isArray(tasks[1].value?.features)
      ?tasks[1].value.features
      :[];
  }

  if(tasks[2].status==='fulfilled'&&tasks[2].value?.success){
    state.catalogs.banten={
      count:Number(tasks[2].value?.result?.count)||0,
      items:Array.isArray(tasks[2].value?.result?.results)
        ?tasks[2].value.result.results
        :[]
    };
  }

  if(tasks[3].status==='fulfilled'&&tasks[3].value?.success){
    state.catalogs.grobogan={
      count:Number(tasks[3].value?.result?.count)||0,
      items:Array.isArray(tasks[3].value?.result?.results)
        ?tasks[3].value.result.results
        :[]
    };
  }

  renderBIG();
  renderCatalogSummary();
  renderCatalog();
}


function idr(value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)return'Harga belum tersedia';
  return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
}

function decodeText(v=''){
  const el=document.createElement('textarea');
  el.innerHTML=String(v);
  return el.value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}

function renderEnterpriseData(){
  const food=state.foodstation;
  const pam=state.pamComplaints;
  const wk=state.waskita;

  $('#foodstationCount').textContent=fmt(food.length);
  $('#waskitaCount').textContent=fmt(wk.length);

  const pamRows=pam.map(x=>x.attributes||{});
  const pamTotal=pamRows.reduce((sum,a)=>sum+(Number(a.sum_keluha??a.SUM_Keluha)||0),0);
  $('#pamComplaintTotal').textContent=fmt(pamTotal);

  $('#foodstationProducts').innerHTML=food.length
    ?food.slice(0,12).map(p=>{
      const minor=10**(Number(p.prices?.currency_minor_unit)||0);
      const price=(Number(p.prices?.price)||0)/minor;
      const category=(p.categories||[])[0]?.name||'Produk pangan';
      const stock=p.is_in_stock?'Tersedia':'Stok habis';
      return '<article class="product-data-card">'+
        '<div class="product-data-top"><span>'+esc(category)+'</span><small>'+esc(stock)+'</small></div>'+
        '<strong>'+esc(decodeText(p.name||'Produk Food Station'))+'</strong>'+
        '<b>'+esc(idr(price))+'</b>'+
        '<a href="'+esc(p.permalink||'https://foodstation.id/shop/')+'" target="_blank" rel="noopener">Lihat produk ↗</a>'+
      '</article>';
    }).join('')
    :'<div class="empty-inline">Katalog Food Station belum tersedia.</div>';

  const topPam=[...pamRows]
    .sort((a,b)=>(Number(b.sum_keluha??b.SUM_Keluha)||0)-(Number(a.sum_keluha??a.SUM_Keluha)||0))
    .slice(0,10);

  $('#pamjayaTop').innerHTML=topPam.length
    ?topPam.map(a=>
      '<article class="region-row">'+
        '<div><strong>'+esc(a.kelurahan||a.KELURAHAN||'—')+'</strong>'+
        '<span>'+esc([a.kecamatan||a.KECAMATAN,a.kotamadya||a.KOTAMADYA].filter(Boolean).join(' · '))+'</span></div>'+
        '<code>'+fmt(a.sum_keluha??a.SUM_Keluha??0)+' keluhan</code>'+
      '</article>'
    ).join('')
    :'<div class="empty-inline">Agregat keluhan PAM JAYA belum tersedia.</div>';

  $('#waskitaPosts').innerHTML=wk.length
    ?wk.slice(0,8).map(p=>{
      const date=p.date?new Date(p.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';
      return '<article class="news-data-row">'+
        '<div><small>'+esc(date)+'</small><strong>'+esc(decodeText(p.title?.rendered||'Publikasi Waskita'))+'</strong>'+
        '<p>'+esc(decodeText(p.excerpt?.rendered||'').slice(0,150))+'</p></div>'+
        '<a href="'+esc(p.link||'https://www.waskita.co.id/')+'" target="_blank" rel="noopener">Buka ↗</a>'+
      '</article>';
    }).join('')
    :'<div class="empty-inline">Publikasi Waskita belum tersedia.</div>';
}

async function loadEnterpriseData(){
  const tasks=await Promise.allSettled([
    json(LIVE.foodstation),
    json(LIVE.pamjaya),
    json(LIVE.waskita)
  ]);

  state.foodstation=tasks[0].status==='fulfilled'&&Array.isArray(tasks[0].value)
    ?tasks[0].value:[];
  state.pamComplaints=tasks[1].status==='fulfilled'&&Array.isArray(tasks[1].value?.features)
    ?tasks[1].value.features:[];
  state.waskita=tasks[2].status==='fulfilled'&&Array.isArray(tasks[2].value)
    ?tasks[2].value:[];

  renderEnterpriseData();
}


const sourceStatusKey={
  'bmkg-weather':'bmkg_weather',
  'bmkg-earthquake':'bmkg_earthquake',
  'big-admin-boundaries':'big_admin_boundaries',
  'banten-ckan':'banten_ckan',
  'grobogan-ckan':'grobogan_ckan',
  'foodstation-store':'foodstation_store',
  'pamjaya-complaints':'pamjaya_complaints',
  'waskita-posts':'waskita_posts'
};

function setText(id,value){
  const el=$(id);
  if(el)el.textContent=value;
}

function snapshotAge(v){
  if(!v)return'Menunggu snapshot';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return'Waktu snapshot tidak valid';
  const mins=Math.max(0,Math.round((Date.now()-d.getTime())/60000));
  if(mins<2)return'Baru saja';
  if(mins<60)return mins+' menit lalu';
  const hours=Math.floor(mins/60);
  if(hours<24)return hours+' jam lalu';
  return Math.floor(hours/24)+' hari lalu';
}

function renderDashboard(){
  const datasetTotal=(state.catalogs.banten.count||0)+(state.catalogs.grobogan.count||0);
  const pamRows=state.pamComplaints.map(x=>x.attributes||{});
  const pamTotal=pamRows.reduce((sum,a)=>sum+(Number(a.sum_keluha??a.SUM_Keluha)||0),0);

  setText('#dashboardDatasetCount',fmt(datasetTotal));
  setText('#dashboardM5Count',fmt(state.m5.length));
  setText('#dashboardPamTotal',fmt(pamTotal));
  setText('#dashboardFoodCount',fmt(state.foodstation.length));
  setText('#dashboardPamAreas',fmt(pamRows.length));
  setText('#dashboardWaskitaCount',fmt(state.waskita.length));

  const status=state.status?.sources||{};
  const statusEntries=Object.entries(status);
  const healthy=statusEntries.filter(([,v])=>v===true).length;
  const total=statusEntries.length||state.sources.length||0;
  const score=total?Math.round(healthy/total*100):0;

  setText('#dashboardHealth',total?score+'%':'—');
  setText('#dashboardHealthText',total?healthy+'/'+total+' sumber sehat':'Status belum tersedia');
  setText('#dashboardHealthBadge',total?healthy+'/'+total+' healthy':'Memuat…');
  setText('#dashboardUpdated',state.status?.generated_at?snapshotAge(state.status.generated_at):'Menunggu snapshot');

  const collections=[
    {label:'Wilayah BIG',value:state.bigCount,unit:'fitur'},
    {label:'Dataset Banten',value:state.catalogs.banten.count,unit:'dataset'},
    {label:'Dataset Grobogan',value:state.catalogs.grobogan.count,unit:'dataset'},
    {label:'PAM JAYA',value:pamRows.length,unit:'wilayah'},
    {label:'Food Station',value:state.foodstation.length,unit:'produk'},
    {label:'Waskita',value:state.waskita.length,unit:'publikasi'},
    {label:'Gempa M5+',value:state.m5.length,unit:'kejadian'}
  ].filter(x=>Number(x.value)>0);

  const maxLog=Math.max(1,...collections.map(x=>Math.log10(Number(x.value)+1)));
  const bars=$('#dashboardCoverageBars');
  if(bars){
    bars.innerHTML=collections.length?collections.map(x=>{
      const pct=Math.max(8,Math.round(Math.log10(Number(x.value)+1)/maxLog*100));
      return '<div class="coverage-row">'+
        '<div class="coverage-label"><span>'+esc(x.label)+'</span><strong>'+fmt(x.value)+' '+esc(x.unit)+'</strong></div>'+
        '<div class="coverage-track"><i style="width:'+pct+'%"></i></div>'+
      '</div>';
    }).join(''):'<div class="empty-inline">Volume snapshot belum tersedia.</div>';
  }

  const gov=state.sources.filter(s=>!s.ownership).length;
  const bumn=state.sources.filter(s=>s.ownership==='BUMN').length;
  const bumd=state.sources.filter(s=>s.ownership==='BUMD').length;
  const mix=$('#dashboardSourceMix');
  if(mix){
    const groups=[
      {label:'Pemerintah',value:gov},
      {label:'BUMN',value:bumn},
      {label:'BUMD',value:bumd}
    ];
    mix.innerHTML=groups.map(g=>
      '<div class="mix-card"><strong>'+fmt(g.value)+'</strong><span>'+esc(g.label)+'</span>'+
      '<small>'+Math.round((g.value/Math.max(1,state.sources.length))*100)+'% sumber</small></div>'
    ).join('');
  }

  const datasets=[
    ...state.catalogs.banten.items.map(d=>({...d,_source:'Banten',_key:'banten'})),
    ...state.catalogs.grobogan.items.map(d=>({...d,_source:'Grobogan',_key:'grobogan'}))
  ].sort((a,b)=>new Date(b.metadata_modified||0)-new Date(a.metadata_modified||0)).slice(0,6);

  const datasetFeed=$('#dashboardDatasets');
  if(datasetFeed){
    datasetFeed.innerHTML=datasets.length?datasets.map(d=>{
      const date=d.metadata_modified?new Date(d.metadata_modified).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'—';
      return '<a class="feed-row" href="'+esc(catalogBase(d._key)+(d.name||''))+'" target="_blank" rel="noopener">'+
        '<div><span>'+esc(d._source)+' · '+esc(date)+'</span><strong>'+esc(d.title||d.name||'Dataset')+'</strong></div>'+
        '<b>↗</b></a>';
    }).join(''):'<div class="empty-inline">Dataset terbaru belum tersedia.</div>';
  }

  const topPam=[...pamRows].sort((a,b)=>(Number(b.sum_keluha??b.SUM_Keluha)||0)-(Number(a.sum_keluha??a.SUM_Keluha)||0))[0];
  const inStock=state.foodstation.filter(p=>p.is_in_stock).length;
  const latestWaskita=state.waskita[0];
  const latestWaskitaDate=latestWaskita?.date?new Date(latestWaskita.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—';

  const highlights=$('#dashboardEnterpriseHighlights');
  if(highlights){
    highlights.innerHTML=[
      '<div><span>Food Station tersedia</span><strong>'+fmt(inStock)+' / '+fmt(state.foodstation.length)+'</strong><small>produk berstatus in-stock</small></div>',
      '<div><span>PAM tertinggi</span><strong>'+esc(topPam?.kelurahan||topPam?.KELURAHAN||'—')+'</strong><small>'+fmt(topPam?.sum_keluha??topPam?.SUM_Keluha??0)+' keluhan agregat</small></div>',
      '<div><span>Waskita terbaru</span><strong>'+esc(latestWaskitaDate)+'</strong><small>'+esc(decodeText(latestWaskita?.title?.rendered||'Belum tersedia').slice(0,55))+'</small></div>'
    ].join('');
  }

  const enterpriseFeed=$('#dashboardEnterpriseFeed');
  if(enterpriseFeed){
    const corporate=state.waskita.slice(0,3).map(p=>({
      label:'BUMN · Waskita',
      title:decodeText(p.title?.rendered||'Publikasi Waskita'),
      meta:p.date?new Date(p.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'',
      href:p.link||'https://www.waskita.co.id/'
    }));
    const products=state.foodstation.slice(0,3).map(p=>{
      const minor=10**(Number(p.prices?.currency_minor_unit)||0);
      const price=(Number(p.prices?.price)||0)/minor;
      return {
        label:'BUMD · Food Station',
        title:decodeText(p.name||'Produk Food Station'),
        meta:(p.is_in_stock?'Tersedia':'Stok habis')+' · '+idr(price),
        href:p.permalink||'https://foodstation.id/shop/'
      };
    });
    enterpriseFeed.innerHTML=[...corporate,...products].map(x=>
      '<a class="feed-row" href="'+esc(x.href)+'" target="_blank" rel="noopener">'+
        '<div><span>'+esc(x.label)+' · '+esc(x.meta)+'</span><strong>'+esc(x.title)+'</strong></div><b>↗</b></a>'
    ).join('')||'<div class="empty-inline">Feed BUMN/BUMD belum tersedia.</div>';
  }

  const healthGrid=$('#dashboardSourceHealth');
  if(healthGrid){
    healthGrid.innerHTML=state.sources.map(s=>{
      const key=sourceStatusKey[s.id];
      const has=key&&Object.prototype.hasOwnProperty.call(status,key);
      const ok=has?status[key]===true:null;
      const label=ok===true?'Healthy':ok===false?'Unavailable':'Unknown';
      const klass=ok===true?'health-ok':ok===false?'health-bad':'health-unknown';
      return '<article class="health-card '+klass+'">'+
        '<div><i></i><span>'+esc(s.ownership||s.level||'Pemerintah')+'</span></div>'+
        '<strong>'+esc(s.name)+'</strong>'+
        '<small>'+esc(s.type)+' · '+label+'</small>'+
      '</article>';
    }).join('');
  }
}

function renderSources(){
  $('#activeSourceCount').textContent=state.sources.length||'—';

  $('#sourceGrid').innerHTML=state.sources.map(s=>
    '<article class="source-card panel">'+
      '<div class="source-head">'+
        '<span class="source-level">'+esc(s.ownership?`${s.ownership} · PUBLIC`:'PUBLIC · NO AUTH')+'</span>'+
        '<span class="status-dot status-up"></span>'+
      '</div>'+
      '<h3>'+esc(s.name)+'</h3>'+
      '<p>'+esc(s.description)+'</p>'+
      '<div class="source-meta"><span>'+esc(s.agency)+'</span><span>'+esc(s.type)+'</span></div>'+
      '<a href="'+esc(s.portalUrl)+'" target="_blank" rel="noopener">Sumber resmi ↗</a>'+
    '</article>'
  ).join('');
}

async function loadRegistry(){
  const r=await json('./data/apis.json');
  state.sources=(r.sources||[]).filter(s=>s.auth==='none');
  const enterpriseCount=state.sources.filter(s=>s.ownership==='BUMN'||s.ownership==='BUMD').length;
  if($('#enterpriseSummaryCount'))$('#enterpriseSummaryCount').textContent=fmt(enterpriseCount);
  renderSources();
}

async function reloadAll(){
  $('#weatherStatus').textContent='Memuat…';
  $('#quakeStatus').textContent='Memuat…';

  await Promise.allSettled([
    loadStatus(),
    loadBMKG(),
    loadAdditionalData(),
    loadEnterpriseData(),
    loadRegistry()
  ]);
  renderDashboard();

  toast('Data publik dimuat ulang');
}

function bind(){
  $$('[data-route]').forEach(b=>b.onclick=()=>nav(b.dataset.route));
  addEventListener('hashchange',route);

  $('#themeToggle').onclick=toggleTheme;
  $('#refreshAll').onclick=reloadAll;

  $$('[data-quake-tab]').forEach(b=>b.onclick=()=>{
    state.quakeTab=b.dataset.quakeTab;
    $$('[data-quake-tab]').forEach(x=>x.classList.toggle('active',x===b));
    renderQuakeList();
  });

  $$('[data-catalog-tab]').forEach(b=>b.onclick=()=>{
    state.catalogTab=b.dataset.catalogTab;
    renderCatalog();
  });
}

async function init(){
  setTheme();
  bind();
  route();
  clock();
  setInterval(clock,30000);

  await Promise.allSettled([
    loadRegistry(),
    loadStatus(),
    loadBMKG(),
    loadAdditionalData(),
    loadEnterpriseData()
  ]);
  renderDashboard();

  if('serviceWorker'in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

init();