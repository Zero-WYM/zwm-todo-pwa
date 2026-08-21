// jsdom 回归测试：验证"先修bug"四处修复
// 1) editTodo 编辑不改原始 due（严重）
// 2) 统一"结束早于开始"：cross-day 不再被错改成同日下午（严重）
// 3) 00:00–00:00 全天任务归入 strip 而非贯穿巨块（中等）
// 4) 桌面滚轮翻日（中等）
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function seedFor(today){
  const d = new Date(today + "T00:00:00");
  const y = new Date(d); y.setDate(d.getDate() - 1);
  const tm = new Date(d); tm.setDate(d.getDate() + 1);
  const fmt = x => x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0");
  const yesterday = fmt(y), tomorrow = fmt(tm);
  return {
    theme:'dark', notify:false,
    categories:[
      {id:'c1', name:'小说', color:'#c084fc'},
      {id:'c2', name:'学习', color:'#60a5fa'}
    ],
    todos:[
      // 严重bug1：due 非今天，编辑时不应被静默改成今天
      {id:1, title:'逾期任务(昨天)', catId:'c1', due:yesterday, recur:'none', recurDays:null, doneDates:[], note:'', created:1, notifiedDate:''},
      {id:2, title:'未来任务(明天)', catId:'c2', due:tomorrow, recur:'none', recurDays:null, doneDates:[], note:'', created:2, notifiedDate:''},
      // 严重bug2：跨天任务 end<start
      {id:3, title:'跨天上午9到次日8', catId:'c1', due:today, start:'09:00', end:'08:00', recur:'none', recurDays:null, doneDates:[], note:'', created:3, notifiedDate:''},
      {id:6, title:'跨天晚11到次日1', catId:'c2', due:today, start:'23:00', end:'01:00', recur:'none', recurDays:null, doneDates:[], note:'', created:6, notifiedDate:''},
      // 中等bug3：00:00–00:00 全天
      {id:4, title:'全天占位', catId:'c1', due:today, start:'00:00', end:'00:00', recur:'none', recurDays:null, doneDates:[], note:'', created:4, notifiedDate:''},
      // 正常任务（对照）
      {id:5, title:'正常下午2到4', catId:'c2', due:today, start:'14:00', end:'16:00', recur:'none', recurDays:null, doneDates:[], note:'', created:5, notifiedDate:''}
    ]
  };
}

const dom = new JSDOM(html, {
  url: 'https://zero-wym.github.io/zwm-todo-pwa/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  storageQuota: 10000000,
  beforeParse(window){
    const now = new Date();
    const today = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
    window.localStorage.setItem('zwm_todo_v1', JSON.stringify(seedFor(today)));
  }
});

const win = dom.window;
const doc = win.document;
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

let pass = 0, fail = 0;
function assert(cond, msg){
  if(!cond){ fail++; console.error('  ✗ '+msg); }
  else { pass++; console.log('  ✓ '+msg); }
}
function ev(code){ return win.eval(code); }

