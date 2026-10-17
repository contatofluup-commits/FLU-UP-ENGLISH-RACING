'use strict';
const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const crypto=require('crypto');
const questions=require('./questions.json');
const app=express();const server=http.createServer(app);
const io=new Server(server,{cors:{origin:false}});
app.use(express.static('public'));
app.get('/health',(req,res)=>res.json({ok:true,rooms:rooms.size}));
const rooms=new Map();const colors=['#348bff','#ef4d70','#ffd15b','#48ddc0'];
const LEVELS=['A1','A2','B1','B2'];
const code=()=>crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const cleanName=s=>String(s||'Student').trim().slice(0,20).replace(/[<>]/g,'')||'Student';
const error=(socket,msg)=>socket.emit('notice',{error:msg});
const visible=r=>({code:r.code,phase:r.phase,level:r.level,goal:r.goal,limit:r.limit,hostOnline:!!r.host,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,color:p.color,progress:p.progress,lane:p.lane,correct:p.correct,wrong:p.wrong,connected:p.connected,finishedAt:p.finishedAt})),seconds:Math.floor(r.elapsed),winner:r.winner});
const publish=r=>io.to(r.code).emit('state',visible(r));
const getRoom=(socket)=>rooms.get(socket.data.room);
const pool=(level)=>questions.filter(q=>level==='MIX'||q.level===level);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function ask(socket,p,r){let list=pool(r.level);if(!list.length)return;let remaining=list.filter((_,i)=>!p.used.has(i));if(!remaining.length){p.used.clear();remaining=list;}let choices=[];for(let i=0;i<list.length;i++)if(!p.used.has(i))choices.push(i);const idx=choices[crypto.randomInt(choices.length)];p.used.add(idx);let q=list[idx];p.question={answer:q.ok,issued:Date.now()};socket.emit('question',{pt:q.pt,level:q.level,category:q.category,options:shuffle([...q.options]),number:p.correct+p.wrong+1,total:list.length});}
function leave(socket){const r=getRoom(socket);if(!r)return;socket.leave(r.code);if(socket.data.role==='host'){if(r.host===socket.id)r.host=null;}else{const p=r.players.get(socket.data.playerId);if(p&&p.socketId===socket.id){p.connected=false;p.socketId=null;if(r.phase==='lobby')r.players.delete(p.id);}}socket.data.room=null;socket.data.role=null;publish(r);if(!r.host&&![...r.players.values()].some(p=>p.connected)){rooms.delete(r.code);}}
io.on('connection',socket=>{
 socket.on('createRoom',(data={},reply=()=>{})=>{leave(socket);let id=code();while(rooms.has(id))id=code();let level=LEVELS.includes(data.level)||data.level==='MIX'?data.level:'MIX';let r={code:id,host:socket.id,players:new Map(),phase:'lobby',level,elapsed:0,winner:null,goal:24,limit:420,lastTick:Date.now()};rooms.set(id,r);socket.join(id);socket.data.room=id;socket.data.role='host';reply({ok:true,code:id});publish(r);});
 socket.on('joinRoom',(data={},reply=()=>{})=>{const id=String(data.code||'').trim().toUpperCase();const r=rooms.get(id);if(!r)return reply({ok:false,error:'Sala não encontrada. Confira o código.'});if(r.phase!=='lobby')return reply({ok:false,error:'Corrida já começou. Aguarde a próxima.'});if(r.players.size>=4)return reply({ok:false,error:'A sala já tem quatro alunos.'});leave(socket);const pid=crypto.randomUUID();const p={id:pid,socketId:socket.id,connected:true,name:cleanName(data.name),color:colors[[...r.players.values()].length],progress:0,lane:0,boostUntil:0,slowUntil:0,correct:0,wrong:0,used:new Set(),question:null,finishedAt:null};r.players.set(pid,p);socket.join(id);socket.data.room=id;socket.data.role='player';socket.data.playerId=pid;reply({ok:true,code:id,playerId:pid});publish(r);});
 socket.on('startRace',()=>{const r=getRoom(socket);if(!r||r.host!==socket.id||r.phase!=='lobby')return;if(!r.players.size)return error(socket,'Espere pelo menos um aluno entrar.');r.phase='running';r.elapsed=0;r.lastTick=Date.now();for(const p of r.players.values()){const s=io.sockets.sockets.get(p.socketId);if(s)ask(s,p,r);}publish(r);});
 socket.on('answer',(payload={})=>{const r=getRoom(socket);if(!r||r.phase!=='running'||socket.data.role!=='player')return;const p=r.players.get(socket.data.playerId);if(!p||p.socketId!==socket.id||!p.question)return;const q=p.question;p.question=null;const yes=String(payload.choice||'')===q.answer;const now=Date.now();if(yes){p.correct++;p.boostUntil=now+1800;p.progress=Math.min(r.goal,p.progress+1);}else{p.wrong++;p.slowUntil=now+1000;}socket.emit('feedback',{correct:yes,answer:q.answer});if(p.progress>=r.goal&&p.finishedAt===null){p.finishedAt=r.elapsed;if(!r.winner)r.winner=p.name;r.phase='finished';publish(r);return;}setTimeout(()=>{if(r.phase==='running'&&p.connected&&p.socketId===socket.id)ask(socket,p,r);},950);publish(r);});
 socket.on('steer',(payload={})=>{const r=getRoom(socket);if(!r||r.phase!=='running')return;const p=r.players.get(socket.data.playerId);if(!p||p.socketId!==socket.id)return;const v=Number(payload.lane);if(Number.isFinite(v))p.lane=Math.max(-38,Math.min(38,v));});
 socket.on('restartRace',()=>{const r=getRoom(socket);if(!r||r.host!==socket.id)return;r.phase='lobby';r.elapsed=0;r.winner=null;for(const p of r.players.values()){p.progress=0;p.used=new Set();p.lane=0;p.correct=0;p.wrong=0;p.question=null;p.finishedAt=null;p.boostUntil=0;p.slowUntil=0;}publish(r);});
 socket.on('disconnect',()=>leave(socket));
});
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){if(r.phase!=='running')continue;const dt=Math.min(.2,Math.max(0,(now-r.lastTick)/1000));r.lastTick=now;r.elapsed+=dt;if(r.elapsed>=r.limit){r.phase='finished';const ranking=[...r.players.values()].sort((a,b)=>b.progress-a.progress||b.correct-a.correct||a.wrong-b.wrong);r.winner=ranking[0]?.progress>0?ranking[0].name:null;}publish(r);}},200);
const PORT=Number(process.env.PORT)||3000;server.listen(PORT,'0.0.0.0',()=>console.log('Flu Up Racing em http://localhost:'+PORT));
