/* =====================================================================
   MY LIFE — a quiet digital notebook under a blue sky
   Vanilla JS SPA. All data persisted to localStorage.
===================================================================== */

/* ---------------------------------------------------------------------
   1. UTILITIES
--------------------------------------------------------------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => fmtISO(new Date());
function fmtISO(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d); }
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function fmtLong(dateStr){
  const d = parseISO(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDayMonth(dateStr){
  const d = parseISO(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function currentMonthKey(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtVND(n){
  const sign = n<0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return sign + abs.toLocaleString('vi-VN') + 'đ';
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function daysBetween(a,b){ return Math.round((b-a)/86400000); }
function addDays(dateStr, n){
  const d = parseISO(dateStr); d.setDate(d.getDate()+n); return fmtISO(d);
}

/* ---------------------------------------------------------------------
   2. STORE (localStorage persistence)
--------------------------------------------------------------------- */
const STORAGE_KEY = 'myLifeData_v1';

function defaultState(){
  return {
    schedules: [],
    journals: [],
    tasks: [],
    taskCompletions: [],
    transactions: [],
    accounts: [
      { id: uid(), name: 'Cash', type: 'Cash', initialBalance: 0 }
    ],
    transfers: [],
    budgets: [],
    savingGoals: [],
    exploreItems: [],
    settings: { theme: 'light', name: '' }
  };
}

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return Object.assign(base, parsed, {
      settings: Object.assign(base.settings, parsed.settings || {})
    });
  }catch(e){
    console.error('Failed to load data', e);
    return defaultState();
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.error('Failed to save data', e);
    showToast('⚠️','Could not save. Storage may be full.');
  }
}

/* ---------------------------------------------------------------------
   3. THEME
--------------------------------------------------------------------- */
function applyTheme(){
  const t = state.settings.theme;
  if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else if(t === 'light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme();

/* ---------------------------------------------------------------------
   4. ROUTING / NAVIGATION
--------------------------------------------------------------------- */
let currentView = 'home';
let calendarCursor = new Date();
let calendarMode = 'month';
let tasksTab = 'today';
let moneyTab = 'overview';
let exploreCat = 'all';
let journalFilter = { q:'', mood:'', tag:'' };

const VIEWS = ['home','write','calendar','journal','tasks','money','explore','settings'];

function navigate(view){
  currentView = view;
  VIEWS.forEach(v => {
    document.getElementById('view-'+v).classList.toggle('active', v===view);
  });
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.view === view);
  });
  document.querySelectorAll('.bnav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.view === view);
  });
  closeDrawer();
  renderView(view);
  window.scrollTo(0,0);
}

function renderView(view){
  if(view==='home') renderHome();
  else if(view==='write') renderWrite();
  else if(view==='calendar') renderCalendar();
  else if(view==='journal') renderJournalView();
  else if(view==='tasks') renderTasks();
  else if(view==='money') renderMoney();
  else if(view==='explore') renderExplore();
  else if(view==='settings') renderSettings();
}

document.querySelectorAll('.nav-item, .bnav-item').forEach(btn=>{
  btn.addEventListener('click', ()=> navigate(btn.dataset.view));
});

/* Drawer (mobile: Home / Journal / Explore / Settings) */
function openDrawer(){
  const root = document.getElementById('drawerRoot');
  root.innerHTML = `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <div class="drawer">
      <div class="brand" style="margin-bottom:18px;">☁ My Life</div>
      <button class="nav-item" data-view="home">⌂&nbsp;&nbsp;Home</button>
      <button class="nav-item" data-view="journal">📖&nbsp;&nbsp;Journal</button>
      <button class="nav-item" data-view="explore">⌁&nbsp;&nbsp;Explore</button>
      <div class="nav-divider"></div>
      <button class="nav-item" data-view="settings">⚙&nbsp;&nbsp;Settings</button>
    </div>`;
  root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click', ()=>navigate(b.dataset.view)));
  document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
}
function closeDrawer(){ document.getElementById('drawerRoot').innerHTML=''; }
document.getElementById('drawerBtn').addEventListener('click', openDrawer);
document.getElementById('searchBtn').addEventListener('click', openSearch);

/* ---------------------------------------------------------------------
   5. MODAL HELPERS
--------------------------------------------------------------------- */
function openModal(title, bodyHtml, onMount){
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">${title}</div>
          <button class="icon-btn" id="modalCloseBtn" aria-label="Close">✕</button>
        </div>
        <div id="modalBody">${bodyHtml}</div>
      </div>
    </div>`;
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e=>{
    if(e.target.id === 'modalBackdrop') closeModal();
  });
  if(onMount) onMount(document.getElementById('modalBody'));
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    if(document.getElementById('modalRoot').innerHTML) closeModal();
    else if(document.getElementById('searchRoot').innerHTML) document.getElementById('searchRoot').innerHTML='';
    else if(document.getElementById('drawerRoot').innerHTML) closeDrawer();
  }
});

/* ---------------------------------------------------------------------
   6. TOAST / CELEBRATION
--------------------------------------------------------------------- */
function showToast(emoji, text, duration=2600){
  const root = document.getElementById('toastRoot');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-emoji">${emoji}</span>${text}`;
  root.innerHTML='';
  root.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>root.innerHTML='',250); }, duration);
}

/* ---------------------------------------------------------------------
   7. QUOTES
--------------------------------------------------------------------- */
const QUOTES = [
  "Take your time.",
  "Small steps still move you forward.",
  "A quiet day is still a good day.",
  "Notice something today.",
  "Rest is part of the process.",
  "You don't have to do it all at once.",
  "Curiosity is enough of a reason.",
  "Let today be simple."
];
function quoteOfDay(){
  const d = new Date();
  const idx = (d.getFullYear()*367 + d.getMonth()*31 + d.getDate()) % QUOTES.length;
  return QUOTES[idx];
}

/* ---------------------------------------------------------------------
   8. NATURE LINE (subtle SVG divider)
--------------------------------------------------------------------- */
function natureLine(){
  return `<div class="nature-line-wrap"><svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none">
    <path d="M0,10 Q40,2 80,10 T160,10 T240,10 T320,10 T400,10" fill="none" stroke="var(--nature)" stroke-width="1.4"/>
  </svg></div>`;
}

/* =====================================================================
   9. HOME
===================================================================== */
function renderHome(){
  const el = document.getElementById('view-home');
  const today = todayISO();
  const hour = new Date().getHours();
  const greet = hour<12 ? 'Good morning' : hour<18 ? 'Good afternoon' : 'Good evening';
  const name = state.settings.name ? `, ${escapeHtml(state.settings.name)}` : '';

  // Today's schedule
  const todaySched = state.schedules.filter(s=>s.date===today).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));

  // Today's tasks (non-habit due today + habits)
  const todayTasksNonHabit = state.tasks.filter(t=>!t.isHabit && t.date===today);
  const habitTasks = state.tasks.filter(t=>t.isHabit);
  const totalTodayCount = todayTasksNonHabit.length + habitTasks.length;
  const completedTodayCount = todayTasksNonHabit.filter(t=>t.completed).length +
    habitTasks.filter(h=>isHabitDoneOn(h.id, today)).length;

  // top streak
  let topHabit = null, topStreak = -1;
  habitTasks.forEach(h=>{
    const {current} = calcStreak(h.id);
    if(current > topStreak){ topStreak = current; topHabit = h; }
  });

  // this month money
  const mKey = currentMonthKey();
  const monthTx = state.transactions.filter(t=>t.date.startsWith(mKey));
  const income = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  // one explore item
  const exploreSample = state.exploreItems.filter(e=>e.status!=='Completed').slice(-1)[0];

  el.innerHTML = `
    <div class="greeting">${greet}${name}</div>
    <div class="date-line">${fmtLong(today)}</div>
    <div class="quote-line">"${escapeHtml(quoteOfDay())}"</div>

    <div class="home-grid">
      <div class="stack">
        <div class="card">
          <div class="section-label">TODAY</div>
          ${todaySched.length ? todaySched.map(s=>`
            <div class="today-item">
              <div class="today-time">${s.startTime||''}</div>
              <div class="today-title">${escapeHtml(s.title)}</div>
            </div>`).join('') : `<div class="empty-line">Nothing planned yet.<br>A quiet day.</div>`}
        </div>

        <div class="card">
          <div class="row-between" style="margin-bottom:10px;">
            <div class="section-label" style="margin:0;">TASKS</div>
            <div style="font-size:13px;color:var(--ink-soft);">${completedTodayCount} / ${totalTodayCount || 0} completed</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${totalTodayCount? (completedTodayCount/totalTodayCount*100):0}%"></div></div>
          ${topHabit ? `
          <div class="row-between" style="margin-top:18px;">
            <div>
              <div style="font-weight:600;font-size:14px;">${escapeHtml(topHabit.title)}</div>
              <div style="font-size:12.5px;color:var(--ink-soft);">Best streak</div>
            </div>
            <div class="streak-flame">🔥 ${topStreak} day${topStreak===1?'':'s'}</div>
          </div>` : ''}
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="section-label">${MONTH_NAMES[new Date().getMonth()].toUpperCase()}</div>
          <div class="row-between" style="margin-top:6px;">
            <div>
              <div style="font-size:12px;color:var(--ink-soft);">Income</div>
              <div style="font-weight:600;color:var(--forest);">+${fmtVND(income)}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--ink-soft);">Expense</div>
              <div style="font-weight:600;color:var(--deep-blue);">-${fmtVND(expense)}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-label">EXPLORE</div>
          ${exploreSample ? `
            <div class="row" style="margin-top:4px;">
              <span style="font-size:20px;">${categoryEmoji(exploreSample.category)}</span>
              <div>
                <div style="font-weight:600;font-size:14px;">${escapeHtml(exploreSample.title)}</div>
                <div style="font-size:12.5px;color:var(--ink-soft);">${escapeHtml(exploreSample.status)}</div>
              </div>
            </div>` : `<div class="empty-line">There is a whole world to explore.</div>`}
        </div>
      </div>
    </div>
  `;
}

