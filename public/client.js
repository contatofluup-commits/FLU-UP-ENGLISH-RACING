(()=>{'use strict';
const $=id=>document.getElementById(id),socket=io(),canvas=$('track'),ctx=canvas.getContext('2d');
let role='',self='',room='',state=null,finished=false,lane=0;
const show=(id)=>{for(const key of ['entry','lobby','race'])$(key).classList.toggle('hidden',key!==id)};
const alert=(msg)=>{$('alert').textContent=msg;$('alert').classList.remove('hidden')};
const h=(text)=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
socket.on('connect',()=>{$('connection').textContent='🟢 Online';const url=new URL(location.href);if(!role&&url.searchParams.get('room')){$('studentTab').click();$('roomCode').value=url.searchParams.get('room').toUpperCase()}});
socket.on('disconnect',()=>{$('connection').textContent='🔴 Sem conexão';$('raceInfo').textContent='Conexão interrompida. Recarregue e entre numa nova sala se necessário.'});
socket.on('notice',m=>alert(m.error));
$('teacherTab').onclick=()=>{$('teacherForm').classList.remove('hidden');$('studentForm').classList.add('hidden')};
$('studentTab').onclick=()=>{$('studentForm').classList.remove('hidden');$('teacherForm').classList.add('hidden')};
$('create').onclick=()=>socket.emit('createRoom',{level:$('level').value},r=>{if(!r.ok)return alert(r.error);role='host';room=r.code;setRoom();});
$('join').onclick=()=>socket.emit('joinRoom',{code:$('roomCode').value,name:$('name').value},r=>{if(!r.ok)return alert(r.error);role='player';self=r.playerId;room=r.code;setRoom();});
function setRoom(){$('code').textContent=room;const url=new URL(location.href);url.searchParams.set('room',room);$('shareLink').value=url.toString();show('lobby');}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('shareLink').value);$('copy').textContent='✅ Link copiado'}catch(e){$('shareLink').select();$('copy').textContent='Selecione e copie o link'}};
$('start').onclick=()=>socket.emit('startRace');$('restart').onclick=()=>socket.emit('restartRace');
socket.on('state',s=>{if(!room||s.code!==room)return;state=s;$('clock').textContent=String(Math.floor(s.seconds/60)).padStart(2,'0')+':'+String(s.seconds%60).padStart(2,'0');
 if(s.phase==='lobby'){finished=false;show('lobby');$('lobbyPlayers').innerHTML=s.players.map(p=>`<div class="pill"><span class="dot" style="background:${p.color}"></span> ${h(p.name)}</div>`).join('')||'<span class="muted">Ninguém entrou ainda</span>';$('start').classList.toggle('hidden',role!=='host'||s.players.length===0);$('lobbyNote').textContent=`${s.players.length}/4 pilotos • nível: ${s.level}`;$('restart').classList.add('hidden');$('results').textContent='';}
 else{show('race');$('steering').classList.toggle('hidden',role!=='player');$('questionBox').classList.toggle('hidden',role==='host');let ranking=[...s.players].sort((a,b)=>b.progress-a.progress);$('board').innerHTML=ranking.map((p,i)=>`<div class="score"><strong>${i+1}º</strong><span class="dot" style="background:${p.color}"></span><b>${h(p.name)}</b><small>${Math.min(100,Math.floor(p.progress/s.goal*100))}% • volta ${Math.min(2,Math.floor(p.progress/(s.goal/2))+1)}/2 • ${p.progress}/${s.goal} desafios • ✅ ${p.correct} / ❌ ${p.wrong}</small></div>`).join('');$('status').textContent=s.phase==='finished'?'🏁 CORRIDA FINALIZADA':`🏎️ 🏁 2 VOLTAS • ${Math.max(0,s.limit-s.seconds)}s restantes • PRIMEIRO A CHEGAR VENCE`;if(s.phase==='finished'){$('results').textContent='🏆 Vencedor: '+(s.winner||'Sem vencedor')+' • Pódio: '+ranking.slice(0,3).map((p,i)=>`${i+1}º ${p.name} (${p.correct} acertos)`).join(' | ');$('restart').classList.toggle('hidden',role!=='host');$('prompt').textContent='🏁 Race finished!';$('answers').innerHTML='';finished=true;}}});
