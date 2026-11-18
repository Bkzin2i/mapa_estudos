(function(){
'use strict';
var DAYS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
var DAYS_FULL=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
var MONTHS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var COLORS=['#3b6fe0','#1f9d6b','#d98a0b','#e0583f','#8a5cd6','#139bb5','#d6498a','#7f9a1e'];
var COLOR_NAMES=['Azul','Verde','Âmbar','Coral','Violeta','Ciano','Rosa','Oliva'];
var LEADS=[[0,'No horário'],[5,'5 min antes'],[10,'10 min antes'],[15,'15 min antes'],[30,'30 min antes'],[60,'1 hora antes'],[120,'2 horas antes'],[1440,'1 dia antes']];
var STATUS={todo:'A estudar',doing:'Estudando',done:'Concluído'};
var NEXT={todo:'doing',doing:'done',done:'todo'};
var W={todo:0,doing:0.5,done:1};
var KEY='mapa-estudos-v1';
var HH=40;

var I={
  plus:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  x:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  edit:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16l.9-3.7L13.4 3.8a1.5 1.5 0 0 1 2.1 0l.7.7a1.5 1.5 0 0 1 0 2.1L7.7 15.1zM12 5.3l2.7 2.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  bell:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13zM8.5 17.5h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>'
};
function stIcon(s){
  if(s==='done')return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="currentColor"/><path d="M6 10.3l2.7 2.7L14 7.7" fill="none" stroke="var(--on-ok)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(s==='doing')return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor"/></svg>';
  return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
}

function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return Math.random().toString(36).slice(2,9)}
function pad(n){return String(n).padStart(2,'0')}
function toMin(s){var p=s.split(':');return (+p[0])*60+(+p[1])}
function hm(d){return pad(d.getHours())+':'+pad(d.getMinutes())}
function toLocalInput(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function dayIdx(d){return (d.getDay()+6)%7}
function sod(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function dayDiff(d,now){return Math.round((sod(d)-sod(now))/864e5)}
function fmtH(min){return Math.floor(min/60)+' h'+(min%60?' '+pad(min%60):'')}
function when(d){
  var diff=dayDiff(d,new Date());
  if(diff===0)return 'hoje '+hm(d);
  if(diff===1)return 'amanhã '+hm(d);
  if(diff===-1)return 'ontem '+hm(d);
  return DAYS[dayIdx(d)].toLowerCase()+', '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+hm(d);
}
function leadLabel(n){for(var i=0;i<LEADS.length;i++)if(LEADS[i][0]===n)return LEADS[i][1];return ''}
function pctOf(ts){return ts.length?Math.round(ts.reduce(function(a,t){return a+W[t.status]},0)/ts.length*100):0}

/* ---------- dados ---------- */
var storageOk=true;
var state=null;
var ui={disc:null,status:'all',q:'',week:window.matchMedia&&window.matchMedia('(max-width:720px)').matches?'list':'grid',exp:{}};
var animRing=true;

function normalize(r){
  if(!r||!Array.isArray(r.disciplines))return null;
  var hmRe=/^([01]\d|2[0-3]):[0-5]\d$/, dtRe=/^\d{4}-\d\d-\d\dT\d\d:\d\d$/;
  return {v:1,sound:r.sound!==false,hideBanner:!!r.hideBanner,disciplines:r.disciplines.slice(0,60).map(function(d){
    d=d||{};
    return {
      id:String(d.id||uid()),name:String(d.name||'Sem nome').slice(0,60),
      color:/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:COLORS[0],ex:!!d.ex,
      sessions:(Array.isArray(d.sessions)?d.sessions:[]).filter(function(s){return s&&Number.isInteger(+s.day)&&+s.day>=0&&+s.day<=6&&hmRe.test(s.start||'')&&hmRe.test(s.end||'')&&toMin(s.end)>toMin(s.start)}).map(function(s){return {id:String(s.id||uid()),day:+s.day,start:s.start,end:s.end}}),
      topics:(Array.isArray(d.topics)?d.topics:[]).slice(0,500).map(function(t){
        t=t||{};
        var lead=LEADS.some(function(l){return l[0]===+t.lead})?+t.lead:0;
        return {id:String(t.id||uid()),title:String(t.title||'Sem título').slice(0,120),status:STATUS[t.status]?t.status:'todo',remindAt:dtRe.test(t.remindAt||'')?t.remindAt:null,lead:lead,notified:!!t.notified,notes:String(t.notes||'').slice(0,500)};
      })
    };
  })};
}
function seed(){
  var now=new Date();now.setSeconds(0,0);
  function at(dd,h,m){var d=new Date(now);d.setDate(d.getDate()+dd);d.setHours(h,m,0,0);return toLocalInput(d)}
  function S(day,a,b){return {id:uid(),day:day,start:a,end:b}}
  function T(title,status,rem,lead){return {id:uid(),title:title,status:status,remindAt:rem||null,lead:lead||0,notified:false,notes:''}}
  var later=new Date(now.getTime()+3*3600000);later.setMinutes(0,0,0);
  return {v:1,sound:true,hideBanner:false,disciplines:[
    {id:uid(),ex:true,name:'Matemática',color:COLORS[0],sessions:[S(0,'19:00','20:30'),S(2,'19:00','20:30'),S(5,'09:00','11:00')],topics:[
      T('Funções do 1º e 2º grau','done'),T('Progressões aritméticas e geométricas','doing',at(1,19,0),30),
      T('Análise combinatória','todo',at(3,19,0),60),T('Probabilidade','todo'),T('Geometria analítica','todo')]},
    {id:uid(),ex:true,name:'Biologia',color:COLORS[1],sessions:[S(1,'20:00','21:30'),S(3,'20:00','21:30'),S(6,'15:00','16:30')],topics:[
      T('Citologia','done'),T('Genética mendeliana','doing',at(2,20,0),15),T('Ecologia e cadeias alimentares','todo',at(5,15,0),60),T('Fisiologia humana','todo')]},
    {id:uid(),ex:true,name:'História',color:COLORS[2],sessions:[S(4,'18:00','19:30'),S(2,'21:00','22:00')],topics:[
      T('Brasil Colônia','done'),T('Revolução Industrial','done'),T('Era Vargas','doing'),T('Guerra Fria','todo',at(4,18,0),30)]},
    {id:uid(),ex:true,name:'Língua Portuguesa',color:COLORS[3],sessions:[S(0,'07:00','08:00'),S(3,'07:00','08:00'),S(5,'14:00','15:30')],topics:[
      T('Interpretação de texto','done'),T('Figuras de linguagem','done'),T('Redação dissertativa','doing',toLocalInput(later),10),T('Concordância verbal','todo')]}
  ]};
}
function load(){
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){var s=normalize(JSON.parse(raw));if(s)return s}
  }catch(e){storageOk=false}
  return seed();
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){storageOk=false;renderFoot()}
}
function find(id){return state.disciplines.filter(function(d){return d.id===id})[0]||null}
function findT(d,id){return d?d.topics.filter(function(t){return t.id===id})[0]||null:null}
function visible(d){return !ui.disc||ui.disc===d.id}

