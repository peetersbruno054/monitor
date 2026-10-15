/* qualidade.js — visual da aba Qualidade no computador (≥ 1100 px). Carregar por ÚLTIMO.
   Não muda nenhum cálculo: só reorganiza os painéis que os outros scripts já criam. */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('qualidade',n,e)}return r}}

var Q='[data-panel=quality]';
var css='@media(min-width:1100px){'+
/* ---- grade: KPIs em cima; 7+5 colunas; bot points embaixo, largura total ---- */
Q+'.view{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;align-items:stretch}'+
Q+'.view>*{min-width:0}'+
Q+'.view>#qualityKpis{grid-column:1/-1;order:0}'+
Q+'.view>.panel:has(#recontactList){grid-column:span 7;order:1}'+
Q+'.view>#funnelPanel{grid-column:span 5;order:2}'+
Q+'.view>#transferPanel{grid-column:1/-1;order:3}'+
Q+'.view>#recPanel{grid-column:1/-1;order:4}'+
Q+'.view>.panel:has(#checkpointList){grid-column:1/-1;order:5}'+
Q+' .panel{padding:18px 20px}'+
/* ---- tempo até voltar: três faixas empilhadas, cada uma com barra de proporção ---- */
Q+' .recontact-layout{grid-template-columns:minmax(220px,.75fr) minmax(0,1.25fr);gap:20px;align-items:start}'+
Q+' .rw-tiles{display:grid;grid-template-columns:1fr;gap:8px}'+
Q+' .rw{position:relative;display:grid;grid-template-columns:auto 1fr;column-gap:14px;align-items:center;min-height:66px;padding:10px 14px 14px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2);overflow:hidden}'+
Q+' .rw b{grid-row:1/3;min-width:34px;font-size:24px;line-height:1;font-variant-numeric:tabular-nums}'+
Q+' .rw span{font-size:13px;font-weight:600;color:var(--ink)}'+
Q+' .rw small{grid-column:2;font-size:11.5px;color:var(--muted)}'+
Q+' .rw:after{content:"";position:absolute;left:0;bottom:0;height:4px;width:var(--p,0%);background:var(--rwc,var(--blue));border-radius:0 4px 4px 0;transition:width .6s cubic-bezier(.2,.8,.2,1)}'+
Q+' .rw.rw0{--rwc:var(--bad)}'+Q+' .rw.rw1{--rwc:var(--inactivity)}'+Q+' .rw.rw2{--rwc:var(--possible)}'+
/* ---- listas longas: altura limitada com rolagem interna ---- */
Q+' #recPanel .rc-ks{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}'+
Q+' #recPanel .pk-s{padding:8px 10px}'+Q+' #recPanel .pk-s strong{font-size:17px}'+Q+' #recPanel .pk-s em{font-size:11px;line-height:1.3}'+
Q+' #recontactList.scroll-list{max-height:330px;border-radius:12px}'+
Q+' .rc-list{max-height:440px;overflow:auto;padding-right:4px;scrollbar-width:thin}'+
/* ---- funil ---- */
Q+' #funnelPanel .fn{grid-template-columns:118px minmax(0,1fr) 88px;gap:12px;padding:10px 6px;border-radius:10px;font-size:13px}'+
Q+' #funnelPanel .fn .tr{height:12px}'+
Q+' #funnelPanel .fn>span:first-child{display:flex;align-items:center;gap:8px;color:var(--ink);font-weight:500}'+
Q+' #funnelPanel .fn>span:first-child:before{content:"";flex:0 0 9px;height:9px;border-radius:3px;background:var(--c)}'+
Q+' #funnelPanel .fn>span:last-child{color:var(--ink);font-weight:600}'+
Q+' #funnelPanel .fn.go:hover{background:var(--surface2)}'+
/* ---- bot points: barra de fundo proporcional ao maior da coluna ---- */
Q+' .cp-cols{gap:8px 40px}'+
Q+' .cp-cols h3{margin:2px 0 8px;padding:0 12px;font-size:13px}'+
Q+' .cp{position:relative;isolation:isolate;display:flex;align-items:center;margin-bottom:2px;padding:8px 12px;border-bottom:0;border-radius:8px}'+
Q+' .cp:before{content:"";position:absolute;inset:0 auto 0 0;z-index:-1;width:var(--w,0%);border-radius:8px;background:color-mix(in srgb,var(--blue) 11%,transparent);transition:width .6s cubic-bezier(.2,.8,.2,1)}'+
Q+' .cp.zero:before{display:none}'+
/* ---- estados vazios mais discretos ---- */
Q+' .empty{padding:26px 18px;border:0;border-radius:12px;background:var(--surface2)}'+
'}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* Define as variáveis usadas pelas barras (largura em %) a partir dos números já mostrados */
function decorate(){
  qa('#recontactWindows .rw').forEach(function(t,i){
    var m=(q('small',t).textContent.match(/(\d+)\s*%/)||[0,0])[1];
    t.style.setProperty('--p',m+'%');t.classList.add('rw'+i);
  });
  qa('#checkpointList>div').forEach(function(col){
    var rows=qa('.cp',col),val=function(r){return parseInt((q('b',r)||{}).textContent,10)||0},mx=Math.max.apply(null,rows.map(val).concat(1));
    rows.forEach(function(r){r.style.setProperty('--w',(val(r)/mx*100)+'%')});
  });
}
wrap('renderQuality',decorate);
decorate();
})();
