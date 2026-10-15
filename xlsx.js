/* xlsx.js — gerador mínimo de planilhas .xlsx (sem bibliotecas). Usado pela aba BI.
   window.monXlsx.build([{name, cols:[largura,...], rows:[[célula,...],...], freeze:1, filter:true,
        merges:['A1:F1'], cf:[{ref,type:'scale'|'bar',color}], dv:[{ref,list:'a,b'}], charts:[...], tab:'FF003B5C', grid:false}]) -> Promise<Blob>
   Célula: texto, número, null, Date ou {v, s, f} — s = estilo (ver STYLE), f = fórmula (sem "=") com v = valor já calculado.
   Percentuais entram como fração (0,25 = 25%).
   Gráficos: {type:'col'|'colStacked'|'colPct'|'bar'|'barStacked'|'barPct'|'line'|'doughnut', title, from:[col,lin], to:[col,lin] (0-based),
        cats:{ref:"'Aba'!$A$2:$A$5", vals:[...]}, series:[{name, nameRef, ref, vals, color:'RRGGBB'}], fmt:'0%', labels:true, colors:[...] (doughnut)} */
(function(){
'use strict';
var enc=new TextEncoder();

/* ---------- ZIP ---------- */
var CRC=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function deflate(u){
  if(typeof CompressionStream==='undefined')return Promise.resolve(null);
  try{
    var cs=new CompressionStream('deflate-raw'),w=cs.writable.getWriter();
    w.write(u);w.close();
    return new Response(cs.readable).arrayBuffer().then(function(b){return new Uint8Array(b)},function(){return null});
  }catch(e){return Promise.resolve(null)}
}
function dosTime(d){return((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF}
function dosDate(d){return(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF}
function zip(files){
  var now=new Date(),tm=dosTime(now),dd=dosDate(now);
  return Promise.all(files.map(function(f){
    var raw=enc.encode(f.text);
    return deflate(raw).then(function(z){
      var use=z&&z.length<raw.length;
      return{name:enc.encode(f.name),raw:raw,data:use?z:raw,method:use?8:0,crc:crc32(raw)};
    });
  })).then(function(list){
    var parts=[],central=[],offset=0;
    list.forEach(function(f){
      var h=new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,f.method,true);
      h.setUint16(10,tm,true);h.setUint16(12,dd,true);h.setUint32(14,f.crc,true);h.setUint32(18,f.data.length,true);h.setUint32(22,f.raw.length,true);
      h.setUint16(26,f.name.length,true);h.setUint16(28,0,true);
      parts.push(new Uint8Array(h.buffer),f.name,f.data);
      var c=new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,f.method,true);
      c.setUint16(12,tm,true);c.setUint16(14,dd,true);c.setUint32(16,f.crc,true);c.setUint32(20,f.data.length,true);c.setUint32(24,f.raw.length,true);
      c.setUint16(28,f.name.length,true);c.setUint32(42,offset,true);
      central.push(new Uint8Array(c.buffer),f.name);
      offset+=30+f.name.length+f.data.length;
    });
    var csize=0;central.forEach(function(p){csize+=p.length});
    var e=new DataView(new ArrayBuffer(22));
    e.setUint32(0,0x06054b50,true);e.setUint16(8,list.length,true);e.setUint16(10,list.length,true);e.setUint32(12,csize,true);e.setUint32(16,offset,true);
    return new Blob(parts.concat(central,[new Uint8Array(e.buffer)]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  });
}

/* ---------- XML ---------- */
function esc(s){return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function colName(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
function ref(c,r){return colName(c)+(r+1)}

/* estilos: o índice de cada um é a posição em cellXfs */
var XF=[
 /*0 */'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
 /*1 head*/'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
 /*2 int*/'<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
 /*3 pct*/'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
 /*4 dec*/'<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
 /*5 date*/'<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>',
 /*6 title*/'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
 /*7 bold*/'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
 /*8 note*/'<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
 /*9 kpi*/'<xf numFmtId="3" fontId="5" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
 /*10 kpip*/'<xf numFmtId="164" fontId="5" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
 /*11 kpid*/'<xf numFmtId="165" fontId="5" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
 /*12 lab*/'<xf numFmtId="0" fontId="6" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
 /*13 input*/'<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
 /*14 sec*/'<xf numFmtId="0" fontId="7" fillId="0" borderId="3" xfId="0" applyFont="1" applyBorder="1"/>',
 /*15 toti*/'<xf numFmtId="3" fontId="3" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>',
 /*16 totp*/'<xf numFmtId="164" fontId="3" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>',
 /*17 tott*/'<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>',
 /*18 hint*/'<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>',
 /*19 sub*/'<xf numFmtId="0" fontId="8" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
 /*20 txtw*/'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
 /*21 dec1*/'<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
 /*22 month*/'<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>',
 /*23 lbl*/'<xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
 /*24 intc*/'<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
];
var STYLE={head:1,int:2,pct:3,dec:4,date:5,title:6,bold:7,note:8,kpi:9,kpip:10,kpid:11,lab:12,input:13,sec:14,toti:15,totp:16,tott:17,hint:18,sub:19,txtw:20,dec1:21,month:22,lbl:23,intc:24};
var STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
'<numFmts count="5"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="0.00"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/><numFmt numFmtId="167" formatCode="0.0"/><numFmt numFmtId="168" formatCode="mmm/yyyy"/></numFmts>'+
'<fonts count="9"><font><sz val="11"/><name val="Calibri"/></font>'+
'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'+
'<font><b/><sz val="15"/><color rgb="FF003B5C"/><name val="Calibri"/></font>'+
'<font><b/><sz val="11"/><name val="Calibri"/></font>'+
'<font><i/><sz val="10"/><color rgb="FF5B7385"/><name val="Calibri"/></font>'+
'<font><b/><sz val="18"/><color rgb="FF003B5C"/><name val="Calibri"/></font>'+
'<font><sz val="10"/><color rgb="FF5B7385"/><name val="Calibri"/></font>'+
'<font><b/><sz val="12"/><color rgb="FF003B5C"/><name val="Calibri"/></font>'+
'<font><b/><sz val="11"/><color rgb="FF003B5C"/><name val="Calibri"/></font></fonts>'+
'<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+
'<fill><patternFill patternType="solid"><fgColor rgb="FF003B5C"/><bgColor indexed="64"/></patternFill></fill>'+
'<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4CC"/><bgColor indexed="64"/></patternFill></fill>'+
'<fill><patternFill patternType="solid"><fgColor rgb="FFE8F1FA"/><bgColor indexed="64"/></patternFill></fill>'+
'<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F8"/><bgColor indexed="64"/></patternFill></fill></fills>'+
'<borders count="4"><border><left/><right/><top/><bottom/><diagonal/></border>'+
'<border><left style="thin"><color rgb="FFB8860B"/></left><right style="thin"><color rgb="FFB8860B"/></right><top style="thin"><color rgb="FFB8860B"/></top><bottom style="thin"><color rgb="FFB8860B"/></bottom><diagonal/></border>'+
'<border><left/><right/><top style="thin"><color rgb="FF5B7385"/></top><bottom/><diagonal/></border>'+
'<border><left/><right/><top/><bottom style="medium"><color rgb="FF003B5C"/></bottom><diagonal/></border></borders>'+
'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
'<cellXfs count="'+XF.length+'">'+XF.join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function serial(d){return Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1899,11,30))/864e5)}
function cell(c,r,v){
  var s=0,f=null;
  if(v&&typeof v==='object'&&!(v instanceof Date)){s=STYLE[v.s]||0;f=v.f||null;v=v.v}
  var rf=colName(c)+r,sa=s?' s="'+s+'"':'';
  if(f){
    var fx='<f>'+esc(f)+'</f>';
    if(v instanceof Date)return'<c r="'+rf+'"'+(s?sa:' s="5"')+'>'+fx+'<v>'+serial(v)+'</v></c>';
    if(typeof v==='number'&&isFinite(v))return'<c r="'+rf+'"'+sa+'>'+fx+'<v>'+v+'</v></c>';
    if(v==null||v==='')return'<c r="'+rf+'"'+sa+'>'+fx+'</c>';
    return'<c r="'+rf+'"'+sa+' t="str">'+fx+'<v>'+esc(v)+'</v></c>';
  }
  if(v==null||v==='')return s?'<c r="'+rf+'" s="'+s+'"/>':'';
  if(v instanceof Date)return'<c r="'+rf+'"'+(s?sa:' s="5"')+'><v>'+serial(v)+'</v></c>';
  if(typeof v==='number'){if(!isFinite(v))return'';return'<c r="'+rf+'"'+sa+'><v>'+v+'</v></c>'}
  return'<c r="'+rf+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
}
function sheetXml(sh,hasDrawing){
  var rows=sh.rows||[],maxC=0,i,j;
  rows.forEach(function(r){if(r.length>maxC)maxC=r.length});
  var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  x+='<sheetPr>'+(sh.tab?'<tabColor rgb="'+sh.tab+'"/>':'')+'<pageSetUpPr fitToPage="1"/></sheetPr>';
  var view='<sheetView workbookViewId="0"'+(sh.grid===false?' showGridLines="0"':'')+(sh.zoom?' zoomScale="'+sh.zoom+'" zoomScaleNormal="'+sh.zoom+'"':'')+'>';
  if(sh.freeze)view+='<pane ySplit="'+sh.freeze+'" topLeftCell="A'+(sh.freeze+1)+'" activePane="bottomLeft" state="frozen"/>';
  x+='<sheetViews>'+view+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
  if(sh.cols&&sh.cols.length){x+='<cols>';sh.cols.forEach(function(w,k){x+='<col min="'+(k+1)+'" max="'+(k+1)+'" width="'+w+'" customWidth="1"/>'});x+='</cols>'}
  x+='<sheetData>';
  rows.forEach(function(r,k){
    var n=k+1,ht=r.height?' ht="'+r.height+'" customHeight="1"':'';
    x+='<row r="'+n+'"'+ht+'>';
    for(j=0;j<r.length;j++)x+=cell(j,n,r[j]);
    x+='</row>';
  });
  x+='</sheetData>';
  if(sh.filter&&rows.length&&maxC)x+='<autoFilter ref="A'+(sh.filterRow||1)+':'+colName(maxC-1)+rows.length+'"/>';
  if(sh.merges&&sh.merges.length)x+='<mergeCells count="'+sh.merges.length+'">'+sh.merges.map(function(m){return'<mergeCell ref="'+m+'"/>'}).join('')+'</mergeCells>';
  var pr=1;
  (sh.cf||[]).forEach(function(c){
    if(c.type==='scale')x+='<conditionalFormatting sqref="'+c.ref+'"><cfRule type="colorScale" priority="'+(pr++)+'"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="'+(c.from||'FFFFFFFF')+'"/><color rgb="'+(c.color||'FF2A78D6')+'"/></colorScale></cfRule></conditionalFormatting>';
    else if(c.type==='bar')x+='<conditionalFormatting sqref="'+c.ref+'"><cfRule type="dataBar" priority="'+(pr++)+'"><dataBar><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="'+(c.color||'FF6250D6')+'"/></dataBar></cfRule></conditionalFormatting>';
  });
  if(sh.dv&&sh.dv.length)x+='<dataValidations count="'+sh.dv.length+'">'+sh.dv.map(function(d){
    return'<dataValidation type="list" allowBlank="0" showInputMessage="1" showErrorMessage="1" errorTitle="Valor inválido" error="Escolha um item da lista." promptTitle="'+esc(d.title||'')+'" prompt="'+esc(d.prompt||'Escolha na lista')+'" sqref="'+d.ref+'"><formula1>'+esc(d.list.charAt(0)==='='?d.list.slice(1):'"'+d.list+'"')+'</formula1></dataValidation>'}).join('')+'</dataValidations>';
  x+='<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
  if(hasDrawing)x+='<drawing r:id="rId1"/>';
  return x+'</worksheet>';
}

/* ---------- Gráficos ---------- */
var CNS='xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
var PALETTE=['2A78D6','EB6834','1BAF7A','EDA100','6250D6','12919F','C13C7E','7A8794'];
function strCache(a){return'<c:strCache><c:ptCount val="'+a.length+'"/>'+a.map(function(v,i){return'<c:pt idx="'+i+'"><c:v>'+esc(v)+'</c:v></c:pt>'}).join('')+'</c:strCache>'}
function numCache(a,fmt){return'<c:numCache><c:formatCode>'+esc(fmt||'General')+'</c:formatCode><c:ptCount val="'+a.length+'"/>'+a.map(function(v,i){return v==null||!isFinite(v)?'':'<c:pt idx="'+i+'"><c:v>'+v+'</c:v></c:pt>'}).join('')+'</c:numCache>'}
function fill(hex){return'<a:solidFill><a:srgbClr val="'+hex+'"/></a:solidFill>'}
function txPr(sz,hex,b){return'<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="'+sz+'" b="'+(b?1:0)+'">'+fill(hex||'3D5568')+'</a:defRPr></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr>'}
function dl(kind,fmt){
  return'<c:dLbls>'+(fmt?'<c:numFmt formatCode="'+esc(fmt)+'" sourceLinked="0"/>':'')+'<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>'+txPr(900,kind==='dark'?'FFFFFF':'3D5568',true)+
   '<c:showLegendKey val="0"/><c:showVal val="'+(kind==='pct'?0:1)+'"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="'+(kind==='pct'?1:0)+'"/><c:showBubbleSize val="0"/></c:dLbls>';
}
function chartXml(ch){
  var t=ch.type,bar=/^(col|bar)/.test(t),horiz=/^bar/.test(t),stacked=/Stacked$/.test(t),pct=/Pct$/.test(t),line=t==='line',donut=t==='doughnut';
  var cats=ch.cats||{},sers=ch.series||[],i;
  var catX='<c:cat><c:strRef><c:f>'+esc(cats.ref)+'</c:f>'+strCache(cats.vals||[])+'</c:strRef></c:cat>';
  var serX=sers.map(function(s,k){
    var color=(s.color||PALETTE[k%PALETTE.length]).replace('#','');
    var tx='<c:tx>'+(s.nameRef?'<c:strRef><c:f>'+esc(s.nameRef)+'</c:f>'+strCache([s.name])+'</c:strRef>':'<c:v>'+esc(s.name)+'</c:v>')+'</c:tx>';
    var val='<c:val><c:numRef><c:f>'+esc(s.ref)+'</c:f>'+numCache(s.vals||[],ch.numFmt)+'</c:numRef></c:val>';
    var x='<c:ser><c:idx val="'+k+'"/><c:order val="'+k+'"/>'+tx;
    if(donut){
      x+='<c:spPr><a:ln w="19050">'+fill('FFFFFF')+'</a:ln></c:spPr>';
      (ch.colors||PALETTE).forEach(function(c,j){if(j<(cats.vals||[]).length)x+='<c:dPt><c:idx val="'+j+'"/><c:bubble3D val="0"/><c:spPr>'+fill(String(c).replace('#',''))+'<a:ln w="19050">'+fill('FFFFFF')+'</a:ln></c:spPr></c:dPt>'});
      x+=dl('pct','0%');
    }else if(line){
      x+='<c:spPr><a:ln w="28575" cap="rnd">'+fill(color)+'<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr>'+fill(color)+'<a:ln w="9525">'+fill('FFFFFF')+'</a:ln></c:spPr></c:marker>';
    }else{
      x+='<c:spPr>'+fill(color)+(stacked||pct?'<a:ln w="9525">'+fill('FFFFFF')+'</a:ln>':'')+'</c:spPr><c:invertIfNegative val="0"/>';
      if(ch.labels)x+=dl(color==='EDA100'||color==='1BAF7A'?'light':'dark');
    }
    x+=catX+val;
    if(line)x+='<c:smooth val="0"/>';
    return x+'</c:ser>';
  }).join('');
  var plot;
  if(donut)plot='<c:doughnutChart><c:varyColors val="1"/>'+serX+'<c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>';
  else{
    var chart=line?'<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>'+serX+'<c:marker val="1"/><c:axId val="5001"/><c:axId val="5002"/></c:lineChart>'
      :'<c:barChart><c:barDir val="'+(horiz?'bar':'col')+'"/><c:grouping val="'+(pct?'percentStacked':stacked?'stacked':'clustered')+'"/><c:varyColors val="0"/>'+serX+'<c:gapWidth val="'+(ch.gap||55)+'"/>'+(stacked||pct?'<c:overlap val="100"/>':'')+'<c:axId val="5001"/><c:axId val="5002"/></c:barChart>';
    var axFont=txPr(900,'5B7385');
    var vfmt=ch.fmt||(pct?'0%':'General');
    plot=chart+
     '<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="'+(horiz?'maxMin':'minMax')+'"/></c:scaling><c:delete val="0"/><c:axPos val="'+(horiz?'l':'b')+'"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="9525">'+fill('9AA7B2')+'</a:ln></c:spPr>'+axFont+'<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>'+
     '<c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/>'+(ch.max!=null?'<c:max val="'+ch.max+'"/>':'')+(ch.min!=null?'<c:min val="'+ch.min+'"/>':'')+'</c:scaling><c:delete val="0"/><c:axPos val="'+(horiz?'b':'l')+'"/><c:majorGridlines><c:spPr><a:ln w="6350">'+fill('DCE4EA')+'</a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="'+esc(vfmt)+'" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>'+axFont+'<c:crossAx val="5001"/><c:crosses val="'+(horiz?'max':'autoZero')+'"/><c:crossBetween val="between"/></c:valAx>';
  }
  var title=ch.title?'<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1">'+fill('003B5C')+'</a:defRPr></a:pPr><a:r><a:rPr lang="pt-BR" sz="1200" b="1">'+fill('003B5C')+'</a:rPr><a:t>'+esc(ch.title)+'</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>':'<c:autoTitleDeleted val="1"/>';
  return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace '+CNS+'><c:roundedCorners val="0"/><c:chart>'+title+'<c:plotArea><c:layout/>'+plot+'</c:plotArea>'+
    (sers.length>1||donut?'<c:legend><c:legendPos val="b"/><c:overlay val="0"/>'+txPr(900,'3D5568')+'</c:legend>':'')+
    '<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr>'+fill('FFFFFF')+'<a:ln w="9525">'+fill('D5DEE5')+'</a:ln></c:spPr></c:chartSpace>';
}
function drawingXml(charts){
  return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'+
  charts.map(function(c,i){
    var f=c.from,t=c.to;
    return'<xdr:twoCellAnchor><xdr:from><xdr:col>'+f[0]+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+f[1]+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>'+t[0]+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+t[1]+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'+
    '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="'+(i+2)+'" name="Gráfico '+(i+1)+'" descr="'+esc(c.title||'Gráfico')+'"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>'+
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId'+(i+1)+'"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>';
  }).join('')+'</xdr:wsDr>';
}

function safeName(n,used){
  var s=String(n).replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,31)||'Planilha',b=s,k=2;
  while(used.indexOf(s.toLowerCase())>=0){var suf=' ('+k++ +')';s=b.slice(0,31-suf.length)+suf}
  used.push(s.toLowerCase());return s;
}
var RT='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function build(sheets){
  var used=[],names=sheets.map(function(s){return safeName(s.name,used)});
  var files=[],chartN=0,drawN=0,ctx='';
  sheets.forEach(function(s,i){
    var ch=(s.charts||[]).filter(function(c){return c&&c.series&&c.series.length});
    var has=ch.length>0;
    files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',text:sheetXml(s,has)});
    if(!has)return;
    var d=++drawN,drels='';
    ch.forEach(function(c,k){
      var n=++chartN;
      files.push({name:'xl/charts/chart'+n+'.xml',text:chartXml(c)});
      ctx+='<Override PartName="/xl/charts/chart'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>';
      drels+='<Relationship Id="rId'+(k+1)+'" Type="'+RT+'/chart" Target="../charts/chart'+n+'.xml"/>';
    });
    files.push({name:'xl/drawings/drawing'+d+'.xml',text:drawingXml(ch)});
    files.push({name:'xl/drawings/_rels/drawing'+d+'.xml.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+drels+'</Relationships>'});
    files.push({name:'xl/worksheets/_rels/sheet'+(i+1)+'.xml.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+RT+'/drawing" Target="../drawings/drawing'+d+'.xml"/></Relationships>'});
    ctx+='<Override PartName="/xl/drawings/drawing'+d+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>';
  });
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
    sheets.map(function(_,i){return'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('')+ctx+'</Types>';
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+RT+'/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  var wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+RT+'"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000" activeTab="0"/></bookViews><sheets>'+
    names.map(function(n,i){return'<sheet name="'+esc(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('')+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
  var wrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map(function(_,i){return'<Relationship Id="rId'+(i+1)+'" Type="'+RT+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+
    '<Relationship Id="rId'+(sheets.length+1)+'" Type="'+RT+'/styles" Target="styles.xml"/></Relationships>';
  files.unshift({name:'xl/styles.xml',text:STYLES});files.unshift({name:'xl/_rels/workbook.xml.rels',text:wrels});files.unshift({name:'xl/workbook.xml',text:wb});files.unshift({name:'_rels/.rels',text:rels});files.unshift({name:'[Content_Types].xml',text:ct});
  return zip(files);
}
window.monXlsx={build:build,colName:colName,ref:ref,PALETTE:PALETTE,names:function(sheets){var u=[];return sheets.map(function(s){return safeName(s.name,u)})}};
})();
