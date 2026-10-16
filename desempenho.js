/* desempenho.js — metas por IA, "Semana a semana", relatório mensal em CSV e aviso de falhas de coleta.
   Carregar por último (depois de acessos.js). Usa data, DESFECHOS, isUnresolvedProtocol, mode (app.js). */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var IAS=['Assistente Safira','IA SPC','SPC AGE','SPC ACI'];
var FIELDS=[['resolvido','Resolvidos','mín.','%'],['transferido','Transferidos','máx.','%'],['nao','Não resolvidos','máx.','%'],['nota','Nota média','mín.','']];
var S={metas:{},eco:{},admin:false,health:null,setup:'',loadedAt:0};
function toast(m){if(window.monToast)window.monToast(m)}
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('desempenho',n,e)}return r}}
function dk(v){var m=String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);m=String(v||'').match(/(\d{4})-(\d{2})-(\d{2})/);return m?m[1]+'-'+m[2]+'-'+m[3]:''}
function d0(iso){return new Date(iso+'T12:00:00')}
function br(iso){var p=String(iso).split('-');return p[2]+'/'+p[1]}
function plus(iso,n){var d=d0(iso);d.setDate(d.getDate()+n);return ymdLocal(d)}
function nota(v){return v?v.toFixed(2).replace('.',','):'—'}

