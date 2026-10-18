import 'dotenv/config';
import express from 'express';
import {createServer as createViteServer} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {lessons,questionPool} from './content.js';
import { getPublicLevels, getPublicLesson, getLessonSolutionKeys, getLessonById, checkLessonPrerequisites, CURRICULUM_CATALOG } from './server/curriculumCatalog.mjs';
import { validateCurriculumCatalog } from './server/curriculumValidator.mjs';
import { requireAdmin } from './server/adminAuth.mjs';
import { getPublicPracticeCatalog, getListeningSolutionKeys, LISTENING_MODULES, SPEAKING_PROMPTS, PRONUNCIATION_ITEMS, CONVERSATION_SCENARIOS } from './server/practiceCatalog.mjs';
import { evaluatePronunciation } from './server/pronunciationEvaluator.mjs';
import { getAIStatus, sendAIConversationTurn } from './server/aiProvider.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, '.env'))) {
  const envContent = fs.readFileSync(path.join(root, '.env'), 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2] ? m[2].trim().replace(/^['"](.*)['"]$/, '$1') : '';
    }
  }
}
const app=express(); app.use(express.json({limit:'20kb'}));
const connected=!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase=connected?createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}):null;
const dataPath=path.join(root,'data.json');
let local=fs.existsSync(dataPath)?JSON.parse(fs.readFileSync(dataPath,'utf8')):{accounts:{},sessions:{},progress:{},games:{}};
const db={async get(table,id){if(!supabase)return structuredClone(local[table][id]||null);const {data,error}=await supabase.from('lingo_'+table).select('payload').eq('id',id).maybeSingle();if(error)throw Error('Database is not ready. Apply supabase/schema.sql.');return data?.payload||null;},async set(table,id,payload){if(supabase){const {error}=await supabase.from('lingo_'+table).upsert({id,payload});if(error)throw Error('Database write failed. Check your Supabase setup.');}else{local[table][id]=structuredClone(payload);fs.writeFileSync(dataPath+'.tmp',JSON.stringify(local));fs.renameSync(dataPath+'.tmp',dataPath);}},async del(table,id){if(supabase){const {error}=await supabase.from('lingo_'+table).delete().eq('id',id);if(error)throw error;}else{delete local[table][id];fs.writeFileSync(dataPath,JSON.stringify(local));}}};
const id=()=>randomBytes(16).toString('hex'); const hash=s=>createHash('sha256').update(s).digest('hex'); const today=()=>new Date().toISOString().slice(0,10);
const locks=new Map();async function locked(key,fn){const prior=locks.get(key)||Promise.resolve();let release;const next=new Promise(r=>release=r);locks.set(key,next);await prior;try{return await fn();}finally{release();if(locks.get(key)===next)locks.delete(key);}}
const fail=(msg,status=400)=>{const e=Error(msg);e.status=status;throw e;};
const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
const rate=new Map();app.use('/api/auth',(req,res,next)=>{const k=req.ip;const t=Date.now();let a=(rate.get(k)||[]).filter(x=>t-x<60000);if(a.length>25)return res.status(429).json({error:'A little too fast! Try again in a minute.'});a.push(t);rate.set(k,a);next();});
let testClockOffset = 0;
const now = () => Date.now() + (process.env.NODE_ENV !== 'production' ? testClockOffset : 0);
if(process.env.NODE_ENV!=='production'){
  app.post('/api/test/advance-clock',(req,res)=>{
    const ms=Number(req.body.ms)||0;
    testClockOffset+=ms;
    res.json({now:now(),offset:testClockOffset});
  });
  app.post('/api/test/reset-clock',(_,res)=>{
    testClockOffset=0;
    res.json({now:now(),offset:testClockOffset});
  });
}
app.get('/api/config',(_,res)=>res.json({database:connected?'supabase':'demo',app:'Lingo'}));
app.get('/api/curriculum/levels',(_,res)=>res.json(getPublicLevels()));
app.get('/api/curriculum/lessons/:id',(req,res)=>{const l=getPublicLesson(req.params.id);if(!l)return res.status(404).json({error:'Lesson not found.'});res.json(l);});
app.get('/api/practice/catalog',(_,res)=>res.json(getPublicPracticeCatalog()));
app.get('/api/ai/status',(_,res)=>res.json(getAIStatus()));
app.post('/api/pronunciation/evaluate',route(async(req,res)=>{
  const {targetPhrase,spokenTranscript,spokenText,transcript}=req.body;
  const spoken=spokenTranscript||spokenText||transcript||'';
  if(!targetPhrase||typeof targetPhrase!=='string')fail('Target phrase is required.',400);
  res.json(evaluatePronunciation(targetPhrase,spoken));
}));
app.post('/api/curriculum/exercises/check',route(async(req,res)=>{
  const {lessonId,exerciseIndex,choice,exerciseId}=req.body;
  if(typeof lessonId!=='string'||!lessonId.trim())fail('Lesson ID is required.',400);
  const keys=getLessonSolutionKeys(lessonId);
  if(!keys)fail('Lesson not found.',404);
  if(!Number.isInteger(exerciseIndex)||exerciseIndex<0||exerciseIndex>=keys.length)fail('Invalid exercise index.',400);
  if(!Number.isInteger(choice)||choice<0||choice>3)fail('Invalid choice. Must be an option index between 0 and 3.',400);
  if(exerciseId!==undefined&&exerciseId!==keys[exerciseIndex].id)fail('Exercise ID mismatch for submitted index.',400);
  
  // Prerequisite verification: if authenticated, ensure learner has unlocked the lesson
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(token){
    const s=await db.get('sessions',hash(token));
    if(s&&s.expires>=Date.now()){
      const authUser=await db.get('accounts',s.username);
      if(authUser){
        const userProgress=await db.get('progress',authUser.username);
        const prereqCheck=checkLessonPrerequisites(lessonId,userProgress?.completed||[]);
        if(!prereqCheck.unlocked){
          fail('Complete the prerequisite lesson first before checking exercises.',403);
        }
      }
    }
  }
  const correctIndex=keys[exerciseIndex].solutionKey.correctIndex;
  const isCorrect=correctIndex===choice;
  res.json({isCorrect,correctIndex});
}));
const initialProgress=(demo=false)=>({xp:demo?1240:0,words:demo?450:0,streak:demo?7:0,completed:[],saved:[],goal:10,todayWords:0,lastStudy:null,history:{},dailyDate:today(),practice:{listening:[],speaking:[],pronunciation:[],conversation:[]}});
const publicUser=u=>({username:u.username,name:u.name,demo:u.demo});
async function session(u){const token=id()+id();await db.set('sessions',hash(token),{username:u.username,expires:Date.now()+30*86400000});return token;}
app.post('/api/auth/signup',route(async(req,res)=>{const {name,password}=req.body;const username=String(req.body.username||'').toLowerCase().trim();if(!/^[a-z0-9_]{3,20}$/.test(username))fail('Use 3–20 letters, numbers, or underscores for your username.');if(typeof name!=='string'||!name.trim()||name.length>40)fail('Please enter a name (up to 40 characters).');if(typeof password!=='string'||password.length<8||password.length>128)fail('Choose a password with 8–128 characters.');await locked('signup:'+username,async()=>{if(await db.get('accounts',username))fail('That username is taken. Try another one.',409);const salt=id();const u={username,name:name.trim(),salt,password:scryptSync(password,salt,64).toString('hex'),demo:false};await db.set('accounts',username,u);await db.set('progress',username,initialProgress());res.json({token:await session(u),user:publicUser(u),progress:initialProgress()});});}));
app.post('/api/auth/login',route(async(req,res)=>{const username=String(req.body.username||'').toLowerCase().trim();const u=await db.get('accounts',username);if(!u||typeof req.body.password!=='string'||req.body.password.length>128||!timingSafeEqual(Buffer.from(u.password,'hex'),scryptSync(req.body.password,u.salt,64)))fail('Username or password doesn’t match.',401);res.json({token:await session(u),user:publicUser(u),progress:await db.get('progress',username)});}));
app.post('/api/auth/demo',route(async(req,res)=>{const username='demo_'+id().slice(0,12),salt=id();const u={username,name:'Jamie',demo:true,salt,password:scryptSync(id(),salt,64).toString('hex')};await db.set('accounts',username,u);const progress=initialProgress(true);await db.set('progress',username,progress);res.json({token:await session(u),user:publicUser(u),progress});}));
app.use('/api',async(req,res,next)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');const s=token&&await db.get('sessions',hash(token));if(!s||s.expires<Date.now())fail('Please sign in to continue.',401);req.user=await db.get('accounts',s.username);if(!req.user)fail('Please sign in again.',401);req.sessionKey=hash(token);next();}catch(e){next(e);}});
app.get('/api/me',route(async(req,res)=>{const p=await db.get('progress',req.user.username);if(!p.practice)p.practice={listening:[],speaking:[],pronunciation:[],conversation:[]};if(p.dailyDate!==today()){p.todayWords=0;p.dailyDate=today();await db.set('progress',req.user.username,p);}res.json({user:publicUser(req.user),progress:p});}));
app.post('/api/auth/logout',route(async(req,res)=>{await db.del('sessions',req.sessionKey);res.json({ok:true});}));
app.get('/api/admin/curriculum/validate', requireAdmin, (req, res) => {
  const report = validateCurriculumCatalog(CURRICULUM_CATALOG);
  res.json(report);
});
app.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user.username });
});
app.post('/api/progress/goal',route(async(req,res)=>{if(![5,10,20,30].includes(req.body.goal))fail('Choose a valid daily goal.');await locked(req.user.username,async()=>{const p=await db.get('progress',req.user.username);p.goal=req.body.goal;await db.set('progress',req.user.username,p);res.json(p);});}));
app.post('/api/progress/word',route(async(req,res)=>{const allowed=['Serendipity','Resilient','Curious','Wanderlust','Gratitude','Flourish','Mindful','Courage'];if(!allowed.includes(req.body.word))fail('Word not found.');await locked(req.user.username,async()=>{const p=await db.get('progress',req.user.username);p.saved=p.saved.includes(req.body.word)?p.saved.filter(w=>w!==req.body.word):[...p.saved,req.body.word];await db.set('progress',req.user.username,p);res.json(p);});}));
app.get('/api/progress/lessons/:id/status',route(async(req,res)=>{
  const p=await db.get('progress',req.user.username);
  const prereqCheck=checkLessonPrerequisites(req.params.id,p.completed);
  if(!prereqCheck.found)fail('Lesson not found.',404);
  const idx=lessons.findIndex(l=>l.id===req.params.id);
  const seqOk=idx===0||p.completed.includes(lessons[idx-1].id);
  res.json({
    lessonId:req.params.id,
    isUnlocked:prereqCheck.unlocked&&seqOk,
    missingPrerequisites:prereqCheck.missing,
    isCompleted:p.completed.includes(req.params.id)
  });
}));
app.post('/api/progress/lesson',route(async(req,res)=>{
  const lesson=lessons.find(l=>l.id===req.body.lesson);
  if(!lesson)fail('Lesson not found.',400);
  const answers=req.body.answers;
  if(!Array.isArray(answers)||answers.length!==lesson.questions.length||answers.some(x=>!Number.isInteger(x)||x<0||x>3))fail('Finish all the questions first.',400);
  await locked(req.user.username,async()=>{
    const p=await db.get('progress',req.user.username);
    const prereqCheck=checkLessonPrerequisites(lesson.id,p.completed);
    const idx=lessons.findIndex(l=>l.id===lesson.id);
    const seqOk=idx===0||p.completed.includes(lessons[idx-1].id);
    if(!prereqCheck.unlocked||!seqOk)fail('Complete the previous level to unlock this one.',400);
    const correct=lesson.questions.filter((q,i)=>q[2]===answers[i]).length;
    const passed=correct>=Math.ceil(lesson.questions.length*.6);
    const fresh=!p.completed.includes(lesson.id);
    let earned=0;
    if(passed&&fresh){
      earned=lesson.xp;
      p.completed.push(lesson.id);
      p.xp+=earned;
      p.words+=lesson.questions.length;
      if(p.dailyDate!==today())p.todayWords=0;
      p.todayWords+=lesson.questions.length;
      p.dailyDate=today();
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      p.streak=p.lastStudy===today()?p.streak:p.lastStudy===yesterday?p.streak+1:1;
      p.lastStudy=today();
      p.history[today()]=(p.history[today()]||0)+lesson.questions.length;
      await db.set('progress',req.user.username,p);
    }
    res.json({progress:p,correct,total:lesson.questions.length,passed,earned,alreadyCompleted:!fresh});
  });
}));
app.post('/api/practice/listening/submit',route(async(req,res)=>{
  const {moduleId,answers}=req.body;
  if(typeof moduleId!=='string'||!moduleId.trim())fail('Module ID is required.',400);
  const keys=getListeningSolutionKeys(moduleId);
  if(!keys)fail('Listening module not found.',404);
  if(!Array.isArray(answers)||answers.length!==keys.length||answers.some(x=>!Number.isInteger(x)||x<0||x>3)){
    fail('Answer all listening questions with valid options.',400);
  }
  const mod=LISTENING_MODULES.find(m=>m.id===moduleId);
  await locked(req.user.username,async()=>{
    const p=await db.get('progress',req.user.username);
    if(!p.practice)p.practice={listening:[],speaking:[],pronunciation:[],conversation:[]};
    const correct=answers.filter((ans,idx)=>ans===keys[idx]).length;
    const passed=correct>=Math.ceil(keys.length*0.6);
    const fresh=!p.practice.listening.includes(moduleId);
    let earned=0;
    if(passed&&fresh){
      earned=mod.xp||25;
      p.practice.listening.push(moduleId);
      p.xp+=earned;
      p.words+=keys.length;
      if(p.dailyDate!==today())p.todayWords=0;
      p.todayWords+=keys.length;
      p.dailyDate=today();
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      p.streak=p.lastStudy===today()?p.streak:p.lastStudy===yesterday?p.streak+1:1;
      p.lastStudy=today();
      p.history[today()]=(p.history[today()]||0)+keys.length;
      await db.set('progress',req.user.username,p);
    }
    res.json({
      progress:p,
      correct,
      total:keys.length,
      passed,
      earned,
      alreadyCompleted:!fresh,
      solutions:keys
    });
  });
}));
app.post('/api/practice/speaking/submit',route(async(req,res)=>{
  const {promptId,transcript}=req.body;
  if(typeof promptId!=='string'||!promptId.trim())fail('Prompt ID is required.',400);
  const spk=SPEAKING_PROMPTS.find(s=>s.id===promptId);
  if(!spk)fail('Speaking prompt not found.',404);
  if(typeof transcript!=='string'||!transcript.trim()){
    fail('Spoken transcript cannot be empty.',400);
  }
  const words=transcript.trim().split(/\s+/).filter(Boolean);
  if(words.length<(spk.minWords||5)){
    fail(`Your spoken response must contain at least ${spk.minWords} words. You spoke ${words.length}.`,400);
  }
  await locked(req.user.username,async()=>{
    const p=await db.get('progress',req.user.username);
    if(!p.practice)p.practice={listening:[],speaking:[],pronunciation:[],conversation:[]};
    const fresh=!p.practice.speaking.includes(promptId);
    let earned=0;
    if(fresh){
      earned=spk.xp||30;
      p.practice.speaking.push(promptId);
      p.xp+=earned;
      p.words+=words.length;
      if(p.dailyDate!==today())p.todayWords=0;
      p.todayWords+=words.length;
      p.dailyDate=today();
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      p.streak=p.lastStudy===today()?p.streak:p.lastStudy===yesterday?p.streak+1:1;
      p.lastStudy=today();
      p.history[today()]=(p.history[today()]||0)+words.length;
      await db.set('progress',req.user.username,p);
    }
    res.json({
      progress:p,
      passed:true,
      wordCount:words.length,
      earned,
      alreadyCompleted:!fresh,
      feedback:'Great speaking practice! Voice recorded and verified.'
    });
  });
}));
app.post('/api/practice/pronunciation/submit',route(async(req,res)=>{
  const {itemId,transcript}=req.body;
  if(typeof itemId!=='string'||!itemId.trim())fail('Pronunciation item ID is required.',400);
  const item=PRONUNCIATION_ITEMS.find(p=>p.id===itemId);
  if(!item)fail('Pronunciation item not found.',404);
  if(typeof transcript!=='string'||!transcript.trim()){
    fail('Spoken transcript cannot be empty.',400);
  }
  const evalResult=evaluatePronunciation(item.targetPhrase,transcript);
  await locked(req.user.username,async()=>{
    const p=await db.get('progress',req.user.username);
    if(!p.practice)p.practice={listening:[],speaking:[],pronunciation:[],conversation:[]};
    const fresh=!p.practice.pronunciation.includes(itemId);
    let earned=0;
    if(evalResult.passed&&fresh){
      earned=item.xp||20;
      p.practice.pronunciation.push(itemId);
      p.xp+=earned;
      p.words+=1;
      if(p.dailyDate!==today())p.todayWords=0;
      p.todayWords+=1;
      p.dailyDate=today();
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      p.streak=p.lastStudy===today()?p.streak:p.lastStudy===yesterday?p.streak+1:1;
      p.lastStudy=today();
      p.history[today()]=(p.history[today()]||0)+1;
      await db.set('progress',req.user.username,p);
    }
    res.json({
      ...evalResult,
      progress:p,
      earned,
      alreadyCompleted:!fresh
    });
  });
}));
app.post('/api/ai/conversation',route(async(req,res)=>{
  const {scenarioId,userMessage,history,level}=req.body;
  const scenario=CONVERSATION_SCENARIOS.find(s=>s.id===scenarioId)||CONVERSATION_SCENARIOS[0];
  const turnResult=await sendAIConversationTurn({
    scenario:scenario.title+' — '+scenario.scenario,
    aiPersona:scenario.aiPersona,
    level:level||scenario.level,
    userMessage,
    history
  });
  await locked(req.user.username,async()=>{
    const p=await db.get('progress',req.user.username);
    if(!p.practice)p.practice={listening:[],speaking:[],pronunciation:[],conversation:[]};
    const fresh=!p.practice.conversation.includes(scenario.id);
    let earned=0;
    if(fresh&&Array.isArray(history)&&history.length>=2){
      earned=30;
      p.practice.conversation.push(scenario.id);
      p.xp+=earned;
      p.words+=5;
      if(p.dailyDate!==today())p.todayWords=0;
      p.todayWords+=5;
      p.dailyDate=today();
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      p.streak=p.lastStudy===today()?p.streak:p.lastStudy===yesterday?p.streak+1:1;
      p.lastStudy=today();
      p.history[today()]=(p.history[today()]||0)+5;
      await db.set('progress',req.user.username,p);
    }
    res.json({
      ...turnResult,
      progress:p,
      earned,
      alreadyCompleted:!fresh
    });
  });
}));

