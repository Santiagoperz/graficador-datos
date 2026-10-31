var PRESETS={arena:["#111844","#4B5694","#7288AE","#EAE0CF"],clasica:["#2563eb","#f59e0b","#10b981","#ffffff"]};
var COL=PRESETS.arena.slice(),PAL=[],dlNS=null;
try{var sv=JSON.parse(localStorage.getItem("graficador-colores")||"null");if(sv&&sv.length===4&&sv.every(function(c){return /^#[0-9a-f]{6}$/i.test(c)}))COL=sv}catch(e){}
function hex2rgb(h){h=h.replace("#","");return [0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})}
function mix(a,b,t){var x=hex2rgb(a),y=hex2rgb(b);return "#"+x.map(function(v,i){var r=Math.round(v*(1-t)+y[i]*t);return (r<16?"0":"")+r.toString(16)}).join("")}
function lum(h){var c=hex2rgb(h);return (0.299*c[0]+0.587*c[1]+0.114*c[2])/255}
function pal(){var b=COL.slice(0,3),bg=COL[3];return b.concat(b.map(function(c){return mix(c,bg,.5)}),[mix(COL[0],bg,.75),mix(COL[1],bg,.75)])}
var charts=[],model=null,mode="texto",fileRows=null,timer=null;
function $(s){return document.querySelector(s)}
function toNum(v){return Number(String(v).trim().replace(/\s/g,"").replace(",","."))}
function isNum(v){return v!==""&&v!=null&&!isNaN(toNum(v))}
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function f(x){return Number.isInteger(x)?x:Math.round(x*100)/100}
function clean(a){return a.filter(function(v){return v!=null})}

/* ---------- lectura ---------- */
function parseText(t){
  var lines=t.split(/\r?\n/).map(function(l){return l.trim()}).filter(Boolean);
  if(lines.length===1){
    var re=/([^\W\d_][^\n,;:=]*?)\s*[-–:=]\s+(-?\d+(?:[.,]\d+)?)(?=\s|,|;|$)/g,m,out=[];
    while((m=re.exec(lines[0]))){out.push([m[1].trim(),m[2]])}
    if(out.length>=2)return out;
  }
  return lines.map(function(l){
    var c;
    if(l.indexOf("\t")>-1)c=l.split("\t");
    else if(l.indexOf(";")>-1)c=l.split(";");
    else if(l.indexOf(",")>-1&&!/^-?\d+,\d+$/.test(l))c=l.split(",");
    else{
      var m=l.match(/^(.*?)[\s:=\-–—]+(-?\d+(?:[.,]\d+)?)$/);
      c=(m&&m[1])?[m[1],m[2]]:l.split(/\s+/);
    }
    return c.map(function(x){return x.trim()});
  });
}
function build(rows){
  rows=rows.filter(function(r){return r.some(function(c){return String(c==null?"":c).trim()!==""})});
  if(!rows.length)throw "Escribe o pega algunos datos primero.";
  var w=Math.max.apply(null,rows.map(function(r){return r.length}));
  rows=rows.map(function(r){r=r.map(function(c){return String(c==null?"":c).trim()});while(r.length<w)r.push("");return r});
  if(rows.length===1&&w>1&&rows[0].every(isNum))rows=rows[0].map(function(c){return [c]});
  w=rows[0].length;
  var header=null,first=rows[0];
  if(rows.length>1&&w>1&&first.slice(1).every(function(c){return c!==""&&!isNum(c)})&&rows.slice(1).some(function(r){return r.slice(1).some(isNum)}))header=rows.shift();
  else if(rows.length>1&&w===1&&!isNum(first[0])&&rows.slice(1).every(function(r){return isNum(r[0])}))header=rows.shift();
  var lc=(w>1&&(header||!rows.every(function(r){return isNum(r[0])})))?0:-1;
  var series=[],start=lc+1;
  for(var j=start;j<w;j++){
    var vals=rows.map(function(r){return isNum(r[j])?toNum(r[j]):null});
    if(!clean(vals).length)continue;
    series.push({name:header&&header[j]?header[j]:"Serie "+(series.length+1),values:vals});
  }
  if(series.length===1&&!(header&&header[start]))series[0].name="Valores";
  if(!series.length)throw "No encontré números en los datos. Revisa el formato.";
  var labels=lc>=0?rows.map(function(r){return r[0]}):rows.map(function(_,i){return String(i+1)});
  var keep=rows.map(function(_,i){return series.some(function(s){return s.values[i]!=null})});
  labels=labels.filter(function(_,i){return keep[i]});
  series.forEach(function(s){s.values=s.values.filter(function(_,i){return keep[i]})});
  return {labels:labels,series:series};
}

/* ---------- estadística ---------- */
function qt(a,p){var h=(a.length-1)*p,i=Math.floor(h);return a[i]+(h-i)*((a[i+1]!==undefined?a[i+1]:a[i])-a[i])}
function stats(v){
  var a=clean(v).sort(function(x,y){return x-y}),n=a.length,s=a.reduce(function(p,c){return p+c},0),m=s/n;
  var med=qt(a,.5),q1=qt(a,.25),q3=qt(a,.75),iqr=q3-q1;
  var vr=n>1?a.reduce(function(p,c){return p+Math.pow(c-m,2)},0)/(n-1):0,sd=Math.sqrt(vr);
  var inside=a.filter(function(x){return x>=q1-1.5*iqr&&x<=q3+1.5*iqr});
  var out=a.filter(function(x){return x<q1-1.5*iqr||x>q3+1.5*iqr});
  var cnt={},best=0,mode=[];
  a.forEach(function(x){cnt[x]=(cnt[x]||0)+1;best=Math.max(best,cnt[x])});
  if(best>1)for(var k in cnt)if(cnt[k]===best)mode.push(+k);
  var sk=(n>2&&sd>0)?n/((n-1)*(n-2))*a.reduce(function(p,c){return p+Math.pow((c-m)/sd,3)},0):null;
  return {n:n,s:s,m:m,med:med,min:a[0],max:a[n-1],sd:sd,vr:vr,q1:q1,q3:q3,iqr:iqr,lo:inside[0],hi:inside[inside.length-1],out:out,mode:mode,sk:sk,cv:m!==0?sd/Math.abs(m)*100:null};
}
function freq(v){
  var a=clean(v).sort(function(x,y){return x-y}),d=a.filter(function(x,i){return a.indexOf(x)===i}),bins=[];
  if(d.length<=12){bins=d.map(function(x){return {l:String(f(x)),c:a.filter(function(y){return y===x}).length}})}
  else{
    var k=Math.ceil(1+Math.log2(a.length)),mn=a[0],mx=a[a.length-1],w=(mx-mn)/k;
    for(var i=0;i<k;i++){
      var lo=mn+i*w,hi=lo+w;
      bins.push({l:f(lo)+"–"+f(hi),c:a.filter(function(y){return y>=lo&&(i===k-1?y<=hi:y<hi)}).length});
    }
  }
  var acc=0,n=a.length;
  return bins.map(function(b){acc+=b.c;return {l:b.l,c:b.c,r:b.c/n*100,ca:acc,ra:acc/n*100}});
}

/* ---------- gráficos ---------- */
function slug(t){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function savePng(ch,title){
  if(!dlNS)return;
  var c=ch.canvas,o=document.createElement("canvas");o.width=c.width;o.height=c.height;
  var x=o.getContext("2d");x.fillStyle=COL[3];x.fillRect(0,0,o.width,o.height);x.drawImage(c,0,0);
  o.toBlob(function(blob){
    if(!blob)return;
    dlNS.save({filename:"grafico-"+slug(title)+".png",data:blob}).catch(function(e){
      if(e&&e.code==="declined")return;
      $("#msg").textContent="No pude descargar la imagen en esta vista.";
    });
  },"image/png");
}
function card(title,note,cfg){
  var d=document.createElement("div");d.className="ch";
  var hd=document.createElement("div");hd.className="chh";
  var h=document.createElement("h3");h.textContent=title;
  var b=document.createElement("button");b.className="dl";b.textContent="Descargar PNG";
  hd.appendChild(h);hd.appendChild(b);
  var p=document.createElement("p");p.textContent=note;
  var cv=document.createElement("div");cv.className="cv";cv.style.background=COL[3];
  var c=document.createElement("canvas");cv.appendChild(c);
  d.appendChild(hd);d.appendChild(p);d.appendChild(cv);
  $("#charts").appendChild(d);
  var ch=new Chart(c,cfg);charts.push(ch);
  b.onclick=function(){savePng(ch,title)};
}
function draw(){
  charts.forEach(function(c){c.destroy()});charts=[];
  $("#charts").innerHTML="";
  PAL=pal();var bg=COL[3],tx=lum(bg)>.55?"#1b2030":"#e8ebf2";
  Chart.defaults.color=tx;Chart.defaults.borderColor=mix(tx,bg,.85);Chart.defaults.devicePixelRatio=Math.max(2,window.devicePixelRatio||1);Chart.defaults.layout.padding=10;
  Chart.defaults.font.family='"Instrument Sans",system-ui,sans-serif';
  var L=model.labels,S=model.series,multi=S.length>1;
  var k=+($("#sel").value||0),s=S[k]||S[0];
  var base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:multi}}};
  function opt(extra){var o=JSON.parse(JSON.stringify(base));for(var key in extra)o[key]=extra[key];return o}
  function dsets(extra){return S.map(function(x,i){var o={label:x.name,data:x.values,backgroundColor:PAL[i%8],borderColor:PAL[i%8]};for(var key in extra)o[key]=extra[key];return o})}

  card("Barras",multi?"Compara las series en cada categoría.":"Compara el valor de cada categoría.",
    {type:"bar",data:{labels:L,datasets:dsets({borderRadius:3})},options:opt({})});

  if(L.length>=2)card("Líneas","Muestra cómo cambian los valores a lo largo de las categorías.",
    {type:"line",data:{labels:L,datasets:dsets({tension:.3,pointRadius:4,fill:false})},options:opt({})});

  var idx=[];s.values.forEach(function(v,i){if(v!=null&&v>=0)idx.push(i)});
  var tot=idx.reduce(function(p,i){return p+s.values[i]},0);
  if(idx.length>=2&&idx.length<=8&&tot>0&&idx.length===clean(s.values).length)
    card("Dona","Reparto de «"+s.name+"» entre categorías (porcentaje del total).",
      {type:"doughnut",data:{labels:idx.map(function(i){return L[i]}),datasets:[{data:idx.map(function(i){return s.values[i]}),backgroundColor:idx.map(function(_,i){return PAL[i%8]}),borderColor:bg,borderWidth:2}]},
       options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:function(c){return c.label+": "+f(c.parsed)+" ("+f(c.parsed/tot*100)+"%)"}}}}}});

  if(multi&&S.every(function(x){return clean(x.values).every(function(v){return v>=0})}))
    card("Barras apiladas","Muestra el total por categoría y cuánto aporta cada serie.",
      {type:"bar",data:{labels:L,datasets:dsets({})},options:opt({scales:{x:{stacked:true},y:{stacked:true}}})});

  var fr=freq(s.values);
  if(clean(s.values).length>=3){
    card("Histograma y polígono de frecuencias","Cuántas veces aparece cada valor de «"+s.name+"»"+(fr.length&&fr[0].l.indexOf("–")>0?" (agrupado en intervalos).":"."),
      {data:{labels:fr.map(function(b){return b.l}),datasets:[
        {type:"bar",label:"Frecuencia",data:fr.map(function(b){return b.c}),backgroundColor:PAL[0]+"cc",borderColor:bg,borderWidth:1,barPercentage:1,categoryPercentage:1,order:2},
        {type:"line",label:"Polígono",data:fr.map(function(b){return b.c}),borderColor:PAL[1],backgroundColor:PAL[1],tension:0,pointRadius:4,order:1}]},
       options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0},title:{display:true,text:"Frecuencia"}},x:{title:{display:true,text:"Valor"}}}}});
    card("Frecuencia acumulada","Porcentaje de datos que quedan en ese valor o por debajo.",
      {type:"line",data:{labels:fr.map(function(b){return b.l}),datasets:[{label:"% acumulado",data:fr.map(function(b){return b.ra}),borderColor:PAL[2],backgroundColor:PAL[2],stepped:true,pointRadius:3}]},
       options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+"%"}}}}}});
  }

  var BX=S.filter(function(x){return clean(x.values).length>=3});
  if(BX.length){
    var bs=BX.map(function(x){return stats(x.values)});
    var gmin=Math.min.apply(null,bs.map(function(b){return b.min})),gmax=Math.max.apply(null,bs.map(function(b){return b.max})),pad=(gmax-gmin||1)*.08;
    card("Diagrama de caja y bigotes","La caja va de Q1 a Q3 y la línea interior es la mediana. Los bigotes llegan al dato más lejano dentro de 1,5 veces el rango intercuartílico; los círculos son valores atípicos.",
      {type:"bar",
       data:{labels:BX.map(function(x){return x.name}),datasets:[{label:"Q1 a Q3",data:bs.map(function(b){return [b.q1,b.q3]}),backgroundColor:BX.map(function(x){return PAL[S.indexOf(x)%8]}),borderColor:tx,borderWidth:2,barPercentage:.5,maxBarThickness:90}]},
       options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){var b=bs[c.dataIndex],r=["Máximo (bigote): "+f(b.hi),"Q3: "+f(b.q3),"Mediana: "+f(b.med),"Q1: "+f(b.q1),"Mínimo (bigote): "+f(b.lo)];if(b.out.length)r.push("Atípicos: "+b.out.map(f).join(", "));return r}}}},scales:{y:{min:gmin-pad,max:gmax+pad}}},
       plugins:[{id:"cajas",afterDatasetsDraw:function(ch){
         var x=ch.ctx,ys=ch.scales.y,mt=ch.getDatasetMeta(0);
         x.save();x.lineWidth=2;
         bs.forEach(function(b,i){
           var el=mt.data[i],cx=el.x,hw=el.width/2,col=PAL[S.indexOf(BX[i])%8];
           var yH=ys.getPixelForValue(b.hi),yL=ys.getPixelForValue(b.lo);
           x.strokeStyle=tx;x.beginPath();
           x.moveTo(cx,ys.getPixelForValue(b.q3));x.lineTo(cx,yH);
           x.moveTo(cx,ys.getPixelForValue(b.q1));x.lineTo(cx,yL);
           x.moveTo(cx-hw/2,yH);x.lineTo(cx+hw/2,yH);
           x.moveTo(cx-hw/2,yL);x.lineTo(cx+hw/2,yL);
           x.stroke();
           b.out.forEach(function(v){x.beginPath();x.arc(cx,ys.getPixelForValue(v),4,0,Math.PI*2);x.stroke()});
           var ym=ys.getPixelForValue(b.med);
           x.strokeStyle=lum(col)>.55?"#1b2030":"#f5f5f5";x.lineWidth=3;
           x.beginPath();x.moveTo(cx-hw,ym);x.lineTo(cx+hw,ym);x.stroke();x.lineWidth=2;
         });
         x.restore();
       }}]});
  }

  if(multi){
    var pts=[];
    S[0].values.forEach(function(x,i){var y=S[1].values[i];if(x!=null&&y!=null)pts.push({x:x,y:y})});
    if(pts.length>=3)card("Dispersión","Relación entre «"+S[0].name+"» y «"+S[1].name+"».",
      {type:"scatter",data:{datasets:[{label:S[0].name+" vs "+S[1].name,data:pts,backgroundColor:PAL[3],pointRadius:5}]},
       options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:S[0].name}},y:{title:{display:true,text:S[1].name}}}}});
  }
}