var css=
'.ag-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-left:auto}'+
'.ag-tools .btn{height:32px;padding:0 12px;font-size:12.5px}'+
'.ag-meta{display:block;margin-top:4px;font-size:10.5px;font-weight:600;color:var(--muted);white-space:nowrap}'+
'.ag-meta.ok{color:var(--good)}.ag-meta.miss{color:var(--bad)}'+
'.ag-stat.meta-miss{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bad) 35%,transparent)}'+
'#agentTable td .ag-meta{display:inline;margin:0 0 0 6px}'+
'#weeklyPanel .wk-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px}#weeklyPanel .wk-head>div:first-child{flex:1;min-width:220px}'+
'#weeklyPanel select{height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}'+
'#weeklyPanel .wk-wrap{overflow-x:auto;margin-top:10px}'+
'#weeklyPanel table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}'+
'#weeklyPanel th{padding:8px 10px;text-align:right;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--line)}'+
'#weeklyPanel th:first-child,#weeklyPanel td:first-child{text-align:left}'+
'#weeklyPanel td{padding:9px 10px;text-align:right;border-bottom:1px solid var(--line2);white-space:nowrap;font-variant-numeric:tabular-nums}'+
'#weeklyPanel td b{font-weight:600}#weeklyPanel td small{display:block;font-size:10.5px;color:var(--muted)}'+
'#weeklyPanel tr.tot td{font-weight:600;border-top:1px solid var(--line);border-bottom:0;background:var(--surface2)}'+
'#weeklyPanel .dv{display:inline-block;width:64px;margin-left:6px;font-size:10.5px;font-weight:600;text-align:left}'+
'#weeklyPanel .dv.up{color:var(--good)}#weeklyPanel .dv.dn{color:var(--bad)}#weeklyPanel .dv.eq{color:var(--muted)}'+
'#weeklyPanel td.miss b{color:var(--bad)}#weeklyPanel td.hit b{color:var(--good)}'+
'#weeklyPanel .wk-note{margin-top:8px;font-size:11.5px;color:var(--muted)}'+
'#healthBanner{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--bad) 35%,transparent);border-radius:12px;background:var(--badbg);color:var(--ink);font-size:13px}'+
'#healthBanner b{color:var(--bad)}#healthBanner small{display:block;margin-top:3px;color:var(--muted);font-size:11.5px}#healthBanner button{margin-left:auto;border:0;background:none;color:var(--muted);font-size:18px;cursor:pointer;line-height:1}'+
'#metaDlg{width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 24px 60px rgba(0,30,50,.25)}'+
'#metaDlg::backdrop{background:rgba(8,24,36,.45)}'+
'#metaDlg .md-h{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line2)}#metaDlg .md-h h2{margin:0;font-size:16px}#metaDlg .md-h p{margin:2px 0 0;color:var(--muted);font-size:12px}'+
'#metaDlg .md-x{margin-left:auto;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink2);font-size:16px;cursor:pointer}'+
'#metaDlg form{padding:16px 18px 18px}#metaDlg .md-wrap{overflow-x:auto}'+
'#metaDlg table{width:100%;border-collapse:collapse;min-width:560px}#metaDlg th{padding:6px;font-size:11px;font-weight:600;color:var(--muted);text-align:left}'+
'#metaDlg th span{display:block;font-weight:400;text-transform:none}#metaDlg td{padding:6px;border-top:1px solid var(--line2)}#metaDlg td:first-child{font-size:13px;font-weight:600;white-space:nowrap}'+
'#metaDlg input{width:100%;min-width:70px;height:36px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}'+
'#metaDlg .md-f{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px}#metaDlg .md-f small{flex:1;min-width:220px;color:var(--muted);font-size:11.5px}'+
'#metaDlg .md-msg{margin-top:10px;font-size:12px;color:var(--bad)}#metaDlg .md-msg.ok{color:var(--good)}'+
'#ecoPanel .panel-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:6px}#ecoPanel .panel-head>div{flex:1}#ecoPanel .panel-head p{margin-top:1px}'+
'#ecoPanel .eco-ks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}'+
'#ecoPanel .eco-k{padding:4px 18px;border-left:1px solid var(--line2)}#ecoPanel .eco-k:first-child{padding-left:0;border-left:0}'+
'#ecoPanel .eco-k small{display:block;color:var(--muted);font-size:11.5px}#ecoPanel .eco-k strong{display:block;margin:1px 0;font-size:24px;line-height:1.15;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}'+
'#ecoPanel .eco-k:first-child strong{color:var(--good)}#ecoPanel .eco-k em{display:block;font-style:normal;color:var(--muted);font-size:11.5px}'+
'#ecoPanel .eco-bar{display:flex;gap:2px;height:8px;margin-top:12px;border-radius:999px;overflow:hidden;background:var(--surface3)}#ecoPanel .eco-bar i{display:block;min-width:3px;background:var(--c)}'+
'#ecoPanel .eco-leg{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:8px}'+
'#ecoPanel .eco-r{display:inline-flex;align-items:baseline;gap:6px;font-size:12px;color:var(--ink2)}#ecoPanel .eco-r u{align-self:center;width:8px;height:8px;border-radius:50%;background:var(--c);text-decoration:none}'+
'#ecoPanel .eco-r strong{font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}#ecoPanel .eco-r small{color:var(--muted);font-size:11px}'+
'#ecoPanel .wk-note{margin-top:8px;font-size:11.5px;color:var(--muted)}#ecoPanel .panel-head .btn{width:auto;flex:none;height:32px;padding:0 12px;font-size:12.5px}'+
'#ecoPanel .eco-empty{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 14px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:12.5px}#ecoPanel .eco-empty span{flex:1;min-width:240px}'+
'#metaDlg .md-eco{margin-top:16px;padding-top:14px;border-top:1px solid var(--line2)}#metaDlg .md-eco h3{margin:0 0 10px;font-size:13px}'+
'#metaDlg .md-eco-g{display:grid;grid-template-columns:1fr 1fr;gap:12px}#metaDlg .md-eco label{display:grid;gap:6px;font-size:12px;color:var(--ink2)}'+
'#metaDlg .md-eco small{display:block;margin-top:8px;color:var(--muted);font-size:11.5px}'+
'@media print{.ag-tools,#ecoSet,#wkIA,#healthBanner{display:none!important}#ecoPanel,#weeklyPanel{break-inside:avoid}#ecoPanel .eco-k,#ecoPanel .eco-r{break-inside:avoid}#weeklyPanel .wk-wrap{overflow:visible}}'+
'@media(max-width:560px){#ecoPanel .panel-head{flex-wrap:nowrap}#ecoPanel .panel-head p{display:none}#ecoPanel .eco-ks{grid-template-columns:1fr;gap:2px}#ecoPanel .eco-k,#ecoPanel .eco-k:first-child{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:0 10px;padding:6px 0;border-left:0;border-top:1px solid var(--line2)}#ecoPanel .eco-k:first-child{border-top:0}#ecoPanel .eco-k small{order:1}#ecoPanel .eco-k strong{order:2;font-size:18px}#ecoPanel .eco-k em{display:none}#metaDlg .md-eco-g{grid-template-columns:1fr}}'+
'@media(max-width:820px){#metaDlg .md-eco-g{grid-template-columns:1fr}}'+
'@media(max-width:820px){.ag-tools{margin-left:0;width:100%;flex-direction:row;flex-wrap:nowrap}.ag-tools .btn{flex:1 1 0;width:auto;min-width:0}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Configurações (metas + situação das coletas) ---------- */
function loadSettings(force){
  if(!force&&Date.now()-S.loadedAt<120000)return Promise.resolve();
  S.loadedAt=Date.now();
  return fetch('/api/settings',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(!j||!j.ok)return;
    S.metas=j.metas||{};S.eco=j.economia||{};S.admin=!!j.admin;S.health=j.health||null;S.setup=j.setupNeeded||'';
    placeTools();renderHealth();
    if(typeof data!=='undefined'&&data&&data.r72){try{window.renderAgents()}catch(e){console.error(e)}renderEco();renderWeekly()}
  }).catch(function(){});
}
var main=document.getElementById('main');
if(main){new MutationObserver(function(){if(!main.hidden)loadSettings(true)}).observe(main,{attributes:true,attributeFilter:['hidden']});if(!main.hidden)loadSettings(true)}

