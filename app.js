const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={rates:null,payrollRows:[],selectedRegion:null};
const DATA_URL='./data/business-rates.json';

const rupiah=v=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v)||0);
const number=v=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(Number(v)||0);
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
  const el=$('#liveClock');
  if(el)el.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';
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

function getDefaultBenchmark(){
  return Number(state.rates?.payroll_table_default?.minimum_wage_reference)||0;
}
function wageBenchmark(){
  const override=Number($('#minimumWageOverride')?.value)||0;
  if(override>0)return override;
  if(!state.selectedRegion)return getDefaultBenchmark();
  if(state.selectedRegion.key==='custom')return getDefaultBenchmark();
  return $('#useSectoral')?.checked&&state.selectedRegion.sectoral
    ?Number(state.selectedRegion.sectoral)
    :Number(state.selectedRegion.value);
}
function benchmarkLabel(){
  if(state.selectedRegion?.key==='custom'){
    return state.rates.payroll_table_default.minimum_wage_label||'Custom benchmark';
  }
  if($('#useSectoral')?.checked&&state.selectedRegion?.sectoral){
    return state.selectedRegion.sectoral_label||'UMSK';
  }
  return state.selectedRegion?.type||'Minimum wage';
}
function jkkRate(){
  const key=$('#jkkSelect')?.value;
  return Number(state.rates.bpjs.employment.jkk.rates.find(x=>x.key===key)?.rate||0);
}
function calcEmployerBpjs(monthlySalary,minWage){
  const b=state.rates.bpjs;
  const healthBase=Math.min(Math.max(monthlySalary,minWage||0),Number(b.health.wage_ceiling));
  const jpBase=Math.min(monthlySalary,Number(b.employment.jp.wage_ceiling_current));
  const health=healthBase*b.health.employer_rate;
  const jht=monthlySalary*b.employment.jht.employer_rate;
  const jp=jpBase*b.employment.jp.employer_rate;
  const jkm=monthlySalary*b.employment.jkm.employer_rate;
  const jkk=monthlySalary*jkkRate();
  return {health,jht,jp,jkm,jkk,total:health+jht+jp+jkm+jkk,healthBase,jpBase};
}
function rowCalc(row){
  const days=Math.max(1,Number($('#projectWorkdays')?.value)||22);
  const hc=Math.max(0,Number(row.headcount)||0);
  const tenant=Math.max(0,Number(row.tenant_rate_daily)||0);
  const worker=Math.max(0,Number(row.worker_cost_daily)||0);
  const minWage=wageBenchmark();
  const monthlySalary=worker*days;
  const revenue=hc*days*tenant;
  const baseWage=hc*days*worker;
  const bpjsPer=calcEmployerBpjs(monthlySalary,minWage);
  const thrPer=$('#includeThr')?.checked?monthlySalary/12:0;
  const employerBpjs=bpjsPer.total*hc;
  const thr=thrPer*hc;
  const employmentCost=baseWage+employerBpjs+thr;
  const contribution=revenue-employmentCost;
  const margin=revenue?contribution/revenue:0;
  const compliance=minWage>0?monthlySalary>=minWage:null;
  return {days,hc,tenant,worker,minWage,monthlySalary,revenue,baseWage,bpjsPer,employerBpjs,thrPer,thr,employmentCost,contribution,margin,compliance};
}
function payrollTotals(){
  const rows=state.payrollRows.map(row=>({row,calc:rowCalc(row)}));
  return rows.reduce((acc,x)=>{
    acc.hc+=x.calc.hc;
    acc.revenue+=x.calc.revenue;
    acc.baseWage+=x.calc.baseWage;
    acc.bpjs+=x.calc.employerBpjs;
    acc.thr+=x.calc.thr;
    acc.employmentCost+=x.calc.employmentCost;
    acc.contribution+=x.calc.contribution;
    return acc;
  },{hc:0,revenue:0,baseWage:0,bpjs:0,thr:0,employmentCost:0,contribution:0});
}
function editInput(rowId,field,value){
  const row=state.payrollRows.find(x=>x.id===rowId);
  if(!row)return;
  if(field==='position')row[field]=value;
  else row[field]=Math.max(0,Number(value)||0);
  renderPayrollTable();
}
function tableInput(row,field,value,type='number'){
  const step=field==='headcount'?'1':'1000';
  return '<input class="table-input" data-row="'+esc(row.id)+'" data-field="'+esc(field)+'" type="'+type+'" step="'+step+'" min="0" value="'+esc(value)+'">';
}
function renderPayrollTable(){
  const body=$('#payrollTableBody'),foot=$('#payrollTableFoot');
  if(!body||!foot)return;
  const benchmark=wageBenchmark();
  const label=benchmarkLabel();
  $('#minimumWageHint').textContent=label+' '+rupiah(benchmark)+(state.selectedRegion?.key==='custom'?' · default Morowali project benchmark, editable':'');
  body.innerHTML=state.payrollRows.map(row=>{
    const c=rowCalc(row);
    const status=c.compliance===null?'INPUT UMK':(c.compliance?'OK':'BELOW');
    const klass=c.compliance===false?'table-status bad':c.compliance===true?'table-status good':'table-status neutral';
    return '<tr>'+
      '<td>'+tableInput(row,'position',row.position,'text')+'</td>'+
      '<td>'+tableInput(row,'headcount',row.headcount)+'</td>'+
      '<td class="num">'+number(c.days)+'</td>'+
      '<td>'+tableInput(row,'tenant_rate_daily',row.tenant_rate_daily)+'</td>'+
      '<td>'+tableInput(row,'worker_cost_daily',row.worker_cost_daily)+'</td>'+
      '<td class="num strong">'+rupiah(c.revenue)+'</td>'+
      '<td class="num">'+rupiah(c.monthlySalary)+'</td>'+
      '<td class="num">'+rupiah(c.minWage)+'</td>'+
      '<td><span class="'+klass+'">'+status+'</span></td>'+
      '<td class="num">'+rupiah(c.employerBpjs)+'</td>'+
      '<td class="num">'+rupiah(c.thr)+'</td>'+
      '<td class="num strong">'+rupiah(c.employmentCost)+'</td>'+
      '<td class="num '+(c.contribution<0?'negative':'positive')+'">'+rupiah(c.contribution)+'</td>'+
      '<td class="num">'+pct(c.margin)+'</td>'+
    '</tr>';
  }).join('');

  body.querySelectorAll('.table-input').forEach(inp=>{
    inp.addEventListener('change',()=>editInput(inp.dataset.row,inp.dataset.field,inp.value));
  });

  const t=payrollTotals();
  const margin=t.revenue?t.contribution/t.revenue:0;
  foot.innerHTML='<tr class="total-row">'+
    '<td>TOTAL</td><td class="num">'+number(t.hc)+'</td><td></td><td></td><td></td>'+
    '<td class="num">'+rupiah(t.revenue)+'</td><td></td><td></td><td></td>'+
    '<td class="num">'+rupiah(t.bpjs)+'</td>'+
    '<td class="num">'+rupiah(t.thr)+'</td>'+
    '<td class="num">'+rupiah(t.employmentCost)+'</td>'+
    '<td class="num '+(t.contribution<0?'negative':'positive')+'">'+rupiah(t.contribution)+'</td>'+
    '<td class="num">'+pct(margin)+'</td></tr>';

  $('#tableTotalHC').textContent=number(t.hc);
  $('#tableRevenue').textContent=rupiah(t.revenue);
  $('#tableBaseWage').textContent=rupiah(t.baseWage);
  $('#tableBpjsEmployer').textContent=rupiah(t.bpjs);
  $('#tableEmploymentCost').textContent=rupiah(t.employmentCost);
  $('#tableGrossContribution').textContent=rupiah(t.contribution);
  $('#tableGrossMargin').textContent='Margin '+pct(margin);

  renderBpjsSummary();
  renderPayrollNotes(t,margin);
  renderOverviewPayroll(t,margin);
}
function renderBpjsSummary(){
  if(!state.payrollRows.length)return;
  const minWage=wageBenchmark();
  const totalHc=state.payrollRows.reduce((s,r)=>s+(Number(r.headcount)||0),0)||1;
  const weightedSalary=state.payrollRows.reduce((s,r)=>s+(Number(r.worker_cost_daily)||0)*(Number($('#projectWorkdays').value)||22)*(Number(r.headcount)||0),0)/totalHc;
  const b=calcEmployerBpjs(weightedSalary,minWage);
  $('#employerBpjsCards').innerHTML=[
    ['BPJS Kesehatan 4%',b.health],
    ['JHT 3.7%',b.jht],
    ['JP 2%',b.jp],
    ['JKM 0.3%',b.jkm],
    ['JKK '+pct(jkkRate()),b.jkk]
  ].map(([a,v])=>'<article class="rate-card"><span>'+esc(a)+'</span><strong>'+rupiah(v)+'</strong><small>weighted / pekerja / bulan</small></article>').join('');
}
function renderPayrollNotes(t,margin){
  const below=state.payrollRows.filter(r=>rowCalc(r).compliance===false);
  const notes=[
    ['Model',state.rates.payroll_table_default.note],
    ['Benchmark',benchmarkLabel()+' '+rupiah(wageBenchmark())],
    ['Compliance',below.length?below.map(x=>x.position).join(', ')+' di bawah benchmark':'Semua posisi memenuhi benchmark yang dipilih'],
    ['Gross contribution',rupiah(t.contribution)+' · '+pct(margin)],
    ['Formula','Revenue = HC × hari × rate tenant; Employment Cost = wage + BPJS employer + THR accrual']
  ];
  $('#payrollTableNotes').innerHTML=notes.map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong></div>').join('');
}
function renderOverviewPayroll(t,margin){
  const el=$('#overviewPayroll');if(!el)return;
  el.innerHTML=[
    ['Default project',number(t.hc)+' HC'],
    ['Revenue / bulan',rupiah(t.revenue)],
    ['Employment cost',rupiah(t.employmentCost)],
    ['Gross contribution',rupiah(t.contribution)+' · '+pct(margin)]
  ].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong></div>').join('');
}
function populatePayroll(){
  const d=state.rates.payroll_table_default;
  state.payrollRows=d.rows.map(x=>({...x}));
  $('#projectWorkdays').value=d.workdays||22;
  $('#includeThr').checked=d.include_thr!==false;

  const rs=$('#regionSelect');
  rs.innerHTML='<option value="custom">Custom / Project Benchmark</option>'+
    state.rates.wages_2026.map(w=>'<option value="'+esc(w.key)+'">'+esc(w.region)+' · '+esc(w.type)+' '+rupiah(w.value)+'</option>').join('');
  rs.value='custom';

  const js=$('#jkkSelect');
  js.innerHTML=state.rates.bpjs.employment.jkk.rates.map(x=>'<option value="'+esc(x.key)+'">'+esc(x.label)+' · '+pct(x.rate)+'</option>').join('');
  js.value=d.jkk_risk||'very_low';

  $('#minimumWageOverride').value=d.minimum_wage_reference||'';
  selectRegion(false);
}
function selectRegion(resetOverride=true){
  const key=$('#regionSelect').value;
  if(key==='custom'){
    state.selectedRegion={key:'custom',region:'Custom / Project',type:'Custom',value:getDefaultBenchmark(),sectoral:null};
    $('#sectoralWrap').classList.add('hidden');
    $('#useSectoral').checked=false;
    if(resetOverride)$('#minimumWageOverride').value=getDefaultBenchmark()||'';
  }else{
    state.selectedRegion=state.rates.wages_2026.find(x=>x.key===key)||state.rates.wages_2026[0];
    $('#sectoralWrap').classList.toggle('hidden',!state.selectedRegion.sectoral);
    if(!state.selectedRegion.sectoral)$('#useSectoral').checked=false;
    if(resetOverride)$('#minimumWageOverride').value='';
  }
  renderPayrollTable();
}
function resetPayroll(){
  const d=state.rates.payroll_table_default;
  state.payrollRows=d.rows.map(x=>({...x}));
  $('#projectWorkdays').value=d.workdays||22;
  $('#jkkSelect').value=d.jkk_risk||'very_low';
  $('#includeThr').checked=d.include_thr!==false;
  $('#regionSelect').value='custom';
  $('#minimumWageOverride').value=d.minimum_wage_reference||'';
  selectRegion(false);
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
    ?'PT/CV/Firma/Badan umum: PP 20/2026 tidak otomatis memakai PPh Final UMKM 0,5%; gunakan ketentuan umum dan fasilitas Pasal 31E bila memenuhi.'
    :entity==='ptperorangan'
      ?'Perseroan Perorangan dengan omzet ≤ Rp4,8 miliar dapat menggunakan PPh Final UMKM 0,5% sesuai PP 20/2026.'
      :'Koperasi dapat menggunakan PPh Final UMKM 0,5% jika memenuhi syarat dan jangka waktu fasilitas.';

  const vatBase=Math.max(0,Number($('#vatBaseInput').value)||0);
  const luxury=$('#vatTypeSelect').value==='luxury';
  const vr=luxury?state.rates.tax.vat.luxury_effective_rate:state.rates.tax.vat.non_luxury_effective_rate;
  $('#vatResult').textContent=rupiah(vatBase*vr);
  $('#vatMethod').textContent=luxury?'12% × nilai transaksi':'12% × DPP 11/12 = efektif 11%';
  renderOverviewTax(r);
}
function renderOverviewTax(r){
  const el=$('#overviewTax');if(!el)return;
  el.innerHTML=[
    ['PPh tahunan',rupiah(r.tax)],
    ['Tax reserve/bulan',rupiah(r.tax/12)],
    ['PPN non-mewah',pct(state.rates.tax.vat.non_luxury_effective_rate)],
    ['PPN luxury',pct(state.rates.tax.vat.luxury_effective_rate)]
  ].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong></div>').join('');
}
function renderWageBenchmarks(){
  const el=$('#wageBenchmarkGrid');if(!el)return;
  el.innerHTML=state.rates.wages_2026.map(w=>{
    const sec=w.sectoral?'<small>'+esc(w.sectoral_label||'UMSK')+' '+rupiah(w.sectoral)+'</small>':'<small>2026 official benchmark</small>';
    return '<article class="wage-card"><div><span>'+esc(w.type)+'</span><strong>'+rupiah(w.value)+'</strong></div><b>'+esc(w.region)+'</b>'+sec+'</article>';
  }).join('');
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
  $('#useSectoral').onchange=()=>renderPayrollTable();
  $('#minimumWageOverride').addEventListener('input',renderPayrollTable);
  ['projectWorkdays','jkkSelect','includeThr'].forEach(id=>$('#'+id).addEventListener('input',renderPayrollTable));
  $('#resetPayrollTable').onclick=resetPayroll;
  ['entitySelect','revenueInput','profitInput','vatBaseInput','vatTypeSelect'].forEach(id=>$('#'+id).addEventListener('input',calcTax));
}
async function init(){
  setTheme();clock();setInterval(clock,30000);bindNav();route();
  state.rates=await loadJSON(DATA_URL);
  $('#rulesUpdated').textContent='Verified '+state.rates.updated_at;
  renderWageBenchmarks();
  populatePayroll();
  renderWithholding();
  renderSources();
  bindInputs();
  renderPayrollTable();
  calcTax();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init().catch(e=>{
  console.error(e);
  const el=$('#rulesUpdated');if(el)el.textContent='Data gagal dimuat';
});