/* ---------- tablas de resultados ---------- */
function td(tag,txt){var e=document.createElement(tag);e.textContent=txt;return e}
function fillTable(el,head,rows){
  el.innerHTML="";
  var tr=document.createElement("tr");head.forEach(function(h){tr.appendChild(td("th",h))});
  var th=document.createElement("thead");th.appendChild(tr);el.appendChild(th);
  var tb=document.createElement("tbody");
  rows.forEach(function(r){var t=document.createElement("tr");r.forEach(function(c){t.appendChild(td("td",c))});tb.appendChild(t)});
  el.appendChild(tb);
}
function render(){
  var rows;
  try{
    if(mode==="texto")rows=parseText($("#txt").value);
    else if(mode==="tabla")rows=gridRows();
    else{if(!fileRows)throw "Elige un archivo para empezar.";rows=fileRows}
    model=build(rows);
  }catch(e){
    $("#msg").textContent=typeof e==="string"?e:"No pude interpretar los datos. Revisa el formato.";
    $("#out").hidden=true;return;
  }
  $("#msg").textContent="";
  var S=model.series,sel=$("#sel"),prev=+sel.value||0;
  sel.innerHTML="";
  S.forEach(function(x,i){var o=document.createElement("option");o.value=i;o.textContent=x.name;sel.appendChild(o)});
  sel.value=prev<S.length?prev:0;
  $("#selw").hidden=S.length<2;
  var Q=S.map(function(x){return stats(x.values)});
  var defs=[
    ["n",function(q){return q.n}],
    ["Suma",function(q){return f(q.s)}],
    ["Media",function(q){return f(q.m)}],
    ["Mediana",function(q){return f(q.med)}],
    ["Moda",function(q){return q.mode.length?q.mode.map(f).join(", "):"Sin moda"}],
    ["Mínimo",function(q){return f(q.min)}],
    ["Máximo",function(q){return f(q.max)}],
    ["Rango",function(q){return f(q.max-q.min)}],
    ["Q1 (25 %)",function(q){return f(q.q1)}],
    ["Q3 (75 %)",function(q){return f(q.q3)}],
    ["Rango intercuartílico",function(q){return f(q.iqr)}],
    ["Varianza",function(q){return f(q.vr)}],
    ["Desviación estándar",function(q){return f(q.sd)}],
    ["Coef. de variación",function(q){return q.cv==null?null:f(q.cv)+"%"}],
    ["Asimetría",function(q){return q.sk==null?null:f(q.sk)}],
    ["Valores atípicos",function(q){return q.out.length?q.out.map(f).join(", "):"Ninguno"}]
  ];
  fillTable($("#stats"),["Estadístico"].concat(S.map(function(x){return x.name})),
    defs.map(function(d){return [d[0]].concat(Q.map(function(q){var r=d[1](q);return r==null?"—":String(r)}))}));
  $("#out").hidden=false;
  showFreq();draw();
}
function showFreq(){
  var s=model.series[+$("#sel").value||0];
  fillTable($("#freq"),["Valor o intervalo","Frecuencia","Relativa","Acumulada","Rel. acumulada"],
    freq(s.values).map(function(b){return [b.l,String(b.c),f(b.r)+"%",String(b.ca),f(b.ra)+"%"]}));
}

