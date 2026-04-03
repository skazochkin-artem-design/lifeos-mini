// --- ИНИЦИАЛИЗАЦИЯ TELEGRAM ---
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- НАСТРОЙКИ SUPABASE ---
const SUPABASE_URL = 'https://hvoznktittcvsqtepopp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mw_ldS2k_bWXSWd4ikNQCA_rCZ6OQYs'; // Вставь сюда скопированный Publishable key (sb_publishable_...)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Настройка нативной кнопки Telegram
tg.MainButton.textColor = "#ffffff";
tg.MainButton.color = "#3b82f6";

// Утилиты
const $ = id => document.getElementById(id);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function haptic(style = 'light') { if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style); }

// --- БАЗЫ ДАННЫХ ---
const EX_DB =["Жим лежа","Жим гантелей","Жим на наклонной","Разводка гантелей","Отжимания","Отжимания на брусьях","Приседания со штангой","Фронтальные приседания","Жим ногами","Выпады","Разгибания ног","Сгибания ног","Румынская тяга","Становая тяга","Тяга в наклоне","Тяга блока к груди","Подтягивания","Тяга гантели одной рукой","Гиперэкстензия","Армейский жим","Жим Арнольда","Махи в стороны","Махи перед собой","Тяга к подбородку","Подъем на бицепс (штанга)","Молотки","Концентрированный подъем","Французский жим","Разгибания на блоке","Планка","Скручивания","Подъем ног в висе","Русский твист","Бег","Эллипс","Велотренажер","Гребля","Скакалка","Берпи"].sort();

const FOOD_DB =[
    {n:"Гречка (сухая)", c:330, p:12, f:3, u:72},
    {n:"Овсянка", c:360, p:12, f:6, u:60},
    {n:"Рис белый", c:360, p:7, f:1, u:79},
    {n:"Макароны тв. сортов", c:350, p:12, f:1, u:70},
    {n:"Куриная грудка (сырая)", c:113, p:23, f:2, u:0},
    {n:"Говядина постная", c:180, p:20, f:10, u:0},
    {n:"Яйцо (1шт)", c:70, p:6, f:5, u:0},
    {n:"Творог 5%", c:121, p:17, f:5, u:2},
    {n:"Банан", c:89, p:1, f:0, u:23},
    {n:"Яблоко", c:52, p:0, f:0, u:14},
    {n:"Огурец", c:15, p:1, f:0, u:3},
    {n:"Помидор", c:20, p:1, f:0, u:4},
    {n:"Масло оливковое", c:884, p:0, f:100, u:0},
    {n:"Протеин (скуп 30г)", c:120, p:24, f:1, u:3}
];

// --- СОСТОЯНИЕ ---
let pivotDate = new Date();
let currentTab = 'sport';
let userGoals = { c: 2500, p: 160, f: 70, u: 300, water: 2000 };
let sportData = {};
let charts = {};
let currentMainButtonCallback = null;