function categoryEmoji(cat){
  return { Places:'🌍', Learn:'📚', Books:'📖', Movies:'🎬', Ideas:'💡', Someday:'🔭' }[cat] || '🌿';
}

/* =====================================================================
   10. WRITE
===================================================================== */
let writeType = 'schedule';
function renderWrite(){
  const el = document.getElementById('view-write');
  el.innerHTML = `
    <div class="page-title">Write</div>
    <div class="page-sub">What would you like to add?</div>
    <div class="type-tabs" id="writeTabs">
      ${tab('schedule','Schedule')}${tab('journal','Journal')}${tab('task','Task')}${tab('income','Income')}${tab('expense','Expense')}
    </div>
    <div id="writeForm"></div>
  `;
  function tab(key,label){
    return `<button class="type-tab ${writeType===key?'active':''}" data-t="${key}">${label}</button>`;
  }
  el.querySelectorAll('.type-tab').forEach(b=>b.addEventListener('click', ()=>{
    writeType = b.dataset.t; renderWrite();
  }));
  renderWriteForm(document.getElementById('writeForm'), writeType);
}

function renderWriteForm(container, type){
  if(type==='schedule') return renderScheduleForm(container);
  if(type==='journal') return renderJournalForm(container);
  if(type==='task') return renderTaskForm(container);
  if(type==='income') return renderTxForm(container,'income');
  if(type==='expense') return renderTxForm(container,'expense');
}

