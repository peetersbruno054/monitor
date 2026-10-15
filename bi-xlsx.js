/* bi-xlsx.js — enriquece a planilha do BI: aba Painel (com filtros em caixa de seleção e fórmulas),
   gráficos nativos, Dia × hora (mapa de calor), Canal × IA e Canais no tempo.
   Carregar depois de xlsx.js. Usado por bi.js: window.monBIXlsx.extend(sheets, c, H) -> novas abas.
   H = {dr:linhas da aba Dados, DIAS, BANDS:[nomes], ft:filterTexts, stamp, brf, NOCH, chOrder} */
(function(){
'use strict';
var OUTL=['Resolvido','Transferido','Não resolvido','Inatividade','Outros (não retornou)'];
var OUTH=['Resolvidos','Transferidos','Não resolvidos','Inatividade','Outros (não retornou)'];
var OUTC=['1BAF7A','2A78D6','E34948','EDA100','9AA7B2'];
var CHC=['6250D6','EB6834','12919F','B8860B','C13C7E'];
var CHO=['WhatsApp','Webchat','Telegram','Instagram','Facebook','E-mail'];
function chHex(n){var k=CHO.indexOf(n);if(k<0||k>4)return n==='Não informado'?'9AA7B2':CHC[4];return CHC[k]}
function H_(t){return{v:t,s:'head'}}
function q(n){return"'"+String(n).replace(/'/g,"''")+"'"}
function A(col,r1,r2,abs){return '$'+col+'$'+r1+(r2!=null?':$'+col+'$'+r2:'')}

function agg(list){
  var a={t:0,c:[0,0,0,0,0],nn:0,s:0,pos:0};
  list.forEach(function(r){var k=OUTL.indexOf(r.out);if(k>=0){a.c[k]++;a.t++}if(r.nota>0){a.nn++;a.s+=r.nota;if(r.nota>=4)a.pos++}});
  return a;
}

function extend(sheets,c,H){
  var X=window.monXlsx,dr=H.dr,n=dr.length,L=Math.max(n+1,2);
  var recs=dr.map(function(r){return{ia:r[6],ch:r[7],dia:r[3],band:r[4],out:r[8],h:r[2],nota:r[9]&&r[9].v!=null?Number(r[9].v):null}});
  var COL={ia:'G',ch:'H',dia:'D',band:'E',out:'I',nota:'J',hora:'C'};
  function rg(k){var col=COL[k]||k;return 'Dados!$'+col+'$2:$'+col+'$'+L}
  var CRIT={ia:'$K$5',ch:'$L$5',dia:'$M$5',band:'$N$5'},ORDER=['ia','ch','dia','band'];
  function pairs(excl){return ORDER.filter(function(k){return k!==excl}).map(function(k){return rg(k)+','+CRIT[k]}).join(',')}
  function cnt(excl,extra){return 'COUNTIFS('+pairs(excl)+(extra?','+extra:'')+')'}
  var NOT='"<>Sem desfecho"';

  var hasCh=!!c.hasCh,iaList=[],seen={};
  recs.forEach(function(r){if(!seen[r.ia]){seen[r.ia]=1;iaList.push(r.ia)}});
  var IAORD=H.IAS||[];
  iaList.sort(function(a,b){var x=IAORD.indexOf(a),y=IAORD.indexOf(b);return(x<0?99:x)-(y<0?99:y)||a.localeCompare(b)});
  var chList=hasCh?c.chNames.filter(function(k){return recs.some(function(r){return r.ch===k})}):[];
  recs.forEach(function(r){if(chList.indexOf(r.ch)<0&&hasCh)chList.push(r.ch)});
  var out={};

  /* ---------------- Painel ---------------- */
  var rows=[],merges=[],charts=[],dv=[],cf=[];
  function row(n){return rows[n-1]||(rows[n-1]=[])}
  function put(n,col,v){row(n)[col]=v}
  function fillRow(n,from,to,v){for(var i=from;i<=to;i++)if(row(n)[i]==null)row(n)[i]=v}
  function merge(n,c1,c2){merges.push(X.colName(c1)+n+':'+X.colName(c2)+n)}
  var cur=1;
  put(1,0,{v:'Painel · BI Monitor IA — Safeweb',s:'title'});merge(1,0,8);rows[0].height=28;
  put(2,0,{v:'Gerado em '+H.stamp()+' · Período '+H.brf(c.p.start)+' a '+H.brf(c.p.end)+' · Recorte do BI: '+H.ft.rec+' · IA: '+H.ft.ia+(hasCh?' · Canal: '+H.ft.ch:'')+' · Dias: '+H.ft.wd+' · Faixa: '+H.ft.band,s:'note'});merge(2,0,8);
  var labels=[['IA',0],['Canal',2],['Dia da semana',4],['Faixa horária',6]];
  labels.forEach(function(l){put(4,l[1],{v:l[0],s:'sub'});put(4,l[1]+1,{v:'',s:'sub'});merge(4,l[1],l[1]+1)});
  put(4,8,{v:'◄ escolha nas caixas amarelas',s:'note'});
  var defs=['Todas as IAs','Todos os canais','Todos os dias','Todas as faixas'];
  [0,2,4,6].forEach(function(cl,i){put(5,cl,{v:defs[i],s:'input'});put(5,cl+1,{v:'',s:'input'});merge(5,cl,cl+1)});
  rows[4].height=22;
  put(4,10,{v:'Critérios (apoio, não editar)',s:'note'});
  var cellOf=['A5','C5','E5','G5'];
  ['ia','ch','dia','band'].forEach(function(k,i){
    put(5,10+i,{v:'*',s:'note',f:'IF(LEFT('+cellOf[i]+',3)="Tod","*",'+cellOf[i]+')'});
  });
  var iaOpts=['Todas as IAs'].concat(iaList),chOpts=['Todos os canais'].concat(chList),diaOpts=['Todos os dias'].concat(H.DIAS),bandOpts=['Todas as faixas'].concat(H.BANDS);
  function dvList(ref,opts,title){var s=opts.join(',');if(s.length>250)s=opts.slice(0,1).concat(opts.slice(1)).join(',').slice(0,250);dv.push({ref:ref,list:s,title:title,prompt:'Escolha na lista'})}
  dvList('A5',iaOpts,'IA');dvList('C5',chOpts,'Canal');dvList('E5',diaOpts,'Dia da semana');dvList('G5',bandOpts,'Faixa horária');

  var all=agg(recs);
  var tl=['Atendimentos com desfecho','% Resolvidos','% Transferidos','% Não resolvidos','% Inatividade','% Outros (não retornou)','Nota média','Avaliações','% Notas 4 e 5'];
  tl.forEach(function(t,i){put(7,i,{v:t,s:'lab'})});rows[6].height=32;
  var sh=function(k){return all.t?all.c[k]/all.t:'–'};
  var tv=[
    {v:all.t,s:'kpi',f:cnt(null,rg('out')+','+NOT)},
    {v:sh(0),s:'kpip',f:'IF($A$8=0,"–",'+cnt(null,rg('out')+',"Resolvido"')+'/$A$8)'},
    {v:sh(1),s:'kpip',f:'IF($A$8=0,"–",'+cnt(null,rg('out')+',"Transferido"')+'/$A$8)'},
    {v:sh(2),s:'kpip',f:'IF($A$8=0,"–",'+cnt(null,rg('out')+',"Não resolvido"')+'/$A$8)'},
    {v:sh(3),s:'kpip',f:'IF($A$8=0,"–",'+cnt(null,rg('out')+',"Inatividade"')+'/$A$8)'},
    {v:sh(4),s:'kpip',f:'IF($A$8=0,"–",'+cnt(null,rg('out')+',"Outros (não retornou)"')+'/$A$8)'},
    {v:all.nn?all.s/all.nn:'–',s:'kpid',f:'IFERROR(AVERAGEIFS('+rg('nota')+','+pairs(null)+','+rg('nota')+',">0"),"–")'},
    {v:all.nn,s:'kpi',f:cnt(null,rg('nota')+',">0"')},
    {v:all.nn?all.pos/all.nn:'–',s:'kpip',f:'IF($H$8=0,"–",'+cnt(null,rg('nota')+',">=4"')+'/$H$8)'}
  ];
  tv.forEach(function(v,i){put(8,i,v)});rows[7].height=40;
  put(9,0,{v:'Os números e gráficos abaixo respondem às caixas amarelas. A base é a aba Dados (já com o recorte do BI no momento do download). Cada quadro ignora o filtro da própria dimensão, para permitir comparar.',s:'hint'});merge(9,0,8);rows[8].height=30;
  cur=11;

  function secRow(text){put(cur,0,{v:text,s:'sec'});fillRow(cur,1,8,{v:'',s:'sec'});merge(cur,0,8);rows[cur-1].height=22;cur++}

  /* desfechos */
  secRow('Como terminam os atendimentos');
  put(cur,0,H_('Desfecho'));put(cur,1,H_('Atendimentos'));put(cur,2,H_('%'));rows[cur-1].height=22;
  var dHead=cur;cur++;var d1=cur;
  OUTL.forEach(function(lb,i){
    put(cur,0,lb);
    put(cur,1,{v:all.c[i],s:'int',f:cnt(null,rg('out')+',"'+lb+'"')});
    put(cur,2,{v:all.t?all.c[i]/all.t:'',s:'pct',f:'IF($B$'+(d1+5)+'=0,"",B'+cur+'/$B$'+(d1+5)+')'});
    cur++;
  });
  put(cur,0,{v:'Total',s:'tott'});put(cur,1,{v:all.t,s:'toti',f:'SUM(B'+d1+':B'+(d1+4)+')'});put(cur,2,{v:all.t?1:'',s:'totp',f:'IF(B'+cur+'=0,"",SUM(C'+d1+':C'+(d1+4)+'))'});
  charts.push({type:'doughnut',title:'Desfechos (conforme filtros)',from:[3,dHead-1],to:[9,dHead+13],cats:{ref:'Painel!$A$'+d1+':$A$'+(d1+4),vals:OUTL},
    series:[{name:'Atendimentos',nameRef:'Painel!$B$'+dHead,ref:'Painel!$B$'+d1+':$B$'+(d1+4),vals:all.c}],colors:OUTC});
  cur=dHead+15;

  /* quadros por dimensão */
  function dimSection(title,dim,label,members,type,colorFn){
    if(!members.length)return;
    secRow(title);
    var hr=cur,i;
    var hd=[label,'Atendimentos'].concat(OUTH,['% Resolvidos','Nota média']);
    hd.forEach(function(t,k){put(cur,k,H_(t))});rows[cur-1].height=32;cur++;
    var r1=cur;
    members.forEach(function(m){
      var list=recs.filter(function(r){return r[dim]===m}),a=agg(list),r=cur;
      put(r,0,{v:m,s:'bold'});
      put(r,1,{v:a.t,s:'int',f:'SUM(C'+r+':G'+r+')'});
      OUTL.forEach(function(lb,k){put(r,2+k,{v:a.c[k],s:'int',f:cnt(dim,rg(dim)+',$A'+r+','+rg('out')+',"'+lb+'"')})});
      put(r,7,{v:a.t?a.c[0]/a.t:'',s:'pct',f:'IF(B'+r+'=0,"",C'+r+'/B'+r+')'});
      put(r,8,{v:a.nn?a.s/a.nn:'',s:'dec',f:'IFERROR(AVERAGEIFS('+rg('nota')+','+pairs(dim)+','+rg(dim)+',$A'+r+','+rg('nota')+',">0"),"")'});
      cur++;
    });
    var r2=cur-1,tot=agg(recs.filter(function(r){return members.indexOf(r[dim])>=0}));
    put(cur,0,{v:'Total',s:'tott'});
    for(i=1;i<=6;i++){var cl=X.colName(i);put(cur,i,{v:i===1?tot.t:tot.c[i-2],s:'toti',f:'SUM('+cl+r1+':'+cl+r2+')'})}
    put(cur,7,{v:tot.t?tot.c[0]/tot.t:'',s:'totp',f:'IF(B'+cur+'=0,"",C'+cur+'/B'+cur+')'});
    cur++;
    cf.push({ref:'B'+r1+':B'+r2,type:'bar',color:'FF7FB0E8'});
    cf.push({ref:'H'+r1+':H'+r2,type:'scale',from:'FFFFFFFF',color:'FF8FD6B8'});
    var catsRef='Painel!$A$'+r1+':$A$'+r2,vals=members;
    var ser=OUTL.map(function(lb,k){
      return{name:OUTH[k],nameRef:'Painel!$'+X.colName(2+k)+'$'+hr,ref:'Painel!$'+X.colName(2+k)+'$'+r1+':$'+X.colName(2+k)+'$'+r2,
        vals:members.map(function(m){return agg(recs.filter(function(r){return r[dim]===m})).c[k]}),color:OUTC[k]};
    });
    cur++;
    var hgt=type==='barPct'?Math.max(12,members.length*2+8):16;
    charts.push({type:type,title:title+(type==='barPct'?' (% dos atendimentos)':''),from:[0,cur-1],to:[9,cur-1+hgt],cats:{ref:catsRef,vals:vals},series:ser,gap:45});
    cur+=hgt+2;
  }
  dimSection('Por IA','ia','IA',iaList,'barPct');
  if(hasCh&&chList.length)dimSection('Por canal de entrada','ch','Canal',chList,'barPct');
  dimSection('Por dia da semana','dia','Dia da semana',H.DIAS.filter(function(d){return recs.some(function(r){return r.dia===d})}),'colStacked');
  dimSection('Por faixa horária','band','Faixa horária',H.BANDS.filter(function(b){return recs.some(function(r){return r.band===b})}),'colStacked');

  secRow('Como ler');
  var notes=[
    'Desfecho "Resolvido": atendimento concluído pela IA (inclui possível solução sem retorno do cliente). "Transferido": foi para a fila de atendimento humano. "Não resolvido": a IA não conseguiu resolver. "Inatividade": o cliente parou de responder. "Outros (não retornou)": finalizado sem retorno do cliente.',
    'Percentuais são calculados sobre os atendimentos com desfecho. A nota média considera só atendimentos avaliados.',
    'Canal de entrada conforme a coluna "Tipo de Entrada" do R72 (Webchat ou WhatsApp); "Não informado" = protocolo sem esse dado.',
    'As abas "Gráficos", "Comparativo…" e "Evolução…" refletem o recorte do BI no momento do download. O Painel permite refinar esse recorte sem voltar ao sistema.'
  ];
  notes.forEach(function(t){put(cur,0,{v:t,s:'hint'});merge(cur,0,8);rows[cur-1].height=44;cur++});
  for(var z=0;z<rows.length;z++)if(!rows[z])rows[z]=[];
  out.painel={name:'Painel',cols:[26,15,15,15,15,15,17,15,15,3,16,16,16,16],rows:rows,grid:false,merges:merges,charts:charts,dv:dv,cf:cf,tab:'FF003B5C'};

  /* ---------------- Gráficos (evolução) ---------------- */
  function findSheet(nm){for(var i=0;i<sheets.length;i++)if(sheets[i].name===nm)return sheets[i];return null}
  var evSh=(c.days<21&&findSheet('Evolução diária'))?findSheet('Evolução diária'):findSheet('Evolução semanal');
  var gcharts=[];
  if(evSh&&evSh.rows.length>3){
    var nm=evSh.name,nd=evSh.rows.length-2,e1=2,e2=nd+1;
    var ref=function(col){return q(nm)+'!$'+col+'$'+e1+':$'+col+'$'+e2};
    var hd=function(col){return q(nm)+'!$'+col+'$1'};
    var vals=function(ci){var o=[];for(var i=1;i<=nd;i++){var cc=evSh.rows[i][ci];o.push(cc&&typeof cc==='object'?cc.v:cc)}return o};
    var cats=[];for(var i=1;i<=nd;i++)cats.push(String(evSh.rows[i][0]));
    var catx={ref:ref('A'),vals:cats};
    gcharts.push({type:'colStacked',title:'Atendimentos por desfecho',from:[0,3],to:[8,21],cats:catx,gap:40,
      series:[['E',4,0],['G',6,1],['I',8,2],['K',10,3],['M',12,4]].map(function(s){return{name:OUTH[s[2]],nameRef:hd(s[0]),ref:ref(s[0]),vals:vals(s[1]),color:OUTC[s[2]]}})});
    gcharts.push({type:'line',title:'Taxas de desfecho (% dos atendimentos)',from:[8,3],to:[16,21],cats:catx,fmt:'0%',numFmt:'0.0%',
      series:[['F',5,0],['H',7,1],['J',9,2],['L',11,3]].map(function(s){return{name:OUTH[s[2]],nameRef:hd(s[0]),ref:ref(s[0]),vals:vals(s[1]),color:OUTC[s[2]]}})});
    gcharts.push({type:'line',title:'Nota média (CSAT)',from:[0,23],to:[8,41],cats:catx,min:1,max:5,fmt:'0.0',numFmt:'0.00',
      series:[{name:'Nota média',nameRef:hd('O'),ref:ref('O'),vals:vals(14),color:'6250D6'}]});
    gcharts.push({type:'col',title:'Avaliações recebidas',from:[8,23],to:[16,41],cats:catx,gap:50,
      series:[{name:'Avaliações',nameRef:hd('N'),ref:ref('N'),vals:vals(13),color:'6250D6'}]});
  }
  if(gcharts.length){
    out.graficos={name:'Gráficos',cols:[12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12],rows:[
      [{v:'Gráficos · evolução no período',s:'title'}],
      [{v:'Refletem o recorte do BI no momento do download ('+(evSh.name==='Evolução diária'?'por dia':'por semana')+').',s:'note'}]
    ],grid:false,charts:gcharts,tab:'FF2A78D6'};
  }

  /* ---------------- Canais no tempo ---------------- */
  if(hasCh&&c.BC&&c.BC.length&&chList.length){
    var names=c.chNames.filter(function(k){return c.BC.some(function(b){return b.list.some(function(x){return(x.channel||H.NOCH)===k})})});
    if(names.length){
      var trs=[[{v:'Canais de entrada no tempo',s:'title'}],[{v:'Atendimentos com desfecho por canal, '+(c.gran==='week'?'por semana':'por dia')+' (todos os canais, ignora o filtro de canal).',s:'note'}]];
      var CH0=24,ch1=CH0+1;
      while(trs.length<CH0-1)trs.push([]);
      trs.push([H_(c.gran==='week'?'Semana':'Dia')].concat(names.map(H_),[H_('Total')]));
      var cv={};names.forEach(function(k){cv[k]=[]});var cats2=[];
      c.BC.forEach(function(b){
        var m={};b.list.forEach(function(x){var k=x.channel||H.NOCH;m[k]=(m[k]||0)+1});
        var r=[b.full],t=0;
        names.forEach(function(k){var v=m[k]||0;t+=v;cv[k].push(v);r.push({v:v,s:'int'})});
        r.push({v:t,s:'int'});trs.push(r);cats2.push(b.full);
      });
      var last=CH0+c.BC.length;
      out.tempo={name:'Canais no tempo',cols:[30].concat(names.map(function(){return 13}),[11]),rows:trs,grid:false,freeze:0,tab:'FF6250D6',charts:[{
        type:'colStacked',title:'Atendimentos por canal',from:[0,2],to:[Math.min(Math.max(names.length+1,8),12),CH0-2],gap:40,
        cats:{ref:"'Canais no tempo'!$A$"+ch1+':$A$'+last,vals:cats2},
        series:names.map(function(k,i){var cl=X.colName(i+1);return{name:k,nameRef:"'Canais no tempo'!$"+cl+'$'+CH0,ref:"'Canais no tempo'!$"+cl+'$'+ch1+':$'+cl+'$'+last,vals:cv[k],color:chHex(k)}})
      }]};
    }
  }

  /* ---------------- Canal × IA ---------------- */
  if(hasCh&&chList.length&&iaList.length){
    var cr=[[{v:'Canal × IA',s:'title'}],[{v:'Atendimentos com desfecho por IA e canal de entrada (conforme a aba Dados).',s:'note'}],[],
      [H_('IA')].concat(chList.map(H_),[H_('Total')])];
    var m1=5;
    iaList.forEach(function(ia,i){
      var r=m1+i,line=[{v:ia,s:'bold'}],tt=0;
      chList.forEach(function(ch,k){var v=recs.filter(function(x){return x.ia===ia&&x.ch===ch&&x.out!=='Sem desfecho'}).length;tt+=v;
        line.push({v:v,s:'int',f:'COUNTIFS('+rg('ia')+',$A'+r+','+rg('ch')+','+X.colName(k+1)+'$4,'+rg('out')+','+NOT+')'})});
      line.push({v:tt,s:'toti',f:'SUM(B'+r+':'+X.colName(chList.length)+r+')'});cr.push(line);
    });
    var m2=m1+iaList.length;
    var tr=[{v:'Total',s:'tott'}];chList.forEach(function(ch,k){var cl=X.colName(k+1);tr.push({v:recs.filter(function(x){return x.ch===ch&&x.out!=='Sem desfecho'}).length,s:'toti',f:'SUM('+cl+m1+':'+cl+(m2-1)+')'})});
    var cl2=X.colName(chList.length+1);tr.push({v:recs.filter(function(x){return x.out!=='Sem desfecho'}).length,s:'toti',f:'SUM('+cl2+m1+':'+cl2+(m2-1)+')'});cr.push(tr);
    cr.push([]);cr.push([{v:'Participação de cada canal no volume da IA',s:'sec'}]);
    var h2=m2+3;cr.push([H_('IA')].concat(chList.map(H_)));
    iaList.forEach(function(ia,i){
      var r=h2+1+i,src=m1+i,line=[{v:ia,s:'bold'}],tt=recs.filter(function(x){return x.ia===ia&&x.out!=='Sem desfecho'}).length;
      chList.forEach(function(ch,k){var v=recs.filter(function(x){return x.ia===ia&&x.ch===ch&&x.out!=='Sem desfecho'}).length;
        line.push({v:tt?v/tt:'',s:'pct',f:'IF($'+cl2+src+'=0,"",'+X.colName(k+1)+src+'/$'+cl2+src+')'})});
      cr.push(line);
    });
    var rEnd=cr.length;
    out.canalia={name:'Canal × IA',cols:[26].concat(chList.map(function(){return 14}),[12]),rows:cr,grid:false,tab:'FF6250D6',
      cf:[{ref:'B'+m1+':'+X.colName(chList.length)+(m2-1),type:'scale',from:'FFFFFFFF',color:'FFB9B1F0'}],
      charts:[{type:'barPct',title:'Canal de entrada por IA (% dos atendimentos)',from:[0,rEnd+1],to:[Math.min(chList.length+3,9),rEnd+1+Math.max(12,iaList.length*2+8)],gap:45,
        cats:{ref:"'Canal × IA'!$A$"+m1+':$A$'+(m2-1),vals:iaList},
        series:chList.map(function(ch,k){var cl=X.colName(k+1);return{name:ch,nameRef:"'Canal × IA'!$"+cl+'$4',ref:"'Canal × IA'!$"+cl+'$'+m1+':$'+cl+'$'+(m2-1),
          vals:iaList.map(function(ia){return recs.filter(function(x){return x.ia===ia&&x.ch===ch&&x.out!=='Sem desfecho'}).length}),color:chHex(ch)}})}]};
  }

  /* ---------------- Dia × hora ---------------- */
  var days=H.DIAS,hrs=[];for(var h=0;h<24;h++)hrs.push(h);
  var hr=[[{v:'Dia × hora',s:'title'}],[{v:'Atendimentos com desfecho por dia da semana e hora de início. Quanto mais escuro, maior o volume.',s:'note'}],[],
    [H_('Dia \\ hora')].concat(hrs.map(function(h){return H_(h)}),[H_('Total')])];
  days.forEach(function(d,i){
    var r=5+i,line=[{v:d,s:'bold'}],tt=0;
    hrs.forEach(function(h){var v=recs.filter(function(x){return x.dia===d&&x.h===h&&x.out!=='Sem desfecho'}).length;tt+=v;
      line.push({v:v,s:'intc',f:'COUNTIFS('+rg('dia')+',$A'+r+','+rg('hora')+','+X.colName(h+1)+'$4,'+rg('out')+','+NOT+')'})});
    line.push({v:tt,s:'toti',f:'SUM(B'+r+':Y'+r+')'});hr.push(line);
  });
  var tl2=[{v:'Total',s:'tott'}],tvals=[];
  hrs.forEach(function(h){var v=recs.filter(function(x){return x.h===h&&x.out!=='Sem desfecho'}).length;tvals.push(v);var cl=X.colName(h+1);tl2.push({v:v,s:'toti',f:'SUM('+cl+'5:'+cl+'11)'})});
  tl2.push({v:recs.filter(function(x){return x.out!=='Sem desfecho'}).length,s:'toti',f:'SUM(Z5:Z11)'});hr.push(tl2);
  out.horas={name:'Dia × hora',cols:[16].concat(hrs.map(function(){return 5.6}),[9]),rows:hr,grid:false,tab:'FF12919F',
    cf:[{ref:'B5:Y11',type:'scale',from:'FFFFFFFF',color:'FF2A78D6'}],
    charts:[{type:'col',title:'Atendimentos por hora do dia',from:[0,13],to:[26,31],gap:35,fmt:'0',
      cats:{ref:"'Dia × hora'!$B$4:$Y$4",vals:hrs.map(String)},series:[{name:'Atendimentos',ref:"'Dia × hora'!$B$12:$Y$12",vals:tvals,color:'2A78D6'}]}]};

  /* ---------------- ordem final ---------------- */
  var res=findSheet('Resumo'),lst=[out.painel];
  if(res)lst.push(res);
  if(out.graficos)lst.push(out.graficos);
  ['Comparativo canais','Comparativo IAs','Evolução semanal','Evolução diária'].forEach(function(nm){var s=findSheet(nm);if(s)lst.push(s)});
  if(out.tempo)lst.push(out.tempo);
  if(out.canalia)lst.push(out.canalia);
  lst.push(out.horas);
  var dados=findSheet('Dados');if(dados)lst.push(dados);
  return lst;
}
window.monBIXlsx={extend:extend};
})();
