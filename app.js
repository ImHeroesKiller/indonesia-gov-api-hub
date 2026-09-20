const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={rates:null,selectedRegion:null};
const DATA_URL='./data/business-rates.json';
const rupiah=v=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v)||0);
const pct=v=>(Number(v)*100).toFixed(2).replace(/\.00$/,'')+'%';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");

async function loadJSON(url){
  const r=await fetch(url+'?ts='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}
function setTheme(){
  const v=localStorage.getItem('nusadata-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=v;
}
function toggleTheme(){
  const v=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=v;
  localStorage.setItem('nusadata-theme',v);
}
function clock(){
  const el=$('#liveClock'); if(el)el.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';
}
function route(){
  const valid=['overview','payroll','tax','sources'];
  const r=valid.includes(location.hash.slice(1))?location.hash.slice(1):'overview';
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===r));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
  window.scrollTo({top:0});
}
function bindNav(){
  $$('[data-route]').forEach(b=>b.onclick=()=>location.hash=b.dataset.route);
  addEventListener('hashchange',route);
  $('#themeToggle').onclick=toggleTheme;
}

function wageBenchmark(region,useSectoral=false){
  if(!region)return 0;
  return useSectoral&&region.sectoral?Number(region.sectoral):Number(region.value);
}
function renderWageBenchmarks(){
  const el=$('#wageBenchmarkGrid'); if(!el)return;
  el.innerHTML=state.rates.wages_2026.map(w=>{
    const sec=w.sectoral?'<small>'+esc(w.sectoral_label||'UMSK')+' '+rupiah(w.sectoral)+'</small>':'<small>2026 official benchmark</small>';
    return '<article class="wage-card"><div><span>'+esc(w.type)+'</span><strong>'+rupiah(w.value)+'</strong></div><b>'+esc(w.region)+'</b>'+sec+'</article>';
  }).join('');
}