function accountOptions(selected){
  return state.accounts.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${escapeHtml(a.name)}</option>`).join('');
}

function renderScheduleForm(container, editId=null){
  const editing = editId ? state.schedules.find(s=>s.id===editId) : null;
  container.innerHTML = `
    <div class="card">
      <div class="field"><label>Title</label><input type="text" id="f-title" value="${editing?escapeHtml(editing.title):''}" placeholder="e.g. Study C++"></div>
      <div class="two-col">
        <div class="field"><label>Date</label><input type="date" id="f-date" value="${editing?editing.date:todayISO()}"></div>
        <div class="field"><label>Repeat</label>
          <select id="f-repeat">
            <option value="none" ${editing?.repeat==='none'?'selected':''}>Does not repeat</option>
            <option value="daily" ${editing?.repeat==='daily'?'selected':''}>Daily</option>
            <option value="weekly" ${editing?.repeat==='weekly'?'selected':''}>Weekly</option>
          </select>
        </div>
      </div>
      <div class="two-col">
        <div class="field"><label>Start time</label><input type="time" id="f-start" value="${editing?editing.startTime||'':''}"></div>
        <div class="field"><label>End time</label><input type="time" id="f-end" value="${editing?editing.endTime||'':''}"></div>
      </div>
      <div class="field"><label>Location</label><input type="text" id="f-location" value="${editing?escapeHtml(editing.location||''):''}"></div>
      <div class="field"><label>Note</label><textarea id="f-note">${editing?escapeHtml(editing.note||''):''}</textarea></div>
      <div class="field"><label>Reminder</label>
        <select id="f-reminder">
          <option value="none" ${editing?.reminder==='none'?'selected':''}>None</option>
          <option value="10m" ${editing?.reminder==='10m'?'selected':''}>10 minutes before</option>
          <option value="1h" ${editing?.reminder==='1h'?'selected':''}>1 hour before</option>
          <option value="1d" ${editing?.reminder==='1d'?'selected':''}>1 day before</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="saveBtn">Save schedule</button>
    </div>`;
  container.querySelector('#saveBtn').addEventListener('click', ()=>{
    const title = document.getElementById('f-title').value.trim();
    if(!title){ showToast('☁️','Give it a title first.'); return; }
    const data = {
      title,
      date: document.getElementById('f-date').value || todayISO(),
      startTime: document.getElementById('f-start').value,
      endTime: document.getElementById('f-end').value,
      location: document.getElementById('f-location').value.trim(),
      note: document.getElementById('f-note').value.trim(),
      repeat: document.getElementById('f-repeat').value,
      reminder: document.getElementById('f-reminder').value
    };
    if(editing){ Object.assign(editing, data); }
    else { state.schedules.push({ id: uid(), ...data }); }
    saveState();
    showToast('☁️','Schedule saved.');
    closeModal();
    if(currentView==='calendar') renderCalendar();
    if(currentView==='home') renderHome();
    if(currentView==='write'){ container.innerHTML=''; renderScheduleForm(container); document.getElementById('f-title').value=''; }
  });
}

function renderJournalForm(container, editId=null){
  const editing = editId ? state.journals.find(j=>j.id===editId) : null;
  container.innerHTML = `
    <div class="card journal-page">
      <div class="field"><label>Date</label><input type="date" id="f-date" value="${editing?editing.date:todayISO()}"></div>
      <div class="field"><label>Title</label><input type="text" id="f-title" style="font-family:var(--font-serif);font-size:17px;" value="${editing?escapeHtml(editing.title):''}" placeholder="What is on your mind?"></div>
      <div class="field"><label>Content</label><textarea id="f-content" style="min-height:220px;font-family:var(--font-serif);font-size:15.5px;line-height:1.8;" placeholder="Write freely...">${editing?escapeHtml(editing.content):''}</textarea></div>
      <div class="two-col">
        <div class="field"><label>Mood</label>
          <select id="f-mood">
            <option value="">—</option>
            <option value="😊 Happy" ${editing?.mood==='😊 Happy'?'selected':''}>😊 Happy</option>
            <option value="😌 Calm" ${editing?.mood==='😌 Calm'?'selected':''}>😌 Calm</option>
            <option value="😔 Down" ${editing?.mood==='😔 Down'?'selected':''}>😔 Down</option>
            <option value="😴 Tired" ${editing?.mood==='😴 Tired'?'selected':''}>😴 Tired</option>
            <option value="🤔 Reflective" ${editing?.mood==='🤔 Reflective'?'selected':''}>🤔 Reflective</option>
            <option value="✨ Grateful" ${editing?.mood==='✨ Grateful'?'selected':''}>✨ Grateful</option>
          </select>
        </div>
        <div class="field"><label>Tags (comma separated)</label><input type="text" id="f-tags" value="${editing?escapeHtml((editing.tags||[]).join(', ')):''}" placeholder="study, weather"></div>
      </div>
      <button class="btn btn-primary btn-block" id="saveBtn">Save journal entry</button>
    </div>`;
  container.querySelector('#saveBtn').addEventListener('click', ()=>{
    const content = document.getElementById('f-content').value.trim();
    if(!content){ showToast('☁️','Write a little something first.'); return; }
    const tags = document.getElementById('f-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
    const now = new Date().toISOString();
    const data = {
      date: document.getElementById('f-date').value || todayISO(),
      title: document.getElementById('f-title').value.trim() || '(untitled)',
      content, mood: document.getElementById('f-mood').value, tags, updatedAt: now
    };
    if(editing){ Object.assign(editing, data); }
    else { state.journals.push({ id: uid(), createdAt: now, ...data }); }
    saveState();
    showToast('📖','Journal entry saved.');
    closeModal();
    if(currentView==='calendar') renderCalendar();
    if(currentView==='journal') renderJournalView();
    if(currentView==='write'){ container.innerHTML=''; renderJournalForm(container); }
  });
}

function renderTaskForm(container, editId=null){
  const editing = editId ? state.tasks.find(t=>t.id===editId) : null;
  container.innerHTML = `
    <div class="card">
      <div class="field"><label>Task name</label><input type="text" id="f-title" value="${editing?escapeHtml(editing.title):''}" placeholder="e.g. English"></div>
      <div class="checkbox-row" style="margin-bottom:16px;">
        <input type="checkbox" id="f-ishabit" ${editing?.isHabit?'checked':''}>
        <label for="f-ishabit">This is a habit (repeats, builds a streak)</label>
      </div>
      <div id="habitFields" style="${editing?.isHabit?'':'display:none;'}">
        <div class="field"><label>Streak goal (days)</label><input type="number" id="f-streakgoal" min="1" value="${editing?.streakGoal||30}"></div>
      </div>
      <div id="normalFields" style="${editing?.isHabit?'display:none;':''}">
        <div class="two-col">
          <div class="field"><label>Date</label><input type="date" id="f-date" value="${editing?editing.date||todayISO():todayISO()}"></div>
          <div class="field"><label>Deadline</label><input type="date" id="f-deadline" value="${editing?editing.deadline||'':''}"></div>
        </div>
      </div>
      <div class="two-col">
        <div class="field"><label>Priority</label>
          <select id="f-priority">
            <option value="low" ${editing?.priority==='low'?'selected':''}>Low</option>
            <option value="medium" ${(!editing||editing.priority==='medium')?'selected':''}>Medium</option>
            <option value="high" ${editing?.priority==='high'?'selected':''}>High</option>
          </select>
        </div>
        <div class="field"><label>Category</label><input type="text" id="f-category" value="${editing?escapeHtml(editing.category||''):''}" placeholder="e.g. Study"></div>
      </div>
      <div class="field"><label>Repeat</label>
        <select id="f-repeat">
          <option value="none" ${editing?.repeat==='none'?'selected':''}>Does not repeat</option>
          <option value="daily" ${editing?.repeat==='daily'?'selected':''}>Daily</option>
          <option value="weekly" ${editing?.repeat==='weekly'?'selected':''}>Weekly</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="saveBtn">Save task</button>
    </div>`;
  const habitCb = container.querySelector('#f-ishabit');
  habitCb.addEventListener('change', ()=>{
    container.querySelector('#habitFields').style.display = habitCb.checked ? '' : 'none';
    container.querySelector('#normalFields').style.display = habitCb.checked ? 'none' : '';
  });
  container.querySelector('#saveBtn').addEventListener('click', ()=>{
    const title = document.getElementById('f-title').value.trim();
    if(!title){ showToast('☁️','Give the task a name.'); return; }
    const isHabit = habitCb.checked;
    const data = {
      title,
      isHabit,
      priority: document.getElementById('f-priority').value,
      category: document.getElementById('f-category').value.trim(),
      repeat: isHabit ? 'daily' : document.getElementById('f-repeat').value,
      streakGoal: isHabit ? (Number(document.getElementById('f-streakgoal').value)||30) : null,
      date: isHabit ? null : document.getElementById('f-date').value,
      deadline: isHabit ? null : document.getElementById('f-deadline').value
    };
    if(editing){ Object.assign(editing, data); }
    else { state.tasks.push({ id: uid(), completed:false, createdAt:new Date().toISOString(), ...data }); }
    saveState();
    showToast('✓','Task saved.');
    closeModal();
    if(currentView==='tasks') renderTasks();
    if(currentView==='home') renderHome();
    if(currentView==='calendar') renderCalendar();
    if(currentView==='write'){ container.innerHTML=''; renderTaskForm(container); }
  });
}

function renderTxForm(container, type, editId=null){
  const editing = editId ? state.transactions.find(t=>t.id===editId) : null;
  const incomeCategories = ['Salary','Freelance','Bonus','Allowance','Investment','Other'];
  const expenseCategories = ['Food','Transport','Housing','Education','Shopping','Health','Entertainment','Bills','Other'];
  const cats = type==='income'?incomeCategories:expenseCategories;
  container.innerHTML = `
    <div class="card">
      <div class="field"><label>Amount (đ)</label><input type="number" id="f-amount" min="0" value="${editing?editing.amount:''}" placeholder="0"></div>
      <div class="two-col">
        <div class="field"><label>Category</label>
          <select id="f-category">
            ${cats.map(c=>`<option value="${c}" ${editing?.category===c?'selected':''}>${c}</option>`).join('')}
            <option value="__custom__">+ Custom...</option>
          </select>
        </div>
        <div class="field"><label>Date</label><input type="date" id="f-date" value="${editing?editing.date:todayISO()}"></div>
      </div>
      <div class="field" id="customCatWrap" style="display:none;"><label>Custom category</label><input type="text" id="f-customcat"></div>
      <div class="field"><label>Account</label><select id="f-account">${accountOptions(editing?editing.accountId:state.accounts[0]?.id)}</select></div>
      <div class="field"><label>Note</label><input type="text" id="f-note" value="${editing?escapeHtml(editing.note||''):''}"></div>
      <div class="checkbox-row" style="margin-bottom:16px;">
        <input type="checkbox" id="f-recurring" ${editing?.recurring?'checked':''}>
        <label for="f-recurring">Recurring</label>
      </div>
      <button class="btn btn-primary btn-block" id="saveBtn">Save ${type}</button>
    </div>`;
  const catSel = container.querySelector('#f-category');
  catSel.addEventListener('change', ()=>{
    container.querySelector('#customCatWrap').style.display = catSel.value==='__custom__' ? '' : 'none';
  });
  container.querySelector('#saveBtn').addEventListener('click', ()=>{
    const amount = Number(document.getElementById('f-amount').value);
    if(!amount || amount<=0){ showToast('☁️','Enter an amount.'); return; }
    let category = catSel.value;
    if(category==='__custom__') category = document.getElementById('f-customcat').value.trim() || 'Other';
    const data = {
      type, amount, category,
      date: document.getElementById('f-date').value || todayISO(),
      accountId: document.getElementById('f-account').value,
      note: document.getElementById('f-note').value.trim(),
      recurring: document.getElementById('f-recurring').checked
    };
    if(editing){ Object.assign(editing, data); }
    else { state.transactions.push({ id: uid(), ...data }); }
    saveState();
    showToast(type==='income'?'💰':'💸', `${type==='income'?'Income':'Expense'} saved.`);
    closeModal();
    if(currentView==='money') renderMoney();
    if(currentView==='home') renderHome();
    if(currentView==='calendar') renderCalendar();
    if(currentView==='write'){ container.innerHTML=''; renderTxForm(container,type); }
  });
}

/* =====================================================================
   11. CALENDAR
===================================================================== */
function dayHasData(dateStr){
  return {
    schedule: state.schedules.some(s=>s.date===dateStr),
    journal: state.journals.some(j=>j.date===dateStr),
    task: state.tasks.some(t=>!t.isHabit && t.date===dateStr),
    money: state.transactions.some(t=>t.date===dateStr)
  };
}

function renderCalendar(){
  const el = document.getElementById('view-calendar');
  el.innerHTML = `
    <div class="page-title">Calendar</div>
    <div class="page-sub">A quiet timeline of your days.</div>
    <div class="cal-header">
      <div class="row">
        <button class="btn btn-soft btn-sm" id="calPrev">←</button>
        <div style="font-weight:600;font-size:16px;min-width:150px;text-align:center;" id="calLabel"></div>
        <button class="btn btn-soft btn-sm" id="calNext">→</button>
      </div>
      <div class="row">
        <button class="btn btn-soft btn-sm" id="calToday">Today</button>
        <div class="pill-group">
          <button class="pill ${calendarMode==='month'?'active':''}" data-m="month">Month</button>
          <button class="pill ${calendarMode==='week'?'active':''}" data-m="week">Week</button>
        </div>
      </div>
    </div>
    <div id="calBody"></div>
  `;
  el.querySelector('#calPrev').addEventListener('click', ()=>{ shiftCal(-1); renderCalendar(); });
  el.querySelector('#calNext').addEventListener('click', ()=>{ shiftCal(1); renderCalendar(); });
  el.querySelector('#calToday').addEventListener('click', ()=>{ calendarCursor = new Date(); renderCalendar(); });
  el.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click', ()=>{ calendarMode=b.dataset.m; renderCalendar(); }));

  const label = document.getElementById('calLabel');
  const body = document.getElementById('calBody');
  if(calendarMode==='month'){
    label.textContent = `${MONTH_NAMES[calendarCursor.getMonth()]} ${calendarCursor.getFullYear()}`;
    body.innerHTML = buildMonthGrid(calendarCursor);
  } else {
    const {start,end} = weekRange(calendarCursor);
    label.textContent = `${fmtDayMonth(fmtISO(start))} – ${fmtDayMonth(fmtISO(end))}`;
    body.innerHTML = buildWeekGrid(start);
  }
  body.querySelectorAll('.cal-cell[data-date]').forEach(c=>{
    c.addEventListener('click', ()=> openDayDetail(c.dataset.date));
  });
}
function shiftCal(dir){
  if(calendarMode==='month') calendarCursor.setMonth(calendarCursor.getMonth()+dir);
  else calendarCursor.setDate(calendarCursor.getDate()+dir*7);
  calendarCursor = new Date(calendarCursor);
}
function weekRange(d){
  const start = new Date(d); start.setDate(d.getDate()-d.getDay());
  const end = new Date(start); end.setDate(start.getDate()+6);
  return {start,end};
}
function buildMonthGrid(cursor){
  const y=cursor.getFullYear(), m=cursor.getMonth();
  const firstDay = new Date(y,m,1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(y,m,1-startOffset);
  let html = `<div class="cal-grid">` + WEEKDAYS.map(w=>`<div class="cal-weekday">${w}</div>`).join('');
  const today = todayISO();
  for(let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const ds = fmtISO(d);
    const other = d.getMonth()!==m;
    const dots = dayHasData(ds);
    html += `<div class="cal-cell ${ds===today?'today':''} ${other?'other-month':''}" data-date="${ds}">
      <div class="cal-daynum">${d.getDate()}</div>
      <div class="cal-dots">
        ${dots.schedule?'<span class="cal-dot dot-schedule"></span>':''}
        ${dots.journal?'<span class="cal-dot dot-journal"></span>':''}
        ${dots.task?'<span class="cal-dot dot-task"></span>':''}
        ${dots.money?'<span class="cal-dot dot-money"></span>':''}
      </div>
    </div>`;
    if(i===41) html += '';
  }
  html += `</div>`;
  return html;
}
function buildWeekGrid(start){
  const today = todayISO();
  let html = `<div class="cal-grid">` + WEEKDAYS.map(w=>`<div class="cal-weekday">${w}</div>`).join('');
  for(let i=0;i<7;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const ds = fmtISO(d);
    const dots = dayHasData(ds);
    html += `<div class="cal-cell ${ds===today?'today':''}" data-date="${ds}" style="min-height:120px;">
      <div class="cal-daynum">${d.getDate()}</div>
      <div class="cal-dots">
        ${dots.schedule?'<span class="cal-dot dot-schedule"></span>':''}
        ${dots.journal?'<span class="cal-dot dot-journal"></span>':''}
        ${dots.task?'<span class="cal-dot dot-task"></span>':''}
        ${dots.money?'<span class="cal-dot dot-money"></span>':''}
      </div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function openDayDetail(dateStr){
  const sched = state.schedules.filter(s=>s.date===dateStr).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));
  const journals = state.journals.filter(j=>j.date===dateStr);
  const tasks = state.tasks.filter(t=>!t.isHabit && t.date===dateStr);
  const tx = state.transactions.filter(t=>t.date===dateStr);

  let body = '';
  if(sched.length){
    body += `<div class="section-label">SCHEDULE</div>` + sched.map(s=>`
      <div class="today-item">
        <div class="today-time">${s.startTime||''}</div>
        <div><div class="today-title">${escapeHtml(s.title)}</div>${s.location?`<div class="tx-note">${escapeHtml(s.location)}</div>`:''}</div>
      </div>`).join('');
  }
  if(journals.length){
    body += `<div class="section-label" style="margin-top:18px;">JOURNAL</div>` + journals.map(j=>`
      <div class="today-item" style="cursor:pointer;" data-journal="${j.id}">
        <div style="font-style:italic;font-family:var(--font-serif);">${escapeHtml(j.content.slice(0,80))}${j.content.length>80?'…':''}</div>
      </div>`).join('');
  }
  if(tasks.length){
    body += `<div class="section-label" style="margin-top:18px;">TASKS</div>` + tasks.map(t=>`
      <div class="today-item"><div>${t.completed?'☑':'☐'} ${escapeHtml(t.title)}</div></div>`).join('');
  }
  if(tx.length){
    body += `<div class="section-label" style="margin-top:18px;">MONEY</div>` + tx.map(t=>`
      <div class="today-item">
        <div class="tx-amt ${t.type}">${t.type==='income'?'+':'-'}${fmtVND(t.amount)}</div>
        <div class="tx-note">${escapeHtml(t.category)}${t.note?' · '+escapeHtml(t.note):''}</div>
      </div>`).join('');
  }
  if(!body){ body = `<div class="empty-line">Nothing planned yet.<br>A quiet day.</div>`; }

  openModal(fmtLong(dateStr).toUpperCase(), `<div>${body}</div>
    <div class="row" style="margin-top:22px;gap:10px;">
      <button class="btn btn-soft btn-sm" id="ddAddSched">+ Schedule</button>
      <button class="btn btn-soft btn-sm" id="ddAddJournal">+ Journal</button>
      <button class="btn btn-soft btn-sm" id="ddAddTask">+ Task</button>
    </div>`, (bodyEl)=>{
      bodyEl.querySelectorAll('[data-journal]').forEach(elx=>{
        elx.addEventListener('click', ()=>{ closeModal(); openJournalReader(elx.dataset.journal); });
      });
      bodyEl.querySelector('#ddAddSched')?.addEventListener('click', ()=>{
        openModal('New schedule', '<div id="qf"></div>', c=>{
          renderScheduleForm(c.querySelector('#qf'));
          c.querySelector('#f-date').value = dateStr;
        });
      });
      bodyEl.querySelector('#ddAddJournal')?.addEventListener('click', ()=>{
        openModal('New journal entry', '<div id="qf"></div>', c=>{
          renderJournalForm(c.querySelector('#qf'));
          c.querySelector('#f-date').value = dateStr;
        });
      });
      bodyEl.querySelector('#ddAddTask')?.addEventListener('click', ()=>{
        openModal('New task', '<div id="qf"></div>', c=>{
          renderTaskForm(c.querySelector('#qf'));
          const dEl = c.querySelector('#f-date'); if(dEl) dEl.value = dateStr;
        });
      });
    });
}

