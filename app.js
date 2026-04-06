const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ВАЖНО: Вставь свои ключи Supabase!
const SUPABASE_URL = 'https://hvoznktittcvsqtepopp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mw_ldS2k_bWXSWd4ikNQCA_rCZ6OQYs'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
const $ = id => document.getElementById(id);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function haptic(style = 'light') { 
    try { 
        if(window.Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style); 
        } 
    } catch(e){} 
}

function setSyncStatus(status) {
    const el = $('syncStatus');
    if(!el) return;
    if(status === 'loading') el.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-blue-400 animate-pulse"></i>';
    else if(status === 'success') { el.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>'; setTimeout(() => { el.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i>'; }, 2000); }
    else if(status === 'error') el.innerHTML = '<i class="fa-solid fa-cloud-xmark text-red-500"></i>';
    else el.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i>';
}

const EX_DB =["Жим лежа","Жим гантелей","Жим на наклонной","Разводка гантелей","Отжимания","Отжимания на брусьях","Сведение рук в кроссовере","Пуловер","Приседания со штангой","Фронтальные приседания","Жим ногами","Выпады","Разгибания ног","Сгибания ног","Сведение ног в тренажере","Разведение ног в тренажере","Гакк-присед","Приседания в Смите","Румынская тяга","Становая тяга","Тяга в наклоне","Тяга блока к груди","Тяга нижнего блока","Подтягивания","Тяга гантели одной рукой","Гиперэкстензия","Тяга Т-грифа","Армейский жим","Жим Арнольда","Махи в стороны","Махи перед собой","Тяга к подбородку","Обратные разводки (задняя дельта)","Жим сидя в Смите","Подъем на бицепс (штанга)","Подъем гантелей на бицепс","Молотки","Концентрированный подъем","Сгибания на нижнем блоке","Французский жим","Разгибания на блоке","Разгибания из-за головы","Отжимания узким хватом","Планка","Скручивания","Подъем ног в висе","Русский твист","Молитва (пресс)","Бег","Эллипс","Велотренажер","Гребля","Скакалка","Берпи","Степпер","Ходьба"].sort();
const CARDIO_LIST =['бег', 'эллипс', 'велотренажер', 'гребля', 'скакалка', 'берпи', 'ходьба', 'степпер'];

const FOOD_DB =[
    {n:"Гречка (сухая)", c:330, p:12, f:3, u:72, fib: 10},
    {n:"Овсянка", c:360, p:12, f:6, u:60, fib: 11},
    {n:"Рис белый", c:360, p:7, f:1, u:79, fib: 1},
    {n:"Макароны тв. сортов", c:350, p:12, f:1, u:70, fib: 3},
    {n:"Куриная грудка (сырая)", c:113, p:23, f:2, u:0, fib: 0},
    {n:"Говядина постная", c:180, p:20, f:10, u:0, fib: 0},
    {n:"Индейка филе", c:115, p:24, f:1, u:0, fib: 0},
    {n:"Лосось (свежий)", c:208, p:20, f:13, u:0, fib: 0},
    {n:"Тунец консервированный", c:116, p:26, f:1, u:0, fib: 0},
    {n:"Яйцо (1шт)", c:70, p:6, f:5, u:0, fib: 0}, 
    {n:"Творог 5%", c:121, p:17, f:5, u:2, fib: 0},
    {n:"Творог 9%", c:159, p:16, f:9, u:2, fib: 0},
    {n:"Кефир 1%", c:40, p:3, f:1, u:4, fib: 0},
    {n:"Сыр твердый (Пармезан)", c:431, p:38, f:29, u:4, fib: 0},
    {n:"Сыр полутвердый (Российский)", c:360, p:24, f:29, u:0, fib: 0},
    {n:"Банан (1шт)", c:105, p:1, f:0, u:27, fib: 3},
    {n:"Яблоко (1шт)", c:95, p:0, f:0, u:25, fib: 4},
    {n:"Огурец", c:15, p:1, f:0, u:3, fib: 1},
    {n:"Помидор", c:20, p:1, f:0, u:4, fib: 1},
    {n:"Масло оливковое", c:884, p:0, f:100, u:0, fib: 0},
    {n:"Протеин (скуп 30г)", c:120, p:24, f:1, u:3, fib: 0}
];

// --- СОСТОЯНИЕ ---
let pivotDate = new Date();
let currentTab = 'sport';
let userGoals = { c: 2500, p: 160, f: 70, u: 300, fib: 30, water: 2000 };
try {
    const savedGoals = localStorage.getItem('tma_user_goals');
    if (savedGoals) userGoals = JSON.parse(savedGoals);
} catch(e) {}

let sportData = {};
let charts = {};
let calPivot = new Date();

let selectedFoodBase = null;
let isCardioSelected = false;
let currentTplType = 'workout'; 
let currentMealForAdd = '';
let isSupersetMode = false;
let selectedForSuperset =[];

// --- МИГРАЦИЯ ДАННЫХ ---
function migrateData() {
    let migrated = false;
    Object.keys(sportData).forEach(date => {
        if (sportData[date].workout && sportData[date].workout.length > 0) {
            if (!sportData[date].workout[0].sets) {
                let newWorkout =[];
                let currentEx = null;
                sportData[date].workout.forEach(w => {
                    if (!currentEx || currentEx.name !== w.n) {
                        currentEx = { id: 'ex_'+Date.now()+Math.random(), name: w.n, sets:[], note: w.notes || '', supersetId: null };
                        newWorkout.push(currentEx);
                    }
                    currentEx.sets.push({ id: 's_'+Date.now()+Math.random(), w: w.w, r: w.r, done: true, isDrop: false, drops:[] });
                });
                sportData[date].workout = newWorkout;
                migrated = true;
            }
        }
    });
    if(migrated) { console.log("Data migrated"); save(); }
}