function populatePayrollControls(){
  const rs=$('#regionSelect');
  rs.innerHTML=state.rates.wages_2026.map(w=>'<option value="'+esc(w.key)+'">'+esc(w.region)+' · '+esc(w.type)+' '+rupiah(w.value)+'</option>').join('');
  const js=$('#jkkSelect');
  js.innerHTML=state.rates.bpjs.employment.jkk.rates.map(x=>'<option value="'+esc(x.key)+'">'+esc(x.label)+' · '+pct(x.rate)+'</option>').join('');
  rs.value=state.rates.wages_2026[0].key;
  js.value='very_low';
  selectRegion(true);
}
function selectRegion(resetSalary=false){
  const key=$('#regionSelect').value;
  state.selectedRegion=state.rates.wages_2026.find(x=>x.key===key)||state.rates.wages_2026[0];
  const wrap=$('#sectoralWrap');
  wrap.classList.toggle('hidden',!state.selectedRegion.sectoral);
  if(!state.selectedRegion.sectoral)$('#useSectoral').checked=false;
  const min=wageBenchmark(state.selectedRegion,$('#useSectoral').checked);
  $('#minimumWageHint').textContent=(state.selectedRegion.sectoral&&$('#useSectoral').checked?'UMSK':'Minimum wage')+' '+rupiah(min);
  if(resetSalary||!Number($('#salaryInput').value))$('#salaryInput').value=Math.round(min);
  calcPayroll();
}
function jkkRate(){
  const key=$('#jkkSelect').value;
  return Number(state.rates.bpjs.employment.jkk.rates.find(x=>x.key===key)?.rate||0);
}
function payrollNumbers(){
  const salary=Math.max(0,Number($('#salaryInput').value)||0);
  const headcount=Math.max(1,Number($('#headcountInput').value)||1);
  const minWage=wageBenchmark(state.selectedRegion,$('#useSectoral').checked);
  const b=state.rates.bpjs;
  const healthBase=Math.min(salary,Number(b.health.wage_ceiling));
  const jpBase=Math.min(salary,Number(b.employment.jp.wage_ceiling_current));
  const employer={
    health:healthBase*b.health.employer_rate,
    jht:salary*b.employment.jht.employer_rate,
    jp:jpBase*b.employment.jp.employer_rate,
    jkm:salary*b.employment.jkm.employer_rate,
    jkk:salary*jkkRate()
  };
  employer.bpjs=Object.values(employer).reduce((s,x)=>s+x,0);
  employer.thr=$('#includeThr').checked?salary/12:0;
  employer.total=salary+employer.bpjs+employer.thr;
  const employee={
    health:healthBase*b.health.employee_rate,
    jht:salary*b.employment.jht.employee_rate,
    jp:jpBase*b.employment.jp.employee_rate
  };
  employee.total=employee.health+employee.jht+employee.jp;
  employee.netBeforeTax=salary-employee.total;
  return{salary,headcount,minWage,employer,employee};
}
function calcPayroll(){
  if(!state.rates||!state.selectedRegion)return;
  const n=payrollNumbers();
  const compliant=n.salary>=n.minWage;
  $('#wageCompliance').textContent=compliant?'ABOVE MINIMUM':'BELOW MINIMUM';
  $('#wageCompliance').classList.toggle('danger',!compliant);
  $('#minimumWageHint').innerHTML=(compliant?'':'⚠ ')+
    (state.selectedRegion.sectoral&&$('#useSectoral').checked?'UMSK':'Minimum wage')+' '+rupiah(n.minWage)+
    (compliant?'':' · selisih '+rupiah(n.minWage-n.salary));

  $('#totalEmployerCost').textContent=rupiah(n.employer.total*n.headcount);
  $('#totalEmployerCostPerEmployee').textContent=rupiah(n.employer.total)+' / karyawan';
  $('#employerBreakdown').innerHTML=[
    ['Gross wage',n.salary*n.headcount],
    ['BPJS employer',n.employer.bpjs*n.headcount],
    ['THR accrual',n.employer.thr*n.headcount],
    ['Headcount',n.headcount]
  ].map(([a,b],i)=>'<div><span>'+esc(a)+'</span><strong>'+ (i===3?new Intl.NumberFormat('id-ID').format(b):rupiah(b)) +'</strong></div>').join('');

  const labels=[
    ['BPJS Kesehatan 4%',n.employer.health],
    ['JHT 3.7%',n.employer.jht],
    ['JP 2%',n.employer.jp],
    ['JKM 0.3%',n.employer.jkm],
    ['JKK '+pct(jkkRate()),n.employer.jkk]
  ];
  $('#employerBpjsCards').innerHTML=labels.map(([a,b])=>'<article class="rate-card"><span>'+esc(a)+'</span><strong>'+rupiah(b)+'</strong><small>/ pekerja / bulan</small></article>').join('');

  $('#employeeNetBeforeTax').textContent=rupiah(n.employee.netBeforeTax);
  $('#employeeDeductions').innerHTML=[
    ['BPJS Kesehatan 1%',n.employee.health],
    ['JHT 2%',n.employee.jht],
    ['JP 1%',n.employee.jp],
    ['Total potongan sebelum PPh21',n.employee.total]
  ].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+rupiah(b)+'</strong></div>').join('');

  renderOverviewPayroll(n);
}
function renderOverviewPayroll(n){
  const el=$('#overviewPayroll'); if(!el)return;
  el.innerHTML=[
    ['Wilayah',state.selectedRegion.region],
    ['Upah minimum',rupiah(n.minWage)],
    ['Employer cost/orang',rupiah(n.employer.total)],
    ['BPJS employer/orang',rupiah(n.employer.bpjs)]
  ].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong></div>').join('');
}