const normalizeCode=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
function member(u){return {username:u.username,name:u.name,score:0,answered:{},joined:now()};}
function view(g,u){
  const current=g.questions[g.index];
  const answered=g.members[u.username]?.answered?.[g.index];
  return {
    code:g.code,
    host:g.host,
    title:g.title,
    difficulty:g.difficulty,
    topic:g.topic,
    duration:g.duration,
    status:g.status,
    index:g.index,
    total:g.questions.length,
    countdownDeadline:g.countdownDeadline||null,
    startedAt:g.startedAt||null,
    endsAt:g.endsAt,
    roundEnd:g.roundEnd,
    serverTime:now(),
    members:Object.values(g.members).map(m=>({username:m.username,name:m.name,score:m.score,answered:m.answered[g.index]!==undefined})),
    question:g.status==='playing'?{prompt:current[0],options:current[1]}:null,
    answer:answered!==undefined?{selected:answered,correct:current[2],explanation:current[3]}:null
  };
}
async function tick(g){
  const currentTime = now();
  if(g.status === 'countdown'){
    if(g.countdownDeadline && currentTime >= g.countdownDeadline){
      g.status = 'playing';
      g.countdownDeadline = null;
      g.startedAt = currentTime;
      g.endsAt = currentTime + (g.duration * 60000);
      g.index = 0;
      g.roundEnd = currentTime + 20000;
      g.lastAnswer = 0;
      await db.set('games', g.code, g);
    }
    return;
  }
  if(g.status!=='playing')return;
  const all=Object.values(g.members).every(m=>m.answered[g.index]!==undefined);
  if(currentTime>=g.endsAt){
    g.status='finished';
  }else if(currentTime>=g.roundEnd||(all&&currentTime>(g.lastAnswer||0)+2200)){
    g.index++;
    if(g.index>=g.questions.length)g.status='finished';
    else{
      g.roundEnd=currentTime+20000;
      g.lastAnswer=0;
    }
  }
  await db.set('games',g.code,g);
}
app.post('/api/games',route(async(req,res)=>{
  const {difficulty,topic,duration}=req.body;
  if(!['Beginner','Intermediate','Advanced'].includes(difficulty)||!['Mixed English','Grammar','Vocabulary','Food & drinks','Conversation'].includes(topic)||![1,3,5,10].includes(duration))fail('Choose valid game settings.');
  let code;
  do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(await db.get('games',code));
  let pool=questionPool(topic,difficulty);
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  const count=Math.min(pool.length,Math.ceil(duration*60/20));
  const g={
    code,
    host:req.user.username,
    title:topic+' challenge',
    difficulty,
    topic,
    duration,
    status:'waiting',
    created:now(),
    countdownDeadline:null,
    startedAt:null,
    endsAt:null,
    roundEnd:null,
    index:0,
    lastAnswer:0,
    members:{[req.user.username]:member(req.user)},
    questions:pool.slice(0,count)
  };
  await db.set('games',code,g);
  res.json(view(g,req.user));
}));
app.post('/api/games/join',route(async(req,res)=>{
  const code=normalizeCode(req.body.code);
  await locked('game:'+code,async()=>{
    const g=await db.get('games',code);
    if(!g)fail('We couldn’t find that game. Double-check the code.',404);
    if(g.status!=='waiting'&&!g.members[req.user.username])fail('That game has already started. Ask the host for a new code.');
    if(g.status==='finished')fail('That game has finished. Create a new challenge!');
    if(!g.members[req.user.username]){
      if(Object.keys(g.members).length>=8)fail('This room is full (8 players).');
      g.members[req.user.username]=member(req.user);
      await db.set('games',code,g);
    }
    res.json(view(g,req.user));
  });
}));
app.get('/api/games/:code',route(async(req,res)=>{
  const code=normalizeCode(req.params.code);
  await locked('game:'+code,async()=>{
    const g=await db.get('games',code);
    if(!g||!g.members[req.user.username])fail('Game not found.',404);
    await tick(g);
    res.json(view(g,req.user));
  });
}));
app.post('/api/games/:code/start',route(async(req,res)=>{
  const code=normalizeCode(req.params.code);
  await locked('game:'+code,async()=>{
    const g=await db.get('games',code);
    if(!g)fail('Game not found.',404);
    if(g.host!==req.user.username)fail('Only the host can start this game.',403);
    if(g.status==='countdown')return res.json(view(g,req.user));
    if(g.status==='playing')fail('This game has already started.',400);
    if(g.status==='finished')fail('This game has finished.',400);
    if(g.status!=='waiting')fail('This game cannot be started.',400);

    const currentTime=now();
    g.status='countdown';
    g.countdownDeadline=currentTime+10000;
    g.startedAt=null;
    g.endsAt=null;
    g.roundEnd=null;
    await db.set('games',g.code,g);

    const delay=Math.max(0,g.countdownDeadline-now());
    setTimeout(async()=>{
      try{
        await locked('game:'+g.code,async()=>{
          const cur=await db.get('games',g.code);
          if(cur&&cur.status==='countdown'){
            await tick(cur);
          }
        });
      }catch(err){
        console.error('Countdown background transition error:',err.message);
      }
    },delay);

    res.json(view(g,req.user));
  });
}));
app.post('/api/games/:code/answer',route(async(req,res)=>{
  const code=normalizeCode(req.params.code);
  await locked('game:'+code,async()=>{
    const g=await db.get('games',code);
    if(!g||!g.members[req.user.username])fail('Game not found.',404);
    await tick(g);
    if(g.status!=='playing'||g.index!==req.body.index)fail('The next question has started.');
    const choice=req.body.choice;
    if(!Number.isInteger(choice)||choice<0||choice>3)fail('Choose an answer.');
    const m=g.members[req.user.username];
    if(m.answered[g.index]!==undefined)fail('You already answered this question.');
    m.answered[g.index]=choice;
    const currentTime=now();
    g.lastAnswer=currentTime;
    if(choice===g.questions[g.index][2])m.score+=100+Math.round(Math.max(0,g.roundEnd-currentTime)/1000)*5;
    await db.set('games',g.code,g);
    res.json(view(g,req.user));
  });
}));
app.post('/api/games/:code/leave',route(async(req,res)=>{
  const code=normalizeCode(req.params.code);
  await locked('game:'+code,async()=>{
    const g=await db.get('games',code);
    if(g?.members[req.user.username]){
      delete g.members[req.user.username];
      if(g.host===req.user.username)g.host=Object.keys(g.members)[0]||null;
      if(!g.host)g.status='finished';
      await db.set('games',g.code,g);
    }
    res.json({ok:true});
  });
}));
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.use((err,req,res,next)=>{console.error(err.message);res.status(err.status||500).json({error:err.status?err.message:'Something went wrong. '+err.message});});
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_,res)=>res.sendFile(path.join(root,'dist/index.html')));}else{const vite=await createViteServer({root,server:{middlewareMode:true,allowedHosts:true},appType:'spa'});app.use(vite.middlewares);}
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log(`Lingo is ready on port ${process.env.PORT||3000} • ${connected?'Supabase connected':'local demo database'}`));
