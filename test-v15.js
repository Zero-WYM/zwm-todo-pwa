// jsdom 端到端测试：验证 v15 全部交互链路
// 注意：脚本内 let 变量(DB/curDate 等)不挂 window，需通过 win.eval 访问；
//       数据在脚本运行前用 beforeParse 写入 localStorage，使 load() 直接读入。
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function seedFor(today){
  return {
    theme:'dark', notify:false,
    categories:[
      {id:'c1', name:'小说', color:'#c084fc'},
      {id:'c2', name:'学习', color:'#60a5fa'}
    ],
    todos:[
      {id:1, title:'任务A', catId:'c1', due:today, start:'08:00', end:'10:00', recur:'none', recurDays:null, doneDates:[], note:'', created:1, notifiedDate:''},
      {id:2, title:'任务B', catId:'c2', due:today, start:'09:00', end:'11:00', recur:'none', recurDays:null, doneDates:[], note:'', created:2, notifiedDate:''},
      {id:3, title:'已完成C', catId:'c1', due:today, start:'14:00', end:'15:00', recur:'none', recurDays:null, doneDates:[today], note:'', created:3, notifiedDate:''}
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
function assert(cond, msg){ if(!cond){ fail++; console.error('  ✗ '+msg); throw new Error(msg); } pass++; console.log('  ✓ '+msg); }
// 通过 eval 在闭包内执行并返回结果
function ev(code){ return win.eval(code); }

(async () => {
  await sleep(350);
  const today = ev("todayStr()");

  console.log('\n[1] openAdd 添加态');
  win.openAdd();
  await sleep(20);
  const addMask = doc.getElementById('addMask');
  assert(addMask.classList.contains('show'), '添加弹窗应打开');
  const doneCheck = doc.getElementById('doneCheck');
  assert(doneCheck.style.visibility === 'hidden', '添加态 doneCheck 应隐藏 (实际='+doneCheck.style.visibility+')');
  const delBtn = doc.getElementById('delBtn');
  assert(delBtn.style.display === 'none', '添加态 删除按钮应隐藏');
  const cancelBtn = doc.getElementById('cancelBtn');
  assert(cancelBtn.style.display === 'inline-flex', '添加态 取消按钮应显示');

  console.log('\n[2] editTodo 编辑态（未完成任务A）');
  win.closeAdd();
  win.editTodo(1);
  await sleep(20);
  assert(addMask.classList.contains('show'), '编辑弹窗应打开');
  assert(doneCheck.style.visibility === 'visible', '编辑态 doneCheck 应可见');
  assert(delBtn.style.display === 'inline-flex', '编辑态 删除按钮应显示');
  assert(cancelBtn.style.display === 'none', '编辑态 取消按钮应隐藏');
  assert(ev("!DB.todos.find(x=>x.id===1).doneDates.includes(curDate)"), '任务A 初始未完成');
  assert(!doneCheck.classList.contains('on'), '未完成任务A 的 doneCheck 不应为 on');
  assert(doc.getElementById('todoTitle').value === '任务A', '标题应回填 任务A');

  console.log('\n[3] toggleEditingDone 完成勾选切换');
  win.toggleEditingDone();
  await sleep(20);
  assert(ev("DB.todos.find(x=>x.id===1).doneDates.includes(curDate)"), '首次点击后 任务A 应标记完成');
  assert(doneCheck.classList.contains('on'), '首次点击后 doneCheck 应为 on');
  win.toggleEditingDone();
  await sleep(20);
  assert(!ev("DB.todos.find(x=>x.id===1).doneDates.includes(curDate)"), '再次点击后 任务A 应取消完成');
  assert(!doneCheck.classList.contains('on'), '再次点击后 doneCheck 应为 off');

  console.log('\n[4] onEditDelete 删除任务B');
  win.editTodo(2);
  await sleep(20);
  win.onEditDelete();
  await sleep(20);
  assert(ev("!DB.todos.find(x=>x.id===2)"), 'onEditDelete 后 任务B 应被删除');
  assert(!addMask.classList.contains('show'), '删除后弹窗应关闭');

  console.log('\n[5] schShift 翻日');
  const before = ev("curDate");
  win.schShift(1);
  const after1 = ev("curDate");
  assert(after1 !== before, 'schShift(1) 应改变日期 ('+before+' -> '+after1+')');
  win.schShift(-1);
  assert(ev("curDate") === before, 'schShift(-1) 应回到原日期');

  console.log('\n[6] 重叠布局（A 与 B 时间重叠，C 已完成）');
  // 重新注入含 A/B 重叠的完整数据并复位到今天
  ev(`DB.todos = ${JSON.stringify(seedFor(today).todos)}; curDate = todayStr(); renderSchedule();`);
  await sleep(30);
  const blocks = Array.from(doc.querySelectorAll('.tl-block'));
  const overlapBlocks = blocks.filter(b=>b.classList.contains('tl-overlap'));
  assert(overlapBlocks.length === 2, '预期 2 个重叠块(任务A/B)，实际 '+overlapBlocks.length);
  const a = blocks.find(b=>b.dataset.id==='1');
  assert(!a.classList.contains('done'), '未完成任务A 色块不应带 done 类');
  const c3 = blocks.find(b=>b.dataset.id==='3');
  assert(c3.classList.contains('done'), '已完成C 色块应带 done 类');
  const withBound = blocks.filter(b=>b.classList.contains('overlap-left')||b.classList.contains('overlap-right'));
  assert(withBound.length === 2, '重叠块应带左右边界类，实际 '+withBound.length);
  // 仅验证重叠组内部（带 tl-overlap 的块）left 互不相同 → 并排而非完全重叠
  const ovLefts = overlapBlocks.map(b=>parseFloat(b.style.left));
  assert(new Set(ovLefts).size === ovLefts.length, '重叠组内部 left 应不同（并排，非完全重叠）');

  console.log('\n[7] 当前时间指示器 tl-now（今天）');
  ev("curDate = todayStr(); renderSchedule();");
  await sleep(20);
  assert(!!doc.querySelector('.tl-now'), '今天应渲染 tl-now 当前时间指示器');

  console.log('\n[8] 标题与副标题');
  assert(doc.querySelector('.brandbar h1').textContent.includes('工作台'), '主标题应包含 工作台 ('+doc.querySelector('.brandbar h1').textContent+')');

  console.log('\n✅ 全部 v15 交互测试通过 ('+pass+' 项断言)');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ 测试失败:', err.message, ' (已通过 '+pass+' 项，失败 '+fail+' 项)');
  process.exit(1);
});