/* =====================================================================
   12. JOURNAL (timeline view)
===================================================================== */
function renderJournalView(){
  const el = document.getElementById('view-journal');
  let list = [...state.journals].sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  if(journalFilter.q){
    const q = journalFilter.q.toLowerCase();
    list = list.filter(j => j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q));
  }
  if(journalFilter.mood) list = list.filter(j=>j.mood===journalFilter.mood);
  if(journalFilter.tag) list = list.filter(j=>(j.tags||[]).includes(journalFilter.tag));

  const allTags = [...new Set(state.journals.flatMap(j=>j.tags||[]))];
  const allMoods = [...new Set(state.journals.map(j=>j.mood).filter(Boolean))];

  el.innerHTML = `
    <div class="row-between">
      <div>
        <div class="page-title">Journal</div>
        <div class="page-sub">A timeline of memories.</div>
      </div>
      <button class="btn btn-primary" id="jNewBtn">+ New entry</button>
    </div>
    <div class="field" style="max-width:340px;"><input type="text" id="jSearch" placeholder="Search journal..." value="${escapeHtml(journalFilter.q)}"></div>
    <div class="pill-group" style="margin-bottom:20px;">
      <button class="pill ${!journalFilter.mood?'active':''}" data-mood="">All moods</button>
      ${allMoods.map(m=>`<button class="pill ${journalFilter.mood===m?'active':''}" data-mood="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join('')}
    </div>
    ${allTags.length?`<div class="pill-group" style="margin-bottom:24px;">
      <button class="pill ${!journalFilter.tag?'active':''}" data-tag="">All tags</button>
      ${allTags.map(t=>`<button class="pill ${journalFilter.tag===t?'active':''}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('')}
    </div>`:''}
    <div id="jList"></div>
  `;
  el.querySelector('#jNewBtn').addEventListener('click', ()=> openModal('New journal entry', '<div id="qf"></div>', c=>renderJournalForm(c.querySelector('#qf'))));
  el.querySelector('#jSearch').addEventListener('input', e=>{ journalFilter.q = e.target.value; renderJournalView(); });
  el.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click', ()=>{ journalFilter.mood=b.dataset.mood; renderJournalView(); }));
  el.querySelectorAll('[data-tag]').forEach(b=>b.addEventListener('click', ()=>{ journalFilter.tag=b.dataset.tag; renderJournalView(); }));

  const jList = document.getElementById('jList');
  if(!list.length){
    jList.innerHTML = `<div class="empty-state"><span class="es-emoji">📖</span><div class="es-title">Nothing written yet.</div><div class="es-sub">What is on your mind?</div></div>`;
    return;
  }
  let html = '';
  let lastMonth = '';
  list.forEach(j=>{
    const d = parseISO(j.date);
    const mLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if(mLabel !== lastMonth){ html += `<div class="journal-month-label">${mLabel.toUpperCase()}</div>`; lastMonth = mLabel; }
    html += `<div class="journal-entry" data-id="${j.id}">
      <div class="journal-day">${d.getDate()}</div>
      <div>
        <div class="journal-title">${escapeHtml(j.title)}</div>
        <div class="journal-snippet">${escapeHtml(j.content.slice(0,90))}${j.content.length>90?'…':''}</div>
      </div>
    </div>`;
  });
  jList.innerHTML = html;
  jList.querySelectorAll('[data-id]').forEach(elx=>elx.addEventListener('click', ()=>openJournalReader(elx.dataset.id)));
}

function openJournalReader(id){
  const j = state.journals.find(x=>x.id===id);
  if(!j) return;
  openModal(fmtLong(j.date), `
    <div class="journal-page">
      <h2 style="font-family:var(--font-serif);font-weight:500;margin-bottom:4px;">${escapeHtml(j.title)}</h2>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:16px;">${j.mood?j.mood+' · ':''}${(j.tags||[]).map(t=>'#'+escapeHtml(t)).join(' ')}</div>
      <div class="je-content">${escapeHtml(j.content)}</div>
      <div class="row" style="margin-top:24px;gap:10px;">
        <button class="btn btn-soft btn-sm" id="jEditBtn">Edit</button>
        <button class="btn btn-danger btn-sm" id="jDelBtn">Delete</button>
      </div>
    </div>`, c=>{
      c.querySelector('#jEditBtn').addEventListener('click', ()=>{
        openModal('Edit journal entry', '<div id="qf"></div>', c2=>renderJournalForm(c2.querySelector('#qf'), id));
      });
      c.querySelector('#jDelBtn').addEventListener('click', ()=>{
        if(confirm('Delete this journal entry?')){
          state.journals = state.journals.filter(x=>x.id!==id);
          saveState(); closeModal();
          if(currentView==='journal') renderJournalView();
          if(currentView==='calendar') renderCalendar();
        }
      });
    });
}

