const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ВАЖНО: Вставь свои ключи Supabase!
const SUPABASE_URL = 'https://hvoznktittcvsqtepopp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mw_ldS2k_bWXSWd4ikNQCA_rCZ6OQYs'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function haptic(style = 'light') { if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style); }

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
    {n:"Гречка (сухая)", c:330, p:12, f:3, u:72},
    {n:"Овсянка", c:360, p:12, f:6, u:60},
    {n:"Рис белый", c:360, p:7, f:1, u:79},
    {n:"Макароны тв. сортов", c:350, p:12, f:1, u:70},
    {n:"Куриная грудка (сырая)", c:113, p:23, f:2, u:0},
    {n:"Говядина постная", c:180, p:20, f:10, u:0},
    {n:"Яйцо (1шт)", c:70, p:6, f:5, u:0}, // ПУНКТ 5: Указано (1шт)
    {n:"Творог 5%", c:121, p:17, f:5, u:2},
    {n:"Банан (1шт)", c:105, p:1, f:0, u:27},
    {n:"Яблоко (1шт)", c:95, p:0, f:0, u:25},
    {n:"Огурец", c:15, p:1, f:0, u:3},
    {n:"Помидор", c:20, p:1, f:0, u:4},
    {n:"Масло оливковое", c:884, p:0, f:100, u:0},
    {n:"Протеин (скуп 30г)", c:120, p:24, f:1, u:3}
];

let pivotDate = new Date();
let currentTab = 'sport';
let userGoals = { c: 2500, p: 160, f: 70, u: 300, water: 2000 };
let sportData = {};
let charts = {};
let calPivot = new Date();

// ПУНКТ 3 & 4: Сохраняем базу выбранного продукта для пересчета
let selectedFoodBase = null;
// ПУНКТ 8: Флаг кардио
let isCardioSelected = false;

async function initData() {
    setSyncStatus('loading');
    try { sportData = JSON.parse(localStorage.getItem('tma_sport_data')) || {}; } catch(e) { sportData = {}; }
    render(); 
    const tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) ? window.Telegram.WebApp.initDataUnsafe.user : { id: 123456789 };
    try {
        let { data, error } = await supabaseClient.from('user_data').select('data').eq('telegram_id', tgUser.id).single();
        if (data && data.data) {
            sportData = data.data;
            localStorage.setItem('tma_sport_data', JSON.stringify(sportData));
            render(); setSyncStatus('success');
        } else setSyncStatus('idle');
    } catch (err) { setSyncStatus('error'); }
}

async function save() {
    setSyncStatus('loading');
    localStorage.setItem('tma_sport_data', JSON.stringify(sportData));
    const tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) ? window.Telegram.WebApp.initDataUnsafe.user : { id: 123456789 };
    try {
        await supabaseClient.from('user_data').upsert({ telegram_id: tgUser.id, data: sportData, updated_at: new Date() });
        setSyncStatus('success');
    } catch (err) { setSyncStatus('error'); }
}

// ПУНКТ 1: Слайдер навигации
function switchTab(tab, index) {
    haptic('light');
    currentTab = tab;
    
    // Двигаем слайдер
    const slider = $('nav-slider');
    if(slider) {
        // 3 вкладки, каждая занимает 33.33%
        slider.style.transform = `translateX(${index * 100}%)`;
    }

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
        // ПУНКТ 8: Проверяем, кардио ли это при рендере
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
            
            // ПУНКТ 8: Меняем лейблы, если это кардио
            isCardioSelected = CARDIO_LIST.some(c => ex.toLowerCase().includes(c));
            $('exInput1Label').innerText = isCardioSelected ? 'Время (мин)' : 'Вес (кг)';
            $('exInput2Label').innerText = isCardioSelected ? 'Уровень / Наклон' : 'Повторы';
        };
        res.appendChild(div);
    });
}

function confirmAddEx() {
    const name = $('exSearch').value;
    if(!name) return tg.showAlert('Введите название!');
    const dk = iso(pivotDate);
    const w = $('exWeight').value;
    const r = $('exReps').value;
    
    // Для кардио добавляем 1 подход, для силовых 3
    const setsCount = isCardioSelected ? 1 : 3;
    for(let i=0; i < setsCount; i++) sportData[dk].workout.push({ n: name, w: w, r: r });
    
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

function updateSet(idx, field, val) { sportData[iso(pivotDate)].workout[idx][field] = val; save(); }
function deleteSet(idx) { haptic('medium'); sportData[iso(pivotDate)].workout.splice(idx, 1); save(); render(); }

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
        $('rm90').innerText = Math.round(rm * 0.9); $('rm80').innerText = Math.round(rm * 0.8);
        $('rm70').innerText = Math.round(rm * 0.7); $('rm60').innerText = Math.round(rm * 0.6);
    } else {
        $('rmResult').innerText = '0 кг';['rm90','rm80','rm70','rm60'].forEach(id => $(id).innerText = '0');
    }
}