/* ---------- Números por IA ---------- */
function blank(){return{t:0,r:0,tr:0,u:0,ina:0,sn:0,n:[]}}
function add(o,x){
  if(DESFECHOS.indexOf(x.outcome)<0)return;
  o.t++;if(x.outcome==='resolvido')o.r++;if(x.outcome==='transferido')o.tr++;if(x.outcome==='inatividade')o.ina++;if(x.outcome==='safenota')o.sn++;
  if(isUnresolvedProtocol(x))o.u++;if(x.survey&&x.survey.note)o.n.push(x.survey.note);
}
function rates(o){var av=o.n.length?o.n.reduce(function(a,v){return a+v},0)/o.n.length:0,pos=o.n.filter(function(v){return v>=4}).length;
  return{t:o.t,r:o.r,tr:o.tr,u:o.u,ina:o.ina,sn:o.sn,safenota:o.t?o.sn/o.t*100:0,nn:o.n.length,resolvido:o.t?o.r/o.t*100:0,transferido:o.t?o.tr/o.t*100:0,nao:o.t?o.u/o.t*100:0,inatividade:o.t?o.ina/o.t*100:0,nota:av,pos:o.n.length?pos/o.n.length*100:0}}
function byIA(list){var g={};IAS.forEach(function(n){g[n]=blank()});var all=blank();list.forEach(function(x){if(g[x.agent])add(g[x.agent],x);add(all,x)});
  var out={};IAS.forEach(function(n){out[n]=rates(g[n])});out._all=rates(all);return out}
