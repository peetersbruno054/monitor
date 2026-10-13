/* movimento.js — movimento discreto, com função. Carregar por ÚLTIMO.
   • Barras e números deslizam do valor anterior para o novo (o que não mudou fica parado);
   • entrada em sequência só quando o período muda (a atualização automática não "pisca");
   • carregamento: brilho nos cartões e barra de progresso real ("Carregando dias");
   • metas: ✓ e ✗ aparecem com um pulso curto;
   • janelas abrem com uma transição curta.
   Quem pede "reduzir movimento" no sistema não vê nada disso (efeitos.css + checagem abaixo). */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var reduce=function(){return matchMedia('(prefers-reduced-motion: reduce)').matches};
var EASE='cubic-bezier(.2,.8,.2,1)';

var css=
'@keyframes mv-up{from{opacity:0;transform:translateY(8px)}}'+
'@keyframes mv-fade{from{opacity:0}}'+
'@keyframes mv-dlg{from{opacity:0;transform:translateY(10px) scale(.985)}}'+
'@keyframes mv-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.12)}100%{transform:scale(1)}}'+
'@keyframes mv-ring{from{box-shadow:inset 0 0 0 1px transparent}}'+
'@keyframes mv-sweep{from{background-position:130% 0}to{background-position:-30% 0}}'+
/* entrada em sequência (só quando o período muda) */
'body.mv-enter .kpi2,body.mv-enter .ag2,body.mv-enter #weeklyPanel tbody tr{animation:mv-up .45s '+EASE+' both}'+
'body.mv-enter .kpi2:nth-child(2),body.mv-enter .ag2:nth-child(2){animation-delay:.06s}'+
'body.mv-enter .kpi2:nth-child(3),body.mv-enter .ag2:nth-child(3){animation-delay:.12s}'+
'body.mv-enter .kpi2:nth-child(4),body.mv-enter .ag2:nth-child(4){animation-delay:.18s}'+
[1,2,3,4,5,6,7,8,9].map(function(i){return'body.mv-enter #weeklyPanel tbody tr:nth-child('+(i+1)+'){animation-delay:'+(i*.04).toFixed(2)+'s}'}).join('')+
/* metas */
'.ag-meta.mv-pop{display:block;transform-origin:left center;animation:mv-pop .5s '+EASE+' .35s both}'+
'#agentTable .ag-meta.mv-pop{display:inline-block}'+
'.ag-stat.meta-miss.mv-ring{animation:mv-ring .6s ease-out .35s both}'+
/* cartões clicáveis: leve elevação */
'.ag-stat.go{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}'+
'.ag-stat.go:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,40,64,.08)}'+
'.ag-stat.go:active{transform:translateY(0)}'+
/* carregando: brilho passando pelos cartões que já estão na tela */
'body.is-loading:not(.mv-enter) .kpi2,body.is-loading:not(.mv-enter) .ag-stat,body.is-loading:not(.mv-enter) .oc-sum{background-image:linear-gradient(100deg,transparent 35%,color-mix(in srgb,var(--blue) 8%,transparent) 50%,transparent 65%);background-size:250% 100%;background-repeat:no-repeat;animation:mv-sweep 1.4s linear infinite}'+
/* barra do topo mostra o andamento real quando carrega dia a dia */
'body.mv-prog:before{animation:none!important;left:0!important;width:calc(var(--mv-p,0) * 100%)!important;transition:width .35s ease}'+
/* janelas */
'dialog[open]{animation:mv-dlg .22s '+EASE+'}dialog[open]::backdrop{animation:mv-fade .22s ease-out}'+
'.conv-modal:not([hidden]) .conv-card{animation:mv-dlg .22s '+EASE+'}.conv-modal:not([hidden]) .conv-backdrop{animation:mv-fade .22s ease-out}'+
'#healthBanner{animation:mv-up .35s '+EASE+'}'+
'@media(prefers-reduced-motion:reduce){body.mv-prog:before{transition:none}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Memória das barras e números entre uma tela e outra ---------- */
var BARS='.oc-m .tr i,.mb u,.bar i,.fn .tr i,.hs-stack .sg';
var NUMS='.ag-stat strong,#overviewKpis .kpi2 .vl';
function isH(el){return el.classList.contains('sg')}
function key(el,i,sel){
  if(isH(el)){var c=el.closest('.hs-col');return'hs|'+(c?c.dataset.h:'')+'|'+el.className}
  var box=el.closest('[id]');return sel+'|'+(box?box.id:'')+'|'+i;
}
function snapshot(){
  var s={bars:{},nums:{},metas:{}};
  qa(BARS).forEach(function(el,i){var p=isH(el)?'height':'width';if(el.style[p])s.bars[key(el,i,'b')]=el.style[p]});
  qa(NUMS).forEach(function(el,i){var t=el.firstChild;if(t&&t.nodeType===3)s.nums[key(el,i,'n')]=t.nodeValue});
  qa('.ag-meta').forEach(function(el,i){s.metas[key(el,i,'m')]=el.className.replace(/\s*mv-pop/,'')+'|'+el.textContent});
  return s;
}
function parse(t){var m=String(t||'').trim().match(/^(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)(\D*)$/);if(!m)return null;
  var raw=m[1],dec=(raw.split(',')[1]||'').length;return{v:Number(raw.replace(/\./g,'').replace(',','.')),dec:dec,suf:m[2]}}
