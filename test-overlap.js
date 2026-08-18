// jsdom 端到端测试：验证时间轴重叠任务并排布局 + 添加窗口
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

  const testData = {
  theme: 'dark',
  notify: false,
  categories: [
    {id:'c1', name:'小说', color:'#c084fc'},
    {id:'c2', name:'学习', color:'#60a5fa'},
    {id:'c3', name:'工作', color:'#34d399'}
  ],
  todos: [
    {id:1, title:'全天任务', catId:'c1', due:'2026-08-19', start:'00:00', end:'00:00', recur:'none', recurDays:null, doneDates:[], note:'', created:1, notifiedDate:''},
    {id:2, title:'上午学习', catId:'c2', due:'2026-08-19', start:'06:00', end:'09:00', recur:'none', recurDays:null, doneDates:[], note:'', created:2, notifiedDate:''},
    {id:3, title:'短会', catId:'c3', due:'2026-08-19', start:'07:00', end:'08:00', recur:'none', recurDays:null, doneDates:[], note:'', created:3, notifiedDate:''}
  ]
};

let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
// 在第一个 <script> 之前注入 localStorage，让应用初始化时加载测试数据
const injectScript = '<script>(function(){ try{ localStorage.setItem("zwm_todo_v1", '+JSON.stringify(JSON.stringify(testData))+'); }catch(e){} })();</script>';
html = html.replace('<script>', injectScript + '<script>', 1);

const dom = new JSDOM(html, {
  url: 'https://zero-wym.github.io/zwm-todo-pwa/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  storageQuota: 10000000
});

const win = dom.window;
const doc = win.document;

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await sleep(300);

  // 初始化已渲染；为确保数据生效，再次调用 renderSchedule
  try {
    win.renderSchedule();
  } catch(e) {
    console.error('renderSchedule 抛错:', e.stack || e.message);
    process.exit(1);
  }
  await sleep(100);

  console.log('scheduleView innerHTML length:', doc.getElementById('scheduleView').innerHTML.length);
  console.log('scheduleView HTML snippet:', doc.getElementById('scheduleView').innerHTML.slice(0, 600));

  const blocks = Array.from(doc.querySelectorAll('.tl-block'));
  console.log('时间轴任务块数量:', blocks.length);
  if(blocks.length !== 3){
    throw new Error('预期 3 个任务块，实际 ' + blocks.length);
  }

  const infos = blocks.map(b => ({
    title: b.querySelector('.tl-t').textContent,
    left: parseFloat(b.style.left),
    width: parseFloat(b.style.width),
    hasOverlap: b.classList.contains('tl-overlap')
  }));
  console.log('任务块布局:', infos);

  const uniqLeft = new Set(infos.map(i => i.left));
  if(uniqLeft.size < 2){
    throw new Error('任务块 left 相同，没有并排显示');
  }
  if(!infos.every(i => i.hasOverlap)){
    throw new Error('重叠任务应带有 tl-overlap 类');
  }
  const widths = infos.map(i => i.width);
  if(Math.max(...widths) - Math.min(...widths) > 1){
    throw new Error('同一组重叠任务宽度应基本相等');
  }

  // 验证添加窗口能打开
  win.openAdd();
  await sleep(100);
  const addMask = doc.getElementById('addMask');
  if(!addMask.classList.contains('show')){
    throw new Error('添加弹窗未打开');
  }
  console.log('添加弹窗可正常打开');

  // 验证点选时间保存
  win.pickWheelItem('start', 'h', 3);
  win.pickWheelItem('start', 'm', 45);
  win.setAmPm('start', 'PM');
  const start24 = win.getTimeBox('start');
  if(start24 !== '15:45'){
    throw new Error('时间选择器保存错误，预期 15:45，实际 ' + start24);
  }
  console.log('时间选择器点选保存正确:', start24);

  console.log('\n✅ 全部测试通过');
  process.exit(0);
})().catch(err => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