// --- ОБЛАЧНЫЕ СОХРАНЕНИЯ SUPABASE ---
async function initData() {
    setSyncStatus('loading');
    try { 
        const localData = localStorage.getItem('tma_sport_data');
        sportData = localData ? JSON.parse(localData) : {}; 
    } catch(e) { sportData = {}; }
    
    if(!sportData._templates) sportData._templates =[];
    if(!sportData._mealTemplates) sportData._mealTemplates =[];
    
    migrateData(); 
    render(); 
    
    if (typeof supabaseClient !== 'undefined') {
        const tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) ? window.Telegram.WebApp.initDataUnsafe.user : { id: 123456789 };
        try {
            let { data, error } = await supabaseClient.from('user_data').select('data').eq('telegram_id', tgUser.id).single();
            if (data && data.data) {
                sportData = data.data;
                migrateData(); 
                try { localStorage.setItem('tma_sport_data', JSON.stringify(sportData)); } catch(e){}
                render(); 
                setSyncStatus('success');
            } else setSyncStatus('idle');
        } catch (err) { setSyncStatus('error'); }
    }
}

function save() {
    try {
        localStorage.setItem('tma_sport_data', JSON.stringify(sportData));
        setTimeout(() => {
            setSyncStatus('loading');
            const tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) ? window.Telegram.WebApp.initDataUnsafe.user : { id: 123456789 };
            if (typeof supabaseClient !== 'undefined') {
                supabaseClient.from('user_data').upsert({ telegram_id: tgUser.id, data: sportData, updated_at: new Date() })
                    .then(() => setSyncStatus('success'))
                    .catch(() => setSyncStatus('error'));
            }
        }, 10);
    } catch (e) { console.error(e); }
}

// --- НАВИГАЦИЯ И ДАТА ---
function switchTab(tab, index) {
    haptic('light');
    currentTab = tab;
    const slider = $('nav-slider');
    if(slider && index !== undefined) slider.style.transform = `translateX(${index * 100}%)`;['sport', 'nutrition', 'analytics'].forEach(t => {
        const btn = $(`tab-${t}`); const view = $(`view-${t}`);
        if(btn) btn.classList.toggle('active', tab === t);
        if(view) view.classList.toggle('hidden', tab !== t);
    });
    render();
}

function changeDate(delta) { haptic('light'); pivotDate.setDate(pivotDate.getDate() + delta); render(); }
function goToday() { haptic('light'); pivotDate = new Date(); render(); }
function closeModal(id) { $(id).style.display = 'none'; }

// Глобальный календарь
function toggleGlobalCalendar() {
    const wrap = $('globalCalendarWrap');
    const icon = $('globalCalIcon');
    if(wrap && icon) {
        if(wrap.classList.contains('open')) {
            wrap.classList.remove('open');
            icon.style.transform = 'rotate(0deg)';
        } else {
            wrap.classList.add('open');
            icon.style.transform = 'rotate(180deg)';
            renderGlobalCalendar();
        }
    }
}

function changeCalMonth(delta) { haptic('light'); calPivot.setMonth(calPivot.getMonth() + delta); renderGlobalCalendar(); }