socket.on('question',q=>{if(finished)return;$('category').textContent=q.category+' • '+q.level+' • QUESTÃO '+q.number;$('prompt').textContent=q.pt;$('feedback').textContent='Escolha a tradução correta para ativar o turbo!';$('answers').innerHTML='';q.options.forEach((option,i)=>{const b=document.createElement('button');b.className='answer';b.textContent=String.fromCharCode(65+i)+'. '+option;b.onclick=()=>{socket.emit('answer',{choice:option});[...$('answers').children].forEach(x=>x.disabled=true)};$('answers').append(b)})});
socket.on('feedback',data=>{$('feedback').textContent=data.correct?'✅ CORRECT! TURBO ACTIVATED ⚡':'❌ TRY AGAIN! Correto: '+data.answer});
function move(d){if(role!=='player'||!state||state.phase!=='running')return;lane=Math.min(38,Math.max(-38,lane+d*15));socket.emit('steer',{lane});}
$('left').onclick=()=>move(-1);$('right').onclick=()=>move(1);
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();move(-1)}if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();move(1)}if('123'.includes(e.key)&&e.key.length===1){const b=$('answers').children[Number(e.key)-1];if(b&&!b.disabled)b.click()}});
// Original Formula-inspired Grand Prix circuit: a winding road, not an oval.
// All cars follow the same arc-length sampled spline and the first to finish wins.
const knots=[[158,370],[110,320],[105,230],[165,158],[284,142],[336,193],[317,270],[376,318],[472,297],[508,222],[484,145],[547,103],[669,122],[758,192],[796,288],[766,387],[681,447],[564,443],[502,395],[429,417],[318,471],[218,446]];
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
const raw=[];
for(let i=0;i<knots.length;i++){
 const a=knots[(i-1+knots.length)%knots.length],b=knots[i],c=knots[(i+1)%knots.length],d=knots[(i+2)%knots.length];
 for(let j=0;j<28;j++){const t=j/28;raw.push({x:cat(a[0],b[0],c[0],d[0],t),y:cat(a[1],b[1],c[1],d[1],t)})}
}
let cumulative=[0];for(let i=1;i<=raw.length;i++){let a=raw[i-1],b=raw[i%raw.length];cumulative.push(cumulative[i-1]+Math.hypot(b.x-a.x,b.y-a.y))}const length=cumulative[cumulative.length-1];
function point(frac,laneShift=0){let d=((frac%1)+1)%1*length,lo=0,hi=raw.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid+1]<d)lo=mid+1;else hi=mid}let i=lo,a=raw[i],b=raw[(i+1)%raw.length],dt=cumulative[i+1]-cumulative[i]||1,t=(d-cumulative[i])/dt,dx=(b.x-a.x)/dt,dy=(b.y-a.y)/dt;return{x:a.x+(b.x-a.x)*t-dy*laneShift,y:a.y+(b.y-a.y)*t+dx*laneShift,angle:Math.atan2(dy,dx)}}
function road(stroke,width,dash=[]){ctx.beginPath();ctx.moveTo(raw[0].x,raw[0].y);for(let i=1;i<raw.length;i++)ctx.lineTo(raw[i].x,raw[i].y);ctx.closePath();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])}
function scenery(){let bg=ctx.createLinearGradient(0,0,900,570);bg.addColorStop(0,'#166447');bg.addColorStop(1,'#258b61');ctx.fillStyle=bg;ctx.fillRect(0,0,900,570);
 // grass texture, trees, safety walls and spectator stands
 for(let i=0;i<160;i++){let x=(i*137+45)%900,y=(i*219+17)%570;ctx.fillStyle=i%3?'#2e9c68':'#178256';ctx.fillRect(x,y,3+i%3,8)}
 for(const [x,y] of [[35,60],[78,485],[867,490],[863,58],[412,62],[49,384],[707,522],[611,23],[435,533]]){ctx.fillStyle='#0b473a';ctx.beginPath();ctx.ellipse(x+4,y+5,17,12,0,0,7);ctx.fill();ctx.fillStyle='#37b778';ctx.beginPath();ctx.arc(x,y,15,0,7);ctx.fill();ctx.fillStyle='#79d997';ctx.beginPath();ctx.arc(x-5,y-5,7,0,7);ctx.fill()}
 ctx.fillStyle='#102548';ctx.fillRect(6,8,260,55);ctx.fillStyle='#fff';ctx.font='900 19px system-ui';ctx.fillText('FLU UP GRAND PRIX',20,34);ctx.fillStyle='#8abaff';ctx.font='bold 12px system-ui';ctx.fillText('ENGLISH SCHOOL • RACE DAY',20,52);
 ctx.fillStyle='#193453';ctx.fillRect(671,15,216,47);ctx.fillStyle='#ffde77';ctx.font='900 17px system-ui';ctx.fillText('🏁 2 LAP SPRINT',682,44);
 ctx.fillStyle='#132e49';ctx.fillRect(16,520,222,35);ctx.font='bold 13px system-ui';ctx.fillStyle='#ffe38e';ctx.fillText('⚡ CORRECT ANSWER = TURBO',24,542);
}
function finish(){const p=point(0),span=57;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);for(let x=-7;x<7;x++)for(let y=-span/2;y<span/2;y+=8){ctx.fillStyle=(Math.floor((x+7)/7)+Math.floor((y+span/2)/8))%2?'#151a29':'#fff';ctx.fillRect(x,y,7,8)}ctx.restore();ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle='#fff';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('START / FINISH',-2,-47);ctx.restore();}
function circuit(){road('#113f3b',93);road('#e7e8ed',78);road('#ed4c69',71,[17,14]);road('#343a4c',61);road('#4a5062',51);road('#b3b8c3',2,[12,17]);finish();
 // Infield sponsor decals
 ctx.fillStyle='#eaf7ff';ctx.font='900 24px system-ui';ctx.textAlign='center';ctx.fillText('FLU UP',625,351);ctx.fillStyle='#ffde7a';ctx.font='bold 13px system-ui';ctx.fillText('LEARN • RACE • WIN',625,370);ctx.textAlign='left';}
