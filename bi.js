/* bi.js — aba "BI": painel filtrável (IA, semana, dia da semana, faixa horária)
   com indicadores, gráficos e tabelas, exportável em Excel (.xlsx) e CSV.
   Carregar depois de desempenho.js e padroes.js (usa window.monDesempenho, monPadroes e monXlsx).
   Usa data, DESFECHOS, dt, isUnresolvedProtocol, ymdLocal, esc (app.js). */
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
  {k:'safenota',lab:'Finaliza SafeNota',one:'Finaliza SafeNota',c:'--bi-sn',t:'--bi-sn-t'},
  {k:'outros',lab:'Outros (não retornou)',one:'Outros (não retornou)',c:'--bi-out',t:'--bi-out-t'}
];
var LINES=OUT.slice(0,4);
function linesFor(c){return c.st._all.sn>0?LINES.concat([OUT[4]]):LINES}
var F={ias:[],ch:[],week:'',wd:[],band:[],gran:''};
var NOCH='Não informado';
/* a cor segue o canal (não a posição no ranking) */
var CH_ORDER=['WhatsApp','Webchat','Telegram','Instagram','Facebook','E-mail'];
function chColor(n){var i=CH_ORDER.indexOf(n);if(i<0||i>4)i=n===NOCH?-1:4;return i<0?'--muted2':'--bi-ch'+i}
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
'.bi{--bi-res:#1baf7a;--bi-nao:#e34948;--bi-tra:#2a78d6;--bi-ina:#eda100;--bi-out:#9aa7b2;--bi-sn:#b0477e;--bi-fcr:#12919f;--bi-nota:#6250d6;--bi-ch0:#6250d6;--bi-ch1:#eb6834;--bi-ch2:#12919f;--bi-ch3:#b8860b;--bi-ch4:#c13c7e;--bi-res-t:#0b1720;--bi-nao-t:#0b1720;--bi-tra-t:#fff;--bi-ina-t:#0b1720;--bi-out-t:#0b1720;--bi-sn-t:#fff}'+
'html[data-theme=dark] .bi{--bi-res:#199e70;--bi-nao:#e66767;--bi-tra:#3987e5;--bi-ina:#c98500;--bi-out:#7b8a97;--bi-sn:#e27fb2;--bi-fcr:#27a3b1;--bi-nota:#9085e9;--bi-ch0:#9085e9;--bi-ch1:#d95926;--bi-ch2:#27a3b1;--bi-ch3:#c9a227;--bi-ch4:#d55181;--bi-res-t:#0b1720;--bi-nao-t:#0b1720;--bi-tra-t:#0b1720;--bi-ina-t:#0b1720;--bi-out-t:#0b1720;--bi-sn-t:#0b1720}'+
'.bi .bi-head p{margin:4px 0 0;color:var(--muted);font-size:13px}.bi .bi-head p b{color:var(--ink2);font-weight:600}'+
'.bi .bi-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;margin-bottom:0}.bi .bi-head>div:first-child{flex:1;min-width:220px}'+
'.bi .bi-actions{display:flex;flex-wrap:wrap;gap:8px}.bi .bi-actions .btn{width:auto;height:34px;padding:0 13px;font-size:12.5px}'+
'.bi .bi-filters{display:flex;flex-wrap:wrap;gap:12px 26px;align-items:flex-start}'+
'.bi .bi-fg{display:grid;gap:5px;min-width:0}.bi .bi-fg>span{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}'+
'.bi .bi-chips{display:flex;flex-wrap:wrap;gap:6px}'+
'.bi .bi-chip{height:30px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink2);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}'+
'.bi .bi-chip:hover{border-color:var(--blue);color:var(--ink)}.bi .bi-chip[aria-pressed=true]{background:var(--blue);border-color:var(--blue);color:#fff}'+
'.bi .bi-chip small{margin-left:5px;font-size:11px;opacity:.75}'+
'.bi .bi-chip:focus-visible,.bi .bi-sel:focus-visible,.bi .bi-mrow:focus-visible{outline:2px solid var(--blue);outline-offset:2px}'+
'.bi .bi-sel{height:34px;max-width:100%;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px}'+
'.bi .bi-fl{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px 22px;margin-top:14px;padding:14px 16px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2)}'+
'.bi .bi-fl .g-ia{grid-column:span 4}.bi .bi-fl .g-ch{grid-column:span 3}.bi .bi-fl .g-wk{grid-column:span 3}.bi .bi-fl .g-gr{grid-column:span 2}.bi .bi-fl .g-wd{grid-column:span 6}.bi .bi-fl .g-bd{grid-column:span 6}'+
'.bi .bi-fl .bi-chip{background:var(--surface)}.bi .bi-fl .bi-chip[aria-pressed=true]{background:var(--blue)}.bi .bi-fl .bi-sel{width:100%}'+
'.bi .bi-ft{display:none;align-items:center;gap:8px;width:100%;height:40px;margin-top:12px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}'+
'.bi .bi-ft i{margin-left:auto;font-style:normal;color:var(--muted)}.bi .bi-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--blue);color:#fff;font-style:normal;font-size:11.5px;line-height:20px;text-align:center}'+
'.bi .bi-act{display:none;flex-wrap:wrap;gap:6px;margin-top:8px}.bi .bi-act span{padding:3px 9px;border:1px solid var(--line2);border-radius:999px;background:var(--surface2);font-size:12px;color:var(--ink2)}'+
'.bi .bi-mrow.n4,.bi .bi-mh{grid-template-columns:minmax(92px,150px) minmax(0,1fr) 52px 72px}'+
'.bi .bi-mh{display:grid;gap:10px;margin:2px 0 4px;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}.bi .bi-mh span:nth-child(n+3){text-align:right}'+
'.bi .bi-mnt{text-align:right;line-height:1.15;font-variant-numeric:tabular-nums}.bi .bi-mnt b{display:block;font-size:14px;font-weight:600;color:var(--ink)}.bi .bi-mnt small{display:block;font-size:10.5px;color:var(--muted)}'+
'.bi .bi-2c{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:8px 30px;align-items:start}.bi .bi-2c .bi-sub:first-child{margin-top:4px}.bi .bi-2c .bi-mix{margin-top:4px}'+
'@media(max-width:1000px){.bi .bi-fl .bi-fg{grid-column:span 6!important}.bi .bi-2c{grid-template-columns:minmax(0,1fr)}}'+
'@media(max-width:700px){.bi .bi-fl{display:none;grid-template-columns:minmax(0,1fr)}.bi .bi-fl.open{display:grid}.bi .bi-fl .bi-fg{grid-column:1!important}.bi .bi-ft{display:flex}.bi .bi-act{display:flex}.bi .bi-bar .bi-clear{margin-left:0}.bi .bi-mh{display:none}'+
'.bi .bi-mrow.n4{grid-template-columns:minmax(0,1fr) 44px 62px;grid-template-areas:"n t nt" "bar bar bar";row-gap:4px}.bi .n4 .bi-mn{grid-area:n}.bi .n4 .bi-mt{grid-area:t}.bi .n4 .bi-mnt{grid-area:nt}.bi .n4 .bi-mbar{grid-area:bar}.bi .bi-mix{gap:10px}}'+
'.bi .bi-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line2);font-size:12.5px;color:var(--ink2)}'+
'.bi .bi-bar b{color:var(--ink);font-variant-numeric:tabular-nums}.bi .bi-bar .bi-clear{margin-left:auto;border:0;background:none;color:var(--blue);font:inherit;font-weight:600;cursor:pointer}.bi .bi-clear[disabled]{color:var(--muted);cursor:default;opacity:.6}'+
'.bi .bi-kpis{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:12px}'+
'.bi .bi-k{padding:14px 14px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0;box-shadow:inset 0 3px 0 var(--c,var(--line))}'+
'.bi .bi-k small{display:block;color:var(--ink2);font-size:12.5px;font-weight:600}'+
'.bi .bi-k strong{display:block;margin:3px 0 1px;font-size:25px;line-height:1.15;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}'+
'.bi .bi-dl{margin-left:8px;font-size:12px;font-weight:600;letter-spacing:0;color:var(--muted);white-space:nowrap}.bi .bi-dl.ok{color:var(--good)}.bi .bi-dl.miss{color:var(--bad)}.bi .bi-k em{display:block;font-style:normal;font-size:12px;color:var(--muted)}.bi .bi-k em.ok{color:var(--good);font-weight:600}.bi .bi-k em.miss{color:var(--bad);font-weight:600}'+
'.bi .bi-lg{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0 0 8px;font-size:12px;color:var(--ink2)}.bi .bi-lg span{display:inline-flex;align-items:center;gap:6px}.bi .bi-lg u{width:10px;height:10px;border-radius:3px;background:var(--c);text-decoration:none}'+
'.bi .bi-mix{display:grid;gap:6px}'+
'.bi .bi-mrow{display:grid;grid-template-columns:minmax(92px,150px) minmax(0,1fr) 46px;align-items:center;gap:10px;width:100%;padding:3px 6px;margin:0 -6px;border:0;border-radius:8px;background:none;color:var(--ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;box-sizing:content-box}'+
'.bi .bi-mrow:hover{background:var(--surface2)}.bi .bi-mrow.sel{background:var(--surface2);box-shadow:inset 3px 0 0 var(--blue)}.bi .bi-mix.dim .bi-mrow:not(.sel){opacity:.55}'+
'.bi .bi-mn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.bi .bi-mrow.tot .bi-mn{color:var(--ink2)}.bi .bi-mt{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}'+
'.bi .bi-mbar{display:flex;gap:2px;height:24px;border-radius:4px;overflow:hidden;background:var(--surface3)}'+
'.bi .bi-mbar i{display:flex;align-items:center;justify-content:center;min-width:2px;overflow:hidden;background:var(--c);color:var(--t);font-style:normal;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}'+
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
'.bi .bi-cts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:2px 0 16px}'+
'.bi .bi-ct{display:grid;gap:2px;text-align:left;padding:12px 14px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2);color:var(--ink2);font:inherit;cursor:pointer}'+
'.bi .bi-ct:hover{border-color:var(--blue)}.bi .bi-ct.sel{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}'+
'.bi .bi-ct small{font-size:12px;color:var(--muted)}.bi .bi-ct strong{font-size:26px;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums}.bi .bi-ct em{font-style:normal;font-size:12px;color:var(--muted)}'+
'.bi .bi-cb{display:block;height:4px;margin-top:6px;border-radius:4px;background:var(--line2);overflow:hidden}.bi .bi-cb i{display:block;height:100%;border-radius:4px;background:var(--cc,var(--blue))}'+
'.bi .bi-ct small{display:flex;align-items:center;gap:7px}.bi .bi-ct small u{width:9px;height:9px;border-radius:3px;background:var(--cc,var(--blue))}'+
'.bi .bi-chl{display:flex;flex-wrap:wrap;gap:6px 16px;margin:4px 0 6px;font-size:12px;color:var(--ink2)}.bi .bi-chl span{display:inline-flex;align-items:center;gap:6px}.bi .bi-chl u{width:10px;height:10px;border-radius:3px;background:var(--c)}'+
'.bi .bi-sub{margin:14px 0 4px;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}'+
'#biTip{position:fixed;z-index:200;max-width:260px;padding:8px 10px;border-radius:8px;background:var(--ink);color:var(--surface);font-size:12px;line-height:1.45;box-shadow:0 8px 24px rgba(0,20,35,.28);pointer-events:none}'+
'#biTip b{display:block;margin-bottom:3px;font-weight:600}#biTip i{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:2px;background:var(--c)}#biTip span{display:flex;justify-content:space-between;gap:14px;font-variant-numeric:tabular-nums}'+
'.bi .bi-sw{position:sticky;top:0;z-index:15;height:0;margin-bottom:-16px;overflow:visible}'+
'.bi #biSticky{display:none;padding-top:8px}.bi #biSticky.on{display:block}'+
'.bi .bi-sb{display:flex;align-items:center;gap:6px 14px;padding:8px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 6px 18px rgba(0,30,50,.12);font-size:12.5px;color:var(--ink2)}'+
'.bi .bi-sf{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bi .bi-sf b,.bi .bi-sc b{color:var(--ink)}.bi .bi-sc{white-space:nowrap;font-variant-numeric:tabular-nums}'+
'.bi .bi-sb button{border:0;background:none;color:var(--blue);font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}'+
'@media(max-width:1100px){.bi .bi-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}'+
'@media(max-width:560px){.bi .bi-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bi .bi-bar{gap:4px 12px;font-size:12px}.bi .bi-dl{display:block;margin:1px 0 0}.bi .bi-sx,.bi .bi-sf b{display:none}.bi .bi-k strong{font-size:22px}.bi .bi-k{padding:10px 12px}.bi .bi-actions{width:100%}.bi .bi-actions .btn{flex:1 1 0}.bi .bi-mrow,.bi .bi-frow{grid-template-columns:minmax(84px,104px) minmax(0,1fr) 40px;gap:8px}.bi .bi-mn{white-space:normal;line-height:1.2;font-size:12px}.bi .bi-frow{grid-template-columns:minmax(84px,104px) minmax(0,1fr) 92px}.bi .bi-bar .bi-clear{margin-left:0}}'+
'@media print{.bi .bi-sw,.bi .bi-actions,.bi .bi-filters,.bi .bi-clear{display:none!important}.bi .panel{break-inside:avoid}.bi .bi-tw{overflow:visible}.bi .bi-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.bi .bi-fl{display:none}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Estrutura da aba ---------- */
function ensureTab(){
  if(q('[data-panel=bi]'))return;
  var sec=document.createElement('section');sec.dataset.panel='bi';sec.dataset.title='BI';sec.className='view bi';sec.hidden=true;
  sec.innerHTML=
    '<div class="bi-sw"><div id="biSticky" aria-label="Resumo dos filtros"></div></div>'+
    '<article class="panel" id="biHead"></article>'+
    '<div class="bi-kpis" id="biKpis"></div>'+
    '<article class="panel" id="biMix"></article>'+
    '<article class="panel" id="biCh"></article>'+
    '<div class="grid-2 bi-g2">'+
      '<article class="panel" id="biLine"></article>'+
      '<article class="panel" id="biCols"></article>'+
    '</div>'+
    '<article class="panel" id="biCmp"></article>'+
    '<article class="panel" id="biEvo"></article>';
  var last=qa('[data-panel]').pop();last.parentNode.insertBefore(sec,last.nextSibling);
  if(!q('.tabs [data-view=bi]')){
    var b=document.createElement('button');b.type='button';b.dataset.view='bi';
    b.innerHTML='<span class="tab-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16V9M10 16V4M16 16v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span> BI';
    q('.tabs').appendChild(b);
    b.onclick=function(){show('bi')};
    b.addEventListener('click',function(){if(location.hash.slice(1).split('?')[0]!=='bi')location.hash='bi'});
  }
  // abriu a página já em #bi: o ui.js rodou antes de a aba existir
  if(location.hash.slice(1).split('?')[0]==='bi'&&typeof show==='function'){show('bi');var tb=q('.tabs [data-view=bi]');if(tb)tb.setAttribute('aria-current','page')}
}

