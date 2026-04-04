const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ВАЖНО: Вставь свои ключи Supabase!
const SUPABASE_URL = 'https://hvoznktittcvsqtepopp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mw_ldS2k_bWXSWd4ikNQCA_rCZ6OQYs'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Безопасный вызов Haptic Feedback (не ломает код на ПК)
function haptic(style = 'light') { 
    try {
        if(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style); 
        }
    } catch(e) {} 
}

function setSyncStatus(status) {
    const el = $('syncStatus');
    if(!el) return;
    if(status === 'loading') el.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-blue-400 animate-pulse"></i>';
    else if(status === 'success') { el.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>'; setTimeout(() => { el.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i>'; }, 2000); }
    else if(status === 'error') el.innerHTML = '<i class="fa-solid fa-cloud-xmark text-red-500"></i>';
    else el.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i>';
}

const EX_DB =["Жим лежа","Жим гантелей","Жим на наклонной","Разводка гантелей","Отжимания","Отжимания на брусьях","Приседания со штангой","Фронтальные приседания","Жим ногами","Выпады","Разгибания ног","Сгибания ног","Румынская тяга","Становая тяга","Тяга в наклоне","Тяга блока к груди","Подтягивания","Тяга гантели одной рукой","Гиперэкстензия","Армейский жим","Жим Арнольда","Махи в стороны","Махи перед собой","Тяга к подбородку","Подъем на бицепс (штанга)","Молотки","Концентрированный подъем","Французский жим","Разгибания на блоке","Планка","Скручивания","Подъем ног в висе","Русский твист","Бег","Эллипс","Велотренажер","Гребля","Скакалка","Берпи"].sort();
const CARDIO_LIST =['бег', 'эллипс', 'велотренажер', 'гребля', 'скакалка', 'берпи', 'ходьба', 'степпер'];

const FOOD_DB =[
    {n:"Гречка (сухая)", c:330, p:12, f:3, u:72, fib: 10},
    {n:"Овсянка", c:360, p:12, f:6, u:60, fib: 11},
    {n:"Рис белый", c:360, p:7, f:1, u:79, fib: 1},
    {n:"Макароны тв. сортов", c:350, p:12, f:1, u:70, fib: 3},
    {n:"Куриная грудка (сырая)", c:113, p:23, f:2, u:0, fib: 0},
    {n:"Говядина постная", c:180, p:20, f:10, u:0, fib: 0},
    {n:"Яйцо (1шт)", c:70, p:6, f:5, u:0, fib: 0}, 
    {n:"Творог 5%", c:121, p:17, f:5, u:2, fib: 0},
    {n:"Банан (1шт)", c:105, p:1, f:0, u:27, fib: 3},
    {n:"Яблоко (1шт)", c:95, p:0, f:0, u:25, fib: 4},
    {n:"Огурец", c:15, p:1, f:0, u:3, fib: 1},
    {n:"Помидор", c:20, p:1, f:0, u:4, fib: 1},
    {n:"Масло оливковое", c:884, p:0, f:100, u:0, fib: 0},
    {n:"Протеин (скуп 30г)", c:120, p:24, f:1, u:3, fib: 0}
];

let pivotDate = new Date();
let currentTab = 'sport';
let userGoals = JSON.parse(localStorage.getItem('tma_user_goals')) || { c: 2500, p: 160, f: 70, u: 300, fib: 30, water: 2000 };
let sportData = {};
let charts = {};
let calPivot = new Date();

let selectedFoodBase = null;
let isCardioSelected = false;
let currentTplType = 'workout'; 
let currentMealForAdd = '';

