/* xlsx.js — gerador mínimo de planilhas .xlsx (sem bibliotecas). Usado pela aba BI.
   window.monXlsx.build([{name, cols:[largura,...], rows:[[célula,...],...], freeze:1, filter:true}]) -> Promise<Blob>
   Célula: texto, número, null ou {v, s} com s = 'head' | 'int' | 'pct' | 'dec' | 'date' | 'title' | 'bold' | 'note'.
   Datas: {v: Date, s:'date'}. Percentuais entram como fração (0,25 = 25%). */
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
/* estilos: índice = posição em cellXfs */
var STYLE={head:1,int:2,pct:3,dec:4,date:5,title:6,bold:7,note:8};
var STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
'<numFmts count="3"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="0.00"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/></numFmts>'+
'<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font>'+
'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'+
'<font><b/><sz val="15"/><color rgb="FF003B5C"/><name val="Calibri"/></font>'+
'<font><b/><sz val="11"/><name val="Calibri"/></font>'+
'<font><i/><sz val="10"/><color rgb="FF5B7385"/><name val="Calibri"/></font></fonts>'+
'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+
'<fill><patternFill patternType="solid"><fgColor rgb="FF003B5C"/><bgColor indexed="64"/></patternFill></fill></fills>'+
'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
'<cellXfs count="9">'+
'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'+
'<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
'<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
'<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>'+
'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
'<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function serial(d){return Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1899,11,30))/864e5)}
function cell(c,r,v){
  var s=0;
  if(v&&typeof v==='object'&&!(v instanceof Date)){s=STYLE[v.s]||0;v=v.v}
  if(v==null||v==='')return s?'<c r="'+colName(c)+r+'" s="'+s+'"/>':'';
  var ref=colName(c)+r,sa=s?' s="'+s+'"':'';
  if(v instanceof Date)return'<c r="'+ref+'"'+(s?sa:' s="5"')+'><v>'+serial(v)+'</v></c>';
  if(typeof v==='number'){if(!isFinite(v))return'';return'<c r="'+ref+'"'+sa+'><v>'+v+'</v></c>'}
  return'<c r="'+ref+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
}
function sheetXml(sh){
  var rows=sh.rows||[],maxC=0,i,j;
  rows.forEach(function(r){if(r.length>maxC)maxC=r.length});
  var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  var view='<sheetView workbookViewId="0"'+(sh.grid===false?' showGridLines="0"':'')+'>';
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
  return x+'<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/></worksheet>';
}
function safeName(n,used){
  var s=String(n).replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,31)||'Planilha',b=s,k=2;
  while(used.indexOf(s.toLowerCase())>=0){var suf=' ('+k++ +')';s=b.slice(0,31-suf.length)+suf}
  used.push(s.toLowerCase());return s;
}
function build(sheets){
  var used=[],names=sheets.map(function(s){return safeName(s.name,used)});
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
    sheets.map(function(_,i){return'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('')+'</Types>';
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  var wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'+
    names.map(function(n,i){return'<sheet name="'+esc(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('')+'</sheets>'+
    '</workbook>';
  var wrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map(function(_,i){return'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+
    '<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  var files=[{name:'[Content_Types].xml',text:ct},{name:'_rels/.rels',text:rels},{name:'xl/workbook.xml',text:wb},{name:'xl/_rels/workbook.xml.rels',text:wrels},{name:'xl/styles.xml',text:STYLES}];
  sheets.forEach(function(s,i){files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',text:sheetXml(s)})});
  return zip(files);
}
window.monXlsx={build:build};
})();