/* ---------- Dados preparados (uma vez por carga) ---------- */
function toRow(x){
  var ms=dt(x.firstDate),d=ms?new Date(ms):null;
  return{x:x,ia:x.agent,ch:x.channel||NOCH,ms:ms,day:d?ymdLocal(d):'',wd:d?(d.getDay()+6)%7:-1,h:d?d.getHours():-1};
}
function prep(){return data.r72.protocols.map(toRow)}
function period(){return{start:q('#start').value,end:q('#end').value}}
function weekObj(ws){for(var i=0;i<ws.length;i++)if(ws[i].start===F.week)return ws[i];return null}
function inBand(h){return F.band.some(function(b){return h>=BANDS[b][2]&&h<BANDS[b][3]})}
function pass(r,skipIA,wk,skipCh){
  if(!skipIA&&F.ias.length&&F.ias.indexOf(r.ia)<0)return false;
  if(!skipCh&&F.ch.length&&F.ch.indexOf(r.ch)<0)return false;
  if(wk&&(!r.day||r.day<wk.start||r.day>wk.end))return false;
  if(F.wd.length&&F.wd.indexOf(r.wd)<0)return false;
  if(F.band.length&&!inBand(r.h))return false;
  return true;
}
function counts(v){var sn=v.sn||0;return{resolvido:v.r,nao:v.u,transferido:v.tr,inatividade:v.ina,safenota:sn,outros:Math.max(0,v.t-v.r-v.u-v.tr-v.ina-sn)}}