// --- ОБЛАЧНЫЕ СОХРАНЕНИЯ SUPABASE ---
async function initData() {
    setSyncStatus('loading');
    try { sportData = JSON.parse(localStorage.getItem('tma_sport_data')) || {}; } catch(e) { sportData = {}; }
    
    if(!sportData._templates) sportData._templates =[];
    if(!sportData._mealTemplates) sportData._mealTemplates =[];
    
    render(); 
    const tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) ? window.Telegram.WebApp.initDataUnsafe.user : { id: 123456789 };
    try {
        let { data, error } = await supabaseClient.from('user_data').select('data').eq('telegram_id', tgUser.id).single();
        if (data && data.data) {
            sportData = data.data;
            if(!sportData._templates) sportData._templates =[];
            if(!sportData._mealTemplates) sportData._mealTemplates =[];
            localStorage.setItem('tma_sport_data', JSON.stringify(sportData));
            render(); setSyncStatus('success');
        } else setSyncStatus('idle');
    } catch (err) { setSyncStatus('error'); }
}

function save() {
    try {
        localStorage.setItem('tma_sport_data', JSON.stringify(sportData));
        // Фоновая отправка, не блокирует UI
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
    if(slider && index !== undefined) slider.style.transform = `translateX(${index * 100}%)`;

    ['sport', 'nutrition', 'analytics'].forEach(t => {
        const btn = $(`tab-${t}`); const view = $(`view-${t}`);
        if(btn) btn.classList.toggle('active', tab === t);
        if(view) view.classList.toggle('hidden', tab !== t);
    });
    render();
}

function changeDate(delta) { haptic('light'); pivotDate.setDate(pivotDate.getDate() + delta); render(); }
function goToday() { haptic('light'); pivotDate = new Date(); render(); }
function closeModal(id) { $(id).style.display = 'none'; }

function render() {
    const dk = iso(pivotDate);
    const isToday = dk === iso(new Date());
    $('dateDisplay').innerText = isToday ? 'Сегодня' : pivotDate.toLocaleDateString('ru-RU', {weekday: 'long'});
    $('dateSubDisplay').innerText = pivotDate.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'});

    if(!sportData[dk]) sportData[dk] = { workout: [], food:[], water: 0, activeMeals:['Завтрак', 'Обед', 'Ужин', 'Перекус'] };

    if (currentTab === 'sport') renderSport(dk);
    if (currentTab === 'nutrition') renderNutrition(dk);
    if (currentTab === 'analytics') renderAnalytics();
}

// === МОДУЛЬ СПОРТА ===
function renderSport(dk) {
    const list = $('workoutList');
    const workout = sportData[dk].workout;
    
    if (workout.length === 0) {
        list.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold"><i class="fa-solid fa-dumbbell text-4xl mb-3 opacity-20"></i><p>Нет тренировок</p></div>';
        return;
    }

    const groups =[];
    workout.forEach((w, i) => {
        const last = groups[groups.length - 1];
        if (last && last.name === w.n) last.sets.push({...w, idx: i});
        else groups.push({ name: w.n, sets:[{...w, idx: i}] });
    });

    list.innerHTML = groups.map(g => {
        const isCardio = CARDIO_LIST.some(c => g.name.toLowerCase().includes(c));
        const label1 = isCardio ? 'мин' : 'кг';
        const label2 = isCardio ? 'ур' : '×';

        return `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-black text-lg">${g.name}</h4>
                <button onclick="addSet('${g.name}')" class="text-blue-500 text-sm font-bold bg-blue-50 px-3 py-1 rounded-lg">+ Подход</button>
            </div>
            <div class="space-y-2">
                ${g.sets.map((s, i) => `
                    <div class="set-row">
                        <span class="text-xs font-bold text-slate-400 w-4">${i+1}</span>
                        <input type="number" value="${s.w}" onchange="updateSet(${s.idx}, 'w', this.value)" class="set-input flex-1" placeholder="${isCardio ? 'Время' : 'Вес'}">
                        <span class="text-xs text-slate-400">${label1}</span>
                        <span class="text-slate-300 mx-1">${isCardio ? '|' : label2}</span>
                        <input type="number" value="${s.r}" onchange="updateSet(${s.idx}, 'r', this.value)" class="set-input flex-1" placeholder="${isCardio ? 'Уровень' : 'Повт'}">
                        <button onclick="deleteSet(${s.idx})" class="text-slate-300 hover:text-red-500 ml-2"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('')}
            </div>
        </div>
    `}).join('');
}

function openExModal() {
    haptic('light');
    $('exModal').style.display = 'flex';
    $('exSearch').value = ''; $('exWeight').value = ''; $('exReps').value = '';
    isCardioSelected = false;
    $('exInput1Label').innerText = 'Вес (кг)';
    $('exInput2Label').innerText = 'Повторы';
    filterEx();
}

function filterEx() {
    const q = $('exSearch').value.toLowerCase();
    const res = $('exSearchResults');
    res.innerHTML = '';
    EX_DB.filter(ex => ex.toLowerCase().includes(q)).forEach(ex => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50';
        div.innerText = ex;
        div.onclick = () => { 
            $('exSearch').value = ex; 
            res.innerHTML = ''; 
            isCardioSelected = CARDIO_LIST.some(c => ex.toLowerCase().includes(c));
            $('exInput1Label').innerText = isCardioSelected ? 'Время (мин)' : 'Вес (кг)';
            $('exInput2Label').innerText = isCardioSelected ? 'Уровень / Наклон' : 'Повторы';
        };
        res.appendChild(div);
    });
}

function confirmAddEx() {
    try {
        const name = $('exSearch').value;
        if(!name) { alert('Введите название!'); return; }
        const dk = iso(pivotDate);
        const w = $('exWeight').value;
        const r = $('exReps').value;
        
        const setsCount = isCardioSelected ? 1 : 3;
        for(let i=0; i < setsCount; i++) sportData[dk].workout.push({ n: name, w: w, r: r });
        
        haptic('success');
        save(); 
        render(); 
        closeModal('exModal');
    } catch(e) { console.error(e); }
}

function addSet(name) {
    haptic('light');
    const dk = iso(pivotDate);
    const lastSet = [...sportData[dk].workout].reverse().find(w => w.n === name);
    sportData[dk].workout.push({ n: name, w: lastSet?.w||'', r: lastSet?.r||'' });
    save(); render();
}

function updateSet(idx, field, val) { sportData[iso(pivotDate)].workout[idx][field] = val; save(); }
function deleteSet(idx) { haptic('medium'); sportData[iso(pivotDate)].workout.splice(idx, 1); save(); render(); }

function shareWorkout() {
    haptic('medium');
    const dk = iso(pivotDate);
    const day = sportData[dk];
    if (!day || !day.workout || day.workout.length === 0) return alert('Нет тренировок для шеринга!');
    let tonnage = 0;
    day.workout.forEach(w => tonnage += (parseFloat(w.w)||0) * (parseFloat(w.r)||0));
    const text = `🔥 Отличная тренировка!\nТоннаж: ${tonnage} кг\nПодходов: ${day.workout.length}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/your_bot_name/app')}&text=${encodeURIComponent(text)}`;
    if(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

// === ШАБЛОНЫ ===
function openSaveTplModal(type, mealType = '') {
    haptic('light');
    currentTplType = type; currentMealForAdd = mealType;
    const dk = iso(pivotDate);
    if(type === 'workout' && sportData[dk].workout.length === 0) return alert('Тренировка пуста!');
    if(type === 'meal' && sportData[dk].food.filter(f => f.type === mealType).length === 0) return alert('Прием пищи пуст!');
    $('tplNameInput').value = type === 'meal' ? mealType : '';
    $('saveTplModal').style.display = 'flex';
}

function confirmSaveTemplate() {
    const name = $('tplNameInput').value;
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
    const list = $('tplList'); list.innerHTML = '';
    const tpls = type === 'workout' ? sportData._templates : sportData._mealTemplates;
    
    if(!tpls || tpls.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 text-sm font-bold py-4">Нет сохраненных шаблонов</p>';
    } else {
        tpls.forEach(t => {
            list.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2 cursor-pointer" onclick="applyTemplate(${t.id})">
                <div><p class="font-bold text-sm text-slate-700">${t.name}</p><p class="text-[10px] text-slate-400 font-bold">${t.items.length} элементов</p></div>
                <button onclick="event.stopPropagation(); deleteTemplate(${t.id})" class="text-slate-300 hover:text-red-500 px-2"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        });
    }
    $('loadTplModal').style.display = 'flex';
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

// === КАЛЬКУЛЯТОР 1RM ===
function openRmModal() {
    haptic('light'); $('rmModal').style.display = 'flex'; $('rmW').value = ''; $('rmR').value = ''; calcRM();
}

function calcRM() {
    const w = parseFloat($('rmW').value) || 0, r = parseFloat($('rmR').value) || 0;
    if (w > 0 && r > 0) {
        const rm = Math.round(w * (1 + r / 30));
        $('rmResult').innerText = rm + ' кг';
        $('rm90').innerText = Math.round(rm * 0.9); $('rm80').innerText = Math.round(rm * 0.8);
        $('rm70').innerText = Math.round(rm * 0.7); $('rm60').innerText = Math.round(rm * 0.6);
    } else {
        $('rmResult').innerText = '0 кг';['rm90','rm80','rm70','rm60'].forEach(id => $(id).innerText = '0');
    }
}

// === МОДУЛЬ ПИТАНИЯ ===
function renderNutrition(dk) {
    const dayData = sportData[dk];
    let tc=0, tp=0, tf=0, tu=0, tfib=0;
    dayData.food.forEach(f => { tc+=f.c; tp+=f.p; tf+=f.f; tu+=f.u; tfib+=(f.fib||0); });
    
    $('calEaten').innerText = tc; $('calLeft').innerText = userGoals.c - tc;
    $('calGoalDisplay').innerText = userGoals.c;
    $('pVal').innerText = `${Math.round(tp)}/${userGoals.p}`; 
    $('fVal').innerText = `${Math.round(tf)}/${userGoals.f}`; 
    $('cVal').innerText = `${Math.round(tu)}/${userGoals.u}`;
    $('fibVal').innerText = `${Math.round(tfib)}/${userGoals.fib}`;
    
    // Глобальный прогресс-бар БЖУК
    let totalM = tp + tf + tu + tfib;
    $('globalMacroBar').innerHTML = totalM > 0 ? `
        <div class="bg-green-400" style="width:${(tp/totalM)*100}%"></div>
        <div class="bg-red-400" style="width:${(tf/totalM)*100}%"></div>
        <div class="bg-blue-400" style="width:${(tu/totalM)*100}%"></div>
        <div class="bg-yellow-400" style="width:${(tfib/totalM)*100}%"></div>
    ` : '';

    const waterVal = dayData.water || 0;
    $('waterVal').innerHTML = `${waterVal} <span class="text-lg opacity-50">/ ${userGoals.water}</span>`;
    const waterPct = Math.min((waterVal / userGoals.water) * 100, 100);
    $('waterFill').style.height = `${waterPct}%`;

    const list = $('foodList');
    list.innerHTML = dayData.activeMeals.map(meal => {
        const items = dayData.food.filter(f => f.type === meal);
        let mc=0, mp=0, mf=0, mu=0, mfib=0; 
        items.forEach(i => { mc+=i.c; mp+=i.p; mf+=i.f; mu+=i.u; mfib+=(i.fib||0); });
        
        let mTotal = mp + mf + mu + mfib;
        let mealBar = mTotal > 0 ? `
            <div class="flex h-1 w-full rounded-full overflow-hidden mt-2 opacity-80">
                <div class="bg-green-500" style="width:${(mp/mTotal)*100}%"></div>
                <div class="bg-red-500" style="width:${(mf/mTotal)*100}%"></div>
                <div class="bg-blue-500" style="width:${(mu/mTotal)*100}%"></div>
                <div class="bg-yellow-500" style="width:${(mfib/mTotal)*100}%"></div>
            </div>
        ` : '';

        return `
        <div class="card">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-black text-lg">${meal}</h4>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 mr-2">${mc} ккал</span>
                    <button onclick="openSaveTplModal('meal', '${meal}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i class="fa-solid fa-floppy-disk"></i></button>
                    <button onclick="openLoadTplModal('meal', '${meal}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i class="fa-solid fa-folder-open"></i></button>
                    <button onclick="openFoodModal('${meal}')" class="w-8 h-8 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            ${mealBar}
            <div class="space-y-2 mt-3">
                ${items.length === 0 ? '<p class="text-xs text-slate-300 font-bold">Пусто</p>' : items.map(f => {
                    let fTotal = f.p + f.f + f.u + (f.fib||0);
                    let foodBar = fTotal > 0 ? `
                        <div class="flex h-1 w-full rounded-full overflow-hidden mt-1.5 opacity-60">
                            <div class="bg-green-500" style="width:${(f.p/fTotal)*100}%"></div>
                            <div class="bg-red-500" style="width:${(f.f/fTotal)*100}%"></div>
                            <div class="bg-blue-500" style="width:${(f.u/fTotal)*100}%"></div>
                            <div class="bg-yellow-500" style="width:${((f.fib||0)/fTotal)*100}%"></div>
                        </div>
                    ` : '';
                    return `
                    <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <div class="flex-1 mr-4">
                            <p class="font-bold text-sm">${f.n}</p>
                            <p class="text-[10px] text-slate-400 font-bold">${f.w}${f.n.includes('шт') ? 'шт' : 'г'} • Б:${f.p} Ж:${f.f} У:${f.u} Кл:${f.fib||0}</p>
                            ${foodBar}
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-black text-sm">${f.c}</span>
                            <button onclick="deleteFood(${dayData.food.indexOf(f)})" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>`;
    }).join('');
}

function addWater(amount) { 
    haptic('light'); 
    const dk = iso(pivotDate); 
    sportData[dk].water = Math.max(0, (sportData[dk].water || 0) + amount); 
    save(); render(); 
}

function openGoalModal() {
    haptic('light');
    $('goalC').value = userGoals.c; $('goalP').value = userGoals.p; $('goalF').value = userGoals.f;
    $('goalU').value = userGoals.u; $('goalFib').value = userGoals.fib; $('goalWater').value = userGoals.water;
    $('goalModal').style.display = 'flex';
}

function saveGoals() {
    userGoals = {
        c: parseInt($('goalC').value)||2500, p: parseInt($('goalP').value)||160, f: parseInt($('goalF').value)||70,
        u: parseInt($('goalU').value)||300, fib: parseInt($('goalFib').value)||30, water: parseInt($('goalWater').value)||2000
    };
    localStorage.setItem('tma_user_goals', JSON.stringify(userGoals));
    haptic('success'); render(); closeModal('goalModal');
}

function openFoodModal(meal) {
    haptic('light'); currentMealForAdd = meal; $('foodMealType').value = meal; $('foodModal').style.display = 'flex';
    selectedFoodBase = null; $('foodSearch').value = ''; $('customFoodName').value = ''; $('customFoodWeightLabel').innerText = 'Вес (г)'; $('customFoodWeight').value = '100';
    calcFood(); filterFood();
}

let searchTimeout;
function filterFood() {
    const q = $('foodSearch').value.toLowerCase(); const res = $('foodSearchResults'); res.innerHTML = '';
    if(!q) return;
    
    FOOD_DB.filter(f => f.n.toLowerCase().includes(q)).forEach(f => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50 flex justify-between items-center';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="food-img-thumb flex items-center justify-center text-slate-300"><i class="fa-solid fa-utensils text-xs"></i></div>
                <span>${f.n}</span>
            </div>
            <span class="text-slate-400 text-xs">${f.c} ккал</span>
        `;
        div.onclick = () => {
            selectedFoodBase = f; $('customFoodName').value = f.n; 
            const isPiece = f.n.includes('шт'); $('customFoodWeightLabel').innerText = isPiece ? 'Кол-во (шт)' : 'Вес (г)'; $('customFoodWeight').value = isPiece ? 1 : 100;
            calcFood(); res.innerHTML = ''; 
        };
        res.appendChild(div);
    });

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchFoodOnline(q), 800);
}

async function searchFoodOnline(q) {
    const res = $('foodSearchResults');
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
                div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50 flex justify-between items-center text-blue-800 bg-blue-50/50';
                
                const imgHtml = f.img ? `<img src="${f.img}" class="food-img-thumb">` : `<div class="food-img-thumb flex items-center justify-center text-blue-300"><i class="fa-solid fa-globe text-xs"></i></div>`;
                
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        ${imgHtml}
                        <span>${f.n}</span>
                    </div>
                    <span class="text-blue-400 text-xs">${f.c} ккал</span>
                `;
                div.onclick = () => {
                    selectedFoodBase = f; $('customFoodName').value = f.n; 
                    $('customFoodWeightLabel').innerText = 'Вес (г)'; $('customFoodWeight').value = 100;
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
    const w = parseFloat($('customFoodWeight').value) || 0;
    if (selectedFoodBase) {
        const multiplier = selectedFoodBase.n.includes('шт') ? w : w / 100;
        $('customFoodP').value = Math.round(selectedFoodBase.p * multiplier);
        $('customFoodF').value = Math.round(selectedFoodBase.f * multiplier);
        $('customFoodU').value = Math.round(selectedFoodBase.u * multiplier);
        $('customFoodFib').value = Math.round((selectedFoodBase.fib || 0) * multiplier);
        $('customFoodC').value = Math.round(selectedFoodBase.c * multiplier);
    } else {
        const p = parseFloat($('customFoodP').value)||0, f = parseFloat($('customFoodF').value)||0, u = parseFloat($('customFoodU').value)||0;
        $('customFoodC').value = Math.round((p*4 + f*9 + u*4));
    }
}

function confirmAddFood() {
    try {
        const name = $('customFoodName').value;
        if(!name) { alert('Введите название!'); return; }
        const dk = iso(pivotDate);
        sportData[dk].food.push({ 
            type: currentMealForAdd, n: name,
            w: parseFloat($('customFoodWeight').value)||100, p: parseFloat($('customFoodP').value)||0,
            f: parseFloat($('customFoodF').value)||0, u: parseFloat($('customFoodU').value)||0, 
            fib: parseFloat($('customFoodFib').value)||0, c: parseInt($('customFoodC').value)||0 
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
    
    if (isScanning) {
        Quagga.stop(); isScanning = false; container.style.display = 'none'; return;
    }
    
    container.style.display = 'block';
    isScanning = true;
    
    Quagga.init({
        inputStream: { name: "Live", type: "LiveStream", target: container },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, function(err) {
        if (err) { alert('Ошибка камеры'); container.style.display = 'none'; isScanning = false; return; }
        Quagga.start();
    });
    
    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        Quagga.stop(); isScanning = false; container.style.display = 'none';
        fetchProductByCode(code);
    });
}

async function fetchProductByCode(code) {
    $('foodSearch').value = 'Ищем в базе...';
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
            $('customFoodName').value = selectedFoodBase.n;
            $('customFoodWeightLabel').innerText = 'Вес (г)'; $('customFoodWeight').value = '100';
            calcFood(); $('foodSearch').value = ''; haptic('success');
        } else { 
            alert('Продукт не найден в базе OpenFoodFacts.'); 
            $('foodSearch').value = code; haptic('error'); 
        }
    } catch(e) { alert('Ошибка сети при поиске штрих-кода.'); $('foodSearch').value = ''; }
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
            day.workout.forEach(w => { totalTon += (parseFloat(w.w)||0) * (parseFloat(w.r)||0); });
        }
    }
    
    $('statTotalWo').innerText = totalWo;
    $('statTonnage').innerHTML = (totalTon / 1000).toFixed(1) + '<span class="text-sm">т</span>';
    
    // ПУНКТ 5: График БЖУК за 7 дней (Группированный)
    drawChart('chartCals', 'bar', { 
        labels: dates, 
        datasets:[
            { label: 'Белки', data: p, backgroundColor: '#22c55e', borderRadius: 2 },
            { label: 'Жиры', data: f, backgroundColor: '#ef4444', borderRadius: 2 },
            { label: 'Углеводы', data: u, backgroundColor: '#3b82f6', borderRadius: 2 },
            { label: 'Клетчатка', data: fib, backgroundColor: '#eab308', borderRadius: 2 }
        ] 
    }, { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { display: false } } } });
    
    const avgP = p.reduce((a,b)=>a+b,0)/7, avgF = f.reduce((a,b)=>a+b,0)/7, avgU = u.reduce((a,b)=>a+b,0)/7;
    drawChart('chartMacros', 'doughnut', {
        labels:['Белки', 'Жиры', 'Углеводы'],
        datasets:[{ data:[avgP, avgF, avgU], backgroundColor:['#22c55e', '#ef4444', '#3b82f6'], borderWidth: 0 }]
    }, { cutout: '70%', plugins: { legend: { position: 'right' } } });

    renderCalendar();
    populateExSelect();
}

function toggleCalendar() {
    const wrap = $('calendarWrapper');
    const icon = $('calToggleIcon');
    if(wrap.style.maxHeight === '0px' || wrap.style.maxHeight === '') {
        wrap.style.maxHeight = '300px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        wrap.style.maxHeight = '0px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function changeCalMonth(delta) { haptic('light'); calPivot.setMonth(calPivot.getMonth() + delta); renderCalendar(); }

function renderCalendar() {
    const grid = $('analyticsCalendar');
    if(!grid) return;
    grid.innerHTML = '';
    
    const year = calPivot.getFullYear();
    const month = calPivot.getMonth();
    $('calMonthLabel').innerText = calPivot.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'});
    $('calCurrentDateBadge').innerText = new Date().toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'});
    
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
        
        let bgClass = 'bg-slate-50 text-slate-600';
        if(hasWorkout) bgClass = 'bg-blue-100 text-blue-600 font-black border border-blue-200';
        if(isToday) bgClass += ' ring-2 ring-orange-400';
        
        grid.innerHTML += `<div onclick="openDayDetails('${dk}')" class="h-10 rounded-xl flex items-center justify-center text-xs cursor-pointer ${bgClass}">${i}</div>`;
    }
}

function openDayDetails(dk) {
    haptic('light');
    const dayData = sportData[dk];
    const content = $('dayModalContent');
    $('dayModalTitle').innerText = new Date(dk).toLocaleDateString('ru-RU', {day:'numeric', month:'long'});
    
    if(!dayData || (!dayData.workout.length && !dayData.food.length)) {
        content.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">Нет данных за этот день</p>';
    } else {
        let html = '';
        if(dayData.workout.length > 0) {
            let ton = 0;
            dayData.workout.forEach(w => ton += (parseFloat(w.w)||0)*(parseFloat(w.r)||0));
            html += `<h4 class="font-black text-sm mb-2 text-blue-500"><i class="fa-solid fa-dumbbell"></i> Тренировка (${ton} кг)</h4>`;
            dayData.workout.forEach(w => {
                html += `<div class="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg mb-1 flex justify-between"><span>${w.n}</span><span>${w.w} × ${w.r}</span></div>`;
            });
        }
        if(dayData.food.length > 0) {
            let cal = 0;
            dayData.food.forEach(f => cal += f.c);
            html += `<h4 class="font-black text-sm mt-4 mb-2 text-orange-500"><i class="fa-solid fa-utensils"></i> Питание (${cal} ккал)</h4>`;
            dayData.food.forEach(f => {
                html += `<div class="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg mb-1 flex justify-between"><span>${f.n}</span><span>${f.c} ккал</span></div>`;
            });
        }
        content.innerHTML = html;
    }
    $('dayModal').style.display = 'flex';
}

function populateExSelect() {
    const select = $('analyticsExSelect');
    if(!select) return;
    const exSet = new Set();
    Object.values(sportData).forEach(d => d.workout?.forEach(w => exSet.add(w.n)));
    
    select.innerHTML = '<option value="">Выберите упражнение...</option>';
    Array.from(exSet).sort().forEach(ex => {
        select.innerHTML += `<option value="${ex}">${ex}</option>`;
    });
}

function renderExProgressChart() {
    const exName = $('analyticsExSelect').value;
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
            const sets = dayData.workout.filter(w => w.n === exName);
            if(sets.length > 0) {
                dates.push(d.toLocaleDateString('ru-RU', {day:'numeric', month:'short'}));
                let maxW = 0;
                sets.forEach(s => { if(parseFloat(s.w) > maxW) maxW = parseFloat(s.w); });
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