// === МОДУЛЬ ПИТАНИЯ ===
function renderNutrition(dk) {
    const dayData = sportData[dk];
    let tc=0, tp=0, tf=0, tu=0;
    dayData.food.forEach(f => { tc+=f.c; tp+=f.p; tf+=f.f; tu+=f.u; });
    
    $('calEaten').innerText = tc; $('calLeft').innerText = userGoals.c - tc;
    $('pVal').innerText = `${Math.round(tp)}/${userGoals.p}`; $('fVal').innerText = `${Math.round(tf)}/${userGoals.f}`; $('cVal').innerText = `${Math.round(tu)}/${userGoals.u}`;
    
    // ПУНКТ 2: Анимация воды
    const waterVal = dayData.water || 0;
    $('waterVal').innerHTML = `${waterVal} <span class="text-lg opacity-50">/ ${userGoals.water}</span>`;
    const waterPct = Math.min((waterVal / userGoals.water) * 100, 100);
    $('waterFill').style.height = `${waterPct}%`;

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
                            <p class="text-[10px] text-slate-400 font-bold">${f.w}${f.n.includes('шт') ? 'шт' : 'г'} • Б:${f.p} Ж:${f.f} У:${f.u}</p>
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

function addWater(amount) { haptic('light'); const dk = iso(pivotDate); sportData[dk].water = (sportData[dk].water || 0) + amount; save(); render(); }

let currentMealForAdd = '';
function openFoodModal(meal) {
    haptic('light'); 
    currentMealForAdd = meal; 
    $('foodMealType').value = meal; 
    $('foodModal').style.display = 'flex';
    
    // ПУНКТ 4: Сброс базы и веса при открытии
    selectedFoodBase = null;
    $('foodSearch').value = ''; 
    $('customFoodName').value = ''; 
    $('customFoodWeightLabel').innerText = 'Вес (г)';
    $('customFoodWeight').value = '100';
    
    calcFood(); filterFood();
}

function filterFood() {
    const q = $('foodSearch').value.toLowerCase(); const res = $('foodSearchResults'); res.innerHTML = '';
    if(!q) return;
    FOOD_DB.filter(f => f.n.toLowerCase().includes(q)).forEach(f => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 rounded-xl font-bold text-sm cursor-pointer border-b border-slate-50 flex justify-between';
        div.innerHTML = `<span>${f.n}</span><span class="text-slate-400 text-xs">${f.c} ккал</span>`;
        div.onclick = () => {
            // ПУНКТ 3 & 5: Сохраняем базу для пересчета
            selectedFoodBase = f;
            $('customFoodName').value = f.n; 
            
            const isPiece = f.n.includes('шт');
            $('customFoodWeightLabel').innerText = isPiece ? 'Кол-во (шт)' : 'Вес (г)';
            $('customFoodWeight').value = isPiece ? 1 : 100;
            
            calcFood(); // Пересчитываем сразу
            res.innerHTML = ''; 
        };
        res.appendChild(div);
    });
}

function calcFood() {
    // ПУНКТ 3: Если продукт выбран из базы, пересчитываем БЖУК пропорционально
    if (selectedFoodBase) {
        const val = parseFloat($('customFoodWeight').value) || 0;
        // Если это штуки, умножаем напрямую. Если граммы - делим на 100.
        const multiplier = selectedFoodBase.n.includes('шт') ? val : val / 100;
        
        $('customFoodP').value = Math.round(selectedFoodBase.p * multiplier);
        $('customFoodF').value = Math.round(selectedFoodBase.f * multiplier);
        $('customFoodU').value = Math.round(selectedFoodBase.u * multiplier);
        $('customFoodC').value = Math.round(selectedFoodBase.c * multiplier);
    } else {
        // Ручной ввод (считаем только калории)
        const w = parseFloat($('customFoodWeight').value)||0, p = parseFloat($('customFoodP').value)||0, f = parseFloat($('customFoodF').value)||0, u = parseFloat($('customFoodU').value)||0;
        $('customFoodC').value = Math.round((p*4 + f*9 + u*4) * (w/100));
    }
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
    haptic('success'); save(); render(); closeModal('foodModal');
}

function deleteFood(idx) { haptic('medium'); sportData[iso(pivotDate)].food.splice(idx, 1); save(); render(); }

// ПУНКТ 9: Сканер штрих-кодов (Улучшенная обработка ошибок)
function scanBarcode() {
    haptic('heavy');
    if(tg.showScanQrPopup) {
        tg.showScanQrPopup({ text: 'Наведите на штрих-код продукта' }, function(text) { fetchProductByCode(text); return true; });
    } else alert('Сканер доступен только с телефона в Telegram');
}

async function fetchProductByCode(code) {
    $('foodSearch').value = 'Ищем в базе...';
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if(data.status === 1) {
            const p = data.product;
            // Создаем временную базу для пересчета
            selectedFoodBase = {
                n: p.product_name || 'Неизвестно',
                p: Math.round(p.nutriments.proteins_100g || 0),
                f: Math.round(p.nutriments.fat_100g || 0),
                u: Math.round(p.nutriments.carbohydrates_100g || 0),
                c: Math.round(p.nutriments['energy-kcal'] || 0)
            };
            
            $('customFoodName').value = selectedFoodBase.n;
            $('customFoodWeightLabel').innerText = 'Вес (г)';
            $('customFoodWeight').value = '100';
            calcFood();
            
            $('foodSearch').value = ''; haptic('success');
        } else { 
            tg.showAlert('Продукт не найден в базе OpenFoodFacts. Введите данные вручную.'); 
            $('foodSearch').value = code; // Оставляем код, вдруг пригодится
            haptic('error'); 
        }
    } catch(e) { 
        tg.showAlert('Ошибка сети при поиске штрих-кода.'); 
        $('foodSearch').value = ''; 
    }
}

// === МОДУЛЬ АНАЛИТИКИ И КАЛЕНДАРЯ ===
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

    renderCalendar();
}

function changeCalMonth(delta) { haptic('light'); calPivot.setMonth(calPivot.getMonth() + delta); renderCalendar(); }

function renderCalendar() {
    const grid = $('analyticsCalendar');
    if(!grid) return;
    grid.innerHTML = '';
    
    const year = calPivot.getFullYear();
    const month = calPivot.getMonth();
    $('calMonthLabel').innerText = calPivot.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'});
    
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