let drawn=new Map();
function car(p,pt){ctx.save();ctx.translate(pt.x,pt.y);ctx.rotate(pt.angle+Math.PI/2);ctx.fillStyle='#151a28';for(let x of [-13,13])for(let y of [-15,12])ctx.fillRect(x-5,y-5,10,12);ctx.fillStyle=p.color;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-12,-20,24,40,6);ctx.fill();ctx.stroke();ctx.fillStyle='#12243c';ctx.fillRect(-8,-7,16,11);ctx.fillStyle='#d9f9ff';ctx.fillRect(-5,-15,10,6);ctx.fillStyle='#121a2d';ctx.fillRect(-16,15,32,5);ctx.restore();ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#0d2038';ctx.strokeText(p.name,pt.x,pt.y-27);ctx.fillStyle='#fff';ctx.fillText(p.name,pt.x,pt.y-27);ctx.textAlign='left'}
function draw(){scenery();circuit();if(state){for(const p of state.players){const target=p.progress/(state.goal||24)*2,prev=drawn.has(p.id)?drawn.get(p.id):target;const current=prev+(target-prev)*.055;drawn.set(p.id,current);const pt=point(Math.min(current,1.999999),p.id===self?lane:p.lane);car(p,pt)}}requestAnimationFrame(draw)}draw();
})();