/* ---------- entrada: tabla ---------- */
function cell(tr,ph){var c=tr.insertCell(),i=document.createElement("input");i.setAttribute("aria-label","Celda");if(ph)i.placeholder=ph;c.appendChild(i)}
function mkGrid(){
  var t=$("#grid");t.innerHTML="";
  var h=t.insertRow();cell(h,"Categoría");cell(h,"Serie 1");
  for(var i=0;i<5;i++){var r=t.insertRow();cell(r);cell(r)}
}
function gridRows(){return [].slice.call($("#grid").rows).map(function(tr){return [].slice.call(tr.querySelectorAll("input")).map(function(i){return i.value})})}
$("#addr").onclick=function(){var t=$("#grid"),r=t.insertRow();for(var i=0;i<t.rows[0].cells.length;i++)cell(r)};
$("#addc").onclick=function(){var t=$("#grid"),n=t.rows[0].cells.length;[].slice.call(t.rows).forEach(function(r,i){cell(r,i===0?"Serie "+n:"")})};
$("#clr").onclick=function(){mkGrid();render()};

/* ---------- entrada: archivo ---------- */
function loadFile(file){
  if(!file)return;
  var name=file.name.toLowerCase(),rd=new FileReader();
  rd.onerror=function(){$("#msg").textContent="No pude leer el archivo."};
  if(/\.(xlsx|xls|ods)$/.test(name)){
    rd.onload=function(){
      try{
        var wb=XLSX.read(rd.result,{type:"array"});
        var data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""});
        fileRows=data.map(function(r){return r.map(String)});
      }catch(e){fileRows=null;$("#msg").textContent="No pude abrir ese archivo de Excel.";return}
      render();
    };
    rd.readAsArrayBuffer(file);
  }else{
    rd.onload=function(){fileRows=parseText(String(rd.result));render()};
    rd.readAsText(file);
  }
}
$("#file").onchange=function(e){loadFile(e.target.files[0])};
var dz=$("#drop");
["dragover","dragenter"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add("over")})});
["dragleave","drop"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove("over")})});
dz.addEventListener("drop",function(e){loadFile(e.dataTransfer.files[0])});

