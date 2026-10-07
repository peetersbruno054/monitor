/* visual.js — carregar por ÚLTIMO (depois de app.js, ui.js, overview.js, extras*.js, features.js) */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('visual',n,e)}return r}}

var css=
'@keyframes vz-grow{from{transform:scaleX(0)}}@keyframes vz-rot{to{transform:rotate(360deg)}}'+
'@keyframes vz-flash{0%{background:color-mix(in srgb,var(--cyan,#00a7c7) 38%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cyan,#00a7c7) 38%,transparent)}100%{background:transparent;box-shadow:0 0 0 3px transparent}}'+
/* 1. barra única */
'#stackbar{display:flex;height:10px;margin:0 0 14px;border-radius:999px;overflow:hidden;transform-origin:left;animation:vz-grow .8s cubic-bezier(.2,.8,.2,1) both}'+
'#stackbar i{display:block;flex:0 0 0;box-sizing:border-box;min-width:6px;border-right:2px solid var(--surface,#fff);background-clip:padding-box;transition:flex-grow .45s ease,opacity .15s}'+
'#stackbar i.z{min-width:0;border-width:0}#stackbar:hover i{opacity:.55}#stackbar i:hover{opacity:1}'+
/* 2. destaque do que mudou */
'.vz-flash{border-radius:6px;animation:vz-flash 1.4s ease-out}'+
/* 3. atualizar */
'.vz-spin{display:inline-block;animation:vz-rot .9s linear infinite}'+
'#vztoast{position:fixed;left:50%;bottom:28px;z-index:300;transform:translate(-50%,12px);padding:10px 18px;border-radius:999px;background:var(--ink,#13293d);color:var(--surface,#fff);font-size:13px;font-weight:500;box-shadow:0 8px 24px rgba(0,30,50,.25);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;white-space:nowrap}'+
'#vztoast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:820px){#vztoast{bottom:calc(90px + env(safe-area-inset-bottom))}}'+
/* 4. indicador deslizante */
'.tabs.vz{position:relative}.tabs.vz button.active:after{display:none}'+
'.vz-ink{position:absolute;bottom:0;left:0;width:0;height:3px;border-radius:3px 3px 0 0;background:var(--cyan,#00a7c7);transition:left .28s cubic-bezier(.3,.7,.2,1),width .28s cubic-bezier(.3,.7,.2,1);pointer-events:none}'+
'.vz-first .vz-ink{transition:none}@media(max-width:820px){.vz-ink{top:0;bottom:auto;border-radius:0 0 3px 3px}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- 1. Barra única de 100% nos Desfechos ---------- */
function stack(){
  var P=q('#outcomes');if(!P)return;
  var bar=q('#stackbar');
  if(!bar){bar=document.createElement('div');bar.id='stackbar';bar.setAttribute('role','img');P.before(bar)}
  var seg=qa('.oc-row',P).map(function(r){
    var n=parseInt((q('.oc-r small',r).textContent.match(/[\d.]+/)||['0'])[0].replace(/\./g,''),10)||0;
    return{k:q('b',r).textContent,n:n,c:r.style.getPropertyValue('--c').trim()}}),
  sum=seg.reduce(function(a,s){return a+s.n},0);
  bar.hidden=!sum;
  seg.forEach(function(s,i){
    var el=bar.children[i];if(!el){el=document.createElement('i');bar.appendChild(el)}
    el.style.flexGrow=s.n;el.style.background=s.c;el.className=s.n?'':'z';
    el.title=s.k+': '+fmt(s.n)+' ('+pct(s.n,sum)+'%)';
  });
  while(bar.children.length>seg.length)bar.lastChild.remove();
  bar.setAttribute('aria-label',seg.filter(function(s){return s.n}).map(function(s){return s.k+' '+pct(s.n,sum)+'%'}).join(', '));
}

/* ---------- 2. Destaque do que mudou ao atualizar ---------- */
var snap=null,snapKey='',changed=0;
function items(){
  var a=[];
  qa('.cu').forEach(function(e){a.push({k:'cu:'+e.dataset.k,e:e,v:e.dataset.to+(e.dataset.s||''),n:1})});
  [['.kpi-value',1],['.ag-stat strong',1],['.oc-r small',0],['.ag-stat em',0]].forEach(function(s){
    qa(s[0]).forEach(function(e,i){a.push({k:s[0]+i,e:e,v:e.textContent,n:s[1]})})});
  return a;
}
function flash(){
  var key=$('start').value+'|'+$('end').value,cur={},n=0;
  items().forEach(function(x){
    cur[x.k]=x.v;
    if(snap&&snapKey===key&&snap[x.k]!==undefined&&snap[x.k]!==x.v){x.e.classList.add('vz-flash');n+=x.n}
  });
  snap=cur;snapKey=key;changed=n;/* trocar de período não conta como "mudança" */
}

/* ---------- 3. Feedback ao atualizar ---------- */
var ref=$('refresh'),manual=false,tt;
function toast(m){var t=q('#vztoast')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'vztoast',role:'status'}));t.textContent='✓ '+m;t.className='show';clearTimeout(tt);tt=setTimeout(function(){t.className=''},2600)}
ref.addEventListener('click',function(e){if(e.isTrusted)manual=true});/* só toque real; a atualização automática não avisa */
document.addEventListener('keydown',function(e){if(e.key&&e.key.toLowerCase()==='r'&&!e.ctrlKey&&!e.metaKey&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))manual=true});
new MutationObserver(function(){
  if(ref.disabled){ref.innerHTML='<span class="btn-icon vz-spin">↻</span> Consultando…';return}
  ref.innerHTML='<span class="btn-icon">↻</span> Atualizar dados';
  if(manual&&/^Atualizado/.test($('status').textContent))
    toast('Dados atualizados às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+(changed?' · '+changed+(changed===1?' número mudou':' números mudaram'):''));
  manual=false;
}).observe(ref,{attributes:true,attributeFilter:['disabled']});

/* ---------- 4. Indicador de aba que desliza ---------- */
var tabs=q('.tabs'),ink=document.createElement('i'),mob=matchMedia('(max-width:820px)');
ink.className='vz-ink';tabs.classList.add('vz','vz-first');tabs.appendChild(ink);
function place(){
  var b=q('.tabs button.active');if(!b||!b.offsetWidth)return;
  var w=b.offsetWidth;
  ink.style.left=(mob.matches?b.offsetLeft+w*.28:b.offsetLeft+12)+'px';
  ink.style.width=(mob.matches?w*.44:w-24)+'px';
  if(tabs.classList.contains('vz-first'))requestAnimationFrame(function(){tabs.classList.remove('vz-first')});
}
if(window.ResizeObserver){var ro=new ResizeObserver(place);ro.observe(tabs);qa('.tabs button').forEach(function(b){ro.observe(b)})}
mob.addEventListener&&mob.addEventListener('change',place);
document.fonts&&document.fonts.ready.then(place);
wrap('show',place);
place();

wrap('renderOverview',stack);
wrap('renderAll',function(){stack();flash()});
})();