/* =====================================================================
   13. TASKS / HABITS / STREAKS
===================================================================== */
function isHabitDoneOn(habitId, dateStr){
  return state.taskCompletions.some(c=>c.taskId===habitId && c.date===dateStr && c.completed);
}
function calcStreak(habitId){
  const dates = state.taskCompletions.filter(c=>c.taskId===habitId && c.completed).map(c=>c.date);
  const set = new Set(dates);
  let current = 0;
  let cursor = parseISO(todayISO());
  if(!set.has(fmtISO(cursor))) cursor.setDate(cursor.getDate()-1);
  while(set.has(fmtISO(cursor))){ current++; cursor.setDate(cursor.getDate()-1); }
  let best=0, run=0, prev=null;
  [...set].sort().forEach(ds=>{
    const dt = parseISO(ds);
    if(prev && daysBetween(prev,dt)===1) run++; else run=1;
    best = Math.max(best,run);
    prev = dt;
  });
  return { current, best: Math.max(best,current) };
}
const MILESTONES = [7,14,30,60,100];
function toggleHabitToday(habitId){
  const today = todayISO();
  const existing = state.taskCompletions.find(c=>c.taskId===habitId && c.date===today);
  const wasDone = existing ? existing.completed : false;
  if(existing) existing.completed = !existing.completed;
  else state.taskCompletions.push({ id: uid(), taskId: habitId, date: today, completed: true });
  saveState();
  const nowDone = !wasDone;
  if(nowDone){
    const { current } = calcStreak(habitId);
    if(MILESTONES.includes(current)){
      showToast('✨', `<b>${current} days</b><br>You kept going.`, 3400);
    }
  }
}
function toggleTaskComplete(taskId){
  const t = state.tasks.find(x=>x.id===taskId);
  if(!t) return;
  t.completed = !t.completed;
  saveState();
}

function renderTasks(){
  const el = document.getElementById('view-tasks');
  el.innerHTML = `
    <div class="row-between">
      <div>
        <div class="page-title">Tasks</div>
        <div class="page-sub">Small steps still move you forward.</div>
      </div>
      <button class="btn btn-primary" id="tNewBtn">+ New task</button>
    </div>
    <div class="tabs">
      ${tTab('today','Today')}${tTab('upcoming','Upcoming')}${tTab('completed','Completed')}${tTab('habits','Habits')}${tTab('streaks','Streaks')}
    </div>
    <div id="tBody"></div>
  `;
  function tTab(key,label){ return `<button class="tab-btn ${tasksTab===key?'active':''}" data-t="${key}">${label}</button>`; }
  el.querySelector('#tNewBtn').addEventListener('click', ()=> openModal('New task','<div id="qf"></div>', c=>renderTaskForm(c.querySelector('#qf'))));
  el.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click', ()=>{ tasksTab=b.dataset.t; renderTasks(); }));

  const body = document.getElementById('tBody');
  const today = todayISO();

  if(tasksTab==='today'){
    const nonHabit = state.tasks.filter(t=>!t.isHabit && t.date===today);
    const habits = state.tasks.filter(t=>t.isHabit);
    if(!nonHabit.length && !habits.length){
      body.innerHTML = emptyTasks(); return;
    }
    body.innerHTML = `<div class="card">` +
      nonHabit.map(t=>taskRowHtml(t,false)).join('') +
      habits.map(h=>taskRowHtml(h,true)).join('') +
      `</div>`;
    bindTaskRows(body);
  } else if(tasksTab==='upcoming'){
    const list = state.tasks.filter(t=>!t.isHabit && !t.completed && t.date && t.date>today).sort((a,b)=>a.date.localeCompare(b.date));
    body.innerHTML = list.length ? `<div class="card">${list.map(t=>taskRowHtml(t,false,true)).join('')}</div>` : emptyTasks();
    bindTaskRows(body);
  } else if(tasksTab==='completed'){
    const list = state.tasks.filter(t=>!t.isHabit && t.completed).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    body.innerHTML = list.length ? `<div class="card">${list.map(t=>taskRowHtml(t,false)).join('')}</div>` : emptyTasks();
    bindTaskRows(body);
  } else if(tasksTab==='habits'){
    const habits = state.tasks.filter(t=>t.isHabit);
    if(!habits.length){ body.innerHTML = emptyTasks(); return; }
    body.innerHTML = `<div class="stack">` + habits.map(h=>{
      const { current, best } = calcStreak(h.id);
      const goal = h.streakGoal || 30;
      const pct = Math.min(100, Math.round(current/goal*100));
      const done = isHabitDoneOn(h.id, today);
      return `<div class="card habit-card" data-habit="${h.id}">
        <div class="row-between">
          <div>
            <div class="habit-name">${escapeHtml(h.title)}</div>
            <div class="habit-freq">Every day</div>
          </div>
          <div class="row">
            <button class="btn btn-ghost btn-sm" data-edit="${h.id}">Edit</button>
            <div class="chk ${done?'checked':''}" data-toggle-habit="${h.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
        </div>
        <div class="streak-numbers">
          <div><div class="streak-num">🔥 ${current}</div><div class="streak-num-label">Current streak</div></div>
          <div><div class="streak-num">${best}</div><div class="streak-num-label">Best streak</div></div>
        </div>
        <div class="progress-track">
          <span>${current}</span>
          <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span>${goal}</span>
        </div>
      </div>`;
    }).join('') + `</div>`;
    body.querySelectorAll('[data-toggle-habit]').forEach(b=>b.addEventListener('click', (e)=>{ e.stopPropagation(); toggleHabitToday(b.dataset.toggleHabit); renderTasks(); if(currentView==='home')renderHome(); }));
    body.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', (e)=>{ e.stopPropagation(); openModal('Edit task','<div id="qf"></div>', c=>renderTaskForm(c.querySelector('#qf'), b.dataset.edit)); }));
  } else if(tasksTab==='streaks'){
    const habits = state.tasks.filter(t=>t.isHabit).map(h=>({h, s: calcStreak(h.id)})).sort((a,b)=>b.s.current-a.s.current);
    if(!habits.length){ body.innerHTML = emptyTasks(); return; }
    body.innerHTML = `<div class="grid-2">` + habits.map(({h,s})=>`
      <div class="card" style="text-align:center;padding:22px;">
        <div style="font-weight:600;font-size:14.5px;margin-bottom:8px;">${escapeHtml(h.title)}</div>
        <div class="streak-num" style="font-size:28px;">🔥 ${s.current}</div>
        <div class="streak-num-label">days · best ${s.best}</div>
      </div>`).join('') + `</div>`;
  }
}
function emptyTasks(){
  return `<div class="empty-state"><span class="es-emoji">✓</span><div class="es-title">Nothing to do.</div><div class="es-sub">Enjoy the quiet.</div></div>`;
}
function taskRowHtml(t, isHabit, showDate=false){
  const today = todayISO();
  const done = isHabit ? isHabitDoneOn(t.id, today) : t.completed;
  return `<div class="task-row" data-task="${t.id}" data-habit="${isHabit?'1':'0'}">
    <div class="chk ${done?'checked':''}" data-toggle="${t.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1;">
      <div class="task-title ${done?'done':''}">
        <span class="priority-dot p-${t.priority||'medium'}"></span>${escapeHtml(t.title)}${isHabit?' <span style="color:var(--ink-soft);font-size:12px;">· habit</span>':''}
      </div>
      ${(showDate && t.date) || t.category ? `<div class="task-meta">${showDate&&t.date?fmtDayMonth(t.date):''}${t.category?(showDate&&t.date?' · ':'')+escapeHtml(t.category):''}</div>`:''}
    </div>
    <button class="btn btn-ghost btn-sm" data-edittask="${t.id}">Edit</button>
  </div>`;
}
function bindTaskRows(container){
  container.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click', (e)=>{
    e.stopPropagation();
    const row = b.closest('[data-task]');
    if(row.dataset.habit==='1') toggleHabitToday(b.dataset.toggle);
    else toggleTaskComplete(b.dataset.toggle);
    renderTasks();
    if(currentView==='home') renderHome();
    if(currentView==='calendar') renderCalendar();
  }));
  container.querySelectorAll('[data-edittask]').forEach(b=>b.addEventListener('click', (e)=>{
    e.stopPropagation();
    openModal('Edit task', '<div id="qf"></div>', c=>renderTaskForm(c.querySelector('#qf'), b.dataset.edittask));
  }));
}

