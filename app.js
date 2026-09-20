const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={registry:null,sources:[],weather:null,latestQuake:null,m5:[],felt:[],quakeTab:'m5'};
const BMKG={
 weather:(adm4)=>`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`,
 latest:'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
 m5:'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
 felt:'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json'
};
const DATASETS={
 jakarta:'https://satudata.jakarta.go.id/api/3/action/package_search',
 nasional:'https://data.go.id/api/3/action/package_search'
};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const num=v=>new Intl.NumberFormat('id-ID').format(Number(v)||0);
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}
function route(){const r=location.hash.slice(1)||'dashboard';$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===r));$$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===r));window.scrollTo({top:0})}
function nav(r){location.hash=r}
function setTheme(){const v=localStorage.getItem('nusadata-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=v}
function toggleTheme(){const v=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=v;localStorage.setItem('nusadata-theme',v)}
async function json(url,timeout=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
function clock(){const d=new Date();$('#liveClock').textContent=d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB'}
function weatherRows(payload){const d=payload?.data?.[0]?.cuaca||[];return d.flat(Infinity).filter(x=>x&&typeof x==='object'&&('t'in x||'weather_desc'in x))}
function weatherLoc(payload){return payload?.lokasi||payload?.data?.[0]?.lokasi||{}}
function nextForecast(rows){const now=Date.now();return rows.find(x=>new Date((x.local_datetime||x.datetime||'').replace(' ','T')).getTime()>=now-30*60*1000)||rows[0]}
function weatherIcon(desc=''){const x=desc.toLowerCase();if(x.includes('hujan'))return'🌧';if(x.includes('petir'))return'⛈';if(x.includes('berawan'))return'☁';if(x.includes('cerah'))return'☀';if(x.includes('kabut'))return'🌫';return'🌤'}
function renderWeather(payload,full=false){
 const rows=weatherRows(payload),loc=weatherLoc(payload),now=nextForecast(rows);
 if(!now)throw new Error('Format data cuaca tidak dikenali');
 if(!full){
  $('#weatherNow').classList.remove('skeleton-block');
  $('#weatherNow').innerHTML=`<div class="weather-icon">${weatherIcon(now.weather_desc)}</div><div><strong>${esc(now.t)}°</strong><span>${esc(now.weather_desc||'—')}</span><small>${esc(loc.desa||loc.kecamatan||'Kemayoran')}, ${esc(loc.kotkab||loc.provinsi||'DKI Jakarta')}</small></div><div class="weather-facts"><span>💧 ${esc(now.hu)}%</span><span>↝ ${esc(now.ws)} km/j</span></div>`;
  $('#weatherMini').innerHTML=rows.slice(0,5).map(x=>`<div><span>${new Date((x.local_datetime||x.datetime).replace(' ','T')).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span><b>${weatherIcon(x.weather_desc)} ${esc(x.t)}°</b></div>`).join('');
  $('#weatherStatus').textContent='Live';
 }else{
  $('#weatherLocation').innerHTML=`<strong>${esc(loc.desa||'Lokasi')}</strong><span>${esc([loc.kecamatan,loc.kotkab,loc.provinsi].filter(Boolean).join(' · '))}</span>`;
  $('#weatherDetail').innerHTML=rows.slice(0,24).map(x=>`<article class="forecast-item"><time>${new Date((x.local_datetime||x.datetime).replace(' ','T')).toLocaleString('id-ID',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time><div class="forecast-icon">${weatherIcon(x.weather_desc)}</div><strong>${esc(x.t)}°C</strong><span>${esc(x.weather_desc||'—')}</span><small>Kelembapan ${esc(x.hu)}% · Angin ${esc(x.ws)} km/j</small></article>`).join('');
 }
}
function quakeObj(p){return p?.Infogempa?.gempa}
function quakeCoords(q){const c=String(q?.Coordinates||'').split(',').map(Number);return c.length===2&&c.every(Number.isFinite)?c:null}
function quakeCard(q){return `<article class="quake-row"><div class="mag">M<strong>${esc(q.Magnitude)}</strong></div><div class="quake-copy"><strong>${esc(q.Wilayah)}</strong><span>${esc(q.Tanggal)} · ${esc(q.Jam)} · Kedalaman ${esc(q.Kedalaman)}</span><small>${esc(q.Potensi||q.Dirasakan||'')}</small></div></article>`}
function renderLatestQuake(q){
 $('#latestQuake').classList.remove('skeleton-block');
 $('#latestQuake').innerHTML=`<div class="magnitude"><span>M</span><strong>${esc(q.Magnitude)}</strong></div><div class="quake-copy"><strong>${esc(q.Wilayah)}</strong><span>${esc(q.Tanggal)} · ${esc(q.Jam)}</span><small>Kedalaman ${esc(q.Kedalaman)} · ${esc(q.Potensi||'')}</small></div>`;
 $('#quakeStatus').textContent='Live';
 $('#quakeHero').innerHTML=`<div class="magnitude big"><span>M</span><strong>${esc(q.Magnitude)}</strong></div><div><span class="kicker">GEMPA TERBARU</span><h2>${esc(q.Wilayah)}</h2><p>${esc(q.Tanggal)} · ${esc(q.Jam)} · Kedalaman ${esc(q.Kedalaman)}</p><div class="tag-line"><span>${esc(q.Potensi||'')}</span>${q.Dirasakan?`<span>Dirasakan: ${esc(q.Dirasakan)}</span>`:''}</div></div>`;
}
function renderQuakeList(){const a=state.quakeTab==='felt'?state.felt:state.m5;$('#quakeList').innerHTML=a.length?a.map(quakeCard).join(''):'<div class="empty-inline">Data belum tersedia.</div>'}
async function loadBMKG(){
 const adm4=$('#adm4Input')?.value.trim()||'31.71.03.1001';
 const tasks=await Promise.allSettled([json(BMKG.weather(adm4)),json(BMKG.latest),json(BMKG.m5),json(BMKG.felt)]);
 if(tasks[0].status==='fulfilled'){state.weather=tasks[0].value;renderWeather(state.weather);renderWeather(state.weather,true)}else{$('#weatherStatus').textContent='Tidak terbaca';$('#weatherNow').classList.remove('skeleton-block');$('#weatherNow').innerHTML='<div class="error-box">Data cuaca tidak dapat dimuat dari browser.</div>'}
 if(tasks[1].status==='fulfilled'){state.latestQuake=quakeObj(tasks[1].value);renderLatestQuake(state.latestQuake)}else{$('#quakeStatus').textContent='Tidak terbaca';$('#latestQuake').innerHTML='<div class="error-box">Feed gempa gagal dimuat.</div>'}
 if(tasks[2].status==='fulfilled')state.m5=quakeObj(tasks[2].value)||[];
 if(tasks[3].status==='fulfilled')state.felt=quakeObj(tasks[3].value)||[];
 $('#dashboardQuakes').innerHTML=(state.m5||[]).slice(0,6).map(quakeCard).join('')||'<div class="empty-inline">Data gempa belum tersedia.</div>';
 renderQuakeList();
}
function sourceName(k){return k==='jakarta'?'Satu Data Jakarta':'Satu Data Indonesia'}
async function queryPortal(key,q='',rows=12,sort='metadata_modified desc'){
 const base=DATASETS[key],u=new URL(base);if(q)u.searchParams.set('q',q);u.searchParams.set('rows',rows);u.searchParams.set('sort',sort);
 const p=await json(u.toString(),10000);if(!p?.success||!p?.result)throw new Error('Format katalog tidak dikenali');
 return {key,count:p.result.count||0,items:p.result.results||[]};
}
function datasetCard(d,source){
 const org=d.organization?.title||d.maintainer||sourceName(source),date=d.metadata_modified?new Date(d.metadata_modified).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';
 const url=source==='jakarta'?`https://satudata.jakarta.go.id/open-data`:`https://data.go.id/dataset/${encodeURIComponent(d.name||'')}`;
 return `<article class="dataset-card panel"><div class="dataset-top"><span>${esc(sourceName(source))}</span><small>${esc(date)}</small></div><h3>${esc(d.title||d.name||'Dataset')}</h3><p>${esc((d.notes||'').replace(/<[^>]*>/g,'').slice(0,180)||'Dataset publik pemerintah.')}</p><div class="dataset-foot"><span>${esc(org)}</span><a href="${esc(url)}" target="_blank" rel="noopener">Buka sumber ↗</a></div></article>`;
}
async function loadDashboardDatasets(){
 const box=$('#dashboardDatasets');
 const calls=await Promise.allSettled([queryPortal('jakarta','',6),queryPortal('nasional','',6)]);
 const good=calls.filter(x=>x.status==='fulfilled').map(x=>x.value);
 if(!good.length){box.innerHTML='<div class="empty-inline">Portal dataset menolak akses langsung dari browser saat ini. Gunakan tab Dataset untuk mencoba pencarian.</div>';return}
 const items=good.flatMap(g=>g.items.slice(0,3).map(d=>({d,source:g.key}))).slice(0,6);
 box.innerHTML=items.map(x=>datasetCard(x.d,x.source)).join('');
}
async function searchDatasets(){
 const q=$('#datasetQuery').value.trim(),sel=$('#datasetSource').value,keys=sel==='all'?['jakarta','nasional']:[sel],box=$('#datasetResults');
 if(!q){toast('Masukkan kata kunci');return}
 box.innerHTML='<div class="empty-state panel"><strong>Mencari data…</strong><span>Menghubungi portal pemerintah.</span></div>';
 const calls=await Promise.allSettled(keys.map(k=>queryPortal(k,q,20,'score desc, metadata_modified desc')));
 const good=calls.filter(x=>x.status==='fulfilled').map(x=>x.value),bad=calls.length-good.length,total=good.reduce((a,b)=>a+b.count,0);
 $('#datasetMeta').textContent=`${num(total)} dataset ditemukan · ${good.length} sumber merespons${bad?' · '+bad+' sumber tidak terbaca':''}`;
 const items=good.flatMap(g=>g.items.map(d=>({d,source:g.key})));
 box.innerHTML=items.length?items.map(x=>datasetCard(x.d,x.source)).join(''):'<div class="empty-state panel"><strong>Tidak ada hasil yang dapat ditampilkan</strong><span>Portal mungkin tidak memberi akses CORS atau tidak menemukan kata kunci tersebut.</span></div>';
}
function renderSources(){
 const publicSources=state.sources.filter(s=>['bmkg-weather','bmkg-earthquake','satudata-indonesia','jakarta-ckan','bps-webapi','bank-indonesia','satusehat-fhir'].includes(s.id));
 $('#activeSourceCount').textContent=publicSources.length;
 $('#sourceGrid').innerHTML=publicSources.map(s=>`<article class="source-card panel"><div class="source-head"><span class="source-level">${esc(s.level==='daerah'?'Daerah':'Pusat')}</span><span class="status-dot status-${esc(s.portalStatus||'unknown')}"></span></div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="source-meta"><span>${esc(s.agency)}</span><span>${esc(s.auth==='none'?'Publik':'Perlu autentikasi')}</span></div><a href="${esc(s.portalUrl)}" target="_blank" rel="noopener">Buka sumber resmi ↗</a></article>`).join('');
}
async function loadRegistry(){try{state.registry=await json('./data/apis.json');state.sources=state.registry.sources||[];renderSources()}catch{state.sources=[];$('#activeSourceCount').textContent='—'}}
function bind(){
 $$('[data-route]').forEach(b=>b.onclick=()=>nav(b.dataset.route));addEventListener('hashchange',route);
 $('#themeToggle').onclick=toggleTheme;$('#refreshAll').onclick=()=>{loadBMKG();loadDashboardDatasets();toast('Memuat ulang data')};
 $('#loadWeather').onclick=()=>loadBMKG();$('#useKemayoran').onclick=()=>{$('#adm4Input').value='31.71.03.1001';loadBMKG()};
 $$('[data-quake-tab]').forEach(b=>b.onclick=()=>{state.quakeTab=b.dataset.quakeTab;$$('[data-quake-tab]').forEach(x=>x.classList.toggle('active',x===b));renderQuakeList()});
 $('#searchDatasets').onclick=searchDatasets;$('#datasetQuery').onkeydown=e=>{if(e.key==='Enter')searchDatasets()};
}
async function init(){setTheme();bind();route();clock();setInterval(clock,30000);await loadRegistry();loadBMKG();loadDashboardDatasets();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}
init();