// --- ОБЛАЧНЫЕ СОХРАНЕНИЯ SUPABASE ---
async function initData() {
    // 1. Сначала загружаем данные локально (чтобы приложение открылось моментально)
    try {
        sportData = JSON.parse(localStorage.getItem('tma_sport_data')) || {};
    } catch(e) {
        sportData = {};
    }
    render();

    // 2. Затем тихо тянем свежие данные из Supabase
    const userId = tg.initDataUnsafe?.user?.id || 123456789; // Берем ID пользователя из ТГ
    
    try {
        let { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('telegram_id', userId)
            .single();
            
        if (data && data.data) {
            sportData = data.data; // Обновляем базу
            localStorage.setItem('tma_sport_data', JSON.stringify(sportData)); // Синхронизируем локальный кэш
            render(); // Перерисовываем интерфейс
        }
    } catch (err) {
        console.error('Ошибка загрузки из Supabase:', err);
    }
}

async function save() {
    // 1. Мгновенно сохраняем локально
    const dataStr = JSON.stringify(sportData);
    localStorage.setItem('tma_sport_data', dataStr);
    
    // 2. Отправляем в облако Supabase
    const userId = tg.initDataUnsafe?.user?.id || 123456789;
    try {
        await supabase
            .from('user_data')
            .upsert({ telegram_id: userId, data: sportData, updated_at: new Date() });
    } catch (err) {
        console.error('Ошибка сохранения в Supabase:', err);
    }
}

// --- УПРАВЛЕНИЕ MAIN BUTTON ---
function setupMainButton(text, callback) {
    if (currentMainButtonCallback) {
        tg.MainButton.offClick(currentMainButtonCallback);
    }
    currentMainButtonCallback = callback;
    tg.MainButton.setText(text).show().onClick(currentMainButtonCallback);
}

function hideMainButton() {
    tg.MainButton.hide();
    if (currentMainButtonCallback) {
        tg.MainButton.offClick(currentMainButtonCallback);
        currentMainButtonCallback = null;
    }
}

// --- НАВИГАЦИЯ И ДАТА ---
function switchTab(tab) {
    haptic('light');
    currentTab = tab;
    ['sport', 'nutrition', 'analytics'].forEach(t => {
        const btn = $(`tab-${t}`);
        const view = $(`view-${t}`);
        if(btn) btn.classList.toggle('active', tab === t);
        if(view) view.classList.toggle('hidden', tab !== t);
    });
    render();
}

function changeDate(delta) {
    haptic('light');
    pivotDate.setDate(pivotDate.getDate() + delta);
    render();
}

function goToday() {
    haptic('light');
    pivotDate = new Date();
    render();
}

function closeModal(id) { 
    $(id).style.display = 'none'; 
    hideMainButton();
}

// --- ГЛАВНЫЙ РЕНДЕР ---
function render() {
    const dk = iso(pivotDate);
    const isToday = dk === iso(new Date());
    $('dateDisplay').innerText = isToday ? 'Сегодня' : pivotDate.toLocaleDateString('ru-RU', {weekday: 'long'});
    $('dateSubDisplay').innerText = pivotDate.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'});

    if(!sportData[dk]) {
        sportData[dk] = { workout: [], food:[], water: 0, activeMeals:['Завтрак', 'Обед', 'Ужин', 'Перекус'] };
    }

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

    list.innerHTML = groups.map(g => `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-black text-lg">${g.name}</h4>
                <button onclick="addSet('${g.name}')" class="text-blue-500 text-sm font-bold bg-blue-50 px-3 py-1 rounded-lg">+ Подход</button>
            </div>
            <div class="space-y-2">
                ${g.sets.map((s, i) => `
                    <div class="set-row">
                        <span class="text-xs font-bold text-slate-400 w-4">${i+1}</span>
                        <input type="number" value="${s.w}" onchange="updateSet(${s.idx}, 'w', this.value)" class="set-input flex-1" placeholder="Вес">
                        <span class="text-xs text-slate-400">кг</span>
                        <span class="text-slate-300 mx-1">×</span>
                        <input type="number" value="${s.r}" onchange="updateSet(${s.idx}, 'r', this.value)" class="set-input flex-1" placeholder="Повт">
                        <button onclick="deleteSet(${s.idx})" class="text-slate-300 hover:text-red-500 ml-2"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function openExModal() {
    haptic('light');
    $('exModal').style.display = 'flex';
    $('exSearch').value = ''; $('exWeight').value = ''; $('exReps').value = '';
    filterEx();
    setupMainButton('ДОБАВИТЬ УПРАЖНЕНИЕ', confirmAddEx);
}

function filterEx() {
    const q = $('exSearch').value.toLowerCase();
    const res = $('exSearchResults');
    res.innerHTML = '';
    EX_DB.filter(ex => ex.toLowerCase().includes(q)).forEach(ex => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50';
        div.innerText = ex;
        div.onclick = () => { $('exSearch').value = ex; res.innerHTML = ''; };
        res.appendChild(div);
    });
}

function confirmAddEx() {
    const name = $('exSearch').value;
    if(!name) return tg.showAlert('Введите название!');
    const dk = iso(pivotDate);
    const w = $('exWeight').value;
    const r = $('exReps').value;
    
    for(let i=0; i<3; i++) sportData[dk].workout.push({ n: name, w: w, r: r });
    haptic('success');
    save(); render(); closeModal('exModal');
}

function addSet(name) {
    haptic('light');
    const dk = iso(pivotDate);
    const lastSet = [...sportData[dk].workout].reverse().find(w => w.n === name);
    sportData[dk].workout.push({ n: name, w: lastSet?.w||'', r: lastSet?.r||'' });
    save(); render();
}

function updateSet(idx, field, val) {
    sportData[iso(pivotDate)].workout[idx][field] = val;
    save();
}

function deleteSet(idx) {
    haptic('medium');
    sportData[iso(pivotDate)].workout.splice(idx, 1);
    save(); render();
}

// Поделиться тренировкой в Telegram
function shareWorkout() {
    haptic('medium');
    const dk = iso(pivotDate);
    const day = sportData[dk];
    if (!day || !day.workout || day.workout.length === 0) return tg.showAlert('Нет тренировок для шеринга!');
    
    let tonnage = 0;
    day.workout.forEach(w => tonnage += (parseFloat(w.w)||0) * (parseFloat(w.r)||0));
    
    const text = `🔥 Отличная тренировка!\nТоннаж: ${tonnage} кг\nПодходов: ${day.workout.length}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/your_bot_name/app')}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(url);
}

// === КАЛЬКУЛЯТОР 1RM ===
function openRmModal() {
    haptic('light');
    $('rmModal').style.display = 'flex';
    $('rmW').value = ''; $('rmR').value = '';
    calcRM();
}

function calcRM() {
    const w = parseFloat($('rmW').value) || 0;
    const r = parseFloat($('rmR').value) || 0;
    if (w > 0 && r > 0) {
        const rm = Math.round(w * (1 + r / 30));
        $('rmResult').innerText = rm + ' кг';
        $('rm90').innerText = Math.round(rm * 0.9);
        $('rm80').innerText = Math.round(rm * 0.8);
        $('rm70').innerText = Math.round(rm * 0.7);
        $('rm60').innerText = Math.round(rm * 0.6);
    } else {
        $('rmResult').innerText = '0 кг';['rm90','rm80','rm70','rm60'].forEach(id => $(id).innerText = '0');
    }
}

// === МОДУЛЬ ПИТАНИЯ ===
function renderNutrition(dk) {
    const dayData = sportData[dk];
    let tc=0, tp=0, tf=0, tu=0;
    dayData.food.forEach(f => { tc+=f.c; tp+=f.p; tf+=f.f; tu+=f.u; });
    
    $('calEaten').innerText = tc;
    $('calLeft').innerText = userGoals.c - tc;
    $('pVal').innerText = `${Math.round(tp)}/${userGoals.p}`;
    $('fVal').innerText = `${Math.round(tf)}/${userGoals.f}`;
    $('cVal').innerText = `${Math.round(tu)}/${userGoals.u}`;
    $('waterVal').innerText = dayData.water || 0;

    const list = $('foodList');
    list.innerHTML = dayData.activeMeals.map(meal => {
        const items = dayData.food.filter(f => f.type === meal);
        let mc=0; items.forEach(i => mc+=i.c);
        return `
        <div class="card">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-black text-lg">${meal}</h4>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-slate-400">${mc} ккал</span>
                    <button onclick="openFoodModal('${meal}')" class="w-8 h-8 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <div class="space-y-2">
                ${items.length === 0 ? '<p class="text-xs text-slate-300 font-bold">Пусто</p>' : items.map(f => `
                    <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <div>
                            <p class="font-bold text-sm">${f.n}</p>
                            <p class="text-[10px] text-slate-400 font-bold">${f.w}г • Б:${f.p} Ж:${f.f} У:${f.u}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-black text-sm">${f.c}</span>
                            <button onclick="deleteFood(${dayData.food.indexOf(f)})" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }).join('');
}

function addWater(amount) {
    haptic('light');
    const dk = iso(pivotDate);
    sportData[dk].water = (sportData[dk].water || 0) + amount;
    save(); render();
}

let currentMealForAdd = '';
function openFoodModal(meal) {
    haptic('light');
    currentMealForAdd = meal;
    $('foodMealType').value = meal;
    $('foodModal').style.display = 'flex';
    $('foodSearch').value = ''; $('customFoodName').value = ''; $('customFoodWeight').value = '100';
    calcFood(); filterFood();
    setupMainButton('СОХРАНИТЬ ПРОДУКТ', confirmAddFood);
}

function filterFood() {
    const q = $('foodSearch').value.toLowerCase();
    const res = $('foodSearchResults');
    res.innerHTML = '';
    if(!q) return;
    FOOD_DB.filter(f => f.n.toLowerCase().includes(q)).forEach(f => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50 flex justify-between';
        div.innerHTML = `<span>${f.n}</span><span class="text-slate-400 text-xs">${f.c} ккал</span>`;
        div.onclick = () => {
            $('customFoodName').value = f.n; $('customFoodP').value = f.p; $('customFoodF').value = f.f;
            $('customFoodU').value = f.u; $('customFoodC').value = f.c; res.innerHTML = '';
        };
        res.appendChild(div);
    });
}

function calcFood() {
    const w = parseFloat($('customFoodWeight').value)||0, p = parseFloat($('customFoodP').value)||0, f = parseFloat($('customFoodF').value)||0, u = parseFloat($('customFoodU').value)||0;
    $('customFoodC').value = Math.round((p*4 + f*9 + u*4) * (w/100));
}

function confirmAddFood() {
    const name = $('customFoodName').value;
    if(!name) return tg.showAlert('Введите название!');
    const dk = iso(pivotDate);
    sportData[dk].food.push({
        type: currentMealForAdd, n: name,
        w: parseFloat($('customFoodWeight').value)||100, p: parseFloat($('customFoodP').value)||0,
        f: parseFloat($('customFoodF').value)||0, u: parseFloat($('customFoodU').value)||0, c: parseInt($('customFoodC').value)||0
    });
    haptic('success');
    save(); render(); closeModal('foodModal');
}

function deleteFood(idx) { haptic('medium'); sportData[iso(pivotDate)].food.splice(idx, 1); save(); render(); }

// Нативный сканер штрих-кодов Telegram
function scanBarcode() {
    haptic('heavy');
    if(tg.showScanQrPopup) {
        tg.showScanQrPopup({ text: 'Наведите на штрих-код продукта' }, function(text) {
            fetchProductByCode(text);
            return true; // Закрывает сканер
        });
    } else {
        alert('Сканер доступен только с телефона в Telegram');
    }
}

async function fetchProductByCode(code) {
    $('foodSearch').value = 'Ищем...';
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if(data.status === 1) {
            const p = data.product;
            $('customFoodName').value = p.product_name || 'Неизвестно';
            $('customFoodP').value = Math.round(p.nutriments.proteins_100g || 0);
            $('customFoodF').value = Math.round(p.nutriments.fat_100g || 0);
            $('customFoodU').value = Math.round(p.nutriments.carbohydrates_100g || 0);
            calcFood();
            $('foodSearch').value = '';
            haptic('success');
        } else {
            tg.showAlert('❌ Продукт не найден в базе');
            $('foodSearch').value = '';
            haptic('error');
        }
    } catch(e) {
        tg.showAlert('❌ Ошибка сети');
        $('foodSearch').value = '';
    }
}

// === МОДУЛЬ АНАЛИТИКИ ===
function renderAnalytics() {
    const dates =[], cals = [], p=[], f=[], u=[];
    let totalWo = 0, totalTon = 0;
    
    const now = new Date();
    for(let i=6; i>=0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dk = iso(d);
        dates.push(d.toLocaleDateString('ru-RU', {weekday:'short'}));
        
        const day = sportData[dk] || { food:[], workout:[] };
        
        let dc=0, dp=0, df=0, du=0;
        day.food.forEach(item => { dc+=item.c; dp+=item.p; df+=item.f; du+=item.u; });
        cals.push(dc); p.push(dp); f.push(df); u.push(du);
        
        if(day.workout.length > 0) {
            totalWo++;
            day.workout.forEach(w => { totalTon += (parseFloat(w.w)||0) * (parseFloat(w.r)||0); });
        }
    }
    
    $('statTotalWo').innerText = totalWo;
    $('statTonnage').innerHTML = (totalTon / 1000).toFixed(1) + '<span class="text-sm">т</span>';
    
    drawChart('chartCals', 'bar', { labels: dates, datasets:[{ label: 'Ккал', data: cals, backgroundColor: '#f97316', borderRadius: 4 }] });
    
    const avgP = p.reduce((a,b)=>a+b,0)/7, avgF = f.reduce((a,b)=>a+b,0)/7, avgU = u.reduce((a,b)=>a+b,0)/7;
    drawChart('chartMacros', 'doughnut', {
        labels:['Белки', 'Жиры', 'Углеводы'],
        datasets: [{ data:[avgP, avgF, avgU], backgroundColor:['#22c55e', '#ef4444', '#3b82f6'], borderWidth: 0 }]
    }, { cutout: '70%', plugins: { legend: { position: 'right' } } });
}

function drawChart(id, type, data, opts={}) {
    if(charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if(!ctx) return;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = "var(--tg-theme-hint-color, #94a3b8)";
    charts[id] = new Chart(ctx, { type: type, data: data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: type==='doughnut' } }, scales: type==='doughnut' ? {} : { x: { grid: { display: false } } }, ...opts } });
}

// Запуск (через Supabase или LocalStorage)
initData();