/* =====================================================================
   14. MONEY
===================================================================== */
function accountBalance(accId){
  const acc = state.accounts.find(a=>a.id===accId);
  if(!acc) return 0;
  let bal = acc.initialBalance || 0;
  state.transactions.forEach(t=>{
    if(t.accountId!==accId) return;
    bal += t.type==='income' ? t.amount : -t.amount;
  });
  state.transfers.forEach(tr=>{
    if(tr.fromAccountId===accId) bal -= tr.amount;
    if(tr.toAccountId===accId) bal += tr.amount;
  });
  return bal;
}
function totalBalance(){ return state.accounts.reduce((s,a)=>s+accountBalance(a.id),0); }

function renderMoney(){
  const el = document.getElementById('view-money');
  el.innerHTML = `
    <div class="row-between">
      <div>
        <div class="page-title">Money</div>
        <div class="page-sub">Clear, not scary.</div>
      </div>
      <button class="btn btn-primary" id="mNewBtn">+ Add</button>
    </div>
    <div class="tabs">
      ${mTab('overview','Overview')}${mTab('income','Income')}${mTab('expenses','Expenses')}${mTab('budget','Budget')}${mTab('accounts','Accounts')}${mTab('goals','Goals')}${mTab('history','History')}
    </div>
    <div id="mBody"></div>
  `;
  function mTab(k,l){ return `<button class="tab-btn ${moneyTab===k?'active':''}" data-t="${k}">${l}</button>`; }
  el.querySelector('#mNewBtn').addEventListener('click', ()=>{
    openModal('Add money entry', `<div class="pill-group" style="margin-bottom:16px;">
      <button class="pill active" data-tt="expense">Expense</button>
      <button class="pill" data-tt="income">Income</button>
    </div><div id="qf"></div>`, c=>{
      renderTxForm(c.querySelector('#qf'),'expense');
      c.querySelectorAll('[data-tt]').forEach(b=>b.addEventListener('click', ()=>{
        c.querySelectorAll('[data-tt]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        c.querySelector('#qf').innerHTML='';
        renderTxForm(c.querySelector('#qf'), b.dataset.tt);
      }));
    });
  });
  el.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click', ()=>{ moneyTab=b.dataset.t; renderMoney(); }));

  const body = document.getElementById('mBody');
  if(moneyTab==='overview') renderMoneyOverview(body);
  else if(moneyTab==='income') renderTxList(body,'income');
  else if(moneyTab==='expenses') renderTxList(body,'expense');
  else if(moneyTab==='budget') renderBudget(body);
  else if(moneyTab==='accounts') renderAccounts(body);
  else if(moneyTab==='goals') renderGoals(body);
  else if(moneyTab==='history') renderHistory(body);
}

function renderMoneyOverview(body){
  const mKey = currentMonthKey();
  const monthTx = state.transactions.filter(t=>t.date.startsWith(mKey));
  const income = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const savings = income - expense;
  body.innerHTML = `
    <div class="card balance-hero">
      <div class="section-label">CURRENT BALANCE</div>
      <div class="balance-amount">${fmtVND(totalBalance())}</div>
      <div class="money-stats">
        <div class="money-stat"><div class="money-stat-label">Income</div><div class="money-stat-value" style="color:var(--forest);">+${fmtVND(income)}</div></div>
        <div class="money-stat"><div class="money-stat-label">Expense</div><div class="money-stat-value" style="color:var(--deep-blue);">-${fmtVND(expense)}</div></div>
        <div class="money-stat"><div class="money-stat-label">Remaining</div><div class="money-stat-value">${fmtVND(savings)}</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:20px;">
      <div class="section-label">INCOME VS EXPENSE — LAST 6 MONTHS</div>
      <div class="chart-wrap"><canvas id="moneyChart"></canvas></div>
    </div>
  `;
  const months = [];
  for(let i=5;i>=0;i--){
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    months.push(currentMonthKey(d));
  }
  const incomeData = months.map(mk => state.transactions.filter(t=>t.type==='income'&&t.date.startsWith(mk)).reduce((s,t)=>s+t.amount,0));
  const expenseData = months.map(mk => state.transactions.filter(t=>t.type==='expense'&&t.date.startsWith(mk)).reduce((s,t)=>s+t.amount,0));
  const labels = months.map(mk => MONTH_NAMES[Number(mk.split('-')[1])-1].slice(0,3));
  const ctx = document.getElementById('moneyChart');
  if(ctx && window.Chart){
    new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[
        { label:'Income', data:incomeData, backgroundColor:getCss('--forest'), borderRadius:6, maxBarThickness:22 },
        { label:'Expense', data:expenseData, backgroundColor:getCss('--blue'), borderRadius:6, maxBarThickness:22 }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:getCss('--ink'), boxWidth:12, font:{family:'Inter'} } } },
        scales:{
          x:{ ticks:{ color:getCss('--ink-soft'), font:{family:'Inter'} }, grid:{ display:false } },
          y:{ ticks:{ color:getCss('--ink-soft'), font:{family:'Inter'} }, grid:{ color:getCss('--border') } }
        }
      }
    });
  }
}
function getCss(varName){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }

function renderTxList(body, type){
  const list = state.transactions.filter(t=>t.type===type).sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){ body.innerHTML = `<div class="empty-state"><span class="es-emoji">${type==='income'?'💰':'💸'}</span><div class="es-title">Nothing here yet.</div></div>`; return; }
  body.innerHTML = `<div class="card">` + list.map(t=>txRowHtml(t)).join('') + `</div>`;
  bindTxRows(body);
}
function txRowHtml(t){
  const acc = state.accounts.find(a=>a.id===t.accountId);
  return `<div class="tx-row" data-tx="${t.id}">
    <div>
      <div class="tx-cat">${escapeHtml(t.category)}</div>
      <div class="tx-note">${fmtDayMonth(t.date)}${acc?' · '+escapeHtml(acc.name):''}${t.note?' · '+escapeHtml(t.note):''}${t.recurring?' · recurring':''}</div>
    </div>
    <div class="row">
      <div class="tx-amt ${t.type}">${t.type==='income'?'+':'-'}${fmtVND(t.amount)}</div>
      <button class="btn btn-ghost btn-sm" data-edittx="${t.id}">Edit</button>
    </div>
  </div>`;
}
function bindTxRows(body){
  body.querySelectorAll('[data-edittx]').forEach(b=>b.addEventListener('click', ()=>{
    const tx = state.transactions.find(t=>t.id===b.dataset.edittx);
    openModal('Edit '+tx.type, '<div id="qf"></div>', c=>renderTxForm(c.querySelector('#qf'), tx.type, tx.id));
  }));
}

function renderHistory(body){
  const list = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){ body.innerHTML = `<div class="empty-state"><span class="es-emoji">◌</span><div class="es-title">No transactions yet.</div></div>`; return; }
  body.innerHTML = `<div class="card">` + list.map(t=>txRowHtml(t)).join('') + `</div>`;
  bindTxRows(body);
}

function renderBudget(body){
  const mKey = currentMonthKey();
  const budgets = state.budgets.filter(b=>b.month===mKey);
  const expenseCategories = ['Food','Transport','Housing','Education','Shopping','Health','Entertainment','Bills','Other'];
  body.innerHTML = `
    <div class="row-between" style="margin-bottom:16px;">
      <div class="section-label" style="margin:0;">${MONTH_NAMES[new Date().getMonth()].toUpperCase()} BUDGET</div>
      <button class="btn btn-soft btn-sm" id="bAddBtn">+ Set budget</button>
    </div>
    <div class="card" id="bList"></div>
  `;
  const list = document.getElementById('bList');
  if(!budgets.length){
    list.innerHTML = `<div class="empty-state"><span class="es-emoji">◌</span><div class="es-title">No budgets set.</div><div class="es-sub">Set one to stay gently on track.</div></div>`;
  } else {
    list.innerHTML = budgets.map(b=>{
      const spent = state.transactions.filter(t=>t.type==='expense'&&t.category===b.category&&t.date.startsWith(mKey)).reduce((s,t)=>s+t.amount,0);
      const pct = Math.min(100, Math.round(spent/b.limit*100));
      let warn = '';
      if(spent >= b.limit) warn = `<div class="budget-exceed">🔴 Budget exceeded</div>`;
      else if(spent >= b.limit*0.8) warn = `<div class="budget-warn">⚠️ Budget almost reached</div>`;
      return `<div class="budget-row">
        <div class="budget-top"><span>${escapeHtml(b.category)}</span><span>${fmtVND(spent)} / ${fmtVND(b.limit)}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${spent>=b.limit?'var(--danger)':spent>=b.limit*0.8?'var(--warn)':'var(--nature-strong)'}"></div></div>
        ${warn}
        ${b.limit-spent>0?`<div class="tx-note" style="margin-top:6px;">${fmtVND(b.limit-spent)} remaining</div>`:''}
      </div>`;
    }).join('');
  }
  document.getElementById('bAddBtn').addEventListener('click', ()=>{
    openModal('Set budget', `
      <div class="card">
        <div class="field"><label>Category</label><select id="bf-cat">${expenseCategories.map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Monthly limit (đ)</label><input type="number" id="bf-limit" min="0"></div>
        <button class="btn btn-primary btn-block" id="bf-save">Save budget</button>
      </div>`, c=>{
        c.querySelector('#bf-save').addEventListener('click', ()=>{
          const limit = Number(c.querySelector('#bf-limit').value);
          if(!limit||limit<=0){ showToast('☁️','Enter a limit.'); return; }
          const category = c.querySelector('#bf-cat').value;
          const existing = state.budgets.find(b=>b.category===category && b.month===mKey);
          if(existing) existing.limit = limit;
          else state.budgets.push({ id: uid(), category, month: mKey, limit });
          saveState(); closeModal(); renderMoney();
        });
      });
  });
}