/* ---------- controles ---------- */
function later(){clearTimeout(timer);timer=setTimeout(function(){if(mode==="texto"&&!$("#txt").value.trim()){$("#out").hidden=true;$("#msg").textContent="";return}render()},450)}
$("#txt").addEventListener("input",later);
$("#grid").addEventListener("input",later);
$("#go").onclick=render;
$("#sel").onchange=function(){showFreq();draw()};
function example(t){mode="texto";setMode("texto");$("#txt").value=t;render()}
$("#ex1").onclick=function(){example("Semana 1 - 23\nSemana 2 - 26\nSemana 3 - 25\nSemana 4 - 24")};
$("#ex2").onclick=function(){example("Mes, Ventas, Gastos\nEnero, 120, 80\nFebrero, 135, 90\nMarzo, 150, 95\nAbril, 142, 110\nMayo, 170, 105")};
$("#ex3").onclick=function(){example("12, 15, 15, 18, 20, 20, 20, 22, 25, 25, 27, 30, 30, 31, 35, 38")};
function setMode(m){
  mode=m;
  [].slice.call($("#tabs").children).forEach(function(b){b.classList.toggle("on",b.dataset.m===m)});
  ["texto","tabla","archivo"].forEach(function(x){$("#p-"+x).hidden=x!==m});
}
$("#tabs").onclick=function(e){var m=e.target.dataset&&e.target.dataset.m;if(m){setMode(m);if(m==="tabla")later();else if(m==="archivo"&&fileRows)render();else if(m==="texto")later()}};
function redraw(){if(model&&!$("#out").hidden)draw()}
if(window.matchMedia)window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",redraw);
new MutationObserver(redraw).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
function syncPal(){[].slice.call(document.querySelectorAll("#pal input")).forEach(function(i){i.value=COL[+i.dataset.c]})}
function savePal(){try{localStorage.setItem("graficador-colores",JSON.stringify(COL))}catch(e){}}
$("#pal").addEventListener("input",function(e){var i=e.target;if(i.dataset&&i.dataset.c!==undefined){COL[+i.dataset.c]=i.value;savePal();redraw()}});
$("#pal").addEventListener("click",function(e){var p=e.target.dataset&&e.target.dataset.p;if(p){COL=PRESETS[p].slice();savePal();syncPal();redraw()}});
syncPal();
function localSave(o){var a=document.createElement("a");a.href=URL.createObjectURL(o.data);a.download=o.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);return Promise.resolve({status:"saved"})}
if(window.claude&&claude.use){claude.use("downloads").then(function(d){if(d){dlNS=d;document.body.classList.add("can-dl")}}).catch(function(){})}
else{dlNS={save:localSave};document.body.classList.add("can-dl")}
mkGrid();