function renderGlobalCalendar() {
    const grid = $('globalCalendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const year = calPivot.getFullYear();
    const month = calPivot.getMonth();
    setTxt('calMonthLabel', calPivot.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'}));
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    for(let i=0; i<startDay; i++) grid.innerHTML += `<div></div>`;
    
    for(let i=1; i<=lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        const dk = iso(d);
        const dayData = sportData[dk];
        const hasWorkout = dayData && dayData.workout && dayData.workout.length > 0;
        const isToday = dk === iso(new Date());
        const isSelected = dk === iso(pivotDate);
        
        let bgClass = 'bg-slate-50 text-slate-600';
        if(hasWorkout) bgClass = 'bg-blue-100 text-blue-600 font-black border border-blue-200';
        if(isToday) bgClass += ' ring-2 ring-orange-400';
        if(isSelected) bgClass = 'bg-slate-900 text-white shadow-md';
        
        grid.innerHTML += `<div onclick="selectGlobalDate('${dk}')" class="h-10 rounded-xl flex items-center justify-center text-xs cursor-pointer transition-all ${bgClass}">${i}</div>`;
    }
}

function selectGlobalDate(dk) {
    haptic('light');
    pivotDate = new Date(dk);
    toggleGlobalCalendar();
    render();
}

function render() {
    const dk = iso(pivotDate);
    const isToday = dk === iso(new Date());
    setTxt('dateDisplay', isToday ? 'Сегодня' : pivotDate.toLocaleDateString('ru-RU', {weekday: 'long'}));
    setTxt('dateSubDisplay', pivotDate.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'}));

    if(!sportData[dk]) sportData[dk] = { workout: [], food:[], water: 0, activeMeals:['Завтрак', 'Обед', 'Ужин', 'Перекус'] };

    if (currentTab === 'sport') renderSport(dk);
    if (currentTab === 'nutrition') renderNutrition(dk);
    if (currentTab === 'analytics') renderAnalytics();
}


// === МОДУЛЬ СПОРТА ===
function renderSport(dk) {
    const list = $('workoutList');
    if(!list) return;
    const workout = sportData[dk].workout;
    
    if (workout.length === 0) {
        list.innerHTML = '<div class="text-center py-12 text-slate-400 font-bold"><i class="fa-solid fa-dumbbell text-5xl mb-4 opacity-20"></i><p>Нет тренировок</p></div>';
        return;
    }

    const ssColors =['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
    let ssColorMap = {};
    let ssCounter = 0;

    list.innerHTML = workout.map((ex, exIdx) => {
        const isCardio = CARDIO_LIST.some(c => ex.name.toLowerCase().includes(c));
        const label1 = isCardio ? 'мин' : 'кг';
        const label2 = isCardio ? 'ур' : '×';
        
        let ssStyle = '';
        let mb = '16px';
        let br = '24px';

        const nextEx = workout[exIdx + 1];
        const prevEx = workout[exIdx - 1];
        const isLinkedToNext = nextEx && nextEx.supersetId === ex.supersetId && ex.supersetId;
        const isLinkedToPrev = prevEx && prevEx.supersetId === ex.supersetId && ex.supersetId;

        if (ex.supersetId) {
            if (!ssColorMap[ex.supersetId]) { ssColorMap[ex.supersetId] = ssColors[ssCounter % ssColors.length]; ssCounter++; }
            ssStyle = `border-left: 4px solid ${ssColorMap[ex.supersetId]};`;
            
            if (isLinkedToNext && !isLinkedToPrev) { mb = '4px'; br = '24px 24px 8px 8px'; }
            else if (isLinkedToNext && isLinkedToPrev) { mb = '4px'; br = '8px'; }
            else if (!isLinkedToNext && isLinkedToPrev) { mb = '16px'; br = '8px 8px 24px 24px'; }
        }

        const summaryHtml = ex.sets.map(s => `<span class="${s.done ? 'done' : ''}">${s.w||0}${label1} ${label2} ${s.r||0}</span>`).join(', ');

        const expandedHtml = `
            <div id="ex-body-${ex.id}" class="mt-4 hidden">
                <div class="space-y-2">
                    ${ex.sets.map((s, sIdx) => `
                        <div>
                            <div class="set-row ${!s.done ? 'set-ghost' : ''}">
                                <div class="check-btn ${s.done ? 'done' : ''}" onclick="toggleSetDone('${ex.id}', '${s.id}')">
                                    ${s.done ? '<i class="fa-solid fa-check"></i>' : sIdx+1}
                                </div>
                                <div class="flex-1 flex justify-center items-center gap-1">
                                    <input type="number" value="${s.w}" onchange="updateSetVal('${ex.id}', '${s.id}', 'w', this.value)" class="set-input" placeholder="-">
                                    <span class="text-slate-400 font-bold text-sm">${label1}</span>
                                    <span class="text-slate-300 font-black text-lg mx-1">${isCardio ? '|' : label2}</span>
                                    <input type="number" value="${s.r}" onchange="updateSetVal('${ex.id}', '${s.id}', 'r', this.value)" class="set-input" placeholder="-">
                                </div>
                                <div class="flex items-center gap-1 ml-2">
                                    <button onclick="makeDropSet('${ex.id}', '${s.id}')" class="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-1.5 rounded-lg uppercase tracking-wider">Дроп</button>
                                    <button onclick="deleteSet('${ex.id}', '${s.id}')" class="text-slate-300 hover:text-red-500 p-2"><i class="fa-solid fa-trash text-sm"></i></button>
                                </div>
                            </div>
                            ${s.isDrop ? `
                                <div class="pl-10 space-y-2 mt-2 mb-3 border-l-2 border-purple-200 ml-4">
                                    ${s.drops.map((d, dIdx) => `
                                        <div class="drop-row bg-purple-50/50 rounded-xl pr-2">
                                            <div class="flex-1 flex justify-center items-center gap-1">
                                                <input type="number" value="${d.w}" onchange="updateDropVal('${ex.id}', '${s.id}', ${dIdx}, 'w', this.value)" class="set-input bg-white" placeholder="-">
                                                <span class="text-slate-300 font-black text-lg mx-1">×</span>
                                                <input type="number" value="${d.r}" onchange="updateDropVal('${ex.id}', '${s.id}', ${dIdx}, 'r', this.value)" class="set-input bg-white" placeholder="-">
                                            </div>
                                            <button onclick="deleteDrop('${ex.id}', '${s.id}', ${dIdx})" class="text-slate-300 hover:text-red-500 p-2"><i class="fa-solid fa-xmark"></i></button>
                                        </div>
                                    `).join('')}
                                    <button onclick="addDrop('${ex.id}', '${s.id}')" class="text-xs font-bold text-purple-500 bg-purple-50 px-3 py-2 rounded-lg mt-1">+ Сброс веса</button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 flex gap-2">
                    <button onclick="addSet('${ex.id}')" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition">+ Добавить подход</button>
                    <button onclick="toggleNote('${ex.id}')" class="w-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:text-blue-500 transition"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>
                ${ex.note !== undefined ? `
                    <div class="mt-3">
                        <input type="text" value="${ex.note}" onchange="updateExNote('${ex.id}', this.value)" placeholder="Заметка к упражнению..." class="custom-input text-sm py-3 w-full bg-blue-50 text-blue-900 border border-blue-100">
                    </div>
                ` : ''}
            </div>
        `;

        return `
        <div class="ex-card" style="margin-bottom: ${mb}; border-radius: ${br}; ${ssStyle}">
            ${isSupersetMode ? `<input type="checkbox" class="absolute right-5 top-5 w-6 h-6 accent-blue-500 z-10" onchange="toggleSupersetSelection('${ex.id}', this.checked)">` : ''}
            
            <div class="flex justify-between items-start cursor-pointer" onclick="toggleExExpand('${ex.id}')">
                <div class="flex-1 pr-8">
                    <div class="flex items-center gap-2">
                        <h4 class="font-black text-xl text-slate-800 leading-tight">${ex.name}</h4>
                    </div>
                    <div class="ex-summary mt-2" id="ex-sum-${ex.id}">
                        ${summaryHtml || 'Нет подходов'}
                        ${ex.note ? `<div class="note-preview"><i class="fa-solid fa-paperclip mr-1"></i> ${ex.note}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${ex.supersetId ? `<button onclick="event.stopPropagation(); removeFromSuperset('${ex.id}')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-full transition" title="Убрать из суперсета"><i class="fa-solid fa-link-slash text-xs"></i></button>` : ''}
                    <button onclick="event.stopPropagation(); deleteExercise('${ex.id}')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            ${expandedHtml}
        </div>
        `;
    }).join('');
}

function removeFromSuperset(id) {
    haptic('medium');
    const dk = iso(pivotDate);
    const ex = sportData[dk].workout.find(w => w.id === id);
    if(ex) {
        ex.supersetId = null;
        save();
        render();
    }
}

function toggleExExpand(id) {
    const body = $(`ex-body-${id}`); const sum = $(`ex-sum-${id}`);
    if(body && sum) {
        if(body.classList.contains('hidden')) { body.classList.remove('hidden'); sum.classList.add('hidden'); } 
        else { body.classList.add('hidden'); sum.classList.remove('hidden'); }
    }
}

function toggleNote(id) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === id);
    if(ex.note === undefined) ex.note = ''; else delete ex.note;
    save(); render();
    const body = $(`ex-body-${id}`); if(body && body.classList.contains('hidden')) toggleExExpand(id);
}

function updateExNote(id, val) { const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === id); if(ex) { ex.note = val; save(); render(); } }
function deleteExercise(id) { if(confirm('Удалить упражнение?')) { const dk = iso(pivotDate); sportData[dk].workout = sportData[dk].workout.filter(w => w.id !== id); save(); render(); } }

function toggleSetDone(exId, setId) {
    haptic('light'); const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId);
    const set = ex.sets.find(s => s.id === setId); set.done = !set.done; save(); render();
}

function updateSetVal(exId, setId, field, val) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId);
    const set = ex.sets.find(s => s.id === setId); set[field] = val; set.done = true; save();
}

function addSet(exId) {
    haptic('light'); const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId);
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({ id: 's_'+Date.now()+Math.random(), w: lastSet?.w||'', r: lastSet?.r||'', done: false, isDrop: false, drops:[] });
    save(); render(); setTimeout(() => { const body = $(`ex-body-${exId}`); if(body) body.classList.remove('hidden'); const sum = $(`ex-sum-${exId}`); if(sum) sum.classList.add('hidden'); }, 10);
}

function deleteSet(exId, setId) {
    haptic('medium'); const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId);
    ex.sets = ex.sets.filter(s => s.id !== setId); save(); render(); setTimeout(() => { const body = $(`ex-body-${exId}`); if(body) body.classList.remove('hidden'); const sum = $(`ex-sum-${exId}`); if(sum) sum.classList.add('hidden'); }, 10);
}

function makeDropSet(exId, setId) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId); const set = ex.sets.find(s => s.id === setId);
    set.isDrop = true; if(!set.drops) set.drops =[]; set.drops.push({ w: '', r: '' }); save(); render();
    setTimeout(() => { const body = $(`ex-body-${exId}`); if(body) body.classList.remove('hidden'); const sum = $(`ex-sum-${exId}`); if(sum) sum.classList.add('hidden'); }, 10);
}

function addDrop(exId, setId) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId); const set = ex.sets.find(s => s.id === setId);
    set.drops.push({ w: '', r: '' }); save(); render();
    setTimeout(() => { const body = $(`ex-body-${exId}`); if(body) body.classList.remove('hidden'); const sum = $(`ex-sum-${exId}`); if(sum) sum.classList.add('hidden'); }, 10);
}

function updateDropVal(exId, setId, dropIdx, field, val) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId); const set = ex.sets.find(s => s.id === setId);
    set.drops[dropIdx][field] = val; set.done = true; save();
}

function deleteDrop(exId, setId, dropIdx) {
    const dk = iso(pivotDate); const ex = sportData[dk].workout.find(w => w.id === exId); const set = ex.sets.find(s => s.id === setId);
    set.drops.splice(dropIdx, 1); if(set.drops.length === 0) set.isDrop = false; save(); render();
    setTimeout(() => { const body = $(`ex-body-${exId}`); if(body) body.classList.remove('hidden'); const sum = $(`ex-sum-${exId}`); if(sum) sum.classList.add('hidden'); }, 10);
}

function toggleSupersetMode() {
    isSupersetMode = !isSupersetMode; selectedForSuperset =[];
    const btn = $('btnSuperset'); const panel = $('supersetPanel');
    if(btn) { btn.classList.toggle('bg-blue-500', isSupersetMode); btn.classList.toggle('text-white', isSupersetMode); }
    if(panel) panel.classList.toggle('hidden', !isSupersetMode); 
    render();
}

function toggleSupersetSelection(id, isChecked) { if(isChecked) selectedForSuperset.push(id); else selectedForSuperset = selectedForSuperset.filter(x => x !== id); }

function cancelSuperset() { 
    isSupersetMode = false; selectedForSuperset =[]; 
    const btn = $('btnSuperset'); const panel = $('supersetPanel');
    if(btn) btn.classList.remove('bg-blue-500', 'text-white'); 
    if(panel) panel.classList.add('hidden'); 
    render(); 
}

function confirmSuperset() {
    if(selectedForSuperset.length < 2) return alert('Выберите минимум 2 упражнения!');
    const dk = iso(pivotDate); const ssId = 'ss_' + Date.now();
    sportData[dk].workout.forEach(w => { if(selectedForSuperset.includes(w.id)) w.supersetId = ssId; });
    sportData[dk].workout.sort((a, b) => { if(a.supersetId === ssId && b.supersetId !== ssId) return -1; if(a.supersetId !== ssId && b.supersetId === ssId) return 1; return 0; });
    save(); cancelSuperset();
}

function openExModal() {
    haptic('light'); 
    const modal = $('exModal');
    if(modal) modal.style.display = 'flex'; 
    const search = $('exSearch');
    if(search) search.value = ''; 
    filterEx();
}

function filterEx() {
    const searchInput = $('exSearch');
    if(!searchInput) return;
    const q = searchInput.value.toLowerCase(); 
    const res = $('exSearchResults'); 
    if(!res) return;
    res.innerHTML = '';
    EX_DB.filter(ex => ex.toLowerCase().includes(q)).forEach(ex => {
        const div = document.createElement('div');
        div.className = 'p-4 hover:bg-slate-50 rounded-2xl font-bold text-base cursor-pointer border-b border-slate-50';
        div.innerText = ex;
        div.onclick = () => confirmAddEx(ex);
        res.appendChild(div);
    });
}

function confirmAddEx(name) {
    const dk = iso(pivotDate);
    let pastSets =[];
    const dates = Object.keys(sportData).sort().reverse();
    for (let d of dates) {
        if (d >= dk) continue;
        const pastEx = sportData[d].workout?.find(w => w.name === name);
        if (pastEx && pastEx.sets.length > 0) {
            pastSets = pastEx.sets.map(s => ({ id: 's_'+Date.now()+Math.random(), w: s.w, r: s.r, done: false, isDrop: s.isDrop || false, drops: s.drops ? JSON.parse(JSON.stringify(s.drops)) :[] }));
            break;
        }
    }
    if (pastSets.length === 0) { for(let i=0; i<3; i++) pastSets.push({ id: 's_'+Date.now()+Math.random(), w: '', r: '', done: false, isDrop: false, drops:[] }); }
    sportData[dk].workout.push({ id: 'ex_' + Date.now(), name: name, sets: pastSets, supersetId: null });
    haptic('success'); save(); render(); closeModal('exModal');
}

// === КАЛЬКУЛЯТОР 1RM ===
function openRmModal() { 
    haptic('light'); 
    const modal = $('rmModal'); if(modal) modal.style.display = 'flex'; 
    const w = $('rmW'); if(w) w.value = ''; 
    const r = $('rmR'); if(r) r.value = ''; 
    calcRM(); 
}
function calcRM() {
    const wInput = $('rmW'); const rInput = $('rmR');
    if(!wInput || !rInput) return;
    const w = parseFloat(wInput.value) || 0, r = parseFloat(rInput.value) || 0;
    if (w > 0 && r > 0) {
        const rm = Math.round(w * (1 + r / 30));
        setTxt('rmResult', rm + ' кг');
        setTxt('rm90', Math.round(rm * 0.9)); setTxt('rm80', Math.round(rm * 0.8));
        setTxt('rm70', Math.round(rm * 0.7)); setTxt('rm60', Math.round(rm * 0.6));
    } else { 
        setTxt('rmResult', '0 кг');['rm90','rm80','rm70','rm60'].forEach(id => setTxt(id, '0')); 
    }
}

// === МОДУЛЬ ПИТАНИЯ ===
function renderNutrition(dk) {
    const dayData = sportData[dk];
    let tc=0, tp=0, tf=0, tu=0, tfib=0;
    dayData.food.forEach(f => { tc+=f.c; tp+=f.p; tf+=f.f; tu+=f.u; tfib+=(f.fib||0); });
    
    setTxt('calEaten', tc); 
    
    const calLeftEl = $('calLeft');
    if(calLeftEl) {
        const left = userGoals.c - tc;
        calLeftEl.innerText = Math.abs(left);
        const pEl = calLeftEl.parentElement.querySelector('p');
        if (left < 0) {
            if(pEl) { pEl.innerText = 'ПЕРЕБОР'; pEl.classList.add('text-red-200'); }
            calLeftEl.classList.add('text-red-100');
        } else {
            if(pEl) { pEl.innerText = 'ОСТАЛОСЬ'; pEl.classList.remove('text-red-200'); }
            calLeftEl.classList.remove('text-red-100');
        }
    }
    
    setTxt('calGoalDisplay', userGoals.c);
    setTxt('pVal', `${Math.round(tp)} / ${userGoals.p}г`); 
    setTxt('fVal', `${Math.round(tf)} / ${userGoals.f}г`); 
    setTxt('cVal', `${Math.round(tu)} / ${userGoals.u}г`);
    setTxt('fibVal', `${Math.round(tfib)} / ${userGoals.fib}г`);
    
    const calPct = Math.min((tc / userGoals.c) * 100, 100);
    const circle = $('calCircle');
    if(circle) {
        circle.style.setProperty('--p', `${calPct}%`);
        if(tc > userGoals.c) circle.classList.add('over'); else circle.classList.remove('over');
    }

    const updateMacroBar = (id, val, goal) => {
        const pct = Math.min((val / goal) * 100, 100);
        const bar = $(id);
        if(bar) {
            bar.style.width = `${pct}%`;
            if(val > goal) bar.classList.add('over'); else bar.classList.remove('over');
        }
    };
    updateMacroBar('pBar', tp, userGoals.p);
    updateMacroBar('fBar', tf, userGoals.f);
    updateMacroBar('cBar', tu, userGoals.u);
    updateMacroBar('fibBar', tfib, userGoals.fib);

    const waterVal = dayData.water || 0;
    const waterValEl = $('waterVal');
    if(waterValEl) waterValEl.innerHTML = `${waterVal} <span class="text-lg opacity-50">/ ${userGoals.water}</span>`;
    const waterPct = Math.min((waterVal / userGoals.water) * 100, 100);
    const waterFill = $('waterFill');
    if(waterFill) waterFill.style.height = `${waterPct}%`;

    const list = $('foodList');
    if(!list) return;
    list.innerHTML = dayData.activeMeals.map(meal => {
        const items = dayData.food.filter(f => f.type === meal);
        let mc=0, mp=0, mf=0, mu=0, mfib=0; 
        items.forEach(i => { mc+=i.c; mp+=i.p; mf+=i.f; mu+=i.u; mfib+=(i.fib||0); });
        
        let mealTime = '';
        if (items.length > 0 && items[0].time) mealTime = `<span class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg ml-2">${items[0].time}</span>`;

        let mTotal = mp + mf + mu + mfib;
        let mealBar = mTotal > 0 ? `
            <div class="flex h-1.5 w-full rounded-full overflow-hidden mt-3 opacity-80">
                <div class="bg-green-400" style="width:${(mp/mTotal)*100}%"></div>
                <div class="bg-purple-500" style="width:${(mf/mTotal)*100}%"></div>
                <div class="bg-blue-400" style="width:${(mu/mTotal)*100}%"></div>
                <div class="bg-yellow-400" style="width:${(mfib/mTotal)*100}%"></div>
            </div>
        ` : '';

        return `
        <div class="card">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="flex items-center">
                        <h4 class="font-black text-xl">${meal}</h4>
                        ${mealTime}
                    </div>
                    <p class="text-[11px] font-bold text-slate-400 mt-1">
                        <span class="text-slate-600">${mc} ккал</span> • Б:${mp} Ж:${mf} У:${mu} Кл:${mfib}
                    </p>
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <button onclick="openSaveTplModal('meal', '${meal}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i class="fa-solid fa-floppy-disk"></i></button>
                    <button onclick="openLoadTplModal('meal', '${meal}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i class="fa-solid fa-folder-open"></i></button>
                    <button onclick="openFoodModal('${meal}')" class="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-lg shadow-sm"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            ${mealBar}
            <div class="space-y-2 mt-4">
                ${items.length === 0 ? '<p class="text-sm text-slate-300 font-bold text-center py-2">Пусто</p>' : items.map(f => {
                    return `
                    <div class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div class="flex-1 pr-4">
                            <p class="font-bold text-base text-slate-800">${f.n}</p>
                            <p class="text-[11px] text-slate-500 font-bold mt-1 flex gap-2">
                                <span>Б:${f.p} Ж:${f.f} У:${f.u} Кл:${f.fib||0}</span>
                                <span>•</span>
                                <span class="text-slate-700">${f.c} ккал</span>
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-black text-sm text-slate-400">${f.w}${f.n.includes('шт') ? 'шт' : 'г'}</span>
                            <button onclick="deleteFood(${dayData.food.indexOf(f)})" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 bg-white rounded-full shadow-sm transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>`;
    }).join('');
}

function addWater(amount) { haptic('light'); const dk = iso(pivotDate); sportData[dk].water = Math.max(0, (sportData[dk].water || 0) + amount); save(); render(); }

function openGoalModal() {
    haptic('light');
    const modal = $('goalModal'); if(!modal) return;
    const setVal = (id, val) => { const el = $(id); if(el) el.value = val; };
    setVal('goalC', userGoals.c); setVal('goalP', userGoals.p); setVal('goalF', userGoals.f);
    setVal('goalU', userGoals.u); setVal('goalFib', userGoals.fib); setVal('goalWater', userGoals.water);
    modal.style.display = 'flex';
}

function saveGoals() {
    const getVal = (id, def) => { const el = $(id); return el ? (parseInt(el.value)||def) : def; };
    userGoals = {
        c: getVal('goalC', 2500), p: getVal('goalP', 160), f: getVal('goalF', 70),
        u: getVal('goalU', 300), fib: getVal('goalFib', 30), water: getVal('goalWater', 2000)
    };
    try { localStorage.setItem('tma_user_goals', JSON.stringify(userGoals)); } catch(e){}
    haptic('success'); render(); closeModal('goalModal');
}

function openFoodModal(meal) {
    haptic('light'); currentMealForAdd = meal; 
    const typeEl = $('foodMealType'); if(typeEl) typeEl.value = meal; 
    const modal = $('foodModal'); if(modal) modal.style.display = 'flex';
    selectedFoodBase = null; 
    const search = $('foodSearch'); if(search) search.value = ''; 
    const name = $('customFoodName'); if(name) name.value = ''; 
    setTxt('customFoodWeightLabel', 'Вес (г)'); 
    const w = $('customFoodWeight'); if(w) w.value = '100';
    calcFood(); filterFood();
}

let searchTimeout;
function filterFood() {
    const searchInput = $('foodSearch');
    if(!searchInput) return;
    const q = searchInput.value.toLowerCase(); 
    const res = $('foodSearchResults'); 
    if(!res) return;
    res.innerHTML = '';
    if(!q) return;
    
    FOOD_DB.filter(f => f.n.toLowerCase().includes(q)).forEach(f => {
        const div = document.createElement('div');
        div.className = 'p-4 hover:bg-slate-50 rounded-2xl font-bold text-base cursor-pointer border-b border-slate-50 flex justify-between items-center';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="food-img-thumb flex items-center justify-center text-slate-300"><i class="fa-solid fa-utensils text-sm"></i></div>
                <span>${f.n}</span>
            </div>
            <span class="text-slate-400 text-sm">${f.c} ккал</span>
        `;
        div.onclick = () => {
            selectedFoodBase = f; 
            const nameEl = $('customFoodName'); if(nameEl) nameEl.value = f.n; 
            const isPiece = f.n.includes('шт'); 
            setTxt('customFoodWeightLabel', isPiece ? 'Кол-во (шт)' : 'Вес (г)'); 
            const wEl = $('customFoodWeight'); if(wEl) wEl.value = isPiece ? 1 : 100;
            calcFood(); res.innerHTML = ''; 
        };
        res.appendChild(div);
    });

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchFoodOnline(q), 800);
}

async function searchFoodOnline(q) {
    const res = $('foodSearchResults');
    if(!res) return;
    try {
        const resp = await fetch(`https://ru.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,image_front_small_url`);
        const data = await resp.json();
        if(data.products && data.products.length > 0) {
            data.products.forEach(p => {
                if(!p.product_name) return;
                const f = {
                    n: p.product_name,
                    c: Math.round(p.nutriments['energy-kcal'] || 0),
                    p: Math.round(p.nutriments.proteins || 0),
                    f: Math.round(p.nutriments.fat || 0),
                    u: Math.round(p.nutriments.carbohydrates || 0),
                    fib: Math.round(p.nutriments.fiber_100g || 0),
                    img: p.image_front_small_url || ''
                };
                const div = document.createElement('div');
                div.className = 'p-4 hover:bg-slate-50 rounded-2xl font-bold text-base cursor-pointer border-b border-slate-50 flex justify-between items-center text-blue-800 bg-blue-50/50';
                
                const imgHtml = f.img ? `<img src="${f.img}" class="food-img-thumb">` : `<div class="food-img-thumb flex items-center justify-center text-blue-300"><i class="fa-solid fa-globe text-sm"></i></div>`;
                
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        ${imgHtml}
                        <span>${f.n}</span>
                    </div>
                    <span class="text-blue-400 text-sm">${f.c} ккал</span>
                `;
                div.onclick = () => {
                    selectedFoodBase = f; 
                    const nameEl = $('customFoodName'); if(nameEl) nameEl.value = f.n; 
                    setTxt('customFoodWeightLabel', 'Вес (г)'); 
                    const wEl = $('customFoodWeight'); if(wEl) wEl.value = 100;
                    calcFood(); res.innerHTML = ''; 
                };
                res.appendChild(div);
            });
        }
    } catch(e) { console.log('API Search Error', e); }
}

function onWeightChange() { calcFood(); }
function onMacroChange() { selectedFoodBase = null; calcFood(); }

function calcFood() {
    const wInput = $('customFoodWeight');
    if(!wInput) return;
    const w = parseFloat(wInput.value) || 0;
    
    const setVal = (id, val) => { const el = $(id); if(el) el.value = val; };
    
    if (selectedFoodBase) {
        const multiplier = selectedFoodBase.n.includes('шт') ? w : w / 100;
        setVal('customFoodP', Math.round(selectedFoodBase.p * multiplier));
        setVal('customFoodF', Math.round(selectedFoodBase.f * multiplier));
        setVal('customFoodU', Math.round(selectedFoodBase.u * multiplier));
        setVal('customFoodFib', Math.round((selectedFoodBase.fib || 0) * multiplier));
        setVal('customFoodC', Math.round(selectedFoodBase.c * multiplier));
    } else {
        const getVal = (id) => { const el = $(id); return el ? (parseFloat(el.value)||0) : 0; };
        const p = getVal('customFoodP'), f = getVal('customFoodF'), u = getVal('customFoodU');
        setVal('customFoodC', Math.round((p*4 + f*9 + u*4)));
    }
}

function confirmAddFood() {
    try {
        const nameEl = $('customFoodName');
        if(!nameEl) return;
        const name = nameEl.value;
        if(!name) { alert('Введите название!'); return; }
        const dk = iso(pivotDate);
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        const getVal = (id, def) => { const el = $(id); return el ? (parseFloat(el.value)||def) : def; };
        
        sportData[dk].food.push({ 
            type: currentMealForAdd, n: name,
            w: getVal('customFoodWeight', 100), p: getVal('customFoodP', 0),
            f: getVal('customFoodF', 0), u: getVal('customFoodU', 0), 
            fib: getVal('customFoodFib', 0), c: parseInt(getVal('customFoodC', 0)),
            time: timeStr
        });
        haptic('success'); save(); render(); closeModal('foodModal');
    } catch(e) { console.error(e); }
}

function deleteFood(idx) { haptic('medium'); sportData[iso(pivotDate)].food.splice(idx, 1); save(); render(); }

// --- СКАНЕР ШТРИХ-КОДОВ ---
let isScanning = false;
function scanBarcode() {
    haptic('heavy');
    const container = $('scanner-container');
    if(!container) return;
    
    if (isScanning) {
        stopScanner(); return;
    }
    
    container.style.display = 'block';
    isScanning = true;
    
    Quagga.init({
        inputStream: { name: "Live", type: "LiveStream", target: container },
        decoder: { readers:["ean_reader", "ean_8_reader"] }
    }, function(err) {
        if (err) { alert('Ошибка камеры'); stopScanner(); return; }
        Quagga.start();
    });
    
    Quagga.onDetected(function(result) {
        if(!isScanning) return;
        const code = result.codeResult.code;
        stopScanner();
        
        const searchEl = $('foodSearch');
        if(searchEl) searchEl.value = code;
        
        fetchProductByCode(code);
    });
}

function stopScanner() {
    if (isScanning) {
        Quagga.stop(); 
        isScanning = false; 
        const container = $('scanner-container');
        if(container) container.style.display = 'none'; 
    }
}

async function fetchProductByCode(code) {
    const searchEl = $('foodSearch');
    if(searchEl) searchEl.value = 'Ищем в базе...';
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if(data.status === 1) {
            const p = data.product;
            selectedFoodBase = {
                n: p.product_name || 'Неизвестно',
                p: Math.round(p.nutriments.proteins_100g || 0),
                f: Math.round(p.nutriments.fat_100g || 0),
                u: Math.round(p.nutriments.carbohydrates_100g || 0),
                fib: Math.round(p.nutriments.fiber_100g || 0),
                c: Math.round(p.nutriments['energy-kcal'] || 0)
            };
            const nameEl = $('customFoodName'); if(nameEl) nameEl.value = selectedFoodBase.n;
            setTxt('customFoodWeightLabel', 'Вес (г)'); 
            const wEl = $('customFoodWeight'); if(wEl) wEl.value = '100';
            calcFood(); 
            if(searchEl) searchEl.value = ''; 
            haptic('success');
        } else { 
            alert('Продукт не найден в базе OpenFoodFacts.'); 
            if(searchEl) searchEl.value = code; 
            haptic('error'); 
        }
    } catch(e) { alert('Ошибка сети при поиске штрих-кода.'); if(searchEl) searchEl.value = ''; }
}

// === МОДУЛЬ АНАЛИТИКИ И КАЛЕНДАРЯ ===
function renderAnalytics() {
    const dates =[], cals = [], p=[], f=[], u=[], fib=[];
    let totalWo = 0, totalTon = 0;
    
    const now = new Date();
    for(let i=6; i>=0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dk = iso(d);
        dates.push(d.toLocaleDateString('ru-RU', {weekday:'short'}));
        
        const day = sportData[dk] || { food:[], workout:[] };
        
        let dc=0, dp=0, df=0, du=0, dfib=0;
        day.food.forEach(item => { dc+=item.c; dp+=item.p; df+=item.f; du+=item.u; dfib+=(item.fib||0); });
        cals.push(dc); p.push(dp); f.push(df); u.push(du); fib.push(dfib);
        
        if(day.workout.length > 0) {
            totalWo++;
            day.workout.forEach(w => { 
                if(w.sets) w.sets.forEach(s => totalTon += (parseFloat(s.w)||0) * (parseFloat(s.r)||0));
            });
        }
    }
    
    setTxt('statTotalWo', totalWo);
    const tonEl = $('statTonnage');
    if(tonEl) tonEl.innerHTML = (totalTon / 1000).toFixed(1) + '<span class="text-sm">т</span>';
    
    const calGoals = Array(7).fill(userGoals.c);
    drawChart('chartCalsLine', 'line', {
        labels: dates,
        datasets:[
            { label: 'Съедено', data: cals, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', fill: true, tension: 0.4 },
            { label: 'Цель', data: calGoals, borderColor: '#94a3b8', borderDash: [5, 5], pointRadius: 0, fill: false }
        ]
    });
    
    drawChart('chartCals', 'bar', { 
        labels: dates, 
        datasets:[
            { label: 'Белки', data: p, backgroundColor: '#4ade80', borderRadius: 2 },
            { label: 'Жиры', data: f, backgroundColor: '#a855f7', borderRadius: 2 },
            { label: 'Углеводы', data: u, backgroundColor: '#60a5fa', borderRadius: 2 },
            { label: 'Клетчатка', data: fib, backgroundColor: '#facc15', borderRadius: 2 }
        ] 
    }, { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { display: false } } } });
    
    // ДОБАВЛЕНО: График потребления воды за 7 дней
    const waterDates = [], waterData =[];
    for(let i=6; i>=0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        waterDates.push(d.toLocaleDateString('ru-RU', {weekday:'short'}));
        waterData.push((sportData[iso(d)]?.water || 0));
    }
    drawChart('chartWater', 'bar', {
        labels: waterDates,
        datasets:[{ label: 'Вода (мл)', data: waterData, backgroundColor: '#3b82f6', borderRadius: 4 }]
    });
    
    const avgP = p.reduce((a,b)=>a+b,0)/7, avgF = f.reduce((a,b)=>a+b,0)/7, avgU = u.reduce((a,b)=>a+b,0)/7;
    drawChart('chartMacros', 'doughnut', {
        labels:['Белки', 'Жиры', 'Углеводы'],
        datasets:[{ data:[avgP, avgF, avgU], backgroundColor:['#4ade80', '#a855f7', '#60a5fa'], borderWidth: 0 }]
    }, { cutout: '70%', plugins: { legend: { position: 'right' } } });

    populateExSelect();
}

// === ШАБЛОНЫ ===
function openSaveTplModal(type, mealType = '') {
    haptic('light');
    currentTplType = type; currentMealForAdd = mealType;
    const dk = iso(pivotDate);
    if(type === 'workout' && sportData[dk].workout.length === 0) return alert('Тренировка пуста!');
    if(type === 'meal' && sportData[dk].food.filter(f => f.type === mealType).length === 0) return alert('Прием пищи пуст!');
    const nameEl = $('tplNameInput'); if(nameEl) nameEl.value = type === 'meal' ? mealType : '';
    const modal = $('saveTplModal'); if(modal) modal.style.display = 'flex';
}

function confirmSaveTemplate() {
    const nameEl = $('tplNameInput');
    if(!nameEl) return;
    const name = nameEl.value;
    if(!name) return alert('Введите название!');
    const dk = iso(pivotDate);
    if(currentTplType === 'workout') {
        sportData._templates.push({ id: Date.now(), name: name, items: JSON.parse(JSON.stringify(sportData[dk].workout)) });
    } else if(currentTplType === 'meal') {
        const items = sportData[dk].food.filter(f => f.type === currentMealForAdd);
        sportData._mealTemplates.push({ id: Date.now(), name: name, items: JSON.parse(JSON.stringify(items)) });
    }
    haptic('success'); save(); closeModal('saveTplModal');
}

function openLoadTplModal(type, mealType = '') {
    haptic('light');
    currentTplType = type; currentMealForAdd = mealType;
    const list = $('tplList'); 
    if(!list) return;
    list.innerHTML = '';
    const tpls = type === 'workout' ? sportData._templates : sportData._mealTemplates;
    
    if(!tpls || tpls.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 text-sm font-bold py-4">Нет сохраненных шаблонов</p>';
    } else {
        tpls.forEach(t => {
            list.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2 cursor-pointer" onclick="applyTemplate(${t.id})">
                <div><p class="font-bold text-sm text-slate-700">${t.name}</p><p class="text-[10px] text-slate-400 font-bold">${t.items.length} элементов</p></div>
                <button onclick="event.stopPropagation(); deleteTemplate(${t.id})" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 bg-white rounded-full shadow-sm transition"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        });
    }
    const modal = $('loadTplModal'); if(modal) modal.style.display = 'flex';
}

function applyTemplate(id) {
    const dk = iso(pivotDate);
    if(currentTplType === 'workout') {
        const t = sportData._templates.find(x => x.id === id);
        if(t) sportData[dk].workout.push(...JSON.parse(JSON.stringify(t.items)));
    } else if(currentTplType === 'meal') {
        const t = sportData._mealTemplates.find(x => x.id === id);
        if(t) {
            const newItems = JSON.parse(JSON.stringify(t.items)).map(i => ({...i, type: currentMealForAdd}));
            sportData[dk].food.push(...newItems);
        }
    }
    haptic('success'); save(); render(); closeModal('loadTplModal');
}

function deleteTemplate(id) {
    if(confirm('Удалить шаблон?')) {
        if(currentTplType === 'workout') sportData._templates = sportData._templates.filter(x => x.id !== id);
        else sportData._mealTemplates = sportData._mealTemplates.filter(x => x.id !== id);
        save(); openLoadTplModal(currentTplType, currentMealForAdd);
    }
}

function populateExSelect() {
    const select = $('analyticsExSelect');
    if(!select) return;
    const exSet = new Set();
    Object.values(sportData).forEach(d => d.workout?.forEach(w => exSet.add(w.name || w.n)));
    
    select.innerHTML = '<option value="">Выберите упражнение...</option>';
    Array.from(exSet).sort().forEach(ex => {
        if(ex) select.innerHTML += `<option value="${ex}">${ex}</option>`;
    });
}

function renderExProgressChart() {
    const select = $('analyticsExSelect');
    if(!select) return;
    const exName = select.value;
    if(!exName) {
        if(charts['chartExProgress']) charts['chartExProgress'].destroy();
        return;
    }
    
    const dates = [];
    const maxWeights =[];
    
    const now = new Date();
    for(let i=29; i>=0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dk = iso(d);
        const dayData = sportData[dk];
        
        if(dayData && dayData.workout) {
            const ex = dayData.workout.find(w => (w.name || w.n) === exName);
            if(ex && ex.sets) {
                dates.push(d.toLocaleDateString('ru-RU', {day:'numeric', month:'short'}));
                let maxW = 0;
                ex.sets.forEach(s => { if(parseFloat(s.w) > maxW) maxW = parseFloat(s.w); });
                maxWeights.push(maxW);
            }
        }
    }
    
    drawChart('chartExProgress', 'line', {
        labels: dates,
        datasets:[{ label: 'Макс. вес (кг)', data: maxWeights, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
    });
}

function drawChart(id, type, data, opts={}) {
    if(charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if(!ctx) return;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = "var(--tg-theme-hint-color, #94a3b8)";
    charts[id] = new Chart(ctx, { type: type, data: data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: type==='doughnut' } }, scales: type==='doughnut' ? {} : { x: { grid: { display: false } } }, ...opts } });
}

// Запуск
initData();