function renderAccounts(body){
  body.innerHTML = `
    <div class="row-between" style="margin-bottom:16px;">
      <div class="section-label" style="margin:0;">ACCOUNTS</div>
      <div class="row">
        <button class="btn btn-soft btn-sm" id="trBtn">Transfer</button>
        <button class="btn btn-soft btn-sm" id="acAddBtn">+ New account</button>
      </div>
    </div>
    <div class="grid-2" id="acGrid"></div>
  `;
  document.getElementById('acGrid').innerHTML = state.accounts.map(a=>`
    <div class="card account-card">
      <div class="row-between">
        <div><div class="account-name">${escapeHtml(a.name)}</div><div class="account-type">${escapeHtml(a.type)}</div></div>
        <button class="btn btn-ghost btn-sm" data-editacc="${a.id}">Edit</button>
      </div>
      <div class="account-balance">${fmtVND(accountBalance(a.id))}</div>
    </div>`).join('');
  document.getElementById('acAddBtn').addEventListener('click', ()=>openAccountForm());
  document.querySelectorAll('[data-editacc]').forEach(b=>b.addEventListener('click', ()=>openAccountForm(b.dataset.editacc)));
  document.getElementById('trBtn').addEventListener('click', openTransferForm);
}
function openAccountForm(editId=null){
  const editing = editId ? state.accounts.find(a=>a.id===editId) : null;
  openModal(editing?'Edit account':'New account', `
    <div class="card">
      <div class="field"><label>Name</label><input type="text" id="af-name" value="${editing?escapeHtml(editing.name):''}" placeholder="e.g. MB Bank"></div>
      <div class="field"><label>Type</label><select id="af-type">
        ${['Bank','Cash','E-wallet','Other'].map(t=>`<option ${editing?.type===t?'selected':''}>${t}</option>`).join('')}
      </select></div>
      <div class="field"><label>Starting balance (đ)</label><input type="number" id="af-balance" value="${editing?editing.initialBalance:0}"></div>
      <button class="btn btn-primary btn-block" id="af-save">Save account</button>
    </div>`, c=>{
      c.querySelector('#af-save').addEventListener('click', ()=>{
        const name = c.querySelector('#af-name').value.trim();
        if(!name){ showToast('☁️','Give the account a name.'); return; }
        const data = { name, type: c.querySelector('#af-type').value, initialBalance: Number(c.querySelector('#af-balance').value)||0 };
        if(editing) Object.assign(editing, data);
        else state.accounts.push({ id: uid(), ...data });
        saveState(); closeModal(); renderMoney();
      });
    });
}
function openTransferForm(){
  openModal('Transfer between accounts', `
    <div class="card">
      <div class="two-col">
        <div class="field"><label>From</label><select id="tf-from">${accountOptions()}</select></div>
        <div class="field"><label>To</label><select id="tf-to">${accountOptions()}</select></div>
      </div>
      <div class="field"><label>Amount (đ)</label><input type="number" id="tf-amount" min="0"></div>
      <div class="field"><label>Date</label><input type="date" id="tf-date" value="${todayISO()}"></div>
      <div class="field"><label>Note</label><input type="text" id="tf-note"></div>
      <button class="btn btn-primary btn-block" id="tf-save">Transfer</button>
    </div>`, c=>{
      c.querySelector('#tf-save').addEventListener('click', ()=>{
        const from = c.querySelector('#tf-from').value, to = c.querySelector('#tf-to').value;
        const amount = Number(c.querySelector('#tf-amount').value);
        if(from===to){ showToast('☁️','Choose two different accounts.'); return; }
        if(!amount||amount<=0){ showToast('☁️','Enter an amount.'); return; }
        state.transfers.push({ id: uid(), fromAccountId: from, toAccountId: to, amount, date: c.querySelector('#tf-date').value||todayISO(), note: c.querySelector('#tf-note').value.trim() });
        saveState(); closeModal(); renderMoney();
        showToast('◌','Transfer complete.');
      });
    });
}

function renderGoals(body){
  body.innerHTML = `
    <div class="row-between" style="margin-bottom:16px;">
      <div class="section-label" style="margin:0;">SAVING GOALS</div>
      <button class="btn btn-soft btn-sm" id="gAddBtn">+ New goal</button>
    </div>
    <div class="stack" id="gList"></div>
  `;
  const list = document.getElementById('gList');
  if(!state.savingGoals.length){
    list.innerHTML = `<div class="empty-state"><span class="es-emoji">◌</span><div class="es-title">No goals yet.</div><div class="es-sub">Give your saving a direction.</div></div>`;
  } else {
    list.innerHTML = state.savingGoals.map(g=>{
      const pct = Math.min(100, Math.round(g.current/g.target*100));
      let monthly = '';
      if(g.deadline){
        const months = Math.max(1, Math.ceil(daysBetween(new Date(), parseISO(g.deadline))/30));
        const needed = Math.max(0, (g.target-g.current)/months);
        monthly = `<div class="tx-note" style="margin-top:6px;">≈ ${fmtVND(needed)} / month to reach it by ${fmtDayMonth(g.deadline)}</div>`;
      }
      return `<div class="card goal-card">
        <div class="row-between">
          <div class="habit-name">${escapeHtml(g.name)}</div>
          <button class="btn btn-ghost btn-sm" data-editgoal="${g.id}">Edit</button>
        </div>
        <div class="row-between" style="font-size:13px;color:var(--ink-soft);margin:8px 0 6px;">
          <span>${fmtVND(g.current)}</span><span>${fmtVND(g.target)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="tx-note" style="margin-top:6px;">${pct}%</div>
        ${monthly}
      </div>`;
    }).join('');
    document.querySelectorAll('[data-editgoal]').forEach(b=>b.addEventListener('click', ()=>openGoalForm(b.dataset.editgoal)));
  }
  document.getElementById('gAddBtn').addEventListener('click', ()=>openGoalForm());
}
function openGoalForm(editId=null){
  const editing = editId ? state.savingGoals.find(g=>g.id===editId) : null;
  openModal(editing?'Edit goal':'New saving goal', `
    <div class="card">
      <div class="field"><label>Name</label><input type="text" id="gf-name" value="${editing?escapeHtml(editing.name):''}" placeholder="e.g. Laptop"></div>
      <div class="two-col">
        <div class="field"><label>Target (đ)</label><input type="number" id="gf-target" value="${editing?editing.target:''}"></div>
        <div class="field"><label>Current (đ)</label><input type="number" id="gf-current" value="${editing?editing.current:0}"></div>
      </div>
      <div class="field"><label>Deadline (optional)</label><input type="date" id="gf-deadline" value="${editing?editing.deadline||'':''}"></div>
      <button class="btn btn-primary btn-block" id="gf-save">Save goal</button>
    </div>`, c=>{
      c.querySelector('#gf-save').addEventListener('click', ()=>{
        const name = c.querySelector('#gf-name').value.trim();
        const target = Number(c.querySelector('#gf-target').value);
        if(!name||!target){ showToast('☁️','Fill in name and target.'); return; }
        const data = { name, target, current: Number(c.querySelector('#gf-current').value)||0, deadline: c.querySelector('#gf-deadline').value||null };
        if(editing) Object.assign(editing, data);
        else state.savingGoals.push({ id: uid(), ...data });
        saveState(); closeModal(); renderMoney();
      });
    });
}