function compute(){
  var rows=prep(),p=period(),ws=p.start&&p.end?D.weeks(p.start,p.end):[],wk=null;
  if(F.week){wk=weekObj(ws);if(!wk)F.week=''}
  var rs=wk?{start:wk.start,end:wk.end}:p;
  var all=D.byIA(rows.map(function(r){return r.x}));
  var fNoIA=rows.filter(function(r){return pass(r,true,wk)});
  var f=rows.filter(function(r){return pass(r,false,wk)});
  var stIA=D.byIA(fNoIA.map(function(r){return r.x}));
  var st=D.byIA(f.map(function(r){return r.x}));
  var chRows=rows.filter(function(r){return pass(r,false,wk,true)}),chList={},stCh={};
  chRows.forEach(function(r){(chList[r.ch]=chList[r.ch]||[]).push(r.x)});
  Object.keys(chList).forEach(function(k){stCh[k]=D.byIA(chList[k])._all});
  F.ch.forEach(function(k){if(!stCh[k])stCh[k]=D.byIA([])._all});
  var chNames=Object.keys(stCh).sort(function(a,b){return(a===NOCH)-(b===NOCH)||stCh[b].t-stCh[a].t||a.localeCompare(b)});
  var FC=window.monFCR,fcrIdx=FC?FC.index(rows.map(function(r){return r.x})):null,xs=function(a){return a.map(function(r){return r.x})};
  var fcr=FC?FC.stats(xs(f),fcrIdx,p.end):null,fcrIA=null;
  if(FC){fcrIA=FC.byAgent(xs(fNoIA),fcrIdx,p.end);fcrIA._all=FC.stats(xs(fNoIA),fcrIdx,p.end)}
  var days=rs.start&&rs.end&&rs.end>=rs.start?span(rs.start,rs.end):0;
  var gran=F.gran||(days>=21?'week':'day');
  if(wk)gran='day';
  if(days>62)gran='week';
  return{stCh:stCh,chNames:chNames,hasCh:rows.some(function(r){return r.x.channel}),rows:rows,p:p,ws:ws,wk:wk,rs:rs,all:all,f:f,st:st,stIA:stIA,days:days,gran:gran,B:buckets(f,rs,gran),BC:buckets(chRows.filter(function(r){return DESFECHOS.indexOf(r.x.outcome)>=0}),rs,gran),prev:prevStats(rows,wk),fcr:fcr,fcrIA:fcrIA,fcrIdx:fcrIdx};
}
/* Comparação com o período anterior (o mesmo que a Visão geral usa): aplica os mesmos filtros.
   Com uma semana escolhida, compara com a semana imediatamente anterior. */
function prevStats(rows,wk){
  var pv=window.monPrev&&window.monPrev();
  if(!pv||!pv.protocols||!pv.protocols.length)return null;
  var prows=pv.protocols.map(toRow),pf,range=pv.range;
  if(wk){
    var pw={start:plus(wk.start,-7),end:plus(wk.end,-7)};
    pf=rows.concat(prows).filter(function(r){return pass(r,false,pw)});range=[pw.start,pw.end];
  }else pf=prows.filter(function(r){return pass(r,false,null)});
  var FC=window.monFCR,fc=null;
  if(FC){var base=(wk?rows.concat(prows):prows).map(function(r){return r.x});fc=FC.stats(pf.map(function(r){return r.x}),FC.index(base),wk?period().end:range[1])}
  return{st:D.byIA(pf.map(function(r){return r.x}))._all,range:range,fcr:fc};
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
  OUT.forEach(function(o){if((o.k==='outros'||o.k==='safenota')&&!c[o.k])return;h+='<span><em style="font-style:normal">'+swatch(o.c)+o.lab+'</em><em style="font-style:normal">'+n0(c[o.k])+' · '+pc(share(c[o.k],v.t))+'</em></span>'});
  return h;
}

/* ---------- Filtros ---------- */
function chipsIA(c){
  var have=IAS.filter(function(n){return c.all[n]&&c.all[n].t});
  if(!have.length)have=IAS.slice();
  F.ias.forEach(function(n){if(have.indexOf(n)<0)have.push(n)});
  return have;
}
function toggle(arr,v){var i=arr.indexOf(v);if(i>=0)arr.splice(i,1);else arr.push(v)}
function anyFilter(){return F.ias.length||F.ch.length||F.week||F.wd.length||F.band.length||F.gran}
function chip(group,val,label,on,extra){return'<button type="button" class="bi-chip" data-f="'+group+':'+val+'" aria-pressed="'+(on?'true':'false')+'">'+label+(extra||'')+'</button>'}