function corporateTax(entity,revenue,profit){
  const t=state.rates.tax;
  if(entity==='ptperorangan'&&revenue<=t.umkm_final.turnover_max){
    return{tax:revenue*t.umkm_final.rate,method:'PP 20/2026 · PPh Final 0,5% omzet'};
  }
  if(entity==='koperasi'&&revenue<=t.umkm_final.turnover_max){
    return{tax:revenue*t.umkm_final.rate,method:'PP 20/2026 · Koperasi eligible · PPh Final 0,5% omzet'};
  }
  if(revenue<=t.corporate.full_relief_turnover_max){
    return{tax:profit*t.corporate.section31e_reduced_rate,method:'Pasal 31E · efektif 11% atas laba kena pajak'};
  }
  if(revenue<=t.corporate.relief_turnover_ceiling&&revenue>0){
    const eligibleShare=Math.min(1,t.corporate.full_relief_turnover_max/revenue);
    const tax=profit*eligibleShare*t.corporate.section31e_reduced_rate+profit*(1-eligibleShare)*t.corporate.general_rate;
    return{tax,method:'Pasal 31E proporsional: bagian omzet Rp4,8 miliar di 11%, sisanya 22%'};
  }
  return{tax:profit*t.corporate.general_rate,method:'PPh Badan umum 22% atas laba kena pajak'};
}
function calcTax(){
  if(!state.rates)return;
  const entity=$('#entitySelect').value;
  const revenue=Math.max(0,Number($('#revenueInput').value)||0);
  const profit=Math.max(0,Number($('#profitInput').value)||0);
  const r=corporateTax(entity,revenue,profit);
  $('#incomeTaxResult').textContent=rupiah(r.tax);
  $('#incomeTaxMethod').textContent=r.method;
  $('#incomeTaxEffective').textContent=profit>0?pct(r.tax/profit):'0%';
  $('#incomeTaxMonthly').textContent=rupiah(r.tax/12);
  $('#taxRuleHint').textContent=entity==='standard'
    ?'PT/CV/Firma/Badan umum: PP 20/2026 tidak lagi memakai PPh Final UMKM 0,5%; gunakan ketentuan umum dan fasilitas Pasal 31E bila memenuhi.'
    :entity==='ptperorangan'
      ?'Perseroan Perorangan dengan omzet ≤ Rp4,8 miliar dapat menggunakan PPh Final UMKM 0,5% sesuai PP 20/2026.'
      :'Koperasi dapat menggunakan PPh Final UMKM 0,5% jika memenuhi syarat dan jangka waktu fasilitas.';

  const vatBase=Math.max(0,Number($('#vatBaseInput').value)||0);
  const luxury=$('#vatTypeSelect').value==='luxury';
  const vr=luxury?state.rates.tax.vat.luxury_effective_rate:state.rates.tax.vat.non_luxury_effective_rate;
  $('#vatResult').textContent=rupiah(vatBase*vr);
  $('#vatMethod').textContent=luxury?'12% × nilai transaksi':'12% × DPP 11/12 = efektif 11%';

  renderOverviewTax(r,vr);
}
function renderOverviewTax(r,vatRate){
  const el=$('#overviewTax');if(!el)return;
  el.innerHTML=[
    ['PPh tahunan',rupiah(r.tax)],
    ['Tax reserve/bulan',rupiah(r.tax/12)],
    ['PPN non-mewah',pct(state.rates.tax.vat.non_luxury_effective_rate)],
    ['PPN luxury',pct(state.rates.tax.vat.luxury_effective_rate)]
  ].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong></div>').join('');
}
function renderWithholding(){
  const t=state.rates.tax;
  $('#withholdingGrid').innerHTML=[
    ['PPh 23 jasa/sewa aset',pct(t.pph23.services_and_asset_rent_rate),'jumlah bruto'],
    ['PPh 23 bunga/royalti',pct(t.pph23.interest_royalty_award_rate),'jumlah bruto'],
    ['PPh 22 impor dengan API',pct(t.pph22_import.api_rate),'nilai impor'],
    ['PPh 22 impor non-API',pct(t.pph22_import.non_api_rate),'nilai impor']
  ].map(([a,b,c])=>'<article class="rate-card"><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong><small>'+esc(c)+'</small></article>').join('');
}
function renderSources(){
  $('#sourceList').innerHTML=state.rates.sources.map(s=>'<article class="source-card-simple"><strong>'+esc(s.name)+'</strong><a href="'+esc(s.url)+'" target="_blank" rel="noopener">Buka sumber resmi ↗</a></article>').join('');
}
function bindInputs(){
  $('#regionSelect').onchange=()=>selectRegion(true);
  $('#useSectoral').onchange=()=>selectRegion(true);
  ['salaryInput','headcountInput','jkkSelect','includeThr'].forEach(id=>$('#'+id).addEventListener('input',calcPayroll));
  ['entitySelect','revenueInput','profitInput','vatBaseInput','vatTypeSelect'].forEach(id=>$('#'+id).addEventListener('input',calcTax));
}
async function init(){
  setTheme();clock();setInterval(clock,30000);bindNav();route();
  state.rates=await loadJSON(DATA_URL);
  $('#rulesUpdated').textContent='Verified '+state.rates.updated_at;
  renderWageBenchmarks();
  populatePayrollControls();
  renderWithholding();
  renderSources();
  bindInputs();
  calcPayroll();
  calcTax();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init().catch(e=>{
  console.error(e);
  const el=$('#rulesUpdated');if(el)el.textContent='Data gagal dimuat';
});