/* ---------- Economia: resolvidos pela IA × tempo médio de um atendimento humano ---------- */
function ecoOn(){return S.eco&&S.eco.minutos>0}
function horas(resolvidos){return ecoOn()?resolvidos*S.eco.minutos/60:0}
function reais(resolvidos){return ecoOn()&&S.eco.custoHora>0?horas(resolvidos)*S.eco.custoHora:null}
function fmtH(h){if(h>0&&h<1)return Math.round(h*60)+' min';return h.toLocaleString('pt-BR',{maximumFractionDigits:1})+' h'}
function fmtR(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function fmtMin(m){return String(m).replace('.',',')}
// meta atingida? null = sem meta ou sem dado
function check(goal,field,v,hasData){
  if(!goal||goal[field]==null||!hasData)return null;
  return field==='transferido'||field==='nao'?v<=goal[field]:v>=goal[field];
}
function goalText(goal,field){var f=FIELDS.find(function(x){return x[0]===field});return'meta '+(f[2]==='mín.'?'≥ ':'≤ ')+(field==='nota'?String(goal[field]).replace('.',','):goal[field]+'%')}

/* ---------- Metas nos cartões e na tabela de Desempenho por IA ---------- */
function markAgents(){
  if(typeof data==='undefined'||!data||!data.r72)return;
  var st=byIA(data.r72.protocols);
  qa('#agentCards .ag2').forEach(function(card){
    var name=(q('.ag2-h b',card)||{}).textContent,goal=S.metas[name],v=st[name];if(!goal||!v)return;
    qa('.ag-stat',card).forEach(function(box,i){var field=FIELDS[i]&&FIELDS[i][0];if(!field||goal[field]==null)return;
      var has=field==='nota'?v.nn>0:v.t>0,ok=check(goal,field,v[field],has);
      box.classList.toggle('meta-miss',ok===false);
      box.insertAdjacentHTML('beforeend','<span class="ag-meta'+(ok===true?' ok':ok===false?' miss':'')+'" title="Meta definida para '+esc(name)+'">'+(ok===true?'✓ ':ok===false?'✗ ':'')+goalText(goal,field)+'</span>')});
  });
  qa('#agentTable tr').forEach(function(tr){
    var td=qa('td',tr);if(!td.length)return;var name=td[0].textContent,goal=S.metas[name],v=st[name];if(!goal||!v)return;
    FIELDS.forEach(function(f,i){var cell=td[i+2],field=f[0];if(!cell||goal[field]==null)return;
      var has=field==='nota'?v.nn>0:v.t>0,ok=check(goal,field,v[field],has);
      cell.insertAdjacentHTML('beforeend','<small class="ag-meta'+(ok===true?' ok':ok===false?' miss':'')+'">'+(field==='nota'?'':(has?Math.round(v[field])+'% · ':''))+goalText(goal,field)+'</small>')});
  });
}
wrap('renderAgents',markAgents);

/* ---------- Botões no cabeçalho de Desempenho por IA ---------- */
var tools=null;
function placeTools(){
  var head=q('#agentCards')&&q('#agentCards').closest('.panel').querySelector('.panel-head');if(!head)return;
  if(!tools){tools=document.createElement('div');tools.className='ag-tools';var seg=q('.segmented',head);head.insertBefore(tools,seg||null)}
  tools.innerHTML=(S.admin?'<button type="button" class="btn btn-ghost" id="metaBtn" title="Definir as metas de cada IA e o tempo médio para a economia">◎ Metas e economia</button>':'')+
    '<button type="button" class="btn btn-ghost" id="iaCsvBtn" title="Baixar o desempenho de cada IA no período, com a quebra por semana">↓ Relatório por IA</button>';
  var m=q('#metaBtn',tools);if(m)m.onclick=openMetas;
  q('#iaCsvBtn',tools).onclick=exportCsv;
}
wrap('renderAll',function(){placeTools();loadSettings(false)});

/* ---------- Semanas (segunda a domingo) dentro do período ---------- */
function weeks(start,end){
  var out=[],d=start;
  while(d<=end&&out.length<60){var wd=(d0(d).getDay()+6)%7,mon=plus(d,-wd),sun=plus(mon,6),e=sun<end?sun:end;
    out.push({start:d,end:e,full:d===mon&&e===sun});d=plus(e,1)}
  return out;
}
function period(){return{start:q('#start').value,end:q('#end').value}}
function weeklyRows(ia){
  var p=period(),ws=weeks(p.start,p.end),list=data.r72.protocols;
  ws.forEach(function(w){w.list=[]});
  list.forEach(function(x){var d=dk(x.firstDate);if(!d)return;for(var i=0;i<ws.length;i++){if(d>=ws[i].start&&d<=ws[i].end){ws[i].list.push(x);break}}});
  ws.forEach(function(w){var st=byIA(w.list);w.v=ia?st[ia]:st._all});
  return ws;
}

function agentsPanel(){return q('#agentCards').closest('.panel')}
function renderEco(){
  var el=q('#ecoPanel');
  if(typeof data==='undefined'||!data||!data.r72){if(el)el.hidden=true;return}
  if(!ecoOn()&&!S.admin){if(el)el.hidden=true;return}
  if(!el){el=document.createElement('article');el.id='ecoPanel';el.className='panel';agentsPanel().after(el)}
  el.hidden=false;
  var st=byIA(data.r72.protocols),all=st._all;
  if(!ecoOn()){
    el.innerHTML='<div class="panel-head"><div><h2>Economia da IA</h2><p>Quanto tempo de atendimento humano a IA evitou no período</p></div></div>'+
      '<div class="eco-empty"><span>Informe o tempo médio de um atendimento humano para ver as horas (e o valor) que as IAs economizaram. Aparece também no relatório por IA, no resumo e no PDF.</span><button type="button" class="btn btn-secondary" id="ecoSet">Definir tempo médio</button></div>';
    q('#ecoSet',el).onclick=openMetas;return;
  }
  var h=horas(all.r),money=reais(all.r),days=h/8;
  var others=Math.max(0,all.r-IAS.reduce(function(a,n){return a+st[n].r},0));
  var COLORS=['var(--blue)','var(--good)','var(--resolved)','var(--inactivity)'];
  var rows=IAS.map(function(n,i){return{name:n,r:st[n].r,c:COLORS[i]}});if(others)rows.push({name:'Outros agentes',r:others,c:'var(--muted2)'});
  rows=rows.filter(function(r){return r.r>0});
  var big=function(label,value,sub){return'<div class="eco-k"><small>'+label+'</small><strong>'+value+'</strong><em>'+sub+'</em></div>'};
  el.innerHTML='<div class="panel-head"><div><h2>Economia da IA</h2><p>Atendimentos resolvidos pela IA × tempo médio de um atendimento humano</p></div>'+(S.admin?'<button type="button" class="btn btn-ghost" id="ecoSet" title="Alterar o tempo médio e o custo por hora">Ajustar</button>':'')+'</div>'+
    '<div class="eco-ks">'+big('Atendimento humano evitado','<span class="eco-h">'+fmtH(h)+'</span>',fmt(all.r)+' resolvidos × '+fmtMin(S.eco.minutos)+' min')+
      big('Equivale a',(Math.round(days*10)/10).toLocaleString('pt-BR')+' dia'+(days>1.05?'s':''),'de um analista (8 h por dia)')+
      (money!=null?big('Economia estimada','<span class="eco-h">'+fmtR(money)+'</span>','a '+fmtR(S.eco.custoHora)+' por hora'):big('Resolvidos pela IA',pct(all.r,all.t)+'%',fmt(all.r)+' de '+fmt(all.t)+' com desfecho'))+'</div>'+
    (rows.length?'<div class="eco-bar" role="img" aria-label="Divisão das horas evitadas por IA">'+rows.map(function(r){return'<i style="flex:'+r.r+' 1 0;--c:'+r.c+'" title="'+esc(r.name)+': '+fmtH(horas(r.r))+'"></i>'}).join('')+'</div>'+
      '<div class="eco-leg">'+rows.map(function(r){return'<span class="eco-r" style="--c:'+r.c+'"><u></u>'+esc(r.name)+' <strong>'+fmtH(horas(r.r))+'</strong><small>'+fmt(r.r)+(money!=null?' · '+fmtR(reais(r.r)):'')+'</small></span>'}).join('')+'</div>':
      '<div class="wk-note">Nenhum atendimento resolvido pela IA no período.</div>')+
    '<div class="wk-note">Só conta os resolvidos pela IA ('+fmt(all.r)+' de '+fmt(all.t)+' com desfecho); transferidos, não resolvidos e inatividade ficam de fora, então o cálculo é conservador.</div>';
  var b=q('#ecoSet',el);if(b)b.onclick=openMetas;
}
wrap('renderOverview',renderEco);
// usado pelo resumo para copiar (features.js)
window.monEconomia=function(){
  if(!ecoOn()||typeof data==='undefined'||!data||!data.r72)return null;
  var all=byIA(data.r72.protocols)._all,m=reais(all.r);
  return{resolvidos:all.r,minutos:S.eco.minutos,horas:horas(all.r),reais:m,
    texto:'Economia: '+fmtH(horas(all.r))+' de atendimento humano evitadas ('+fmt(all.r)+' resolvidos × '+fmtMin(S.eco.minutos)+' min)'+(m!=null?' · '+fmtR(m):'')};
};

var wkIA='';
function renderWeekly(){
  var el=q('#weeklyPanel');
  if(typeof data==='undefined'||!data||!data.r72){if(el)el.hidden=true;return}
  var p=period(),days=Math.round((d0(p.end)-d0(p.start))/864e5)+1;
  if(days<14){if(el)el.hidden=true;return}
  if(!el){var anchor=q('#ecoPanel')||agentsPanel();el=document.createElement('article');el.id='weeklyPanel';el.className='panel';anchor.after(el)}
  el.hidden=false;
  var ws=weeklyRows(wkIA),goal=wkIA?S.metas[wkIA]:null,tot=wkIA?byIA(data.r72.protocols)[wkIA]:byIA(data.r72.protocols)._all;
  function delta(cur,prev,field,good){
    if(!prev||!prev.t||!cur.t)return'<span class="dv"></span>';
    var a=field==='nota'?cur.nota:cur[field],b=field==='nota'?prev.nota:prev[field];
    if(field==='nota'&&(!cur.nn||!prev.nn))return'<span class="dv"></span>';
    var d=field==='nota'?Math.round((a-b)*100)/100:Math.round(a-b);
    if(!d)return'<span class="dv eq">=</span>';
    var better=good==='up'?d>0:d<0;
    return'<span class="dv '+(better?'up':'dn')+'">'+(d>0?'▲ +':'▼ −')+String(Math.abs(d)).replace('.',',')+(field==='nota'?'':' pp')+'</span>';
  }
  function ecoCell(v){if(!ecoOn())return'';var m=reais(v.r);return'<td><b>'+fmtH(horas(v.r))+'</b>'+(m!=null?'<small>'+fmtR(m)+'</small>':'')+'</td>'}
  function cell(v,prev,field,good){
    var has=field==='nota'?v.nn>0:v.t>0,ok=check(goal,field,field==='nota'?v.nota:v[field],has),
        txt=field==='nota'?nota(v.nota):(v.t?Math.round(v[field])+'%':'—'),
        sub=field==='nota'?(v.nn?v.nn+' aval.':''):(v.t?fmt(field==='resolvido'?v.r:field==='transferido'?v.tr:v.u):'');
    return'<td class="'+(ok===true?'hit':ok===false?'miss':'')+'"><b>'+txt+'</b>'+(prev!==undefined?delta(v,prev,field,good):'')+(sub?'<small>'+sub+'</small>':'')+'</td>';
  }
  var rows=ws.map(function(w,i){var prev=i?ws[i-1].v:null;
    return'<tr><td><b>'+br(w.start)+' – '+br(w.end)+'</b><small>'+(w.full?'semana completa':'semana parcial')+'</small></td>'+
      '<td><b>'+fmt(w.v.t)+'</b></td>'+cell(w.v,prev,'resolvido','up')+cell(w.v,prev,'transferido','down')+cell(w.v,prev,'nao','down')+cell(w.v,prev,'nota','up')+
      ecoCell(w.v)+'</tr>'}).join('');
  var total='<tr class="tot"><td>Período todo</td><td>'+fmt(tot.t)+'</td>'+cell(tot,undefined,'resolvido')+cell(tot,undefined,'transferido')+cell(tot,undefined,'nao')+cell(tot,undefined,'nota')+ecoCell(tot)+'</tr>';
  el.innerHTML='<div class="panel-head wk-head"><div><h2>Semana a semana</h2><p>Evolução '+(wkIA?'da '+esc(wkIA):'das IAs')+' em cada semana do período (segunda a domingo), comparando com a semana anterior</p></div>'+
    '<select id="wkIA" aria-label="IA"><option value="">Todas as IAs</option>'+IAS.map(function(n){return'<option'+(n===wkIA?' selected':'')+'>'+esc(n)+'</option>'}).join('')+'</select></div>'+
    '<div class="wk-wrap"><table><thead><tr><th>Semana</th><th>Atendimentos</th><th>Resolvidos</th><th>Transferidos</th><th>Não resolvidos</th><th>Nota média</th>'+(ecoOn()?'<th>Horas evitadas</th>':'')+'</tr></thead><tbody>'+rows+total+'</tbody></table></div>'+
    '<div class="wk-note">'+(wkIA&&goal?'Verde: dentro da meta · vermelho: fora da meta. ':wkIA?'':'Escolha uma IA para ver as metas dela. ')+'Setas: variação em pontos percentuais (pp) vs. a semana anterior.</div>';
  q('#wkIA',el).onchange=function(){wkIA=this.value;renderWeekly()};
}
wrap('renderOverview',renderWeekly);

/* ---------- Relatório por IA (CSV para Excel) ---------- */
function exportCsv(){
  if(typeof data==='undefined'||!data||!data.r72){toast('Carregue os dados primeiro');return}
  var p=period(),ws=weeks(p.start,p.end),list=data.r72.protocols,n=function(v){return String(Math.round(v*10)/10).replace('.',',')};
  ws.forEach(function(w){w.list=[]});
  list.forEach(function(x){var d=dk(x.firstDate);if(!d)return;for(var i=0;i<ws.length;i++){if(d>=ws[i].start&&d<=ws[i].end){ws[i].list.push(x);break}}});
  var head=['IA','Recorte','De','Até','Atendimentos com desfecho','Resolvidos','% Resolvidos','Transferidos','% Transferidos','Não resolvidos','% Não resolvidos','Inatividade','% Inatividade','Avaliações','Nota média','% Notas 4 e 5','Meta % resolvidos (mín.)','Meta % transferidos (máx.)','Meta % não resolvidos (máx.)','Meta nota (mín.)','Metas atingidas','Tempo médio humano (min)','Horas evitadas','Economia (R$)'];
  function line(ia,label,a,b,v){
    var goal=ia==='Todas as IAs'?null:S.metas[ia],hits=0,total=0;
    FIELDS.forEach(function(f){var has=f[0]==='nota'?v.nn>0:v.t>0,ok=check(goal,f[0],f[0]==='nota'?v.nota:v[f[0]],has);if(ok!==null){total++;if(ok)hits++}});
    var g=function(k){return goal&&goal[k]!=null?String(goal[k]).replace('.',','):''};
    return[ia,label,brFull(a),brFull(b),v.t,v.r,n(v.resolvido),v.tr,n(v.transferido),v.u,n(v.nao),v.ina,n(v.inatividade),v.nn,v.nn?v.nota.toFixed(2).replace('.',','):'',v.nn?n(v.pos):'',g('resolvido'),g('transferido'),g('nao'),g('nota'),total?hits+' de '+total:'',
      ecoOn()?fmtMin(S.eco.minutos):'',ecoOn()?String(Math.round(horas(v.r)*10)/10).replace('.',','):'',reais(v.r)!=null?reais(v.r).toFixed(2).replace('.',','):''];
  }
  var all=byIA(list),rows=[];
  IAS.concat(['Todas as IAs']).forEach(function(ia){
    var key=ia==='Todas as IAs'?'_all':ia;
    rows.push(line(ia,'Período todo',p.start,p.end,all[key]));
    if(ws.length>1)ws.forEach(function(w){rows.push(line(ia,'Semana '+br(w.start)+' – '+br(w.end)+(w.full?'':' (parcial)'),w.start,w.end,byIA(w.list)[key]))});
  });
  var out=[head].concat(rows).map(function(r){return r.map(function(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"'}).join(';')}).join('\r\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+out],{type:'text/csv;charset=utf-8'}));
  a.download='desempenho-por-ia-'+p.start+'-a-'+p.end+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500);
  toast('Relatório por IA baixado');
}
function brFull(iso){var x=String(iso).split('-');return x[2]+'/'+x[1]+'/'+x[0]}

/* ---------- Janela de metas (administradores) ---------- */
var dlg=null;
function openMetas(){
  if(!dlg){dlg=document.createElement('dialog');dlg.id='metaDlg';document.body.appendChild(dlg);dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()})}
  var val=function(ia,f){var g=S.metas[ia];return g&&g[f]!=null?String(g[f]):''};
  dlg.innerHTML='<div class="md-h"><div><h2>Metas e economia</h2><p>Valem para todos os períodos. Deixe em branco para não usar.</p></div><button type="button" class="md-x" aria-label="Fechar">✕</button></div>'+
    '<form id="metaForm"><div class="md-wrap"><table><thead><tr><th>IA</th>'+FIELDS.map(function(f){return'<th>'+f[1]+'<span>'+f[2]+(f[3]?' em %':' (1 a 5)')+'</span></th>'}).join('')+'</tr></thead><tbody>'+
    IAS.map(function(ia){return'<tr data-ia="'+esc(ia)+'"><td>'+esc(ia)+'</td>'+FIELDS.map(function(f){return'<td><input type="number" inputmode="decimal" name="'+f[0]+'" min="'+(f[0]==='nota'?1:0)+'" max="'+(f[0]==='nota'?5:100)+'" step="'+(f[0]==='nota'?'0.1':'1')+'" value="'+esc(val(ia,f[0]))+'" aria-label="'+esc(ia+' · '+f[1])+'"></td>'}).join('')+'</tr>'}).join('')+
    '</tbody></table></div>'+
    '<div class="md-eco"><h3>Economia da IA</h3><div class="md-eco-g"><label>Tempo médio de um atendimento humano (minutos)<input type="number" inputmode="decimal" id="ecoMin" min="1" max="480" step="0.5" value="'+esc(S.eco.minutos!=null?S.eco.minutos:'')+'" placeholder="ex.: 8"></label>'+
    '<label>Custo da hora do analista (R$, opcional)<input type="number" inputmode="decimal" id="ecoCost" min="0" step="0.01" value="'+esc(S.eco.custoHora!=null?S.eco.custoHora:'')+'" placeholder="ex.: 35"></label></div>'+
    '<small>Cada atendimento resolvido pela IA conta como esse tempo de atendimento humano evitado.</small></div>'+
    '<div class="md-f"><small>Resolvidos e nota: o mínimo esperado. Transferidos e não resolvidos: o máximo aceitável. As metas aparecem nos cartões de cada IA, no “Semana a semana” e no relatório em CSV.</small>'+
    '<button type="button" class="btn btn-secondary" id="metaCancel">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div><div id="metaMsg">'+(S.setup?'<div class="md-msg">'+esc(S.setup)+'</div>':'')+'</div></form>';
  q('.md-x',dlg).onclick=q('#metaCancel',dlg).onclick=function(){dlg.close()};
  q('#metaForm',dlg).onsubmit=saveMetas;
  dlg.showModal();
}
function saveMetas(e){
  e.preventDefault();
  var metas={},btn=q('#metaForm button[type=submit]',dlg),msg=q('#metaMsg',dlg);
  qa('tr[data-ia]',dlg).forEach(function(tr){var g={};qa('input',tr).forEach(function(i){if(i.value!=='')g[i.name]=i.value});if(Object.keys(g).length)metas[tr.dataset.ia]=g});
  btn.disabled=true;msg.innerHTML='';
  fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({metas:metas,economia:{minutos:q('#ecoMin',dlg).value,custoHora:q('#ecoCost',dlg).value}})})
    .then(function(r){return r.json().catch(function(){return{ok:false,error:'Resposta inválida do servidor.'}})})
    .then(function(j){
      if(!j.ok)throw new Error(j.error||'Não foi possível salvar.');
      S.metas=j.metas||{};S.eco=j.economia||{};S.setup='';dlg.close();toast('Salvo');
      if(typeof data!=='undefined'&&data&&data.r72){window.renderAgents();renderEco();renderWeekly()}
    })
    .catch(function(err){msg.innerHTML='<div class="md-msg">'+esc(err.message)+'</div>'})
    .finally(function(){btn.disabled=false});
}