(async () => {
  await sleep(350);
  const today = ev("todayStr()");
  const d = new Date(today + "T00:00:00");
  const y = new Date(d); y.setDate(d.getDate() - 1);
  const tm = new Date(d); tm.setDate(d.getDate() + 1);
  const fmt = x => x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
  const yesterday = fmt(y), tomorrow = fmt(tm);

  console.log('\n[1] 严重bug1：首页编辑逾期任务，due 应保持为昨天');
  win.switchTab('home');
  await sleep(20);
  win.editTodo(1);
  await sleep(20);
  win.saveTodo();
  await sleep(20);
  assert(ev("DB.todos.find(x=>x.id===1).due") === yesterday, '编辑后 任务1 due 应为昨天('+yesterday+')，实际='+ev("DB.todos.find(x=>x.id===1).due"));

  console.log('\n[2] 严重bug1：日程页查看明天时编辑未来任务，due 应保持为明天');
  ev("currentPage='schedule'; curDate='"+tomorrow+"';");
  win.editTodo(2);
  await sleep(20);
  win.saveTodo();
  await sleep(20);
  assert(ev("DB.todos.find(x=>x.id===2).due") === tomorrow, '编辑后 任务2 due 应为明天('+tomorrow+')，实际='+ev("DB.todos.find(x=>x.id===2).due"));

  console.log('\n[3] 严重bug2：normalizeEnd 不再把跨天误改成同日下午');
  assert(ev("normalizeEnd('09:00','08:00')") === '08:00', "09:00–08:00 应保留 08:00（不是 20:00），实际="+ev("normalizeEnd('09:00','08:00')"));
  assert(ev("normalizeEnd('23:00','01:00')") === '01:00', "23:00–01:00 应保留 01:00，实际="+ev("normalizeEnd('23:00','01:00')"));
  assert(ev("normalizeEnd('14:00','16:00')") === '16:00', "14:00–16:00 正常应保留 16:00");

  console.log('\n[4] 严重bug2：跨天任务渲染带"次日"标签、画到 24:00');
  ev("curDate=todayStr(); renderSchedule();");
  await sleep(30);
  const b3 = doc.querySelector('.tl-block[data-id="3"]');
  assert(!!b3, '任务3(09:00–08:00) 应渲染为时间轴块');
  if(b3) assert(b3.textContent.includes('次日'), '任务3 标签应含"次日"，实际="'+b3.textContent+'"');
  const b6 = doc.querySelector('.tl-block[data-id="6"]');
  assert(!!b6, '任务6(23:00–01:00) 应渲染为时间轴块');
  if(b6) assert(b6.textContent.includes('次日'), '任务6 标签应含"次日"，实际="'+b6.textContent+'"');
  const b5 = doc.querySelector('.tl-block[data-id="5"]');
  if(b5) assert(!b5.textContent.includes('次日'), '任务5(正常) 标签不应含"次日"，实际="'+b5.textContent+'"');

  console.log('\n[5] 中等bug3：00:00–00:00 全天任务归入 strip，不画贯穿巨块');
  assert(!doc.querySelector('.tl-block[data-id="4"]'), '任务4(全天) 不应作为时间轴块渲染');
  const strip = doc.querySelector('.tl-notime');
  assert(!!strip, '应存在无时间/全天 strip');
  if(strip) assert(strip.textContent.includes('全天') && strip.textContent.includes('全天占位'), 'strip 应标注"全天"并含任务4标题，实际="'+strip.textContent+'"');

  console.log('\n[6] 中等bug4：桌面滚轮翻日');
  ev("currentPage='schedule'; curDate=todayStr(); renderSchedule();");
  await sleep(20);
  const main = doc.querySelector('main');
  function makeWheel(deltaY){
    try{
      return new win.WheelEvent('wheel', {deltaY:deltaY, bubbles:true, cancelable:true});
    }catch(err){
      const e = new win.Event('wheel', {bubbles:true, cancelable:true});
      Object.defineProperty(e, 'deltaY', {value:deltaY, configurable:true});
      return e;
    }
  }
  // 顶部(scrollTop=0) + 上滚(deltaY<0) => 切前一天
  // 注：jsdom 无布局，clientHeight=0 且自动滚动会把 scrollTop 设为 364(7:00)，
  //     故测试显式置 scrollTop=0 来模拟"在顶部"。
  main.scrollTop = 0;
  await sleep(10);
  const before = ev("curDate");
  main.dispatchEvent(makeWheel(-100));
  await sleep(30);
  const afterPrev = ev("curDate");
  assert(afterPrev === yesterday, '滚轮上滚(顶部)应切到前一天，实际 before='+before+' after='+afterPrev);
  // 冷却结束后：底部(scrollTop 设大值) + 下滚(deltaY>0) => 切后一天
  await sleep(500);
  main.scrollTop = 99999;
  await sleep(10);
  main.dispatchEvent(makeWheel(100));
  await sleep(30);
  const afterNext = ev("curDate");
  assert(afterNext === today, '滚轮下滚(底部)应切回今天，实际='+afterNext);

  console.log('\n========== 结果 ==========');
  console.log('通过 '+pass+' 项，失败 '+fail+' 项');
  process.exit(fail > 0 ? 1 : 0);
})().catch(err => {
  console.error('\n❌ 测试异常:', err && err.message, ' (已通过 '+pass+' 项，失败 '+fail+' 项)');
  process.exit(1);
});
