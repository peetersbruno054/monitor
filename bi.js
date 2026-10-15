/* bi.js — aba "BI": painel filtrável (IA, semana, dia da semana, faixa horária, falhas de conhecimento)
   com indicadores, gráficos e tabelas, exportável em Excel (.xlsx) e CSV.
   Carregar depois de desempenho.js e padroes.js (usa window.monDesempenho, monPadroes e monXlsx).
   Usa data, DESFECHOS, dt, hasFailure, isUnresolvedProtocol, ymdLocal, esc (app.js). */
(function(){
'use strict';
var D=window.monDesempenho,P=window.monPadroes;
if(!D||!P)return;
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var IAS=D.IAS,DIAS=P.DIAS,DS=P.DS;
var BANDS=[['Madrugada','0–6h',0,6],['Manhã','6–12h',6,12],['Tarde','12–18h',12,18],['Noite','18–24h',18,24]];
/* ordem fixa das cores de desfecho — não muda com os filtros */
var OUT=[
  {k:'resolvido',lab:'Resolvidos',one:'Resolvido',c:'--bi-res',t:'--bi-res-t'},
  {k:'nao',lab:'Não resolvidos',one:'Não resolvido',c:'--bi-nao',t:'--bi-nao-t'},
  {k:'transferido',lab:'Transferidos',one:'Transferido',c:'--bi-tra',t:'--bi-tra-t'},
  {k:'inatividade',lab:'Inatividade',one:'Inatividade',c:'--bi-ina',t:'--bi-ina-t'},
  {k:'outros',lab:'Outros',one:'Outros',c:'--bi-out',t:'--bi-out-t'}
];
var LINES=OUT.slice(0,4);
var F={ias:[],week:'',wd:[],band:[],fail:false,gran:''};
var LAST=null;

function toast(m){if(window.monToast)window.monToast(m)}
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('bi',n,e)}return r}}
function d0(iso){return new Date(iso+'T12:00:00')}
function plus(iso,n){var d=d0(iso);d.setDate(d.getDate()+n);return ymdLocal(d)}
function span(a,b){return Math.round((d0(b)-d0(a))/864e5)+1}
function brd(iso){var p=String(iso).split('-');return p[2]+'/'+p[1]}
function brf(iso){var p=String(iso).split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function n0(v){return Math.round(v).toLocaleString('pt-BR')}
function pc(v){return(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}
function nt(v){return v.toFixed(2).replace('.',',')}
function share(a,b){return b?a/b*100:0}
function pad(n){return('0'+n).slice(-2)}

/* ---------- Estilos ---------- */
var css=
'.bi{--bi-res:#1baf7a;--bi-nao:#e34948;--bi-tra:#2a78d6;--bi-ina:#eda100;--bi-out:#9aa7b2;--bi-fal:#6250d6;--bi-res-t:#0b1720;--bi-nao-t:#0b1720;--bi-tra-t:#fff;--bi-ina-t:#0b1720;--bi-out-t:#0b1720}'+
'html[data-theme=dark] .bi{--bi-res:#199e70;--bi-nao:#e66767;--bi-tra:#3987e5;--bi-ina:#c98500;--bi-out:#7b8a97;--bi-fal:#9085e9;--bi-res-t:#0b1720;--bi-nao-t:#0b1720;--bi-tra-t:#0b1720;--bi-ina-t:#0b1720;--bi-out-t:#0b1720}'+
'.bi .bi-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;margin-bottom:12px}.bi .bi-head>div:first-child{flex:1;min-width:220px}'+
'.bi .bi-actions{display:flex;flex-wrap:wrap;gap:8px}.bi .bi-actions .btn{width:auto;height:34px;padding:0 13px;font-size:12.5px}'+
'.bi .bi-filters{display:flex;flex-wrap:wrap;gap:12px 26px;align-items:flex-start}'+
'.bi .bi-fg{display:grid;gap:5px;min-width:0}.bi .bi-fg>span{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}'+
'.bi .bi-chips{display:flex;flex-wrap:wrap;gap:6px}'+
'.bi .bi-chip{height:30px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink2);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}'+
'.bi .bi-chip:hover{border-color:var(--blue);color:var(--ink)}.bi .bi-chip[aria-pressed=true]{background:var(--blue);border-color:var(--blue);color:#fff}'+
'.bi .bi-chip small{margin-left:5px;font-size:11px;opacity:.75}'+
'.bi .bi-chip:focus-visible,.bi .bi-sel:focus-visible,.bi .bi-mrow:focus-visible{outline:2px solid var(--blue);outline-offset:2px}'+
'.bi .bi-sel{height:34px;max-width:100%;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px}'+
'.bi .bi-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line2);font-size:12.5px;color:var(--ink2)}'+
'.bi .bi-bar b{color:var(--ink);font-variant-numeric:tabular-nums}.bi .bi-bar .bi-clear{margin-left:auto;border:0;background:none;color:var(--blue);font:inherit;font-weight:600;cursor:pointer}.bi .bi-clear[disabled]{color:var(--muted);cursor:default;opacity:.6}'+
'.bi .bi-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'+
'.bi .bi-k{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0}'+
'.bi .bi-k small{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.bi .bi-k small u{flex:none;width:8px;height:8px;border-radius:50%;background:var(--c,var(--muted2));text-decoration:none}'+
'.bi .bi-k strong{display:block;margin:3px 0 1px;font-size:26px;line-height:1.15;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}'+
'.bi .bi-k em{display:block;font-style:normal;font-size:12px;color:var(--muted)}.bi .bi-k em.ok{color:var(--good);font-weight:600}.bi .bi-k em.miss{color:var(--bad);font-weight:600}'+
'.bi .bi-lg{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0 0 8px;font-size:12px;color:var(--ink2)}.bi .bi-lg span{display:inline-flex;align-items:center;gap:6px}.bi .bi-lg u{width:10px;height:10px;border-radius:3px;background:var(--c);text-decoration:none}'+
'.bi .bi-mix{display:grid;gap:6px}'+
'.bi .bi-mrow{display:grid;grid-template-columns:minmax(92px,150px) minmax(0,1fr) 46px;align-items:center;gap:10px;width:100%;padding:3px 6px;margin:0 -6px;border:0;border-radius:8px;background:none;color:var(--ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;box-sizing:content-box}'+
'.bi .bi-mrow:hover{background:var(--surface2)}.bi .bi-mrow.sel{background:var(--surface2);box-shadow:inset 3px 0 0 var(--blue)}.bi .bi-mix.dim .bi-mrow:not(.sel){opacity:.55}'+
'.bi .bi-mn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.bi .bi-mrow.tot .bi-mn{color:var(--ink2)}.bi .bi-mt{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}'+
'.bi .bi-mbar{display:flex;gap:2px;height:24px;border-radius:4px;overflow:hidden;background:var(--surface3)}'+
'.bi .bi-mbar i{display:flex;align-items:center;justify-content:center;min-width:2px;overflow:hidden;background:var(--c);color:var(--t);font-style:normal;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}'+
'.bi .bi-fail{display:grid;gap:8px}.bi .bi-frow{display:grid;grid-template-columns:minmax(92px,150px) minmax(0,1fr) 116px;align-items:center;gap:10px;width:100%;padding:3px 6px;margin:0 -6px;border:0;border-radius:8px;background:none;color:var(--ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;box-sizing:content-box}'+
'.bi .bi-frow:hover{background:var(--surface2)}.bi .bi-frow.sel{background:var(--surface2);box-shadow:inset 3px 0 0 var(--blue)}.bi .bi-fail.dim .bi-frow:not(.sel){opacity:.55}'+
'.bi .bi-fbar{height:20px;border-radius:0 4px 4px 0;background:var(--bi-fal);min-width:2px}.bi .bi-ftrack{display:flex;align-items:center;height:20px}'+
'.bi .bi-fv{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}.bi .bi-fv small{display:block;white-space:nowrap;color:var(--muted);font-size:11px}'+
'.bi .bi-cw{position:relative;width:100%;min-height:220px}.bi .bi-cw svg{display:block;width:100%;overflow:visible;touch-action:pan-y}'+
'.bi .bi-cw text{font-family:inherit;fill:var(--muted);font-size:10.5px}.bi .bi-cw text.lab{fill:var(--ink2);font-size:11px}.bi .bi-cw .grid{stroke:var(--line2);stroke-width:1}.bi .bi-cw .axis{stroke:var(--line);stroke-width:1}'+
'.bi .bi-empty{display:flex;align-items:center;justify-content:center;min-height:120px;color:var(--muted);font-size:13px;text-align:center}'+
'.bi .bi-tw{overflow-x:auto}.bi table{width:100%;border-collapse:collapse;font-size:13px;min-width:700px}'+
'.bi th{padding:8px 10px;text-align:right;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--line);white-space:nowrap}'+
'.bi th:first-child,.bi td:first-child{text-align:left}.bi td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--line2);white-space:nowrap;font-variant-numeric:tabular-nums}'+
'.bi td small{display:block;font-size:10.5px;color:var(--muted)}.bi td b{font-weight:600}.bi td.hit b{color:var(--good)}.bi td.miss b{color:var(--bad)}'+
'.bi tr.tot td{font-weight:600;border-top:1px solid var(--line);background:var(--surface2)}.bi tr.sel td:first-child{box-shadow:inset 3px 0 0 var(--blue)}.bi tr.clk{cursor:pointer}.bi tr.clk:hover td{background:var(--surface2)}'+
'@media(max-width:820px){.bi td:first-child,.bi th:first-child{position:sticky;left:0;z-index:1;background:var(--surface)}.bi tr.tot td:first-child{background:var(--surface2)}}'+
'.bi .bi-note{margin-top:8px;font-size:11.5px;color:var(--muted)}'+
'#biTip{position:fixed;z-index:200;max-width:260px;padding:8px 10px;border-radius:8px;background:var(--ink);color:var(--surface);font-size:12px;line-height:1.45;box-shadow:0 8px 24px rgba(0,20,35,.28);pointer-events:none}'+
'#biTip b{display:block;margin-bottom:3px;font-weight:600}#biTip i{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:2px;background:var(--c)}#biTip span{display:flex;justify-content:space-between;gap:14px;font-variant-numeric:tabular-nums}'+
'@media(max-width:1000px){.bi .bi-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
'@media(max-width:560px){.bi .bi-k strong{font-size:22px}.bi .bi-k{padding:10px 12px}.bi .bi-actions{width:100%}.bi .bi-actions .btn{flex:1 1 0}.bi .bi-mrow,.bi .bi-frow{grid-template-columns:minmax(84px,104px) minmax(0,1fr) 40px;gap:8px}.bi .bi-mn{white-space:normal;line-height:1.2;font-size:12px}.bi .bi-frow{grid-template-columns:minmax(84px,104px) minmax(0,1fr) 92px}.bi .bi-bar .bi-clear{margin-left:0}}'+
'@media print{.bi .bi-actions,.bi .bi-filters,.bi .bi-clear{display:none!important}.bi .panel{break-inside:avoid}.bi .bi-tw{overflow:visible}.bi .bi-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Estrutura da aba ---------- */
function ensureTab(){
  if(q('[data-panel=bi]'))return;
  var sec=document.createElement('section');sec.dataset.panel='bi';sec.dataset.title='BI';sec.className='view bi';sec.hidden=true;
  sec.innerHTML=
    '<article class="panel" id="biHead"></article>'+
    '<div class="bi-kpis" id="biKpis"></div>'+
    '<div class="grid-2">'+
      '<article class="panel" id="biMix"></article>'+
      '<article class="panel" id="biFail"></article>'+
    '</div>'+
    '<article class="panel" id="biLine"></article>'+
    '<article class="panel" id="biCols"></article>'+
    '<article class="panel" id="biCmp"></article>'+
    '<article class="panel" id="biEvo"></article>';
  var last=qa('[data-panel]').pop();last.parentNode.insertBefore(sec,last.nextSibling);
  if(!q('.tabs [data-view=bi]')){
    var b=document.createElement('button');b.type='button';b.dataset.view='bi';
    b.innerHTML='<span class="tab-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16V9M10 16V4M16 16v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span> BI';
    q('.tabs').appendChild(b);
    b.onclick=function(){show('bi')};
    b.addEventListener('click',function(){if(location.hash.slice(1)!=='bi')location.hash='bi'});
  }
}

/* ---------- Dados preparados (uma vez por carga) ---------- */
function prep(){
  return data.r72.protocols.map(function(x){
    var ms=dt(x.firstDate),d=ms?new Date(ms):null;
    return{x:x,ia:x.agent,ms:ms,day:d?ymdLocal(d):'',wd:d?(d.getDay()+6)%7:-1,h:d?d.getHours():-1,fail:hasFailure(x)};
  });
}
function period(){return{start:q('#start').value,end:q('#end').value}}
function weekObj(ws){for(var i=0;i<ws.length;i++)if(ws[i].start===F.week)return ws[i];return null}
function inBand(h){return F.band.some(function(b){return h>=BANDS[b][2]&&h<BANDS[b][3]})}
function pass(r,skipIA,skipFail,wk){
  if(!skipIA&&F.ias.length&&F.ias.indexOf(r.ia)<0)return false;
  if(wk&&(!r.day||r.day<wk.start||r.day>wk.end))return false;
  if(F.wd.length&&F.wd.indexOf(r.wd)<0)return false;
  if(F.band.length&&!inBand(r.h))return false;
  if(!skipFail&&F.fail&&!r.fail)return false;
  return true;
}
function counts(v){return{resolvido:v.r,nao:v.u,transferido:v.tr,inatividade:v.ina,outros:Math.max(0,v.t-v.r-v.u-v.tr-v.ina)}}

function compute(){
  var rows=prep(),p=period(),ws=p.start&&p.end?D.weeks(p.start,p.end):[],wk=null;
  if(F.week){wk=weekObj(ws);if(!wk)F.week=''}
  var rs=wk?{start:wk.start,end:wk.end}:p;
  var all=D.byIA(rows.map(function(r){return r.x}));
  var fNoIA=rows.filter(function(r){return pass(r,true,false,wk)});
  var fNoIAFail=rows.filter(function(r){return pass(r,true,true,wk)});
  var f=rows.filter(function(r){return pass(r,false,false,wk)});
  var stIA=D.byIA(fNoIA.map(function(r){return r.x}));
  var stFail=D.byIA(fNoIAFail.map(function(r){return r.x}));
  var st=D.byIA(f.map(function(r){return r.x}));
  var days=rs.start&&rs.end&&rs.end>=rs.start?span(rs.start,rs.end):0;
  var gran=F.gran||(days>=21?'week':'day');
  if(wk)gran='day';
  if(days>62)gran='week';
  return{rows:rows,p:p,ws:ws,wk:wk,rs:rs,all:all,f:f,st:st,stIA:stIA,stFail:stFail,days:days,gran:gran,B:buckets(f,rs,gran)};
}
function buckets(list,rs,gran){
  var B=[],i;
  if(!rs.start||!rs.end||rs.end<rs.start)return B;
  if(gran==='week'){
    D.weeks(rs.start,rs.end).forEach(function(w){B.push({start:w.start,end:w.end,label:brd(w.start),full:'Semana '+brd(w.start)+' – '+brd(w.end)+(w.full?'':' (parcial)'),list:[]})});
  }else{
    var d=rs.start,k=0;
    while(d<=rs.end&&k++<400){var wd=(d0(d).getDay()+6)%7;B.push({start:d,end:d,label:brd(d),full:DIAS[wd]+' '+brf(d),list:[]});d=plus(d,1)}
  }
  list.forEach(function(r){if(!r.day)return;for(i=0;i<B.length;i++)if(r.day>=B[i].start&&r.day<=B[i].end){B[i].list.push(r.x);break}});
  B.forEach(function(b){b.v=D.byIA(b.list)._all});
  return B;
}

/* ---------- Dicas (tooltip único) ---------- */
var tip=null;
function showTip(html,cx,cy){
  if(!tip){tip=document.createElement('div');tip.id='biTip';tip.setAttribute('role','tooltip');document.body.appendChild(tip)}
  tip.innerHTML=html;tip.hidden=false;
  var z=parseFloat(getComputedStyle(document.body).zoom)||1,w=tip.offsetWidth*z,h=tip.offsetHeight*z,x=cx+14,y=cy+14;
  if(x+w>innerWidth-8)x=cx-w-14;if(x<8)x=8;
  if(y+h>innerHeight-8)y=cy-h-14;if(y<8)y=8;
  tip.style.left=x/z+'px';tip.style.top=y/z+'px';
}
function hideTip(){if(tip)tip.hidden=true}
function swatch(c){return'<i style="--c:var('+c+')"></i>'}
function tipOutcomes(title,v,sub){
  var c=counts(v),h='<b>'+esc(title)+'</b>'+(sub?'<span><em style="font-style:normal;opacity:.8">'+esc(sub)+'</em></span>':'')+'<span><em style="font-style:normal;opacity:.8">Atendimentos com desfecho</em><b style="margin:0;display:inline">'+n0(v.t)+'</b></span>';
  OUT.forEach(function(o){if(o.k==='outros'&&!c.outros)return;h+='<span><em style="font-style:normal">'+swatch(o.c)+o.lab+'</em><em style="font-style:normal">'+n0(c[o.k])+' · '+pc(share(c[o.k],v.t))+'</em></span>'});
  return h;
}

/* ---------- Filtros ---------- */
function chipsIA(c){
  var have=IAS.filter(function(n){return c.all[n]&&(c.all[n].t||c.all[n].f)});
  if(!have.length)have=IAS.slice();
  F.ias.forEach(function(n){if(have.indexOf(n)<0)have.push(n)});
  return have;
}
function toggle(arr,v){var i=arr.indexOf(v);if(i>=0)arr.splice(i,1);else arr.push(v)}
function anyFilter(){return F.ias.length||F.week||F.wd.length||F.band.length||F.fail||F.gran}
function chip(group,val,label,on,extra){return'<button type="button" class="bi-chip" data-f="'+group+':'+val+'" aria-pressed="'+(on?'true':'false')+'">'+label+(extra||'')+'</button>'}

function renderHead(c){
  var wsOpts='';
  if(c.ws.length>1){
    wsOpts='<option value="">Período todo</option>'+c.ws.map(function(w){return'<option value="'+w.start+'"'+(F.week===w.start?' selected':'')+'>Semana '+brd(w.start)+' – '+brd(w.end)+(w.full?'':' (parcial)')+'</option>'}).join('');
  }
  var h='<div class="bi-head"><div><h2>BI · Desempenho das IAs</h2><p>'+brf(c.p.start)+' a '+brf(c.p.end)+' · mesmo período do topo da página. Filtre, compare e exporte.</p></div>'+
    '<div class="bi-actions"><button type="button" class="btn btn-primary" data-act="xlsx" title="Baixar a planilha com os filtros aplicados (resumo, comparativo, evolução e dados)">↓ Excel</button><button type="button" class="btn btn-ghost" data-act="csv" title="Baixar os atendimentos filtrados em CSV">↓ CSV</button></div></div>'+
    '<div class="bi-filters">'+
      '<div class="bi-fg"><span>IA</span><div class="bi-chips">'+chipsIA(c).map(function(n){return chip('ia',esc(n),esc(n),F.ias.indexOf(n)>=0)}).join('')+'</div></div>'+
      (wsOpts?'<div class="bi-fg"><span>Recorte</span><select class="bi-sel" data-f="week" aria-label="Recorte do período">'+wsOpts+'</select></div>':'')+
      '<div class="bi-fg"><span>Dia da semana</span><div class="bi-chips">'+DS.map(function(n,i){return chip('wd',i,n,F.wd.indexOf(i)>=0)}).join('')+'</div></div>'+
      '<div class="bi-fg"><span>Faixa horária</span><div class="bi-chips">'+BANDS.map(function(b,i){return chip('band',i,b[0],F.band.indexOf(i)>=0,'<small>'+b[1]+'</small>')}).join('')+'</div></div>'+
      '<div class="bi-fg"><span>Conhecimento</span><div class="bi-chips">'+chip('fail','1','Só falhas de conhecimento',F.fail)+'</div></div>'+
      '<div class="bi-fg"><span>Evolução</span><select class="bi-sel" data-f="gran" aria-label="Agrupar a evolução"><option value="">Automático</option><option value="day"'+(F.gran==='day'?' selected':'')+'>Por dia</option><option value="week"'+(F.gran==='week'?' selected':'')+'>Por semana</option></select></div>'+
    '</div>'+
    '<div class="bi-bar"><span>Mostrando <b>'+n0(c.st._all.t)+'</b> de <b>'+n0(c.all._all.t)+'</b> atendimentos com desfecho</span>'+
    '<span>'+n0(c.f.length)+' protocolos no filtro</span>'+
    '<button type="button" class="bi-clear" data-act="clear"'+(anyFilter()?'':' disabled')+'>Limpar filtros</button></div>';
  q('#biHead').innerHTML=h;
}

/* ---------- Indicadores ---------- */
function singleGoal(c){return F.ias.length===1?D.metas()[F.ias[0]]:null}
function goalLine(goal,field,v,has){
  if(!goal||goal[field]==null)return'';
  var ok=D.check(goal,field,v,has);
  return'<em class="'+(ok===true?'ok':ok===false?'miss':'')+'">'+(ok===true?'✔ ':ok===false?'✖ ':'')+D.goalText(goal,field)+'</em>';
}
function metaTally(c){
  var metas=D.metas(),hit=0,tot=0,scope=F.ias.length?F.ias:IAS.filter(function(n){return c.st[n]&&c.st[n].t});
  scope.forEach(function(ia){
    var g=metas[ia],v=c.st[ia];if(!g||!v)return;
    D.FIELDS.forEach(function(f){var has=f[0]==='nota'?v.nn>0:v.t>0,ok=D.check(g,f[0],v[f[0]],has);if(ok!==null){tot++;if(ok)hit++}});
  });
  return{hit:hit,tot:tot,n:scope.length};
}
function renderKpis(c){
  var v=c.st._all,cnt=counts(v),g=singleGoal(c),t=v.t;
  var k=function(color,lab,val,sub){return'<div class="bi-k"><small>'+(color?'<u style="--c:var('+color+')"></u>':'')+lab+'</small><strong>'+val+'</strong>'+sub+'</div>'};
  var mt=metaTally(c);
  var h=k('','Atendimentos com desfecho',n0(t),'<em>'+pc(share(t,c.all._all.t))+' do total do período</em>')+
    k('--bi-res','Resolvidos',t?pc(v.resolvido):'—','<em>'+n0(cnt.resolvido)+' atendimentos</em>'+goalLine(g,'resolvido',v.resolvido,t>0))+
    k('--bi-tra','Transferidos',t?pc(v.transferido):'—','<em>'+n0(cnt.transferido)+' atendimentos</em>'+goalLine(g,'transferido',v.transferido,t>0))+
    k('--bi-nao','Não resolvidos',t?pc(v.nao):'—','<em>'+n0(cnt.nao)+' atendimentos</em>'+goalLine(g,'nao',v.nao,t>0))+
    k('--bi-ina','Inatividade',t?pc(v.inatividade):'—','<em>'+n0(cnt.inatividade)+' atendimentos</em>')+
    k('','Nota média',v.nn?nt(v.nota):'—','<em>'+n0(v.nn)+' avaliações'+(v.nn?' · '+pc(v.pos)+' notas 4 e 5':'')+'</em>'+goalLine(g,'nota',v.nota,v.nn>0))+
    k('--bi-fal','Falhas de conhecimento',n0(v.f),'<em>'+(t?pc(share(v.f,t))+' dos atendimentos':'—')+'</em>')+
    k('','Metas atingidas',mt.tot?mt.hit+' de '+mt.tot:'—','<em>'+(mt.tot?(F.ias.length?'nas IAs selecionadas':'em todas as IAs'):'sem metas definidas')+'</em>');
  q('#biKpis').innerHTML=h;
}

/* ---------- Composição por IA e falhas ---------- */
function legend(c){
  var show=OUT.filter(function(o){return o.k!=='outros'||(c.stIA._all&&counts(c.stIA._all).outros>0)});
  return'<div class="bi-lg">'+show.map(function(o){return'<span><u style="--c:var('+o.c+')"></u>'+o.lab+'</span>'}).join('')+'</div>';
}
function mixRow(name,v,sel,tot){
  var cn=counts(v),segs=OUT.map(function(o){
    var n=cn[o.k];if(!n)return'';
    var p=share(n,v.t);
    return'<i data-seg="'+esc(name)+'|'+o.k+'" style="flex:'+n+' 1 0;--c:var('+o.c+');--t:var('+o.t+')">'+(p>=(innerWidth<560?17:10)?Math.round(p)+'%':'')+'</i>';
  }).join('');
  return'<button type="button" class="bi-mrow'+(sel?' sel':'')+(tot?' tot':'')+'" data-ia="'+(tot?'':esc(name))+'" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+esc(name)+': '+n0(v.t)+' atendimentos"'+(tot?' tabindex="-1"':'')+'>'+
    '<span class="bi-mn" title="'+esc(name)+'">'+esc(name)+'</span><span class="bi-mbar" data-row="'+esc(name)+'">'+(v.t?segs:'')+'</span><span class="bi-mt">'+n0(v.t)+'</span></button>';
}
function renderMix(c){
  var rows='',any=false;
  rows+=mixRow('Todas as IAs',c.stIA._all,false,true);
  IAS.forEach(function(n){var v=c.stIA[n];if(!v||!v.t)return;any=true;rows+=mixRow(n,v,F.ias.indexOf(n)>=0,false)});
  q('#biMix').innerHTML='<div class="panel-head"><div><h2>Como terminam os atendimentos</h2><p>Composição dos desfechos por IA · clique numa IA para filtrar</p></div></div>'+
    (c.stIA._all.t&&any?legend(c)+'<div class="bi-mix'+(F.ias.length?' dim':'')+'">'+rows+'</div>':'<div class="bi-empty">Sem atendimentos com desfecho nesses filtros.</div>');
}
function renderFail(c){
  var max=0;IAS.forEach(function(n){var v=c.stFail[n];if(v&&v.f>max)max=v.f});
  var rows=IAS.filter(function(n){var v=c.stFail[n];return v&&(v.t||v.f)}).map(function(n){
    var v=c.stFail[n],sel=F.ias.indexOf(n)>=0;
    return'<button type="button" class="bi-frow'+(sel?' sel':'')+'" data-ia="'+esc(n)+'" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+esc(n)+': '+n0(v.f)+' falhas de conhecimento"><span class="bi-mn" title="'+esc(n)+'">'+esc(n)+'</span>'+
      '<span class="bi-ftrack"><span class="bi-fbar" style="width:'+(max?Math.max(1,v.f/max*100):0)+'%" data-fail="'+esc(n)+'"></span></span>'+
      '<span class="bi-fv">'+n0(v.f)+'<small>'+(v.t?pc(share(v.f,v.t)):'—')+' dos atend.</small></span></button>';
  }).join('');
  q('#biFail').innerHTML='<div class="panel-head"><div><h2>Falhas de conhecimento</h2><p>Atendimentos em que a IA não soube responder, por IA</p></div></div>'+
    (rows&&c.stFail._all.f?'<div class="bi-fail'+(F.ias.length?' dim':'')+'">'+rows+'</div>':'<div class="bi-empty">'+(rows?'Nenhuma falha de conhecimento nesses filtros.':'Sem atendimentos nesses filtros.')+'</div>');
}

/* ---------- Gráficos SVG (largura real do contêiner) ---------- */
var NS='http://www.w3.org/2000/svg';
function el(n,a,txt){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e}
function niceMax(v){var raw=Math.max(v,4)/4,mag=Math.pow(10,Math.floor(Math.log10(raw))),n=raw/mag,st=n<=1?1:n<=2?2:n<=5?5:10;return st*mag*4}
function xlabels(g,B,xc,H,m,pw){
  var maxL=Math.max(1,Math.floor(pw/48)),step=Math.ceil(B.length/maxL);
  B.forEach(function(b,i){if(i%step!==0&&i!==B.length-1)return;if(i!==B.length-1&&B.length-1-i<step*0.6&&i!==0)return;
    g.appendChild(el('text',{x:xc(i),y:H-m.b+16,'text-anchor':'middle'},b.label))});
}
function frame(host,H,m,W){
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'});
  return svg;
}
function hoverLayer(host,svg,B,m,pw,ph,xc,onMove){
  var hv=el('g',{style:'display:none'}),ov=el('rect',{x:m.l,y:m.t,width:pw,height:ph,fill:'transparent'});
  svg.appendChild(hv);svg.appendChild(ov);
  function idx(e){var r=svg.getBoundingClientRect(),sx=svg.viewBox.baseVal.width/r.width,px=(e.clientX-r.left)*sx;return Math.max(0,Math.min(B.length-1,Math.floor((px-m.l)/pw*B.length)))}
  function move(e){var i=idx(e);hv.style.display='';onMove(i,hv,e)}
  ov.addEventListener('pointermove',move);ov.addEventListener('pointerdown',move);
  ov.addEventListener('pointerleave',function(){hv.style.display='none';hideTip()});
  return hv;
}
function drawLine(c){
  var host=q('#biLineCw');if(!host)return;
  var B=c.B,W=host.clientWidth;if(!W||!B.length)return;
  host.textContent='';
  var wide=W>=640,H=250,m={l:40,r:wide?100:12,t:12,b:28},pw=W-m.l-m.r,ph=H-m.t-m.b;
  var svg=frame(host,H,m,W);
  svg.setAttribute('aria-label','Evolução dos percentuais de desfecho: '+B.map(function(b){return b.label}).join(', '));
  var xc=function(i){return m.l+pw*(i+.5)/B.length},yc=function(v){return m.t+ph*(1-v/100)};
  [0,25,50,75,100].forEach(function(t){svg.appendChild(el('line',{x1:m.l,x2:W-m.r,y1:yc(t),y2:yc(t),class:t?'grid':'axis'}));svg.appendChild(el('text',{x:m.l-8,y:yc(t)+3.5,'text-anchor':'end'},t+'%'))});
  xlabels(svg,B,xc,H,m,pw);
  var ends=[];
  LINES.forEach(function(o){
    var d='',pen=false,prevNull=true,single=[];
    B.forEach(function(b,i){
      if(!b.v.t){prevNull=true;return}
      var x=xc(i),y=yc(b.v[o.k]);
      d+=(prevNull?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);
      var nextNull=i===B.length-1||!B[i+1].v.t;
      if(prevNull&&nextNull)single.push([x,y]);
      prevNull=false;
    });
    svg.appendChild(el('path',{d:d,fill:'none',stroke:'var('+o.c+')','stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'}));
    var dots=B.length<=16?B.map(function(b,i){return b.v.t?[xc(i),yc(b.v[o.k])]:null}).filter(Boolean):single;
    dots.forEach(function(p){svg.appendChild(el('circle',{cx:p[0],cy:p[1],r:4,fill:'var('+o.c+')',stroke:'var(--surface)','stroke-width':2}))});
    for(var i=B.length-1;i>=0;i--)if(B[i].v.t){ends.push({o:o,y:yc(B[i].v[o.k])});break}
  });
  if(wide){
    ends.sort(function(a,b){return a.y-b.y});
    for(var i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<14)ends[i].y=ends[i-1].y+14;
    ends.forEach(function(e){
      svg.appendChild(el('rect',{x:W-m.r+8,y:e.y-4,width:8,height:8,rx:2,fill:'var('+e.o.c+')'}));
      svg.appendChild(el('text',{x:W-m.r+21,y:e.y+3.5,class:'lab'},e.o.lab));
    });
  }
  hoverLayer(host,svg,B,m,pw,ph,xc,function(i,hv,e){
    hv.textContent='';var b=B[i];
    hv.appendChild(el('line',{x1:xc(i),x2:xc(i),y1:m.t,y2:m.t+ph,stroke:'var(--muted2)','stroke-width':1}));
    if(b.v.t)LINES.forEach(function(o){hv.appendChild(el('circle',{cx:xc(i),cy:yc(b.v[o.k]),r:4.5,fill:'var('+o.c+')',stroke:'var(--surface)','stroke-width':2}))});
    showTip(b.v.t?tipOutcomes(b.full,b.v):'<b>'+esc(b.full)+'</b>Sem atendimentos',e.clientX,e.clientY);
  });
  host.appendChild(svg);
}
function drawCols(c){
  var host=q('#biColsCw');if(!host)return;
  var B=c.B,W=host.clientWidth;if(!W||!B.length)return;
  host.textContent='';
  var H=250,m={l:44,r:12,t:12,b:28},pw=W-m.l-m.r,ph=H-m.t-m.b;
  var mx=0;B.forEach(function(b){if(b.v.t>mx)mx=b.v.t});
  var top=niceMax(Math.max(mx,1)),svg=frame(host,H,m,W);
  svg.setAttribute('aria-label','Volume de atendimentos por desfecho: '+B.map(function(b){return b.label}).join(', '));
  var xc=function(i){return m.l+pw*(i+.5)/B.length},yc=function(v){return m.t+ph*(1-v/top)};
  for(var t=0;t<=4;t++){var val=top*t/4;svg.appendChild(el('line',{x1:m.l,x2:W-m.r,y1:yc(val),y2:yc(val),class:t?'grid':'axis'}));svg.appendChild(el('text',{x:m.l-8,y:yc(val)+3.5,'text-anchor':'end'},n0(val)))}
  xlabels(svg,B,xc,H,m,pw);
  var band=pw/B.length,cw=Math.max(3,Math.min(24,band*0.7)),defs=el('defs',{});svg.appendChild(defs);
  B.forEach(function(b,i){
    if(!b.v.t)return;
    var cn=counts(b.v),x=xc(i)-cw/2,y=yc(0),colTop=yc(b.v.t),id='bic'+i;
    var cp=el('clipPath',{id:id});cp.appendChild(el('rect',{x:x,y:colTop,width:cw,height:y-colTop+8,rx:Math.min(4,cw/2)}));defs.appendChild(cp);
    var g=el('g',{'clip-path':'url(#'+id+')'}),acc=0;
    OUT.forEach(function(o){
      var n=cn[o.k];if(!n)return;
      var y1=yc(acc+n),y0=yc(acc);acc+=n;
      g.appendChild(el('rect',{x:x,y:y1,width:cw,height:Math.max(0,y0-y1),fill:'var('+o.c+')',stroke:'var(--surface)','stroke-width':2,'paint-order':'stroke'}));
    });
    svg.appendChild(g);
  });
  hoverLayer(host,svg,B,m,pw,ph,xc,function(i,hv,e){
    hv.textContent='';var b=B[i];
    hv.appendChild(el('rect',{x:m.l+band*i,y:m.t,width:band,height:ph,fill:'var(--ink)',opacity:.06}));
    showTip(b.v.t?tipOutcomes(b.full,b.v):'<b>'+esc(b.full)+'</b>Sem atendimentos',e.clientX,e.clientY);
  });
  host.appendChild(svg);
}
function renderCharts(c){
  var sub=c.gran==='week'?'por semana':'por dia',empty=!c.st._all.t;
  q('#biLine').innerHTML='<div class="panel-head"><div><h2>Evolução dos desfechos (%)</h2><p>Percentual sobre os atendimentos com desfecho de cada '+(c.gran==='week'?'semana':'dia')+' · passe o mouse para ver os valores</p></div></div>'+
    (empty?'<div class="bi-empty">Sem atendimentos com desfecho nesses filtros.</div>':legend(c)+'<div class="bi-cw" id="biLineCw"></div>');
  q('#biCols').innerHTML='<div class="panel-head"><div><h2>Volume de atendimentos</h2><p>Quantidade de atendimentos com desfecho '+sub+', separada por desfecho</p></div></div>'+
    (empty?'<div class="bi-empty">Sem atendimentos com desfecho nesses filtros.</div>':legend(c)+'<div class="bi-cw" id="biColsCw"></div>');
  drawLine(c);drawCols(c);
  if(window.requestAnimationFrame&&window.biFit)requestAnimationFrame(window.biFit);
}

/* ---------- Tabelas ---------- */
function cellRate(goal,field,v,txt,cnt){
  var has=field==='nota'?v.nn>0:v.t>0,ok=goal?D.check(goal,field,v[field],has):null;
  return'<td class="'+(ok===true?'hit':ok===false?'miss':'')+'"><b>'+txt+'</b>'+(cnt!=null?'<small>'+cnt+'</small>':'')+'</td>';
}
function statCells(v,goal){
  var cn=counts(v),t=v.t;
  return'<td><b>'+n0(t)+'</b></td>'+
    cellRate(goal,'resolvido',v,t?pc(v.resolvido):'—',n0(cn.resolvido))+
    cellRate(goal,'nao',v,t?pc(v.nao):'—',n0(cn.nao))+
    cellRate(goal,'transferido',v,t?pc(v.transferido):'—',n0(cn.transferido))+
    '<td><b>'+(t?pc(v.inatividade):'—')+'</b><small>'+n0(cn.inatividade)+'</small></td>'+
    cellRate(goal,'nota',v,v.nn?nt(v.nota):'—',v.nn?n0(v.nn)+' aval.':'')+
    '<td><b>'+n0(v.f)+'</b></td>';
}
var THEAD='<th>%s</th><th>Atend.</th><th>Resolvidos</th><th>Não resolvidos</th><th>Transferidos</th><th>Inatividade</th><th>Nota média</th><th>Falhas</th>';
function renderTables(c){
  var metas=D.metas(),rows='';
  IAS.forEach(function(n){var v=c.stIA[n];if(!v||(!v.t&&!v.f))return;var sel=F.ias.indexOf(n)>=0;
    rows+='<tr class="clk'+(sel?' sel':'')+'" data-ia="'+esc(n)+'" tabindex="0" aria-pressed="'+(sel?'true':'false')+'"><td><b>'+esc(n)+'</b></td>'+statCells(v,metas[n])+'</tr>'});
  rows+='<tr class="tot"><td>Todas as IAs</td>'+statCells(c.stIA._all,null)+'</tr>';
  q('#biCmp').innerHTML='<div class="panel-head"><div><h2>Comparativo entre IAs</h2><p>Valores nos filtros atuais (exceto o filtro de IA) · verde/vermelho = meta atingida/não atingida · clique numa linha para filtrar</p></div></div>'+
    '<div class="bi-tw"><table><thead><tr>'+THEAD.replace('%s','IA')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  var g=F.ias.length===1?metas[F.ias[0]]:null;
  var ev=c.B.map(function(b){return'<tr><td><b>'+esc(b.full)+'</b></td>'+statCells(b.v,g)+'</tr>'}).join('');
  q('#biEvo').innerHTML='<div class="panel-head"><div><h2>Evolução '+(c.gran==='week'?'semanal':'diária')+'</h2><p>Os mesmos números dos gráficos, em tabela'+(g?' · com as metas de '+esc(F.ias[0]):'')+'</p></div></div>'+
    '<div class="bi-tw"><table><thead><tr>'+THEAD.replace('%s',c.gran==='week'?'Semana':'Dia')+'</tr></thead><tbody>'+ev+'<tr class="tot"><td>Total do filtro</td>'+statCells(c.st._all,g)+'</tr></tbody></table></div>'+
    '<p class="bi-note">Percentuais calculados sobre os atendimentos com desfecho. “Falhas” conta protocolos com ponto de falha de conhecimento.</p>';
}

/* ---------- Render ---------- */
function render(){
  ensureTab();
  if(typeof data==='undefined'||!data||!data.r72){return}
  var af=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.bi')&&document.activeElement.getAttribute('data-f');
  var c=compute();LAST=c;
  renderHead(c);renderKpis(c);renderMix(c);renderFail(c);renderCharts(c);renderTables(c);
  if(af){var e=q('.bi [data-f="'+af+'"]');if(e&&e.focus)e.focus()}
}
function redo(){render()}

/* ---------- Interações ---------- */
document.addEventListener('click',function(e){
  var root=e.target.closest&&e.target.closest('.bi');if(!root)return;
  var f=e.target.closest('[data-f]'),a=e.target.closest('[data-act]'),ia=e.target.closest('[data-ia]');
  if(f&&f.tagName==='BUTTON'){
    var p=f.dataset.f.split(':'),g=p[0],v=p.slice(1).join(':');
    if(g==='ia')toggle(F.ias,v);else if(g==='wd')toggle(F.wd,+v);else if(g==='band')toggle(F.band,+v);else if(g==='fail')F.fail=!F.fail;
    redo();return;
  }
  if(a){
    if(a.dataset.act==='clear'){F={ias:[],week:'',wd:[],band:[],fail:false,gran:''};redo()}
    else if(a.dataset.act==='xlsx')exportXlsx();
    else if(a.dataset.act==='csv')exportCsv();
    return;
  }
  if(ia&&ia.dataset.ia){toggle(F.ias,ia.dataset.ia);redo()}
});
document.addEventListener('change',function(e){
  var s=e.target.closest&&e.target.closest('.bi select[data-f]');if(!s)return;
  if(s.dataset.f==='week')F.week=s.value;else if(s.dataset.f==='gran')F.gran=s.value;
  redo();
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.bi tr.clk')){e.preventDefault();toggle(F.ias,e.target.dataset.ia);redo()}
});
/* dicas nas barras de composição e de falhas */
function tipMove(e){
  var t=e.target.closest&&e.target.closest('.bi [data-seg],.bi [data-fail]');
  if(!t||!LAST){if(tip&&!tip.hidden&&!e.target.closest('.bi-cw'))hideTip();return}
  if(t.dataset.seg){
    var s=t.dataset.seg.split('|'),name=s[0],k=s[1],v=name==='Todas as IAs'?LAST.stIA._all:LAST.stIA[name];if(!v)return;
    var o=OUT.filter(function(x){return x.k===k})[0],n=counts(v)[k];
    showTip('<b>'+esc(name)+'</b><span><em style="font-style:normal">'+swatch(o.c)+o.lab+'</em><em style="font-style:normal">'+n0(n)+' · '+pc(share(n,v.t))+'</em></span><span><em style="font-style:normal;opacity:.8">Total com desfecho</em><em style="font-style:normal">'+n0(v.t)+'</em></span>',e.clientX,e.clientY);
  }else{
    var nm=t.dataset.fail,fv=LAST.stFail[nm];if(!fv)return;
    showTip('<b>'+esc(nm)+'</b><span><em style="font-style:normal">'+swatch('--bi-fal')+'Falhas de conhecimento</em><em style="font-style:normal">'+n0(fv.f)+'</em></span><span><em style="font-style:normal;opacity:.8">Dos atendimentos com desfecho</em><em style="font-style:normal">'+(fv.t?pc(share(fv.f,fv.t)):'—')+'</em></span>',e.clientX,e.clientY);
  }
}
document.addEventListener('pointermove',tipMove);document.addEventListener('pointerdown',tipMove);
window.addEventListener('scroll',hideTip,{passive:true});
/* redesenha os gráficos quando a largura muda (inclusive ao abrir a aba) */
ensureTab();
if(window.ResizeObserver){
  var tries=0,fit=function(){
    if(!LAST)return;var ch=false;
    ['biLineCw','biColsCw'].forEach(function(id){var e=document.getElementById(id);if(!e)return;var w=e.clientWidth,sv=e.firstChild;if(w&&(!sv||Math.abs(sv.viewBox.baseVal.width-w)>1))ch=true});
    if(ch&&tries++<4){drawLine(LAST);drawCols(LAST);requestAnimationFrame(fit)}
  },ro=new ResizeObserver(function(){tries=0;fit()});
  window.addEventListener('resize',function(){tries=0;fit()});
  window.biFit=function(){tries=0;fit()};
  ro.observe(q('[data-panel=bi]'));
}

/* ---------- Exportação ---------- */
function filterTexts(c){
  return{
    ia:F.ias.length?F.ias.join(', '):'Todas',
    rec:c.wk?'Semana '+brf(c.wk.start)+' a '+brf(c.wk.end):'Período todo',
    wd:F.wd.length?F.wd.slice().sort().map(function(i){return DS[i]}).join(', '):'Todos',
    band:F.band.length?F.band.slice().sort().map(function(i){return BANDS[i][0]+' ('+BANDS[i][1]+')'}).join(', '):'Todas',
    fail:F.fail?'Sim':'Não'
  };
}
function outLabel(x){
  if(x.outcome==='resolvido')return'Resolvido';
  if(isUnresolvedProtocol(x))return'Não resolvido';
  if(x.outcome==='transferido')return'Transferido';
  if(x.outcome==='inatividade')return'Inatividade';
  if(DESFECHOS.indexOf(x.outcome)>=0)return'Outros';
  return'Sem desfecho';
}
function bandOf(h){for(var i=0;i<BANDS.length;i++)if(h>=BANDS[i][2]&&h<BANDS[i][3])return BANDS[i][0];return''}
function statRow(label,v,goal,extra){
  var cn=counts(v),f=function(x){return{v:x,s:'pct'}},i=function(x){return{v:x,s:'int'}},tot=0,hit=0;
  var gv=function(k){return goal&&goal[k]!=null?Number(goal[k]):null};
  D.FIELDS.forEach(function(fl){var has=fl[0]==='nota'?v.nn>0:v.t>0,ok=goal?D.check(goal,fl[0],v[fl[0]],has):null;if(ok!==null){tot++;if(ok)hit++}});
  var gp=function(k){var g=gv(k);return g==null?null:{v:g/100,s:'pct'}};
  return(extra||[label]).concat([i(v.t),i(cn.resolvido),f(v.t?v.r/v.t:null),i(cn.transferido),f(v.t?v.tr/v.t:null),i(cn.nao),f(v.t?v.u/v.t:null),i(cn.inatividade),f(v.t?v.ina/v.t:null),i(cn.outros),
    i(v.nn),v.nn?{v:Math.round(v.nota*100)/100,s:'dec'}:null,v.nn?f(v.pos/100):null,i(v.f),gp('resolvido'),gp('transferido'),gp('nao'),gv('nota')!=null?{v:gv('nota'),s:'dec'}:null,tot?hit+' de '+tot:null]);
}
var HEAD_STAT=['Atendimentos com desfecho','Resolvidos','% Resolvidos','Transferidos','% Transferidos','Não resolvidos','% Não resolvidos','Inatividade','% Inatividade','Outros','Avaliações','Nota média','% Notas 4 e 5','Falhas de conhecimento','Meta % resolvidos','Meta % transferidos','Meta % não resolvidos','Meta nota','Metas atingidas'];
function head(a){return a.map(function(t){return{v:t,s:'head'}})}
function dataRows(c){
  return c.f.filter(function(r){return r.ms}).sort(function(a,b){return a.ms-b.ms}).map(function(r){
    var d=new Date(r.ms),x=r.x,wkStart=plus(r.day,-r.wd);
    return[String(x.protocol||''),new Date(d.getFullYear(),d.getMonth(),d.getDate()),r.h,DIAS[r.wd],bandOf(r.h),new Date(+wkStart.slice(0,4),+wkStart.slice(5,7)-1,+wkStart.slice(8,10)),x.agent||'',outLabel(x),
      x.survey&&x.survey.note?{v:x.survey.note,s:'int'}:null,r.fail?'Sim':'Não'];
  });
}
var DATA_HEAD=['Protocolo','Data','Hora','Dia da semana','Faixa horária','Semana (início)','IA','Desfecho','Nota','Falha de conhecimento'];
function stamp(){var d=new Date();return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
function fileName(c,ext){return'bi-monitor-ia-'+c.rs.start+'-a-'+c.rs.end+'.'+ext}
function save(blob,name){
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
}
function exportXlsx(){
  if(!LAST){toast('Carregue os dados primeiro');return}
  if(!window.monXlsx){toast('Exportação indisponível');return}
  var c=LAST,ft=filterTexts(c),v=c.st._all,g=singleGoal(c),metas=D.metas(),t=v.t,mt=metaTally(c);
  var lab=function(s){return{v:s,s:'bold'}},st=function(ok){return ok===true?'Atingida':ok===false?'Não atingida':''};
  var kpi=function(name,val,fmt,goal,field,has){
    var ok=g&&goal!=null?D.check(g,field,field==='nota'?v.nota:v[field],has):null;
    return[name,{v:val,s:fmt},goal!=null&&g?(field==='nota'?String(g[field]).replace('.',','):g[field]+'%'):null,st(ok)];
  };
  var resumo=[
    [{v:'BI · Monitor IA — Safeweb',s:'title'}],
    [{v:'Gerado em '+stamp()+'. Percentuais calculados sobre os atendimentos com desfecho.',s:'note'}],
    [],
    [lab('Período'),brf(c.p.start)+' a '+brf(c.p.end)],
    [lab('Recorte'),ft.rec],[lab('IA'),ft.ia],[lab('Dias da semana'),ft.wd],[lab('Faixa horária'),ft.band],[lab('Somente falhas de conhecimento'),ft.fail],
    [],
    head(['Indicador','Valor','Meta','Situação da meta']),
    ['Atendimentos com desfecho',{v:t,s:'int'}],
    ['% do total do período',{v:c.all._all.t?t/c.all._all.t:0,s:'pct'}],
    kpi('% Resolvidos',t?v.r/t:null,'pct',g&&g.resolvido,'resolvido',t>0),
    kpi('% Transferidos',t?v.tr/t:null,'pct',g&&g.transferido,'transferido',t>0),
    kpi('% Não resolvidos',t?v.u/t:null,'pct',g&&g.nao,'nao',t>0),
    ['% Inatividade',{v:t?v.ina/t:null,s:'pct'}],
    kpi('Nota média',v.nn?Math.round(v.nota*100)/100:null,'dec',g&&g.nota,'nota',v.nn>0),
    ['Avaliações',{v:v.nn,s:'int'}],
    ['Falhas de conhecimento',{v:v.f,s:'int'}],
    ['Metas atingidas',mt.tot?mt.hit+' de '+mt.tot:'sem metas definidas'],
    [],
    [{v:'A meta de cada indicador só aparece quando uma única IA está selecionada.',s:'note'}]
  ];
  var cmp=[head(['IA'].concat(HEAD_STAT).concat(['Incluída no filtro']))];
  IAS.forEach(function(n){var s=c.stIA[n];if(!s||(!s.t&&!s.f))return;var r=statRow(n,s,metas[n]);r.push(!F.ias.length||F.ias.indexOf(n)>=0?'Sim':'Não');cmp.push(r)});
  var rt=statRow('Todas as IAs',c.stIA._all,null);rt.push('');cmp.push(rt);
  var evo=function(gran){
    var B=buckets(c.f,c.rs,gran),rows=[head([gran==='week'?'Semana':'Dia','De','Até'].concat(HEAD_STAT.slice(0,14)))];
    B.forEach(function(b){
      var d1=d0(b.start),d2=d0(b.end);
      var r=statRow(b.full,b.v,null,[b.full,d1,d2]);rows.push(r.slice(0,17));
    });
    var r=statRow('Total do filtro',v,null,['Total do filtro',d0(c.rs.start),d0(c.rs.end)]);rows.push(r.slice(0,17));
    return rows;
  };
  var evoW=evo('week'),sheets=[
    {name:'Resumo',cols:[34,16,12,18],rows:resumo,grid:false},
    {name:'Comparativo IAs',cols:[22,14,12,12,12,12,12,12,12,12,10,11,11,12,14,12,12,12,10,12,12],rows:cmp,freeze:1,filter:true},
    {name:'Evolução semanal',cols:[30,12,12,14,12,12,12,12,12,12,12,12,10,11,11,12,14],rows:evoW,freeze:1,filter:true}
  ];
  if(c.days<=120)sheets.push({name:'Evolução diária',cols:[26,12,12,14,12,12,12,12,12,12,12,12,10,11,11,12,14],rows:evo('day'),freeze:1,filter:true});
  var dr=dataRows(c);
  sheets.push({name:'Dados',cols:[22,12,7,15,14,14,20,18,7,14],rows:[head(DATA_HEAD)].concat(dr),freeze:1,filter:true});
  window.monXlsx.build(sheets).then(function(b){save(b,fileName(c,'xlsx'));toast('Planilha baixada ('+n0(dr.length)+' atendimentos)')},function(){toast('Não foi possível gerar a planilha')});
}
function csvCell(v){
  if(v instanceof Date)v=pad(v.getDate())+'/'+pad(v.getMonth()+1)+'/'+v.getFullYear();
  if(v&&typeof v==='object')v=v.v;
  v=v==null?'':String(v);
  if(/^[=+\-@\t\r]/.test(v))v="'"+v;
  return'"'+v.replace(/"/g,'""')+'"';
}
function exportCsv(){
  if(!LAST){toast('Carregue os dados primeiro');return}
  var c=LAST,rows=[DATA_HEAD].concat(dataRows(c));
  var out=rows.map(function(r){return r.map(csvCell).join(';')}).join('\r\n');
  save(new Blob(['﻿'+out],{type:'text/csv;charset=utf-8'}),fileName(c,'csv'));
  toast('CSV baixado ('+n0(rows.length-1)+' atendimentos)');
}

window.monBI={state:function(){return F},compute:function(){return LAST}};
ensureTab();
wrap('renderAll',render);
if(typeof data!=='undefined'&&data&&data.r72)render();
})();