var FOPEN=false;
function nActive(){return F.ias.length+F.ch.length+(F.week?1:0)+F.wd.length+F.band.length+(F.gran?1:0)}
function renderHead(c){
  var wsOpts='';
  if(c.ws.length>1){
    wsOpts='<option value="">Período todo</option>'+c.ws.map(function(w){return'<option value="'+w.start+'"'+(F.week===w.start?' selected':'')+'>Semana '+brd(w.start)+' – '+brd(w.end)+(w.full?'':' (parcial)')+'</option>'}).join('');
  }
  var n=nActive(),sum=filterSummary(c),mt=metaTally(c);
  var h='<div class="bi-head"><div><h2>BI · Desempenho das IAs</h2><p><b>'+brf(c.p.start)+'</b> a <b>'+brf(c.p.end)+'</b> · período do topo da página</p></div>'+
    '<div class="bi-actions"><button type="button" class="btn btn-primary" data-act="xlsx" title="Baixar a planilha com os filtros aplicados (painel, gráficos, comparativos, evolução e dados)">↓ Excel</button><button type="button" class="btn btn-ghost" data-act="csv" title="Baixar os atendimentos filtrados em CSV">↓ CSV</button><button type="button" class="btn btn-ghost" data-act="link" title="Copiar um link com esses filtros (o período vem do seletor do topo)">🔗 Link</button></div></div>'+
    '<button type="button" class="bi-ft" data-act="ftoggle" aria-expanded="'+(FOPEN?'true':'false')+'" aria-controls="biFl"><span>Filtros</span>'+(n?'<em class="bi-badge">'+n+'</em>':'')+'<i aria-hidden="true">'+(FOPEN?'▴':'▾')+'</i></button>'+
    (sum.length?'<div class="bi-act" aria-label="Filtros ativos">'+sum.map(function(t){return'<span>'+esc(t)+'</span>'}).join('')+'</div>':'')+
    '<div class="bi-fl'+(FOPEN?' open':'')+'" id="biFl">'+
      '<div class="bi-fg g-ia"><span>IA</span><div class="bi-chips">'+chipsIA(c).map(function(n){return chip('ia',esc(n),esc(n),F.ias.indexOf(n)>=0)}).join('')+'</div></div>'+
      (c.hasCh?'<div class="bi-fg g-ch"><span>Canal</span><div class="bi-chips">'+c.chNames.map(function(n){return chip('ch',esc(n),esc(n),F.ch.indexOf(n)>=0)}).join('')+'</div></div>':'')+
      (wsOpts?'<div class="bi-fg g-wk"><span>Recorte</span><select class="bi-sel" data-f="week" aria-label="Recorte do período">'+wsOpts+'</select></div>':'')+
      '<div class="bi-fg g-gr"><span>Evolução</span><select class="bi-sel" data-f="gran" aria-label="Agrupar a evolução"><option value="">Automático</option><option value="day"'+(F.gran==='day'?' selected':'')+'>Por dia</option><option value="week"'+(F.gran==='week'?' selected':'')+'>Por semana</option></select></div>'+
      '<div class="bi-fg g-wd"><span>Dia da semana</span><div class="bi-chips">'+DS.map(function(n,i){return chip('wd',i,n,F.wd.indexOf(i)>=0)}).join('')+'</div></div>'+
      '<div class="bi-fg g-bd"><span>Faixa horária</span><div class="bi-chips">'+BANDS.map(function(b,i){return chip('band',i,b[0],F.band.indexOf(i)>=0,'<small>'+b[1]+'</small>')}).join('')+'</div></div>'+
    '</div>'+
    '<div class="bi-bar"><span>Mostrando <b>'+n0(c.st._all.t)+'</b> de <b>'+n0(c.all._all.t)+'</b> atendimentos com desfecho</span>'+
    '<span>'+n0(c.f.length)+' protocolos</span>'+(c.prev?'<span>Comparando com '+brf(c.prev.range[0])+' a '+brf(c.prev.range[1])+'</span>':'')+(mt.tot?'<span>Metas atingidas: <b>'+mt.hit+' de '+mt.tot+'</b></span>':'')+
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
function fcrCard(c,dl,pst){
  var f=c.fcr;if(!f||!f.res)return'';
  var pf=c.prev&&c.prev.fcr,okp=pf&&pf.elig>=10&&f.elig>=10&&pst&&pst.t>=10&&c.st._all.t>=10;
  var fo=f.janela+f.semid,tip=window.monFCR.DEF+(fo?' Fora do cálculo: '+window.monFCR.note(f)+'.':'');
  return'<div class="bi-k" title="'+esc(tip)+'" style="--c:var(--bi-fcr)"><small>FCR · 1º contato</small><strong>'+(f.fcr==null?'—':pc(f.fcr))+(okp?dl(f.fcr,pf.fcr,1,'pp'):'')+'</strong><em>'+n0(f.ok)+' de '+n0(f.elig)+' resolvidos não voltaram em 24h</em>'+(fo?'<em>'+n0(fo)+' fora do cálculo</em>':'')+'</div>';
}
function renderKpis(c){
  var v=c.st._all,cnt=counts(v),g=singleGoal(c),t=v.t;
  var k=function(color,lab,val,sub){return'<div class="bi-k"'+(color?' style="--c:var('+color+')"':'')+'><small>'+lab+'</small><strong>'+val+'</strong>'+sub+'</div>'};
  var pv=c.prev,pst=pv&&pv.st,okp=pst&&pst.t>=10&&t>=10;
  // variação vs. período anterior: pontos percentuais; "good" diz se subir é bom (1), descer é bom (-1) ou tanto faz (0)
  var dl=function(cur,old,good,unit){
    if(!okp||cur==null||old==null)return'';
    var d=cur-old,r=unit==='%'?Math.round(d):Math.round(d*(unit==='pp'?10:100))/(unit==='pp'?10:100),cls=!r?'':(good===0?'':(d*good>0?'ok':'miss'));
    var txt=unit==='%'?String(Math.abs(r)).replace('.',',')+'%':String(Math.abs(r)).replace('.',',')+(unit==='pp'?' pp':'');
    return'<span class="bi-dl '+cls+'" title="vs. '+brf(pv.range[0])+' a '+brf(pv.range[1])+'">'+(r>0?'▲ ':r<0?'▼ ':'= ')+(r?txt:'igual')+'</span>';
  };
  var h=k('--muted2','Atendimentos',n0(t)+(okp?dl((t/pst.t-1)*100,0,0,'%'):''),'<em>com desfecho · '+pc(share(t,c.all._all.t))+' do total</em>')+
    k('--bi-res','Resolvidos',(t?pc(v.resolvido):'—')+dl(v.resolvido,pst&&pst.resolvido,1,'pp'),'<em>'+n0(cnt.resolvido)+' atendimentos</em>'+goalLine(g,'resolvido',v.resolvido,t>0))+
    fcrCard(c,dl,pst)+
    k('--bi-tra','Transferidos',(t?pc(v.transferido):'—')+dl(v.transferido,pst&&pst.transferido,-1,'pp'),'<em>'+n0(cnt.transferido)+' atendimentos</em>'+goalLine(g,'transferido',v.transferido,t>0))+
    k('--bi-nao','Não resolvidos',(t?pc(v.nao):'—')+dl(v.nao,pst&&pst.nao,-1,'pp'),'<em>'+n0(cnt.nao)+' atendimentos</em>'+goalLine(g,'nao',v.nao,t>0))+
    k('--bi-ina','Inatividade',(t?pc(v.inatividade):'—')+dl(v.inatividade,pst&&pst.inatividade,-1,'pp'),'<em>'+n0(cnt.inatividade)+' atendimentos</em>')+
    (v.sn>0?k('--bi-sn','Finaliza SafeNota',(t?pc(v.safenota):'—')+dl(v.safenota,pst&&pst.safenota,0,'pp'),'<em>'+n0(cnt.safenota)+' atendimentos</em>'):'')+
    k('--bi-nota','Nota média',(v.nn?nt(v.nota):'—')+(v.nn&&pst&&pst.nn?dl(v.nota,pst.nota,1,'nota'):''),'<em>'+(v.nn?pc(v.pos)+' notas 4 e 5':'sem avaliações')+'</em><em>'+n0(v.nn)+' respostas'+(t?' · '+pc(share(v.nn,t)):'')+'</em>'+goalLine(g,'nota',v.nota,v.nn>0));
  var nk=(v.sn>0?7:6)+(c.fcr&&c.fcr.res?1:0),kp=q('#biKpis');kp.style.setProperty('--n',nk>7?4:nk);kp.innerHTML=h;
}

/* ---------- Composição por IA e nota ---------- */
function legend(c){
  var show=OUT.filter(function(o){return(o.k!=='outros'&&o.k!=='safenota')||(c.stIA._all&&counts(c.stIA._all)[o.k]>0)});
  return'<div class="bi-lg">'+show.map(function(o){return'<span><u style="--c:var('+o.c+')"></u>'+o.lab+'</span>'}).join('')+'</div>';
}
function mixRow(name,v,sel,tot){
  var cn=counts(v),segs=OUT.map(function(o){
    var n=cn[o.k];if(!n)return'';
    var p=share(n,v.t);
    return'<i data-seg="'+esc(name)+'|'+o.k+'" style="flex:'+n+' 1 0;--c:var('+o.c+');--t:var('+o.t+')">'+(p>=(innerWidth<560?17:10)?Math.round(p)+'%':'')+'</i>';
  }).join('');
  return'<button type="button" class="bi-mrow n4'+(sel?' sel':'')+(tot?' tot':'')+'" data-ia="'+(tot?'':esc(name))+'" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+esc(name)+': '+n0(v.t)+' atendimentos, nota média '+(v.nn?nt(v.nota):'sem avaliações')+'"'+(tot?' tabindex="-1"':'')+'>'+
    '<span class="bi-mn" title="'+esc(name)+'">'+esc(name)+'</span><span class="bi-mbar" data-row="'+esc(name)+'">'+(v.t?segs:'')+'</span><span class="bi-mt">'+n0(v.t)+'</span>'+
    '<span class="bi-mnt" data-nota="'+esc(name)+'"><b>'+(v.nn?nt(v.nota):'—')+'</b><small>'+n0(v.nn)+' aval.</small></span></button>';
}
function renderMix(c){
  var rows='',any=false;
  rows+=mixRow('Todas as IAs',c.stIA._all,false,true);
  IAS.forEach(function(n){var v=c.stIA[n];if(!v||!v.t)return;any=true;rows+=mixRow(n,v,F.ias.indexOf(n)>=0,false)});
  q('#biMix').innerHTML='<div class="panel-head"><div><h2>Desempenho por IA</h2><p>Como terminam os atendimentos e nota da pesquisa · clique numa IA para filtrar</p></div></div>'+
    (c.stIA._all.t&&any?legend(c)+'<div class="bi-mh"><span>IA</span><span>Desfechos</span><span>Atend.</span><span>Nota</span></div><div class="bi-mix'+(F.ias.length?' dim':'')+'">'+rows+'</div>':'<div class="bi-empty">Sem atendimentos com desfecho nesses filtros.</div>');
}

/* ---------- Canais de entrada (WhatsApp, Webchat…) ---------- */
function chRow(name,v,sel,tot){
  var cn=counts(v),segs=OUT.map(function(o){
    var n=cn[o.k];if(!n)return'';
    var p=share(n,v.t);
    return'<i data-segc="'+esc(name)+'|'+o.k+'" style="flex:'+n+' 1 0;--c:var('+o.c+');--t:var('+o.t+')">'+(p>=(innerWidth<560?17:10)?Math.round(p)+'%':'')+'</i>';
  }).join('');
  return'<button type="button" class="bi-mrow'+(sel?' sel':'')+(tot?' tot':'')+'" data-ch="'+(tot?'':esc(name))+'" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+esc(name)+': '+n0(v.t)+' atendimentos"'+(tot?' tabindex="-1"':'')+'>'+
    '<span class="bi-mn" title="'+esc(name)+'">'+esc(name)+'</span><span class="bi-mbar">'+(v.t?segs:'')+'</span><span class="bi-mt">'+n0(v.t)+'</span></button>';
}
function renderCh(c){
  var host=q('#biCh');if(!host)return;
  if(!c.hasCh){
    var inf=window.data&&data.r72&&data.r72.channelInfo||{},vals=inf.values||{},vt=Object.keys(vals).map(function(k){return k+' ('+n0(vals[k])+')'}).join(', ');
    if(!c.rows.length){host.hidden=true;return}
    host.hidden=false;
    host.innerHTML='<div class="panel-head"><div><h2>Por onde o cliente chega</h2><p>Webchat × WhatsApp, conforme a coluna “Tipo de Entrada” do R72</p></div></div>'+
      '<div class="bi-empty">Canal indisponível neste período. '+(vt?'A coluna “Tipo de Entrada” trouxe: <b>'+esc(vt)+'</b> — nenhum é Webchat ou WhatsApp.':(inf.column?'A coluna “Tipo de Entrada” chegou sem valores.':'A coluna “Tipo de Entrada” não chegou do servidor (confira se o <code>api/reports.js</code> novo está no ar; períodos antigos são coletados de novo na primeira abertura).'))+'</div>';
    return;
  }
  host.hidden=false;
  var tot=0;c.chNames.forEach(function(n){tot+=c.stCh[n].t});
  var tiles=c.chNames.map(function(n,i){
    var v=c.stCh[n],sel=F.ch.indexOf(n)>=0;
    return'<button type="button" style="--cc:var('+chColor(n)+')" class="bi-ct'+(sel?' sel':'')+'" data-ch="'+esc(n)+'" aria-pressed="'+(sel?'true':'false')+'" title="Clique para filtrar por '+esc(n)+'"><small><u></u>'+esc(n)+'</small><strong>'+n0(v.t)+'</strong><em>'+(tot?pc(share(v.t,tot)):'—')+' dos atendimentos</em><span class="bi-cb"><i style="width:'+(tot?Math.max(v.t?2:0,share(v.t,tot)):0)+'%"></i></span></button>';
  }).join('');
  var rows=chRow('Todos os canais',{t:tot,r:0,u:0,tr:0,ina:0},false,true),any=c.chNames.some(function(n){return c.stCh[n].t});
  var all=D.byIA(c.rows.filter(function(r){return pass(r,false,c.wk,true)}).map(function(r){return r.x}))._all;
  rows=chRow('Todos os canais',all,false,true)+c.chNames.filter(function(n){return c.stCh[n].t}).map(function(n){return chRow(n,c.stCh[n],F.ch.indexOf(n)>=0,false)}).join('');
  var info=window.data&&data.r72&&data.r72.channelInfo||{},raw=info.values||{},rawTxt=Object.keys(raw).map(function(k){return k+' ('+n0(raw[k])+')'}).join(', ');
  var note=rawTxt?'<p class="bi-note">Canal lido da coluna “Tipo de Entrada” do R72 (protocolos): '+esc(rawTxt)+'.'+(c.chNames.indexOf(NOCH)>=0?' “Não informado” = protocolos cujo R72 veio sem o tipo de entrada.':'')+'</p>':'';
  host.innerHTML='<div class="panel-head"><div><h2>Por onde o cliente chega</h2><p>Atendimentos com desfecho por canal de entrada · respeita os demais filtros · clique num canal para filtrar</p></div></div>'+
    (any?'<div class="bi-cts">'+tiles+'</div><div class="bi-2c"><div class="bi-c1"><h3 class="bi-sub">Volume por canal '+(c.gran==='week'?'por semana':'por dia')+'</h3><div class="bi-chl">'+c.chNames.filter(function(n){return c.stCh[n].t}).map(function(n){return'<span><u style="--c:var('+chColor(n)+')"></u>'+esc(n)+'</span>'}).join('')+'</div><div class="bi-cw" id="biChCw"></div></div><div class="bi-c2"><h3 class="bi-sub">Como terminam, por canal</h3>'+legend(c)+'<div class="bi-mix'+(F.ch.length?' dim':'')+'">'+rows+'</div></div></div>'+note:'<div class="bi-empty">Sem atendimentos com desfecho nesses filtros.</div>');
}

function chCounts(list){var m={};list.forEach(function(x){var k=x.channel||NOCH;m[k]=(m[k]||0)+1});return m}
function drawChCols(c){
  var host=q('#biChCw');if(!host)return;
  var B=c.BC||[],W=host.clientWidth;if(!W||!B.length)return;
  host.textContent='';
  var names=c.chNames.filter(function(n){return c.stCh[n]&&c.stCh[n].t});
  B.forEach(function(b){b.cc=chCounts(b.list);b.tt=b.list.length});
  var H=220,m={l:44,r:12,t:12,b:28},pw=W-m.l-m.r,ph=H-m.t-m.b,mx=0;
  B.forEach(function(b){if(b.tt>mx)mx=b.tt});
  var top=niceMax(Math.max(mx,1)),svg=frame(host,H,m,W);
  svg.setAttribute('aria-label','Volume de atendimentos por canal: '+B.map(function(b){return b.label}).join(', '));
  var xc=function(i){return m.l+pw*(i+.5)/B.length},yc=function(v){return m.t+ph*(1-v/top)};
  for(var t=0;t<=4;t++){var val=top*t/4;svg.appendChild(el('line',{x1:m.l,x2:W-m.r,y1:yc(val),y2:yc(val),class:t?'grid':'axis'}));svg.appendChild(el('text',{x:m.l-8,y:yc(val)+3.5,'text-anchor':'end'},n0(val)))}
  xlabels(svg,B,xc,H,m,pw);
  var band=pw/B.length,cw=Math.max(3,Math.min(56,band*0.62)),defs=el('defs',{});svg.appendChild(defs);
  B.forEach(function(b,i){
    if(!b.tt)return;
    var x=xc(i)-cw/2,y=yc(0),colTop=yc(b.tt),id='bicc'+i;
    var cp=el('clipPath',{id:id});cp.appendChild(el('rect',{x:x,y:colTop,width:cw,height:y-colTop+8,rx:Math.min(4,cw/2)}));defs.appendChild(cp);
    var g=el('g',{'clip-path':'url(#'+id+')'}),acc=0;
    names.forEach(function(nm){
      var n=b.cc[nm]||0;if(!n)return;
      var y1=yc(acc+n),y0=yc(acc);acc+=n;
      g.appendChild(el('rect',{x:x,y:y1,width:cw,height:Math.max(0,y0-y1),fill:'var('+chColor(nm)+')',stroke:'var(--surface)','stroke-width':2,'paint-order':'stroke'}));
    });
    svg.appendChild(g);
  });
  hoverLayer(host,svg,B,m,pw,ph,xc,function(i,hv,e){
    hv.textContent='';var b=B[i];
    hv.appendChild(el('rect',{x:m.l+band*i,y:m.t,width:band,height:ph,fill:'var(--ink)',opacity:.06}));
    var h='<b>'+esc(b.full)+'</b>';
    if(!b.tt)h+='Sem atendimentos';
    else{
      h+='<span><em style="font-style:normal;opacity:.8">Atendimentos com desfecho</em><em style="font-style:normal">'+n0(b.tt)+'</em></span>';
      names.forEach(function(nm){var n=b.cc[nm]||0;h+='<span><em style="font-style:normal">'+swatch(chColor(nm))+esc(nm)+'</em><em style="font-style:normal">'+n0(n)+' · '+pc(share(n,b.tt))+'</em></span>'});
    }
    showTip(h,e.clientX,e.clientY);
  });
  host.appendChild(svg);
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
  var LS=linesFor(c);
  LS.forEach(function(o){
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
    if(b.v.t)LS.forEach(function(o){hv.appendChild(el('circle',{cx:xc(i),cy:yc(b.v[o.k]),r:4.5,fill:'var('+o.c+')',stroke:'var(--surface)','stroke-width':2}))});
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
  var band=pw/B.length,cw=Math.max(3,Math.min(56,band*0.62)),defs=el('defs',{});svg.appendChild(defs);
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
  q('#biLine').innerHTML='<div class="panel-head"><div><h2>Evolução dos desfechos (%)</h2><p>Percentual sobre os atendimentos com desfecho de cada '+(c.gran==='week'?'semana':'dia')+' · passe o mouse ou toque para ver os valores</p></div></div>'+
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
var SNCOL=false;
function fcrCell(fc){return'<td><b>'+(fc&&fc.fcr!=null?pc(fc.fcr):'—')+'</b>'+(fc&&fc.elig?'<small>'+n0(fc.ok)+' de '+n0(fc.elig)+'</small>':'')+'</td>'}
function statCells(v,goal,fc){
  var cn=counts(v),t=v.t;
  return'<td><b>'+n0(t)+'</b></td>'+
    cellRate(goal,'resolvido',v,t?pc(v.resolvido):'—',n0(cn.resolvido))+
    cellRate(goal,'nao',v,t?pc(v.nao):'—',n0(cn.nao))+
    cellRate(goal,'transferido',v,t?pc(v.transferido):'—',n0(cn.transferido))+
    '<td><b>'+(t?pc(v.inatividade):'—')+'</b><small>'+n0(cn.inatividade)+'</small></td>'+
    (SNCOL?'<td><b>'+(t?pc(v.safenota):'—')+'</b><small>'+n0(cn.safenota)+'</small></td>':'')+
    cellRate(goal,'nota',v,v.nn?nt(v.nota):'—',v.nn?n0(v.nn)+' aval.':'')+
    (fc!==undefined?fcrCell(fc):'');
}
function theadFor(withF){return'<th>%s</th><th>Atend.</th><th>Resolvidos</th><th>Não resolvidos</th><th>Transferidos</th><th>Inatividade</th>'+(SNCOL?'<th>SafeNota</th>':'')+'<th>Nota média</th>'+(withF?'<th title="Resolvidos que não voltaram em 24h">FCR</th>':'')}
function renderTables(c){
  SNCOL=c.stIA._all.sn>0;var HASF=!!(c.fcrIA&&c.fcrIA._all.res),THEAD=theadFor(),THEADF=theadFor(HASF),metas=D.metas(),rows='';
  IAS.forEach(function(n){var v=c.stIA[n];if(!v||!v.t)return;var sel=F.ias.indexOf(n)>=0;
    rows+='<tr class="clk'+(sel?' sel':'')+'" data-ia="'+esc(n)+'" tabindex="0" aria-pressed="'+(sel?'true':'false')+'"><td><b>'+esc(n)+'</b></td>'+statCells(v,metas[n],HASF?c.fcrIA[n]||{}:undefined)+'</tr>'});
  rows+='<tr class="tot"><td>Todas as IAs</td>'+statCells(c.stIA._all,null,HASF?c.fcrIA._all:undefined)+'</tr>';
  q('#biCmp').innerHTML='<div class="panel-head"><div><h2>Comparativo entre IAs</h2><p>Valores nos filtros atuais (exceto o filtro de IA) · verde/vermelho = meta atingida/não atingida · clique numa linha para filtrar</p></div></div>'+
    '<div class="bi-tw"><table><thead><tr>'+THEADF.replace('%s','IA')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+(HASF?'<p class="bi-note">FCR: resolvidos em que o cliente não voltou em até 24h (clientes sem telefone/contato e janelas de 24h incompletas ficam de fora).</p>':'');
  var g=F.ias.length===1?metas[F.ias[0]]:null;
  var ev=c.B.map(function(b){return'<tr><td><b>'+esc(b.full)+'</b></td>'+statCells(b.v,g)+'</tr>'}).join('');
  q('#biEvo').innerHTML='<div class="panel-head"><div><h2>Evolução '+(c.gran==='week'?'semanal':'diária')+'</h2><p>Os mesmos números dos gráficos, em tabela'+(g?' · com as metas de '+esc(F.ias[0]):'')+'</p></div></div>'+
    '<div class="bi-tw"><table><thead><tr>'+THEAD.replace('%s',c.gran==='week'?'Semana':'Dia')+'</tr></thead><tbody>'+ev+'<tr class="tot"><td>Total do filtro</td>'+statCells(c.st._all,g)+'</tr></tbody></table></div>'+
    '<p class="bi-note">Percentuais calculados sobre os atendimentos com desfecho.</p>';
}

/* ---------- Render ---------- */
function render(){
  ensureTab();
  if(typeof data==='undefined'||!data||!data.r72){return}
  var af=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.bi')&&document.activeElement.getAttribute('data-f');
  var c=compute();LAST=c;
  renderHead(c);renderSticky(c);renderKpis(c);renderMix(c);renderCh(c);renderCharts(c);drawChCols(c);renderTables(c);
  if(af){var e=q('.bi [data-f="'+af+'"]');if(e&&e.focus)e.focus()}
  syncUrl();watchHead();
}
function redo(){render()}

/* ---------- Filtros no link (#bi?ia=IA SPC&wd=0,1&band=1&week=2026-09-07&gran=day) ---------- */
function stateQS(){
  var a=[];
  if(F.ias.length)a.push('ia='+F.ias.map(encodeURIComponent).join(','));
  if(F.ch.length)a.push('ch='+F.ch.map(encodeURIComponent).join(','));
  if(F.week)a.push('week='+F.week);
  if(F.wd.length)a.push('wd='+F.wd.slice().sort().join(','));
  if(F.band.length)a.push('band='+F.band.slice().sort().join(','));
  if(F.gran)a.push('gran='+F.gran);
  return a.join('&');
}
function parseQS(qs){
  var o={ias:[],ch:[],week:'',wd:[],band:[],gran:''},nums=function(v,max){return v.split(',').map(Number).filter(function(n){return n===Math.floor(n)&&n>=0&&n<=max})};
  qs.split('&').forEach(function(kv){
    var i=kv.indexOf('=');if(i<0)return;var k=kv.slice(0,i),v=kv.slice(i+1);
    try{
      if(k==='ia')o.ias=v.split(',').map(decodeURIComponent).filter(function(n){return IAS.indexOf(n)>=0});
      else if(k==='ch')o.ch=v.split(',').map(decodeURIComponent).filter(Boolean).slice(0,10);
      else if(k==='week'&&/^\d{4}-\d\d-\d\d$/.test(v))o.week=v;
      else if(k==='wd')o.wd=nums(v,6);
      else if(k==='band')o.band=nums(v,BANDS.length-1);
      else if(k==='gran'&&(v==='day'||v==='week'))o.gran=v;
    }catch(e){}
  });
  return o;
}
function fromHash(){var h=location.hash.slice(1);if(h.indexOf('bi?')!==0)return false;F=parseQS(h.slice(3));return true}
function biVisible(){var s=q('[data-panel=bi]');return!!s&&!s.hidden}
function syncUrl(){
  if(!biVisible()||!window.history||!history.replaceState)return;
  var qs=stateQS(),h='#bi'+(qs?'?'+qs:'');
  if(location.hash!==h)try{history.replaceState(null,'',location.pathname+location.search+h)}catch(e){}
}
function copyLink(){
  var qs=stateQS(),u=location.origin+location.pathname+'#bi'+(qs?'?'+qs:'');
  if(window.copyText)copyText(u,'Link copiado');else toast('Link: '+u);
}
window.addEventListener('hashchange',function(){if(fromHash())redo()});
document.addEventListener('monprev',function(){if(LAST)redo()});

/* ---------- Barra fixa com o resumo dos filtros (aparece ao rolar para baixo) ---------- */
function filterSummary(c){
  var a=[];
  if(F.ias.length)a.push(F.ias.join(', '));
  if(F.ch.length)a.push(F.ch.join(', '));
  if(c.wk)a.push('Semana '+brd(c.wk.start)+' – '+brd(c.wk.end));
  if(F.wd.length)a.push(F.wd.slice().sort().map(function(i){return DS[i]}).join(', '));
  if(F.band.length)a.push(F.band.slice().sort().map(function(i){return BANDS[i][0]}).join(', '));
  return a;
}
function renderSticky(c){
  var bar=q('#biSticky');if(!bar)return;
  var a=filterSummary(c);
  bar.innerHTML='<div class="bi-sb"><span class="bi-sf">'+(a.length?'<b>Filtros:</b> '+a.map(esc).join(' · '):'Sem filtros')+'</span><span class="bi-sc"><b>'+n0(c.st._all.t)+'</b><span class="bi-sx"> de '+n0(c.all._all.t)+' atend.</span></span>'+
    '<button type="button" data-act="edit">Ajustar ↑</button>'+(anyFilter()?'<button type="button" data-act="clear">Limpar</button>':'')+'</div>';
}
function placeSticky(){
  var bar=q('.bi-sw'),rail=q('.rail');if(!bar)return;
  var top=rail&&getComputedStyle(rail).position==='sticky'?rail.offsetHeight:0;
  bar.style.top=top+'px';
}
function watchHead(){
  var head=q('#biHead'),bar=q('#biSticky');if(!head||!bar||!window.IntersectionObserver||head.dataset.io)return;
  head.dataset.io='1';
  new IntersectionObserver(function(en){var e=en[0];bar.classList.toggle('on',!e.isIntersecting&&e.boundingClientRect.bottom<0)},{rootMargin:'-70px 0px 0px 0px'}).observe(head);
  window.addEventListener('resize',placeSticky);placeSticky();
}

/* ---------- Interações ---------- */
document.addEventListener('click',function(e){
  var root=e.target.closest&&e.target.closest('.bi');if(!root)return;
  var f=e.target.closest('[data-f]'),a=e.target.closest('[data-act]'),ia=e.target.closest('[data-ia]'),chb=e.target.closest('[data-ch]');
  if(f&&f.tagName==='BUTTON'){
    var p=f.dataset.f.split(':'),g=p[0],v=p.slice(1).join(':');
    if(g==='ia')toggle(F.ias,v);else if(g==='ch')toggle(F.ch,v);else if(g==='wd')toggle(F.wd,+v);else if(g==='band')toggle(F.band,+v);
    redo();return;
  }
  if(a){
    if(a.dataset.act==='clear'){F={ias:[],ch:[],week:'',wd:[],band:[],gran:''};redo()}
    else if(a.dataset.act==='ftoggle'){FOPEN=!FOPEN;var fl=q('#biFl'),bt=a;if(fl)fl.classList.toggle('open',FOPEN);bt.setAttribute('aria-expanded',FOPEN?'true':'false');var ic=q('i',bt);if(ic)ic.textContent=FOPEN?'▴':'▾'}
    else if(a.dataset.act==='xlsx')exportXlsx();
    else if(a.dataset.act==='csv')exportCsv();
    else if(a.dataset.act==='link')copyLink();
    else if(a.dataset.act==='edit'){var hd=q('#biHead');if(hd)hd.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
    return;
  }
  if(ia&&ia.dataset.ia){toggle(F.ias,ia.dataset.ia);redo()}
  else if(chb&&chb.dataset.ch){toggle(F.ch,chb.dataset.ch);redo()}
});
document.addEventListener('change',function(e){
  var s=e.target.closest&&e.target.closest('.bi select[data-f]');if(!s)return;
  if(s.dataset.f==='week')F.week=s.value;else if(s.dataset.f==='gran')F.gran=s.value;
  redo();
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.bi tr.clk')){e.preventDefault();toggle(F.ias,e.target.dataset.ia);redo()}
});
/* dicas nas barras de composição e de nota */
function tipMove(e){
  var t=e.target.closest&&e.target.closest('.bi [data-seg],.bi [data-segc],.bi [data-nota]');
  if(!t||!LAST){if(tip&&!tip.hidden&&!e.target.closest('.bi-cw'))hideTip();return}
  if(t.dataset.segc){
    var sc=t.dataset.segc.split('|'),cname=sc[0],ck=sc[1],cv=cname==='Todos os canais'?null:LAST.stCh[cname];
    if(!cv)cv=D.byIA(LAST.rows.filter(function(r){return pass(r,false,LAST.wk,true)}).map(function(r){return r.x}))._all;
    var co=OUT.filter(function(x){return x.k===ck})[0],cn2=counts(cv)[ck];
    showTip('<b>'+esc(cname)+'</b><span><em style="font-style:normal">'+swatch(co.c)+co.lab+'</em><em style="font-style:normal">'+n0(cn2)+' · '+pc(share(cn2,cv.t))+'</em></span><span><em style="font-style:normal;opacity:.8">Total com desfecho</em><em style="font-style:normal">'+n0(cv.t)+'</em></span>',e.clientX,e.clientY);
  }else if(t.dataset.seg){
    var s=t.dataset.seg.split('|'),name=s[0],k=s[1],v=name==='Todas as IAs'?LAST.stIA._all:LAST.stIA[name];if(!v)return;
    var o=OUT.filter(function(x){return x.k===k})[0],n=counts(v)[k];
    showTip('<b>'+esc(name)+'</b><span><em style="font-style:normal">'+swatch(o.c)+o.lab+'</em><em style="font-style:normal">'+n0(n)+' · '+pc(share(n,v.t))+'</em></span><span><em style="font-style:normal;opacity:.8">Total com desfecho</em><em style="font-style:normal">'+n0(v.t)+'</em></span>',e.clientX,e.clientY);
  }else{
    var nm=t.dataset.nota,nv=nm==='Todas as IAs'?LAST.stIA._all:LAST.stIA[nm];if(!nv)return;
    showTip('<b>'+esc(nm)+'</b><span><em style="font-style:normal">'+swatch('--bi-nota')+'Nota média</em><em style="font-style:normal">'+(nv.nn?nt(nv.nota):'—')+'</em></span><span><em style="font-style:normal;opacity:.8">Avaliações</em><em style="font-style:normal">'+n0(nv.nn)+'</em></span>',e.clientX,e.clientY);
  }
}
document.addEventListener('pointermove',tipMove);document.addEventListener('pointerdown',tipMove);
window.addEventListener('scroll',hideTip,{passive:true});
/* redesenha os gráficos quando a largura muda (inclusive ao abrir a aba) */
ensureTab();
if(window.ResizeObserver){
  var tries=0,fit=function(){
    if(!LAST)return;var ch=false;
    ['biLineCw','biColsCw','biChCw'].forEach(function(id){var e=document.getElementById(id);if(!e)return;var w=e.clientWidth,sv=e.firstChild;if(w&&(!sv||Math.abs(sv.viewBox.baseVal.width-w)>1))ch=true});
    if(ch&&tries++<4){drawLine(LAST);drawCols(LAST);drawChCols(LAST);requestAnimationFrame(fit)}
  },ro=new ResizeObserver(function(){tries=0;fit()});
  window.addEventListener('resize',function(){tries=0;fit()});
  window.biFit=function(){tries=0;fit()};
  ro.observe(q('[data-panel=bi]'));
}

/* ---------- Exportação ---------- */
function filterTexts(c){
  return{
    ia:F.ias.length?F.ias.join(', '):'Todas',
    ch:F.ch.length?F.ch.join(', '):'Todos',
    rec:c.wk?'Semana '+brf(c.wk.start)+' a '+brf(c.wk.end):'Período todo',
    wd:F.wd.length?F.wd.slice().sort().map(function(i){return DS[i]}).join(', '):'Todos',
    band:F.band.length?F.band.slice().sort().map(function(i){return BANDS[i][0]+' ('+BANDS[i][1]+')'}).join(', '):'Todas'
  };
}
function outLabel(x){
  if(x.outcome==='resolvido')return'Resolvido';
  if(isUnresolvedProtocol(x))return'Não resolvido';
  if(x.outcome==='transferido')return'Transferido';
  if(x.outcome==='inatividade')return'Inatividade';
  if(x.outcome==='safenota')return'Finaliza SafeNota';
  if(DESFECHOS.indexOf(x.outcome)>=0)return'Outros (não retornou)';
  return'Sem desfecho';
}
function bandOf(h){for(var i=0;i<BANDS.length;i++)if(h>=BANDS[i][2]&&h<BANDS[i][3])return BANDS[i][0];return''}
function statRow(label,v,goal,extra){
  var cn=counts(v),f=function(x){return{v:x,s:'pct'}},i=function(x){return{v:x,s:'int'}},tot=0,hit=0;
  var gv=function(k){return goal&&goal[k]!=null?Number(goal[k]):null};
  D.FIELDS.forEach(function(fl){var has=fl[0]==='nota'?v.nn>0:v.t>0,ok=goal?D.check(goal,fl[0],v[fl[0]],has):null;if(ok!==null){tot++;if(ok)hit++}});
  var gp=function(k){var g=gv(k);return g==null?null:{v:g/100,s:'pct'}};
  return(extra||[label]).concat([i(v.t),i(cn.resolvido),f(v.t?v.r/v.t:null),i(cn.transferido),f(v.t?v.tr/v.t:null),i(cn.nao),f(v.t?v.u/v.t:null),i(cn.inatividade),f(v.t?v.ina/v.t:null),i(cn.outros)].concat(SN?[i(cn.safenota)]:[],[
    i(v.nn),v.nn?{v:Math.round(v.nota*100)/100,s:'dec'}:null,v.nn?f(v.pos/100):null,gp('resolvido'),gp('transferido'),gp('nao'),gv('nota')!=null?{v:gv('nota'),s:'dec'}:null,tot?hit+' de '+tot:null]));
}
var SN=false;
function headStat(){var h=['Atendimentos com desfecho','Resolvidos','% Resolvidos','Transferidos','% Transferidos','Não resolvidos','% Não resolvidos','Inatividade','% Inatividade','Outros (não retornou)'];if(SN)h.push('Finaliza SafeNota');return h.concat(['Avaliações','Nota média','% Notas 4 e 5','Meta % resolvidos','Meta % transferidos','Meta % não resolvidos','Meta nota','Metas atingidas'])}
function fcrCells(f){f=f||{};return[f.fcr!=null?{v:f.fcr/100,s:'pct'}:null,{v:f.ok||0,s:'int'},{v:f.elig||0,s:'int'}]}
function head(a){return a.map(function(t){return{v:t,s:'head'}})}
function dataRows(c){
  return c.f.filter(function(r){return r.ms}).sort(function(a,b){return a.ms-b.ms}).map(function(r){
    var d=new Date(r.ms),x=r.x,wkStart=plus(r.day,-r.wd);
    return[String(x.protocol||''),new Date(d.getFullYear(),d.getMonth(),d.getDate()),r.h,DIAS[r.wd],bandOf(r.h),new Date(+wkStart.slice(0,4),+wkStart.slice(5,7)-1,+wkStart.slice(8,10)),IAS.indexOf(x.agent)>=0?x.agent:'Sem IA identificada',x.channel||NOCH,outLabel(x),
      x.survey&&x.survey.note?{v:x.survey.note,s:'int'}:null,
      window.monFCR&&c.fcrIdx?window.monFCR.label(x,c.fcrIdx,c.p.end):''];
  });
}
var DATA_HEAD=['Protocolo','Data','Hora','Dia da semana','Faixa horária','Semana (início)','IA','Canal','Desfecho','Nota','Retorno em 24h'];
function stamp(){var d=new Date();return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
function fileName(c,ext){return'bi-monitor-ia-'+c.rs.start+'-a-'+c.rs.end+'.'+ext}
function save(blob,name){
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
}
function exportXlsx(){
  if(!LAST){toast('Carregue os dados primeiro');return}
  if(!window.monXlsx){toast('Exportação indisponível');return}
  SN=LAST.stIA._all.sn>0;
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
    [lab('Recorte'),ft.rec],[lab('IA'),ft.ia],[lab('Canal'),ft.ch],[lab('Dias da semana'),ft.wd],[lab('Faixa horária'),ft.band],
    [],
    head(['Indicador','Valor','Meta','Situação da meta']),
    ['Atendimentos com desfecho',{v:t,s:'int'}],
    ['% do total do período',{v:c.all._all.t?t/c.all._all.t:0,s:'pct'}],
    kpi('% Resolvidos',t?v.r/t:null,'pct',g&&g.resolvido,'resolvido',t>0),
    kpi('% Transferidos',t?v.tr/t:null,'pct',g&&g.transferido,'transferido',t>0),
    kpi('% Não resolvidos',t?v.u/t:null,'pct',g&&g.nao,'nao',t>0),
    ['% Inatividade',{v:t?v.ina/t:null,s:'pct'}],
    ].concat(SN?[['% Finaliza SafeNota',{v:t?counts(v).safenota/t:null,s:'pct'}]]:[]).concat([
    kpi('Nota média',v.nn?Math.round(v.nota*100)/100:null,'dec',g&&g.nota,'nota',v.nn>0),
    ['Avaliações',{v:v.nn,s:'int'}],
    ['Metas atingidas',mt.tot?mt.hit+' de '+mt.tot:'sem metas definidas'],
    [],
    [{v:'A meta de cada indicador só aparece quando uma única IA está selecionada.',s:'note'}]
  ]);
  var fc=c.fcr;
  if(fc&&fc.res){
    var ri=resumo.findIndex(function(r){return r[0]==='Nota média'});
    resumo.splice(ri,0,['FCR · resolução no 1º contato',{v:fc.fcr!=null?fc.fcr/100:null,s:'pct'}],['  Resolvidos que não voltaram em 24h',{v:fc.ok,s:'int'}],['  Resolvidos avaliáveis',{v:fc.elig,s:'int'}],['  Fora do cálculo (janela incompleta / sem contato)',{v:fc.janela+fc.semid,s:'int'}]);
  }
  var HF=!!(c.fcrIA&&c.fcrIA._all.res),cmp=[head(['IA'].concat(headStat()).concat(HF?['FCR','Resolvidos sem retorno em 24h','Resolvidos avaliáveis']:[]).concat(['Incluída no filtro']))];
  IAS.forEach(function(n){var s=c.stIA[n];if(!s||!s.t)return;var r=statRow(n,s,metas[n]);if(HF)r.push.apply(r,fcrCells(c.fcrIA[n]));r.push(!F.ias.length||F.ias.indexOf(n)>=0?'Sim':'Não');cmp.push(r)});
  var rt=statRow('Todas as IAs',c.stIA._all,null);if(HF)rt.push.apply(rt,fcrCells(c.fcrIA._all));rt.push('');cmp.push(rt);
  var evo=function(gran){
    var B=buckets(c.f,c.rs,gran),rows=[head([gran==='week'?'Semana':'Dia','De','Até'].concat(headStat().slice(0,13+(SN?1:0))))];
    B.forEach(function(b){
      var d1=d0(b.start),d2=d0(b.end);
      var r=statRow(b.full,b.v,null,[b.full,d1,d2]);rows.push(r.slice(0,16+(SN?1:0)));
    });
    var r=statRow('Total do filtro',v,null,['Total do filtro',d0(c.rs.start),d0(c.rs.end)]);rows.push(r.slice(0,16+(SN?1:0)));
    return rows;
  };
  var chs=[head(['Canal'].concat(headStat()))];
  c.chNames.forEach(function(n){var s=c.stCh[n];if(s&&s.t)chs.push(statRow(n,s,null))});
  var evoW=evo('week'),sheets=[
    {name:'Resumo',cols:[34,16,12,18],rows:resumo,grid:false},
    {name:'Comparativo IAs',cols:[22,14,12,12,12,12,12,12,12,12,12,10,11,11,12,12,12,12,10,10,14,14,12,12],rows:cmp,freeze:1,filter:true},
    {name:'Evolução semanal',cols:[30,12,12,14,12,12,12,12,12,12,12,12,12,10,11,11,12],rows:evoW,freeze:1,filter:true}
  ];
  if(c.hasCh)sheets.splice(1,0,{name:'Comparativo canais',cols:[22,14,12,12,12,12,12,12,12,12,12,10,11,11,12,12,12,12,10,12,12],rows:chs,freeze:1,filter:true});
  if(c.days<=120)sheets.push({name:'Evolução diária',cols:[26,12,12,14,12,12,12,12,12,12,12,12,12,10,11,11,12],rows:evo('day'),freeze:1,filter:true});
  var dr=dataRows(c);
  sheets.push({name:'Dados',cols:[22,12,7,15,14,14,20,14,18,7,18],rows:[head(DATA_HEAD)].concat(dr),freeze:1,filter:true});
  if(window.monBIXlsx){
    try{sheets=window.monBIXlsx.extend(sheets,c,{dr:dr,IAS:IAS,DIAS:DIAS,BANDS:BANDS.map(function(b){return b[0]}),ft:ft,stamp:stamp,brf:brf,NOCH:NOCH,sn:SN,fcr:c.fcr})}
    catch(e){if(window.console)console.error('xlsx painel',e)}
  }
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

fromHash();
window.monBI={state:function(){return F},compute:function(){return LAST}};
ensureTab();
wrap('renderAll',render);
if(typeof data!=='undefined'&&data&&data.r72)render();
})();