function show(v,dec,suf){return(dec?v.toFixed(dec).replace('.',','):Math.round(v).toLocaleString('pt-BR'))+suf}
function tween(node,from,to){
  var t0=performance.now();
  (function f(t){var p=Math.min(1,(t-t0)/650),e=1-Math.pow(1-p,3);node.nodeValue=show(from.v+(to.v-from.v)*e,to.dec,to.suf);if(p<1)requestAnimationFrame(f)})(t0);
}
function apply(prev,entering){
  // barras: do valor anterior para o novo; o que não mudou não se move
  var moves=[];
  qa(BARS).forEach(function(el,i){
    var p=isH(el)?'height':'width',target=el.style[p];if(!target)return;
    var from=prev.bars[key(el,i,'b')];
    if(from==null){if(!isH(el))return;from='0%'}           // barras horizontais novas: usam o crescimento padrão
    el.style.animation='none';
    if(from===target)return;
    el.style.transition='none';el.style[p]=from;moves.push([el,p,target]);
  });
  if(moves.length){
    void document.body.offsetWidth;
    moves.forEach(function(m){var el=m[0],d=0;
      if(entering&&isH(el)){var c=el.closest('.hs-col');d=c?(+c.dataset.h||0)*18:0}
      el.style.transition=m[1]+' .7s '+EASE+(d?' '+d+'ms':'');el.style[m[1]]=m[2]});
  }
  // números que ainda não tinham contagem própria
  qa(NUMS).forEach(function(el,i){
    if(q('.cu',el))return;var t=el.firstChild;if(!t||t.nodeType!==3)return;
    var old=prev.nums[key(el,i,'n')];if(old==null||old===t.nodeValue)return;
    var a=parse(old),b=parse(t.nodeValue);if(a&&b&&a.suf===b.suf)tween(t,a,b);
  });
  // metas novas ou que mudaram de situação
  qa('.ag-meta').forEach(function(el,i){
    var now=el.className+'|'+el.textContent;if(prev.metas[key(el,i,'m')]===now)return;
    el.classList.add('mv-pop');var box=el.closest('.ag-stat');if(box&&box.classList.contains('meta-miss'))box.classList.add('mv-ring');
  });
}

/* ---------- Encaixe nas funções de desenho (só a chamada mais externa mede e aplica) ---------- */
var depth=0,lastPeriod='',enterTimer=0;
function wrapRender(name,isAll){
  var o=window[name];if(typeof o!=='function')return;
  window[name]=function(){
    if(reduce())return o.apply(this,arguments);
    var outer=depth===0,prev=outer?snapshot():null,entering=false;
    if(outer&&isAll){
      var per=(q('#start')||{}).value+'|'+(q('#end')||{}).value;
      entering=per!==lastPeriod;lastPeriod=per;
      if(entering){document.body.classList.add('mv-enter');clearTimeout(enterTimer);enterTimer=setTimeout(function(){document.body.classList.remove('mv-enter')},1100)}
    }
    depth++;
    try{return o.apply(this,arguments)}
    finally{depth--;if(outer){try{apply(prev,entering)}catch(e){console.error('movimento',e)}}}
  };
}
wrapRender('renderAll',true);
wrapRender('renderOverview',false);
wrapRender('renderAgents',false);

/* ---------- Barra de progresso real durante "Carregando dias: X de N" ---------- */
var st=q('#status');
if(st)new MutationObserver(function(){
  var m=st.textContent.match(/Carregando dias:\s*(\d+)\s*de\s*(\d+)/);
  if(m){document.body.classList.add('mv-prog');document.body.style.setProperty('--mv-p',Math.max(.04,+m[1]/+m[2]))}
  else{document.body.classList.remove('mv-prog');document.body.style.removeProperty('--mv-p')}
}).observe(st,{childList:true,characterData:true,subtree:true});
})();