/* =====================================================================
   15. EXPLORE
===================================================================== */
const EXPLORE_CATS = ['Places','Learn','Books','Movies','Ideas','Someday'];
function renderExplore(){
  const el = document.getElementById('view-explore');
  el.innerHTML = `
    <div class="row-between">
      <div>
        <div class="page-title">Explore</div>
        <div class="page-sub">A space for curiosity.</div>
      </div>
      <button class="btn btn-primary" id="eNewBtn">+ Add</button>
    </div>
    <div class="pill-group" style="margin-bottom:10px;">
      <button class="pill ${exploreCat==='all'?'active':''}" data-cat="all">All</button>
      ${EXPLORE_CATS.map(c=>`<button class="pill ${exploreCat===c?'active':''}" data-cat="${c}">${categoryEmoji(c)} ${c}</button>`).join('')}
    </div>
    <div id="eList"></div>
  `;
  el.querySelector('#eNewBtn').addEventListener('click', ()=>openExploreForm());
  el.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click', ()=>{ exploreCat=b.dataset.cat; renderExplore(); }));

  const list = document.getElementById('eList');
  const items = exploreCat==='all' ? state.exploreItems : state.exploreItems.filter(i=>i.category===exploreCat);
  if(!items.length){
    list.innerHTML = `<div class="empty-state"><span class="es-emoji">🧭</span><div class="es-title">There is a whole world to explore.</div></div>`;
    return;
  }
  const cats = exploreCat==='all' ? EXPLORE_CATS : [exploreCat];
  let html = '';
  cats.forEach(cat=>{
    const catItems = items.filter(i=>i.category===cat);
    if(!catItems.length) return;
    html += `<div class="explore-cat-header">${categoryEmoji(cat)} ${cat}</div>`;
    catItems.forEach(i=>{
      html += `<div class="explore-item" data-id="${i.id}">
        <div class="explore-top">
          <div>
            <div class="explore-title">${escapeHtml(i.title)}</div>
            ${i.note?`<div class="explore-note">${escapeHtml(i.note)}</div>`:''}
            ${i.link?`<div class="explore-note"><a href="${escapeHtml(i.link)}" target="_blank" rel="noopener">${escapeHtml(i.link)}</a></div>`:''}
          </div>
          <span class="status-badge status-${i.status==='Want to explore'?'want':i.status==='Exploring'?'exploring':'completed'}">${escapeHtml(i.status)}</span>
        </div>
      </div>`;
    });
  });
  list.innerHTML = html;
  list.querySelectorAll('[data-id]').forEach(elx=>elx.addEventListener('click', ()=>openExploreForm(elx.dataset.id)));
}
function openExploreForm(editId=null){
  const editing = editId ? state.exploreItems.find(i=>i.id===editId) : null;
  openModal(editing?'Edit item':'New explore item', `
    <div class="card">
      <div class="field"><label>Title</label><input type="text" id="ef-title" value="${editing?escapeHtml(editing.title):''}" placeholder="e.g. Japan"></div>
      <div class="two-col">
        <div class="field"><label>Category</label><select id="ef-cat">${EXPLORE_CATS.map(c=>`<option ${editing?.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select id="ef-status">
          ${['Want to explore','Exploring','Completed'].map(s=>`<option ${editing?.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div class="field"><label>Note</label><textarea id="ef-note">${editing?escapeHtml(editing.note||''):''}</textarea></div>
      <div class="field"><label>Link (optional)</label><input type="url" id="ef-link" value="${editing?escapeHtml(editing.link||''):''}"></div>
      <div class="row" style="gap:10px;">
        <button class="btn btn-primary btn-block" id="ef-save">Save</button>
        ${editing?'<button class="btn btn-danger btn-sm" id="ef-del">Delete</button>':''}
      </div>
    </div>`, c=>{
      c.querySelector('#ef-save').addEventListener('click', ()=>{
        const title = c.querySelector('#ef-title').value.trim();
        if(!title){ showToast('☁️','Give it a title.'); return; }
        const data = {
          title, category: c.querySelector('#ef-cat').value, status: c.querySelector('#ef-status').value,
          note: c.querySelector('#ef-note').value.trim(), link: c.querySelector('#ef-link').value.trim()
        };
        if(editing) Object.assign(editing, data);
        else state.exploreItems.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
        saveState(); closeModal(); renderExplore();
        if(currentView==='home') renderHome();
      });
      c.querySelector('#ef-del')?.addEventListener('click', ()=>{
        state.exploreItems = state.exploreItems.filter(i=>i.id!==editId);
        saveState(); closeModal(); renderExplore();
      });
    });
}

/* =====================================================================
   16. SETTINGS
===================================================================== */
function renderSettings(){
  const el = document.getElementById('view-settings');
  el.innerHTML = `
    <div class="page-title">Settings</div>
    <div class="page-sub">Make this space yours.</div>
    <div class="stack" style="max-width:480px;">
      <div class="card">
        <div class="field"><label>Your name</label><input type="text" id="s-name" value="${escapeHtml(state.settings.name||'')}" placeholder="How should we greet you?"></div>
      </div>
      <div class="card">
        <div class="section-label">APPEARANCE</div>
        <div class="pill-group">
          <button class="pill ${state.settings.theme==='light'?'active':''}" data-theme="light">☀️ Light</button>
          <button class="pill ${state.settings.theme==='dark'?'active':''}" data-theme="dark">🌙 Dark</button>
        </div>
      </div>
      <div class="card">
        <div class="section-label">YOUR DATA</div>
        <div class="stack">
          <button class="btn btn-soft btn-block" id="exportBtn">Export data (.json)</button>
          <label class="btn btn-soft btn-block" style="cursor:pointer;justify-content:center;">
            Import data
            <input type="file" id="importFile" accept=".json" style="display:none;">
          </label>
        </div>
        <div class="tx-note" style="margin-top:10px;">Your data stays on this device. Export regularly to keep a backup.</div>
      </div>
    </div>
  `;
  el.querySelector('#s-name').addEventListener('input', e=>{ state.settings.name = e.target.value; saveState(); });
  el.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click', ()=>{
    state.settings.theme = b.dataset.theme; saveState(); applyTheme(); renderSettings();
  }));
  el.querySelector('#exportBtn').addEventListener('click', exportData);
  el.querySelector('#importFile').addEventListener('change', importData);
}

function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my-life-backup.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('☁️','Backup downloaded.');
}
function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!confirm('This will replace your current data with the imported backup. Continue?')) return;
      const base = defaultState();
      state = Object.assign(base, parsed, { settings: Object.assign(base.settings, parsed.settings||{}) });
      saveState(); applyTheme();
      showToast('☁️','Data restored.');
      renderView(currentView);
    }catch(err){
      showToast('⚠️','That file could not be read.');
    }
  };
  reader.readAsText(file);
}

/* =====================================================================
   17. SEARCH
===================================================================== */
function openSearch(){
  const root = document.getElementById('searchRoot');
  root.innerHTML = `
    <div class="search-overlay">
      <div class="search-input-wrap">
        <input type="text" id="searchInput" placeholder="Search journal, schedule, tasks, money, explore..." autofocus>
        <button class="icon-btn" id="searchClose">✕</button>
      </div>
      <div id="searchResults"></div>
    </div>`;
  root.querySelector('#searchClose').addEventListener('click', ()=> root.innerHTML='');
  root.querySelector('#searchInput').addEventListener('input', e=> renderSearchResults(e.target.value));
  renderSearchResults('');
}
function renderSearchResults(q){
  const el = document.getElementById('searchResults');
  if(!q.trim()){ el.innerHTML = `<div class="empty-line" style="text-align:center;">Type to search across everything you've written.</div>`; return; }
  const ql = q.toLowerCase();
  const groups = [];

  const j = state.journals.filter(x=>x.title.toLowerCase().includes(ql)||x.content.toLowerCase().includes(ql));
  if(j.length) groups.push({ label:'JOURNAL', items:j.map(x=>({title:x.title, sub:fmtLong(x.date), action:()=>openJournalReader(x.id)})) });

  const s = state.schedules.filter(x=>x.title.toLowerCase().includes(ql)||(x.location||'').toLowerCase().includes(ql)||(x.note||'').toLowerCase().includes(ql));
  if(s.length) groups.push({ label:'SCHEDULE', items:s.map(x=>({title:x.title, sub:fmtLong(x.date), action:()=>{ closeSearchAnd(()=>openDayDetail(x.date)); }})) });

  const t = state.tasks.filter(x=>x.title.toLowerCase().includes(ql));
  if(t.length) groups.push({ label:'TASKS', items:t.map(x=>({title:x.title, sub:x.isHabit?'Habit':(x.date?fmtLong(x.date):''), action:()=>{ closeSearchAnd(()=>navigate('tasks')); }})) });

  const tx = state.transactions.filter(x=>x.category.toLowerCase().includes(ql)||(x.note||'').toLowerCase().includes(ql));
  if(tx.length) groups.push({ label:'MONEY', items:tx.map(x=>({title:`${x.type==='income'?'+':'-'}${fmtVND(x.amount)} · ${x.category}`, sub:fmtLong(x.date), action:()=>{ closeSearchAnd(()=>navigate('money')); }})) });

  const ex = state.exploreItems.filter(x=>x.title.toLowerCase().includes(ql)||(x.note||'').toLowerCase().includes(ql));
  if(ex.length) groups.push({ label:'EXPLORE', items:ex.map(x=>({title:x.title, sub:x.category, action:()=>{ closeSearchAnd(()=>navigate('explore')); }})) });

  if(!groups.length){ el.innerHTML = `<div class="empty-line" style="text-align:center;">No results.</div>`; return; }
  el.innerHTML = groups.map(g=>`
    <div class="search-group-label">${g.label}</div>
    ${g.items.map((it,idx)=>`<div class="search-result" data-g="${g.label}" data-i="${idx}">
      <div class="search-result-title">${escapeHtml(it.title)}</div>
      <div class="search-result-sub">${escapeHtml(it.sub)}</div>
    </div>`).join('')}
  `).join('');
  el.querySelectorAll('.search-result').forEach(rowEl=>{
    const g = groups.find(x=>x.label===rowEl.dataset.g);
    const it = g.items[Number(rowEl.dataset.i)];
    rowEl.addEventListener('click', it.action);
  });
}
function closeSearchAnd(fn){ document.getElementById('searchRoot').innerHTML=''; fn(); }

/* =====================================================================
   18. INIT
===================================================================== */
navigate('home');