/* ---------- renderização ---------- */
function renderToday(){
  $('#today').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function renderBanner(){
  var has=state.disciplines.some(function(d){return d.ex});
  $('#banner').innerHTML=has&&!state.hideBanner?'<div class="banner"><p>Estas disciplinas são exemplos para você ver o painel funcionando. Edite à vontade ou comece com a sua própria lista.</p><div><button class="btn sm" data-act="clear-example">Remover exemplos</button><button class="btn sm ghost" data-act="hide-banner">Ocultar aviso</button></div></div>':'';
}
function nextSession(now){
  var best=null;
  state.disciplines.forEach(function(d){d.sessions.forEach(function(s){
    for(var off=0;off<8;off++){
      var base=new Date(now.getFullYear(),now.getMonth(),now.getDate()+off);
      if(dayIdx(base)!==s.day)continue;
      var st=new Date(base);st.setHours(0,toMin(s.start),0,0);
      var en=new Date(base);en.setHours(0,toMin(s.end),0,0);
      if(en<=now)continue;
      var cur=st<=now;
      if(!best||(cur&&!best.cur)||(cur===best.cur&&st<best.st))best={d:d,s:s,st:st,en:en,cur:cur};
      break;
    }
  })});
  return best;
}
function reminderList(){
  var out=[];
  state.disciplines.forEach(function(d){d.topics.forEach(function(t){
    if(t.remindAt&&t.status!=='done'){var at=new Date(t.remindAt);if(!isNaN(at))out.push({d:d,t:t,at:at})}
  })});
  out.sort(function(a,b){return a.at-b.at});
  return out;
}
function renderStrip(){
  var now=new Date(),ns=nextSession(now),rl=reminderList();
  var up=rl.filter(function(x){return x.at>=now})[0],over=rl.filter(function(x){return x.at<now}).length;
  var a,b;
  if(ns){
    a='<div class="sx" style="--c:'+ns.d.color+'"><i class="dot"></i><div><small>'+(ns.cur?'Agora':'Próxima sessão')+'</small><b>'+esc(ns.d.name)+'</b><span class="sub">'+(ns.cur?'até '+hm(ns.en):when(ns.st)+' – '+hm(ns.en))+'</span></div></div>';
  }else{
    a='<div class="sx"><i class="dot"></i><div><small>Próxima sessão</small><b>Nenhum horário cadastrado</b><span class="sub">Adicione horários ao criar uma disciplina.</span></div></div>';
  }
  if(up){
    b='<div class="sx" style="--c:'+up.d.color+'"><span class="dot"></span><div><small>Próximo lembrete</small><b>'+esc(up.t.title)+'</b><span class="sub">'+esc(up.d.name)+' · '+when(up.at)+'</span></div>'+(over?'<span class="chipcrit">'+over+' atrasado'+(over>1?'s':'')+'</span>':'')+'</div>';
  }else{
    b='<div class="sx"><span class="dot"></span><div><small>Próximo lembrete</small><b>Nada agendado</b><span class="sub">Defina data e hora ao cadastrar um assunto.</span></div>'+(over?'<span class="chipcrit">'+over+' atrasado'+(over>1?'s':'')+'</span>':'')+'</div>';
  }
  $('#strip').innerHTML=a+b;
}
function renderOverview(){
  var all=[];state.disciplines.forEach(function(d){all=all.concat(d.topics)});
  var c={todo:0,doing:0,done:0};all.forEach(function(t){c[t.status]++});
  var p=pctOf(all),C=2*Math.PI*52;
  var mins=0;state.disciplines.forEach(function(d){d.sessions.forEach(function(s){mins+=toMin(s.end)-toMin(s.start)})});
  var rem=all.filter(function(t){return t.remindAt&&t.status!=='done'}).length;
  var legend=['done','doing','todo'].map(function(k){return '<li><span class="st st-'+k+'">'+stIcon(k)+'</span><span>'+STATUS[k]+'</span><b>'+c[k]+'</b></li>'}).join('');
  $('#ov').innerHTML='<div class="ov"><svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Progresso geral: '+p+' por cento"><circle class="track" cx="60" cy="60" r="52"/><circle class="arc'+(animRing?' anim':'')+'" cx="60" cy="60" r="52" stroke-dasharray="'+(C*p/100).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 60 60)"/><text x="60" y="64" text-anchor="middle" font-size="30" font-weight="700">'+p+'%</text><text x="60" y="82" text-anchor="middle" font-size="9.5" style="fill:var(--muted)">'+all.length+' assunto'+(all.length===1?'':'s')+'</text></svg>'
    +'<div class="ovr"><ul class="legend">'+legend+'</ul><div class="mini"><div><small>Estudo por semana</small><b>'+fmtH(mins)+'</b></div><div><small>Lembretes ativos</small><b>'+rem+'</b></div></div></div></div>';
  animRing=false;
}
function renderBars(){
  var ds=state.disciplines;
  if(!ds.length){$('#bars').innerHTML='<div class="empty"><p>Nenhuma disciplina ainda.</p><button class="btn primary" data-act="new-disc">Cadastrar a primeira</button></div>';return}
  $('#bars').innerHTML=ds.map(function(d){
    var n=d.topics.length,done=d.topics.filter(function(t){return t.status==='done'}).length,p=pctOf(d.topics);
    var m=d.sessions.reduce(function(a,s){return a+toMin(s.end)-toMin(s.start)},0);
    return '<button class="brow'+(ui.disc&&ui.disc!==d.id?' dim':'')+'" data-act="sel-disc" data-id="'+d.id+'" aria-pressed="'+(ui.disc===d.id)+'" style="--c:'+d.color+'"><div class="bt"><i class="dot"></i><span class="nm">'+esc(d.name)+'</span><span class="num">'+done+'/'+n+' assuntos'+(m?' · '+fmtH(m)+'/sem':'')+' <b>'+p+'%</b></span></div><div class="track"><div class="fill" style="width:'+p+'%"></div></div></button>';
  }).join('');
}
function lanes(items){
  items.sort(function(a,b){return a.s-b.s||a.e-b.e});
  var cluster=[],end=0;
  function flush(){
    if(!cluster.length)return;
    var cols=[];
    cluster.forEach(function(it){var c=-1;for(var i=0;i<cols.length;i++)if(cols[i]<=it.s){c=i;break}if(c<0){c=cols.length;cols.push(it.e)}else cols[c]=it.e;it.col=c});
    cluster.forEach(function(it){it.n=cols.length});
    cluster=[];
  }
  items.forEach(function(it){if(cluster.length&&it.s>=end){flush();end=0}cluster.push(it);end=Math.max(end,it.e)});
  flush();
  return items;
}
function renderWeek(){
  var now=new Date(),mon=sod(now);mon.setDate(mon.getDate()-dayIdx(now));
  var rl=reminderList().filter(function(x){var df=Math.round((sod(x.at)-mon)/864e5);return df>=0&&df<7});
  var hasSess=state.disciplines.some(function(d){return d.sessions.length});
  var wrap=$('#weekBody');
  $$('[data-act="week-view"]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===ui.week))});
  if(!hasSess&&!rl.length){wrap.innerHTML='<div class="empty"><p>Cadastre horários de estudo para montar o mapa da semana.</p><button class="btn primary" data-act="new-disc">Nova disciplina</button></div>';return}
  var cur=nextSession(now),curKey=cur&&cur.cur?cur.d.id+'|'+cur.s.id:'';
  if(ui.week==='list'){
    var h='<div class="wl">';
    for(var i=0;i<7;i++){
      var day=new Date(mon);day.setDate(mon.getDate()+i);
      var items=[];
      state.disciplines.forEach(function(d){d.sessions.forEach(function(s){if(s.day===i)items.push({k:toMin(s.start),html:'<li class="'+(ui.disc&&ui.disc!==d.id?'dim':'')+'" style="--c:'+d.color+'"><span class="tm">'+s.start+' – '+s.end+'</span><span><i class="dot"></i> '+esc(d.name)+'</span></li>'})})});
      rl.forEach(function(x){if(dayDiff(x.at,day)===0)items.push({k:x.at.getHours()*60+x.at.getMinutes(),html:'<li class="'+(ui.disc&&ui.disc!==x.d.id?'dim':'')+'" style="--c:'+x.d.color+'"><span class="tm">'+hm(x.at)+'</span><span>'+I.bell.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')+' '+esc(x.t.title)+' <span class="meta" style="display:inline">· '+esc(x.d.name)+'</span></span></li>'})});
      items.sort(function(a,b){return a.k-b.k});
      h+='<div><h3>'+DAYS_FULL[i]+', '+day.getDate()+' '+MONTHS[day.getMonth()]+(dayDiff(day,now)===0?' <em>hoje</em>':'')+'</h3>'+(items.length?'<ul>'+items.map(function(x){return x.html}).join('')+'</ul>':'<p class="free">Dia livre</p>')+'</div>';
    }
    wrap.innerHTML=h+'</div>';
    return;
  }
  var lo=7*60,hi=21*60;
  state.disciplines.forEach(function(d){d.sessions.forEach(function(s){lo=Math.min(lo,Math.floor(toMin(s.start)/60)*60);hi=Math.max(hi,Math.ceil(toMin(s.end)/60)*60)})});
  rl.forEach(function(x){var m=x.at.getHours()*60+x.at.getMinutes();lo=Math.min(lo,Math.floor(m/60)*60);hi=Math.max(hi,Math.ceil((m+1)/60)*60)});
  var hours=(hi-lo)/60,H=hours*HH;
  var html='<div class="wk" style="--hh:'+HH+'px"><div></div>';
  var days=[];
  for(var j=0;j<7;j++){var dd=new Date(mon);dd.setDate(mon.getDate()+j);days.push(dd);html+='<div class="wk-h'+(dayDiff(dd,now)===0?' today':'')+'">'+DAYS[j]+'<b>'+dd.getDate()+'</b></div>'}
  html+='<div class="wk-gut" style="height:'+H+'px">';
  for(var k=0;k<hours;k++)html+='<span style="top:'+(k*HH)+'px">'+pad(lo/60+k)+':00</span>';
  html+='</div>';
  for(var c=0;c<7;c++){
    var today=dayDiff(days[c],now)===0,items2=[];
    state.disciplines.forEach(function(d){d.sessions.forEach(function(s){if(s.day===c)items2.push({d:d,s:s,s0:toMin(s.start),e0:toMin(s.end),s:toMin(s.start),e:toMin(s.end),raw:s})})});
    lanes(items2);
    html+='<div class="wk-col'+(today?' today':'')+'" style="height:'+H+'px">';
    items2.forEach(function(it){
      var top=(it.s-lo)/60*HH,h2=(it.e-it.s)/60*HH-2,isNow=curKey===it.d.id+'|'+it.raw.id;
      html+='<button class="blk'+(isNow?' now':'')+(ui.disc&&ui.disc!==it.d.id?' dim':'')+'" data-act="sel-disc" data-id="'+it.d.id+'" style="--c:'+it.d.color+';top:'+top+'px;height:'+h2+'px;left:calc('+(it.col/it.n*100)+'% + 2px);width:calc('+(100/it.n)+'% - 4px)" aria-label="'+esc(it.d.name)+', '+it.raw.start+' às '+it.raw.end+'"><b>'+esc(it.d.name)+'</b>'+(h2>=36?'<span>'+it.raw.start+'–'+it.raw.end+'</span>':'')+'</button>';
    });
    rl.forEach(function(x){
      if(dayDiff(x.at,days[c])!==0)return;
      var m=x.at.getHours()*60+x.at.getMinutes();
      html+='<button class="mk'+(ui.disc&&ui.disc!==x.d.id?' dim':'')+'" data-act="go-rem" style="--c:'+x.d.color+';top:'+((m-lo)/60*HH)+'px" title="'+esc(x.t.title)+' · '+hm(x.at)+'" aria-label="Lembrete: '+esc(x.t.title)+' às '+hm(x.at)+'"></button>';
    });
    if(today){var nm=now.getHours()*60+now.getMinutes();if(nm>=lo&&nm<=hi)html+='<div class="nowline" style="top:'+((nm-lo)/60*HH)+'px"></div>'}
    html+='</div>';
  }
  wrap.innerHTML=html+'</div>';
}
function renderReminders(){
  var now=new Date(),rl=reminderList().filter(function(x){return visible(x.d)});
  if(!rl.length){$('#rem').innerHTML='<div class="empty"><p>Sem lembretes'+(ui.disc?' para esta disciplina':'')+'.</p><button class="btn sm" data-act="new-topic">Agendar um assunto</button></div>';return}
  var groups=[['Atrasados',[],true],['Hoje',[],false],['Amanhã',[],false],['Próximos 7 dias',[],false],['Depois',[],false]];
  rl.forEach(function(x){
    var df=dayDiff(x.at,now),g=x.at<now?0:df===0?1:df===1?2:df<=7?3:4;
    groups[g][1].push(x);
  });
  $('#rem').innerHTML=groups.filter(function(g){return g[1].length}).map(function(g){
    return '<div class="rg'+(g[2]?' over':'')+'"><h3>'+g[0]+' · '+g[1].length+'</h3><ul>'+g[1].map(function(x){
      var lead=x.t.lead?' · aviso '+leadLabel(x.t.lead).toLowerCase():'';
      return '<li class="ri'+(g[2]?' over':'')+'" style="--c:'+x.d.color+'"><button class="stb st-todo" data-act="complete" data-d="'+x.d.id+'" data-t="'+x.t.id+'" aria-label="Marcar '+esc(x.t.title)+' como concluído" title="Marcar como concluído">'+stIcon('todo')+'</button><div><div class="t">'+esc(x.t.title)+'</div><div class="meta"><span><i class="dot"></i> '+esc(x.d.name)+'</span><span class="when">'+when(x.at)+'</span>'+(lead?'<span>'+lead.replace(' · ','')+'</span>':'')+'</div></div><button class="iconbtn" data-act="edit-topic" data-d="'+x.d.id+'" data-t="'+x.t.id+'" aria-label="Editar assunto">'+I.edit+'</button></li>';
    }).join('')+'</ul></div>';
  }).join('');
}
function renderChips(){
  $('#chips').innerHTML='<button class="chip" data-act="sel-disc" data-id="" aria-pressed="'+(!ui.disc)+'">Todas</button>'+state.disciplines.map(function(d){
    return '<button class="chip" style="--c:'+d.color+'" data-act="sel-disc" data-id="'+d.id+'" aria-pressed="'+(ui.disc===d.id)+'"><i class="dot"></i>'+esc(d.name)+'</button>';
  }).join('');
  $$('[data-act="st-filter"]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===ui.status))});
}
function topicsOf(d){
  var q=ui.q.trim().toLowerCase();
  return d.topics.filter(function(t){return (ui.status==='all'||t.status===ui.status)&&(!q||t.title.toLowerCase().indexOf(q)>=0)});
}
function renderCards(){
  if(!state.disciplines.length){$('#cards').innerHTML='<div class="empty" style="grid-column:1/-1"><p>Comece cadastrando uma disciplina, com cor e horários de estudo.</p><button class="btn primary" data-act="new-disc">Nova disciplina</button></div>';return}
  var filtering=ui.status!=='all'||ui.q.trim();
  var html=state.disciplines.filter(visible).map(function(d){
    var f=topicsOf(d);
    if(filtering&&!f.length)return '';
    var p=pctOf(d.topics),done=d.topics.filter(function(t){return t.status==='done'}).length;
    var shown=ui.exp[d.id]?f:f.slice(0,6);
    var sess=d.sessions.slice().sort(function(a,b){return a.day-b.day||toMin(a.start)-toMin(b.start)}).map(function(s){return '<span>'+DAYS[s.day]+' '+s.start+'–'+s.end+'</span>'}).join('');
    var list=shown.map(function(t){
      var at=t.remindAt?new Date(t.remindAt):null,over=at&&t.status!=='done'&&at<new Date();
      return '<li class="tp s-'+t.status+'"><button class="stb st-'+t.status+'" data-act="cycle" data-d="'+d.id+'" data-t="'+t.id+'" aria-label="'+esc(t.title)+': '+STATUS[t.status]+'. Alterar status" title="'+STATUS[t.status]+' (clique para alterar)">'+stIcon(t.status)+'</button><div><div class="t">'+esc(t.title)+'</div>'+(at?'<div class="meta">'+I.bell+'<span'+(over?' style="color:var(--crit);font-weight:600"':'')+'>'+when(at)+(over?' · atrasado':'')+'</span></div>':'')+'</div><button class="iconbtn" data-act="edit-topic" data-d="'+d.id+'" data-t="'+t.id+'" aria-label="Editar '+esc(t.title)+'">'+I.edit+'</button></li>';
    }).join('');
    return '<article class="dc" style="--c:'+d.color+'"><div class="dh"><h3><i class="dot"></i>'+esc(d.name)+'</h3><div class="pc">'+p+'<small>%</small></div></div><div><div class="track"><div class="fill" style="width:'+p+'%"></div></div><div class="meta" style="margin-top:6px">'+done+' de '+d.topics.length+' assuntos concluídos</div></div>'
      +(sess?'<div class="sess">'+sess+'</div>':'<p class="meta">Sem horários cadastrados</p>')
      +(shown.length?'<ul class="tps">'+list+'</ul>':'<p class="meta">'+(d.topics.length?'Nenhum assunto neste filtro.':'Nenhum assunto ainda.')+'</p>')
      +'<div class="cfoot"><button class="btn sm" data-act="new-topic" data-d="'+d.id+'">'+I.plus+'Assunto</button><button class="btn sm ghost" data-act="edit-disc" data-id="'+d.id+'">'+I.edit+'Editar</button>'+(f.length>6?'<button class="btn sm ghost" data-act="more" data-id="'+d.id+'">'+(ui.exp[d.id]?'Mostrar menos':'Ver todos ('+f.length+')')+'</button>':'')+'</div></article>';
  }).join('');
  $('#cards').innerHTML=html||'<div class="empty" style="grid-column:1/-1"><p>Nenhum assunto encontrado com esses filtros.</p></div>';
}
function renderFoot(){
  var f=$('#foot');
  f.className='foot'+(storageOk?'':' warn');
  f.textContent=storageOk?'Os dados ficam salvos neste navegador. Os avisos tocam enquanto esta página estiver aberta.':'Este navegador não permite salvar dados: o que você cadastrar vale só até fechar a página. Use Backup para guardar uma cópia.';
}
function renderAll(){renderToday();renderBanner();renderStrip();renderOverview();renderBars();renderWeek();renderReminders();renderChips();renderCards();renderFoot()}
function renderLive(){renderStrip();renderWeek();renderReminders()}
function commit(){save();renderAll()}

/* ---------- avisos ---------- */
var actx=null;
function unlockAudio(){try{if(!actx){var AC=window.AudioContext||window.webkitAudioContext;if(AC)actx=new AC()}if(actx&&actx.state==='suspended')actx.resume()}catch(e){}}
function beep(){
  if(!state.sound)return;
  try{
    unlockAudio();if(!actx)return;
    var t=actx.currentTime;
    [[880,0],[1175,0.18]].forEach(function(p){
      var o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.value=p[0];
      g.gain.setValueAtTime(0.0001,t+p[1]);g.gain.linearRampToValueAtTime(0.18,t+p[1]+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+p[1]+0.35);
      o.connect(g);g.connect(actx.destination);o.start(t+p[1]);o.stop(t+p[1]+0.4);
    });
  }catch(e){}
}
function osNotify(title,body){
  try{if('Notification' in window&&Notification.permission==='granted')new Notification(title,{body:body,tag:'mapa-estudos'})}catch(e){}
}
function trimToasts(){var ts=$$('#toasts .toast');while(ts.length>4){ts.shift().remove()}}
function note(msg){
  var el=document.createElement('div');el.className='toast note';el.textContent=msg;$('#toasts').appendChild(el);trimToasts();
  setTimeout(function(){el.remove()},3500);
}
function showAlert(o){
  var el=document.createElement('div');el.className='toast';el.style.setProperty('--c',o.color||'var(--muted)');
  if(o.d)el.dataset.d=o.d;if(o.t)el.dataset.t=o.t;
  el.innerHTML='<div class="th"><i class="dot"></i>'+esc(o.head)+'</div><div class="tb">'+esc(o.title)+'</div>'+(o.meta?'<div class="meta">'+esc(o.meta)+'</div>':'')
    +'<div class="ta">'+(o.t?'<button class="btn sm primary" data-act="toast-done">Concluir</button><button class="btn sm" data-act="toast-snooze">Adiar 10 min</button>':'')+(o.go?'<button class="btn sm primary" data-act="go-rem">Ver lembretes</button>':'')+'<button class="btn sm ghost" data-act="toast-close">Fechar</button></div>';
  $('#toasts').appendChild(el);trimToasts();
  if(o.sound!==false)beep();
  osNotify(o.head,o.title+(o.meta?' · '+o.meta:''));
}
function checkReminders(){
  var now=Date.now(),fresh=[],missed=[],changed=false;
  state.disciplines.forEach(function(d){d.topics.forEach(function(t){
    if(!t.remindAt||t.status==='done'||t.notified)return;
    var at=new Date(t.remindAt).getTime();if(isNaN(at))return;
    var fire=at-(t.lead||0)*60000;
    if(now<fire)return;
    t.notified=true;changed=true;
    (now-fire>30*60000?missed:fresh).push({d:d,t:t,at:new Date(at)});
  })});
  if(!changed)return;
  save();
  fresh.slice(0,3).forEach(function(x){showAlert({head:'Hora de estudar',title:x.t.title,meta:x.d.name+' · '+when(x.at),color:x.d.color,d:x.d.id,t:x.t.id})});
  if(fresh.length>3)showAlert({head:'Lembretes',title:(fresh.length-3)+' outros lembretes venceram agora',go:true,sound:false});
  if(missed.length)showAlert({head:'Lembretes perdidos',title:missed.length+(missed.length>1?' lembretes passaram':' lembrete passou')+' enquanto a página estava fechada',go:true,sound:!fresh.length});
  renderLive();
}

/* ---------- diálogos ---------- */
function openDlg(sel){var d=$(sel);if(d.showModal){if(!d.open)d.showModal()}else d.setAttribute('open','')}
function closeDlg(d){if(d.close)d.close();else d.removeAttribute('open')}
function arm(btn,label,fn){
  if(btn.dataset.armed){delete btn.dataset.armed;fn();return}
  var old=btn.textContent;btn.dataset.armed='1';btn.textContent=label;
  setTimeout(function(){if(btn.dataset.armed){delete btn.dataset.armed;btn.textContent=old}},4000);
}
var editDisc=null,sessN=0;
function addSessRow(s){
  var k=++sessN,row=document.createElement('div');row.className='srow';
  row.innerHTML='<select id="sd'+k+'" aria-label="Dia da semana">'+DAYS_FULL.map(function(n,i){return '<option value="'+i+'"'+(i===s.day?' selected':'')+'>'+n+'</option>'}).join('')+'</select><input type="time" id="ss'+k+'" value="'+s.start+'" aria-label="Início"><input type="time" id="se'+k+'" value="'+s.end+'" aria-label="Fim"><button type="button" class="iconbtn" data-rm aria-label="Remover horário">'+I.x+'</button>';
  $('#sessRows').appendChild(row);
}
function openDisc(id){
  editDisc=id||null;var d=id?find(id):null;
  $('#dDiscTitle').textContent=d?'Editar disciplina':'Nova disciplina';
  $('#dName').value=d?d.name:'';
  var col=d?d.color:COLORS[state.disciplines.length%COLORS.length];
  $('#dColors').innerHTML=COLORS.map(function(c,i){return '<label class="sw" style="--c:'+c+'"><input type="radio" name="dcolor" id="dc'+i+'" value="'+c+'"'+(c.toLowerCase()===col.toLowerCase()?' checked':'')+'><span title="'+COLOR_NAMES[i]+'"></span><em class="sr">'+COLOR_NAMES[i]+'</em></label>'}).join('');
  $('#sessRows').innerHTML='';
  (d?d.sessions:[{day:dayIdx(new Date()),start:'19:00',end:'20:00'}]).forEach(addSessRow);
  $('#dErr').hidden=true;$('#dDel').hidden=!d;
  openDlg('#dlgDisc');setTimeout(function(){$('#dName').focus()},30);
}
var editTopic=null;
function setRemind(v){$('#tRemind').value=v||''}
function openTopic(discId,topicId){
  if(!state.disciplines.length){note('Cadastre uma disciplina antes de adicionar assuntos.');openDisc();return}
  var d=discId?find(discId):null,t=d&&topicId?findT(d,topicId):null;
  editTopic=t?{d:d.id,t:t.id}:null;
  $('#dTopicTitle').textContent=t?'Editar assunto':'Novo assunto';
  $('#tDisc').innerHTML=state.disciplines.map(function(x){return '<option value="'+x.id+'">'+esc(x.name)+'</option>'}).join('');
  $('#tDisc').value=(d||(ui.disc&&find(ui.disc))||state.disciplines[0]).id;
  $('#tLead').innerHTML=LEADS.map(function(l){return '<option value="'+l[0]+'">'+l[1]+'</option>'}).join('');
  $('#tTitle').value=t?t.title:'';
  $('#tStatus').value=t?t.status:'todo';
  setRemind(t?t.remindAt:'');
  $('#tLead').value=String(t?t.lead:0);
  $('#tNotes').value=t?t.notes:'';
  $('#tErr').hidden=true;$('#tDel').hidden=!t;
  openDlg('#dlgTopic');setTimeout(function(){$('#tTitle').focus()},30);
}
function osLabel(){
  if(!('Notification' in window))return 'unsupported';
  try{return Notification.permission}catch(e){return 'unsupported'}
}
function renderAlertsDlg(){
  var s=osLabel(),txt,action='';
  if(s==='granted')txt='Ativadas';
  else if(s==='denied')txt='Bloqueadas pelo navegador';
  else if(s==='default'){txt='Desativadas';action='<button type="button" class="btn sm" data-act="ask-os">Ativar</button>'}
  else txt='Indisponíveis nesta página';
  $('#alertsBody').innerHTML='<p class="note-t">No horário do lembrete (menos a antecedência escolhida), aparece um aviso no canto da tela. Os avisos funcionam enquanto esta página estiver aberta, mesmo em outra aba.</p>'
   +'<div class="kv"><span>Notificações do navegador</span><span style="display:flex;gap:8px;align-items:center"><span class="meta">'+txt+'</span>'+action+'</span></div>'
   +'<div class="kv"><label for="aSound" style="margin:0;font-size:14px;color:var(--fg)">Tocar som nos avisos</label><input type="checkbox" id="aSound"'+(state.sound?' checked':'')+'></div>'
   +'<div class="kv"><span>Ver como funciona</span><button type="button" class="btn sm" data-act="test-alert">Testar aviso</button></div>';
}

/* ---------- eventos ---------- */
document.addEventListener('pointerdown',unlockAudio,{once:true});
document.addEventListener('click',function(e){
  var t=e.target;
  if(t.tagName==='DIALOG'){closeDlg(t);return}
  var cl=t.closest('[data-close]');if(cl){closeDlg(cl.closest('dialog'));return}
  var rm=t.closest('[data-rm]');if(rm){rm.closest('.srow').remove();return}
  var q=t.closest('[data-q]');
  if(q){
    var v=q.dataset.q;
    if(v==='clear'){setRemind('');return}
    var p=v.split(','),d=new Date();d.setDate(d.getDate()+(+p[0]));d.setHours(+p[1],0,0,0);setRemind(toLocalInput(d));return;
  }
  var b=t.closest('[data-act]');if(!b)return;
  var a=b.dataset.act,did=b.dataset.d,tid=b.dataset.t,d1,t1,toast;
  switch(a){
    case 'new-disc':openDisc();break;
    case 'edit-disc':openDisc(b.dataset.id);break;
    case 'new-topic':openTopic(did||null,null);break;
    case 'edit-topic':openTopic(did,tid);break;
    case 'sel-disc':ui.disc=b.dataset.id&&ui.disc!==b.dataset.id?b.dataset.id:null;renderBars();renderWeek();renderReminders();renderChips();renderCards();break;
    case 'st-filter':ui.status=b.dataset.v;renderChips();renderCards();break;
    case 'week-view':ui.week=b.dataset.v;renderWeek();break;
    case 'more':ui.exp[b.dataset.id]=!ui.exp[b.dataset.id];renderCards();break;
    case 'cycle':d1=find(did);t1=findT(d1,tid);if(t1){t1.status=NEXT[t1.status];commit()}break;
    case 'complete':d1=find(did);t1=findT(d1,tid);if(t1){t1.status='done';commit();note('Concluído: '+t1.title)}break;
    case 'go-rem':$('#remPanel').scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'hide-banner':state.hideBanner=true;save();renderBanner();break;
    case 'clear-example':state.disciplines=state.disciplines.filter(function(d){return !d.ex});ui.disc=null;commit();break;
    case 'alerts':renderAlertsDlg();openDlg('#dlgAlerts');break;
    case 'ask-os':
      try{var r=Notification.requestPermission();if(r&&r.then)r.then(renderAlertsDlg);else renderAlertsDlg()}catch(err){renderAlertsDlg()}
      break;
    case 'test-alert':showAlert({head:'Hora de estudar',title:'Assim aparece um aviso',meta:'Teste · agora',color:'var(--ink)'});break;
    case 'backup':$('#bOut').value=JSON.stringify(state,null,1);$('#bIn').value='';$('#bErr').hidden=true;openDlg('#dlgBackup');break;
    case 'toast-close':b.closest('.toast').remove();break;
    case 'toast-done':toast=b.closest('.toast');d1=find(toast.dataset.d);t1=findT(d1,toast.dataset.t);if(t1){t1.status='done';commit()}toast.remove();break;
    case 'toast-snooze':toast=b.closest('.toast');d1=find(toast.dataset.d);t1=findT(d1,toast.dataset.t);if(t1){t1.remindAt=toLocalInput(new Date(Date.now()+10*60000));t1.lead=0;t1.notified=false;commit();note('Adiado por 10 minutos')}toast.remove();break;
  }
});
document.addEventListener('change',function(e){
  if(e.target.id==='aSound'){state.sound=e.target.checked;save();if(state.sound)beep()}
});
$('#q').addEventListener('input',function(e){ui.q=e.target.value;renderCards()});
$('#addSess').addEventListener('click',function(){addSessRow({day:dayIdx(new Date()),start:'19:00',end:'20:00'})});

$('#fDisc').addEventListener('submit',function(e){
  e.preventDefault();
  var err=$('#dErr'),name=$('#dName').value.trim();
  if(!name){err.textContent='Informe o nome da disciplina.';err.hidden=false;$('#dName').focus();return}
  var sessions=[],bad=false;
  $$('#sessRows .srow').forEach(function(r){
    var sel=r.querySelector('select'),ins=r.querySelectorAll('input'),a=ins[0].value,b=ins[1].value;
    if(!a||!b||toMin(b)<=toMin(a)){bad=true;return}
    sessions.push({id:uid(),day:+sel.value,start:a,end:b});
  });
  if(bad){err.textContent='Em cada horário, o fim precisa ser depois do início.';err.hidden=false;return}
  var chosen=document.querySelector('input[name="dcolor"]:checked'),d=editDisc?find(editDisc):null;
  var color=chosen?chosen.value:(d?d.color:COLORS[0]);
  if(d){d.name=name;d.color=color;d.sessions=sessions;d.ex=false}
  else state.disciplines.push({id:uid(),name:name,color:color,sessions:sessions,topics:[]});
  closeDlg($('#dlgDisc'));commit();
});
$('#dDel').addEventListener('click',function(e){
  arm(e.currentTarget,'Confirmar exclusão',function(){
    state.disciplines=state.disciplines.filter(function(d){return d.id!==editDisc});
    if(ui.disc===editDisc)ui.disc=null;
    closeDlg($('#dlgDisc'));commit();
  });
});
$('#fTopic').addEventListener('submit',function(e){
  e.preventDefault();
  var err=$('#tErr'),title=$('#tTitle').value.trim();
  if(!title){err.textContent='Informe o assunto.';err.hidden=false;$('#tTitle').focus();return}
  var rem=$('#tRemind').value||null,lead=+$('#tLead').value,status=$('#tStatus').value,notes=$('#tNotes').value.trim(),target=find($('#tDisc').value);
  if(!target)return;
  var t=null;
  if(editTopic){
    var src=find(editTopic.d);t=findT(src,editTopic.t);
    if(t&&src!==target){src.topics=src.topics.filter(function(x){return x!==t});target.topics.push(t)}
  }
  var changed=!t||t.remindAt!==rem||t.lead!==lead;
  if(!t){t={id:uid()};target.topics.push(t)}
  t.title=title;t.status=status;t.notes=notes;t.remindAt=rem;t.lead=lead;
  if(changed)t.notified=false;
  closeDlg($('#dlgTopic'));commit();
  checkReminders();
});
$('#tDel').addEventListener('click',function(e){
  arm(e.currentTarget,'Confirmar exclusão',function(){
    var d=find(editTopic.d);if(d)d.topics=d.topics.filter(function(t){return t.id!==editTopic.t});
    closeDlg($('#dlgTopic'));commit();
  });
});
$('#bCopy').addEventListener('click',function(){
  var ta=$('#bOut');
  function sel(){ta.focus();ta.select();note('Texto selecionado. Use Ctrl+C para copiar.')}
  try{navigator.clipboard.writeText(ta.value).then(function(){note('Backup copiado')},sel)}catch(err){sel()}
});
$('#fBackup').addEventListener('submit',function(e){
  e.preventDefault();
  var err=$('#bErr'),raw=$('#bIn').value.trim();
  if(!raw){err.textContent='Cole o texto do backup no campo de importação.';err.hidden=false;return}
  try{
    var s=normalize(JSON.parse(raw));
    if(!s)throw new Error('formato');
    state=s;ui.disc=null;closeDlg($('#dlgBackup'));commit();note('Backup importado');
  }catch(x){err.textContent='Não consegui ler esse texto. Cole exatamente o conteúdo exportado.';err.hidden=false}
});

/* ---------- início ---------- */
$$('[data-i]').forEach(function(el){el.innerHTML=I[el.dataset.i]||''});
state=load();
save();
renderAll();
checkReminders();
setInterval(checkReminders,15000);
setInterval(renderLive,60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){checkReminders();renderLive()}});
})();