/* ---------- Aviso de falhas seguidas na coleta (só administradores) ---------- */
var hidden=false;
function renderHealth(){
  var h=S.health,el=q('#healthBanner');
  var show=S.admin&&h&&h.failing&&!hidden&&h.lastFailureAt&&Date.now()-Date.parse(h.lastFailureAt)<24*3600e3;
  if(!show){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='healthBanner';el.setAttribute('role','status');var n=q('#notice');n.parentNode.insertBefore(el,n.nextSibling)}
  var t=function(v){return v?new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
  el.innerHTML='<span aria-hidden="true">⚠</span><div><b>As últimas '+h.consecutiveFailures+' coletas no Orpen falharam</b> (a mais recente em '+t(h.lastFailureAt)+').'+
    '<small>Última coleta com sucesso: '+t(h.lastSuccessAt)+(h.lastError?' · erro: '+esc(h.lastError.slice(0,140)):'')+'</small>'+
    '<small>'+(h.emailConfigured?'Um alerta por e-mail é enviado automaticamente (no máximo a cada 2 horas).':'Para receber esse aviso por e-mail, configure RESEND_API_KEY e ALERT_EMAIL na Vercel.')+'</small></div>'+
    '<button type="button" aria-label="Fechar aviso">×</button>';
  q('button',el).onclick=function(){hidden=true;el.remove()};
}
window.monDesempenho={byIA:byIA,weeks:weeks,weeklyRows:weeklyRows,exportCsv:exportCsv,IAS:IAS,FIELDS:FIELDS,check:check,goalText:goalText,fmtH:fmtH,fmtR:fmtR,
  metas:function(){return S.metas},
  eco:function(){return ecoOn()?{minutos:S.eco.minutos,custoHora:S.eco.custoHora||0,horas:horas,reais:reais}:null}};
})();
