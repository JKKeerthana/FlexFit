


// ---------- Helpers ----------
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const UID = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// ---------- LocalStorage ----------
const DB = {
  get(key, fallback=null){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : (fallback===null?[]:fallback); } catch(e){ return fallback===null?[]:fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  remove(key){ localStorage.removeItem(key); }
};

// Defaults if first run
if(!localStorage.getItem('profile')){
  DB.set('profile', { name:'', gender:'male', age:25, weight:70, height:170, activity:1.375 });
}
if(!localStorage.getItem('goals')){
  DB.set('goals', { burn:1500, workouts:4, cals:14000 });
}
if(!localStorage.getItem('waterLog')){
  DB.set('waterLog', { today:0, goal:2000, history: {} });
}

// ---------- Navigation ----------
qsa('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    qsa('.view').forEach(v => v.classList.add('hidden'));
    qs('#' + view).classList.remove('hidden');
    if(view==='dashboard') updateDashboard();
    if(view==='workouts') renderWorkouts();
    if(view==='diet') renderMeals();
    if(view==='water') renderWater();
    if(view==='profile') populateProfile();
  });
});

// ---------- Theme Toggle ----------
const themeToggle = qs('#themeToggle');
themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  themeToggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
});

// ---------- METs ----------
const METS = {
  'Running (10 km/h)':9.8,'Cycling (moderate)':7.5,'Walking (5 km/h)':3.5,'Yoga':3,'HIIT':8,'Bodyweight':6,'Jump Rope':12
};

// ---------- Utilities ----------
function estimateCalories(mins, activity){
  const profile = DB.get('profile', {});
  const weight = parseFloat(profile.weight) || 70;
  const met = METS[activity] || 4;
  return Math.round(mins * met * 3.5 * weight / 200);
}

// ---------- Workouts ----------
const wkName = qs('#wkName'), 
      wkDuration = qs('#wkDuration'), 
      wkDay = qs('#wkDay'), 
      addWorkoutBtn = qs('#addWorkoutBtn'), 
      wkListEl = qs('#workoutList');

function renderWorkouts(){
  const wks = DB.get('workouts', []);
  wkListEl.innerHTML = '';
  if (!wks.length) { wkListEl.innerHTML = '<p class="muted">No workouts yet.</p>'; return; }

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  days.forEach(day => {
    const dayWks = wks.filter(w => w.day === day);
    if(dayWks.length){
      const dayDiv = document.createElement('div');
      dayDiv.innerHTML = `<strong>${day}</strong>`;
      wkListEl.appendChild(dayDiv);

      dayWks.forEach(w => {
        const div = document.createElement('div');
        div.className = 'item';
        div.dataset.id = w.id;
        const doneClass = w.done ? 'done' : '';
        const dateStr = w.date ? new Date(w.date).toLocaleString() : 'Scheduled';
        div.innerHTML = `
          <div class="left">
            <div class="${doneClass}"><strong>${w.name}</strong> (${w.duration} min)</div>
            <div class="meta muted">${estimateCalories(w.duration,w.name)} kcal • ${dateStr}</div>
          </div>
          <div class="controls">
            <button data-done="${w.id}" title="Mark done" class="btn">${w.done ? '↺' : '✔'}</button>
            <button data-del="${w.id}" class="btn ghost">Del</button>
          </div>
        `;
        wkListEl.appendChild(div);
      });
    }
  });
}

addWorkoutBtn.addEventListener('click', ()=>{
  const name = wkName.value.trim(),
        duration = parseInt(wkDuration.value),
        day = wkDay.value;
  if(!name || !duration || !day) return;
  const wks = DB.get('workouts', []);
  // do NOT set date when adding a scheduled workout; date is set when it's completed
  wks.push({ id: UID(), name, duration, day, date: null, done:false });
  DB.set('workouts', wks);
  wkName.value=''; wkDuration.value=''; renderWorkouts(); updateDashboard(); populateExerciseSelect();
});

// fixed listener: use closest button to ensure dataset reads work even if inner element clicked
wkListEl.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const idDel = btn.dataset.del;
  const idDone = btn.dataset.done;
  if(idDel){
    if(!confirm('Are you sure you want to delete this workout?')) return;
    let wks = DB.get('workouts', []);
    wks = wks.filter(w => w.id !== idDel);
    DB.set('workouts', wks); 
    renderWorkouts(); 
    updateDashboard(); 
    populateExerciseSelects();
  }
  else if(idDone){
    const wks = DB.get('workouts', []);
    const idx = wks.findIndex(x => x.id === idDone);
    if(idx>=0){
      // toggle done; when marking done set date to now; when unmarking clear date
      wks[idx].done = !wks[idx].done;
      if(wks[idx].done){
        wks[idx].date = Date.now();
      } else {
        wks[idx].date = null;
      }
      DB.set('workouts', wks); renderWorkouts(); updateDashboard(); populateExerciseSelect();
    }
  }
});
renderWorkouts();

// ---------- Diet ----------
const mealName = qs('#mealName'), 
      mealCals = qs('#mealCals'), 
      mealDay = qs('#mealDay'), 
      addMealBtn = qs('#addMealBtn'), 
      mealListEl = qs('#mealList');

function renderMeals(){
  const meals = DB.get('meals', []);
  mealListEl.innerHTML = '';
  if(!meals.length){ mealListEl.innerHTML='<p class="muted">No meals logged yet.</p>'; return; }

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  days.forEach(day => {
    const dayMeals = meals.filter(m => m.day === day);
    if(dayMeals.length){
      const dayDiv = document.createElement('div');
      dayDiv.innerHTML = `<strong>${day}</strong>`;
      mealListEl.appendChild(dayDiv);

      dayMeals.forEach(m=>{
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<div class="left"><strong>${m.name}</strong><div class="meta muted">${m.cals} kcal • ${new Date(m.date).toLocaleString()}</div></div><div class="controls"><button data-del="${m.id}" class="btn ghost">Del</button></div>`;
        mealListEl.appendChild(div);
      });
    }
  });
}

addMealBtn.addEventListener('click', ()=>{
  const name = mealName.value.trim(),
        cals = parseInt(mealCals.value),
        day = mealDay.value;
  if(!name || isNaN(cals) || !day) return;
  const meals = DB.get('meals', []);
  meals.push({ id: UID(), name, cals, day, date: Date.now() });
  DB.set('meals', meals);
  mealName.value=''; mealCals.value=''; renderMeals(); updateDashboard();
});

// fixed listener similar to workouts
mealListEl.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.del;
  if(id){
    if(!confirm('Are you sure you want to delete this meal?')) return;
    let meals = DB.get('meals', []);
    meals = meals.filter(m=>m.id !== id);
    DB.set('meals', meals); 
    renderMeals(); 
    updateDashboard();
  }

});
renderMeals();

// ---------- Profile & Goals ----------
const profileName = qs('#profileName'),
      profileGender = qs('#profileGender'),
      profileAge = qs('#profileAge'),
      profileWeight = qs('#profileWeight'),
      profileHeight = qs('#profileHeight'),
      profileActivity = qs('#profileActivity'),
      saveProfileBtn = qs('#saveProfileBtn');

const bmrValue = qs('#bmrValue'), tdeeValue = qs('#tdeeValue');
const goalBurn = qs('#goalBurn'), goalWorkout = qs('#goalWorkout'), goalCals = qs('#goalCals'), saveGoalsBtn = qs('#saveGoalsBtn');

function populateProfile(){
  const p = DB.get('profile', {});
  profileName.value = p.name || '';
  profileGender.value = p.gender || 'male';
  profileAge.value = p.age || 25;
  profileWeight.value = p.weight || 70;
  profileHeight.value = p.height || 170;
  profileActivity.value = p.activity || 1.375;

  const goals = DB.get('goals', {});
  goalBurn.value = goals.burn || 1500;
  goalWorkout.value = goals.workouts || 4;
  goalCals.value = goals.cals || 14000;

  computeBMR();
  // update dashboard greeting (if dashboard open)
  updateDashboardGreeting();
}

function computeBMR(){
  const p = DB.get('profile', {});
  const age = parseFloat(p.age) || 25;
  const wt = parseFloat(p.weight) || 70;
  const ht = parseFloat(p.height) || 170;
  const gender = p.gender || 'male';
  let bmr = (10 * wt) + (6.25 * ht) - (5 * age) + (gender==='male' ? 5 : -161);
  bmr = Math.round(bmr);
  const tdee = Math.round(bmr * (parseFloat(p.activity) || 1.375));
  bmrValue.textContent = `${bmr}`;
  tdeeValue.textContent = `${tdee}`;
  return {bmr, tdee};
}

saveProfileBtn.addEventListener('click', ()=>{
  const p = {
    name: profileName.value.trim(),
    gender: profileGender.value,
    age: Number(profileAge.value),
    weight: Number(profileWeight.value),
    height: Number(profileHeight.value),
    activity: Number(profileActivity.value)
  };
  DB.set('profile', p);
  computeBMR();
  alert('Profile saved.');
  updateDashboard();
  updateDashboardGreeting();
});

saveGoalsBtn.addEventListener('click', ()=>{
  const g = { burn: Number(goalBurn.value)||1500, workouts: Number(goalWorkout.value)||4, cals: Number(goalCals.value)||14000 };
  DB.set('goals', g);
  alert('Goals saved.');
  updateDashboard();
});

// ---------- BMI ----------
qs('#calcBmi').addEventListener('click', ()=>{
  const w=parseFloat(qs('#weight').value), h=parseFloat(qs('#height').value), wu=qs('#weightUnit').value, hu=qs('#heightUnit').value;
  if(!w || !h){qs('#bmiResult').textContent='Enter values.'; return;}
  let weight=w; if(wu==='lb') weight*=0.453592;
  let height=h; if(hu==='cm') height/=100; if(hu==='ft') height*=0.3048;
  const bmi=weight/(height*height); 
  let cat='';
  if(bmi<18.5) cat='Underweight';
  else if(bmi<25) cat='Normal';
  else if(bmi<30) cat='Overweight';
  else cat='Obese';
  qs('#bmiResult').textContent=`BMI ${bmi.toFixed(1)} — ${cat}`;
});

// ---------- Session Timer ----------
let sessionTimer=null, sessionRemaining=0;
const sessionDisplay=qs('#sessionTimer'), sessionCalories=qs('#sessionCalories'), exerciseSelect=qs('#exerciseSelect');
function populateExerciseSelect(){
  const set=new Set(Object.keys(METS));
  DB.get('workouts',[]).forEach(w=>set.add(w.name));
  exerciseSelect.innerHTML='';
  Array.from(set).forEach(n=>{
    const o=document.createElement('option'); o.value=n; o.textContent=n; exerciseSelect.appendChild(o);
  });
}
populateExerciseSelect();

qs('#startSession').addEventListener('click', ()=>{
  const mins=parseInt(qs('#sessionDuration').value)||20; sessionRemaining=mins*60; if(sessionTimer) clearInterval(sessionTimer);
  const start = Date.now();
  sessionTimer=setInterval(()=>{
    if(sessionRemaining<=0){clearInterval(sessionTimer);sessionTimer=null;alert('Session complete!');updateDashboard();return;}
    sessionRemaining--;
    const mm=String(Math.floor(sessionRemaining/60)).padStart(2,'0');
    const ss=String(sessionRemaining%60).padStart(2,'0');
    sessionDisplay.textContent=`${mm}:${ss}`;
    const elapsedMins = Math.ceil((Date.now()-start)/60000);
    sessionCalories.textContent='Estimated: '+estimateCalories(elapsedMins,exerciseSelect.value)+' kcal';
  },1000);
});
qs('#pauseSession').addEventListener('click', ()=>{if(sessionTimer){clearInterval(sessionTimer);sessionTimer=null;}});
qs('#resetSession').addEventListener('click', ()=>{if(sessionTimer) clearInterval(sessionTimer); sessionTimer=null; sessionRemaining=0; sessionDisplay.textContent='00:00'; sessionCalories.textContent='Estimated: 0 kcal';});




// ---------- Toggle Timer / Stopwatch ----------
const toggleBtn = qs('#toggleTimerStopwatch');
const timerCard = qs('#timerCard');
const stopwatchCard = qs('#stopwatchCard');

toggleBtn.addEventListener('click', () => {
  if(timerCard.classList.contains('hidden')){
    // show timer
    timerCard.classList.remove('hidden');
    stopwatchCard.classList.add('hidden');
    toggleBtn.textContent = 'Switch to Stopwatch';
  } else {
    // show stopwatch
    timerCard.classList.add('hidden');
    stopwatchCard.classList.remove('hidden');
    toggleBtn.textContent = 'Switch to Timer';
  }
});

// ---------- Stopwatch logic ----------
let stopwatchTimer = null;
let stopwatchElapsed = 0;
const stopwatchDisplay = qs('#stopwatchTimer');

qs('#startStopwatch').addEventListener('click', () => {
  if(stopwatchTimer) return; // already running
  const startTime = Date.now() - stopwatchElapsed*1000; // resume
  stopwatchTimer = setInterval(() => {
    // calculate total seconds elapsed
    stopwatchElapsed = Math.floor((Date.now() - startTime) / 1000);

    const mm = String(Math.floor(stopwatchElapsed / 60)).padStart(2, '0');
    const ss = String(stopwatchElapsed % 60).padStart(2, '0');
    stopwatchDisplay.textContent = `${mm}:${ss}`;

    // calculate calories
    const elapsedMins = stopwatchElapsed / 60; // fractional minutes for precision
    const exercise = stopwatchExerciseSelect.value || 'Stopwatch';
    qs('#stopwatchCalories').textContent = 'Estimated: ' + estimateCalories(elapsedMins, exercise) + ' kcal';

  }, 1000);
});



qs('#pauseStopwatch').addEventListener('click', () => {
  if(stopwatchTimer){ clearInterval(stopwatchTimer); stopwatchTimer = null; }
});



qs('#resetStopwatch').addEventListener('click', () => {
  if(stopwatchTimer) { clearInterval(stopwatchTimer); stopwatchTimer = null; }
  stopwatchElapsed = 0;
  stopwatchDisplay.textContent = '00:00';
});





// ---------- Charts & Dashboard ----------
const ctx = document.getElementById('weeklyChart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      { label: 'Calories Consumed', data: [0,0,0,0,0,0,0], backgroundColor: 'rgba(108,99,255,0.7)' },
      { label: 'Calories Burned', data: [0,0,0,0,0,0,0], backgroundColor: 'rgba(255,99,132,0.7)' }
    ]
  },
  options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
});

function updateDashboard(){
  const wks = DB.get('workouts', []);
  const meals = DB.get('meals', []);
  qs('#summaryWorkouts').textContent = wks.length;

  // ---------- STREAK BASED ON COMPLETED WORKOUTS ----------

const doneWorkouts = wks.filter(w => w.done && w.date)
                        .map(w => new Date(w.date).setHours(0,0,0,0)); // normalize to start of day
const uniqueDates = Array.from(new Set(doneWorkouts)).sort((a,b) => b - a); // newest first

let streak = 0;
if(uniqueDates.length){
  let today = new Date();
  today.setHours(0,0,0,0); // today midnight
  let expected = today.getTime();

  for(let d of uniqueDates){
    if(d === expected){
      streak++;
      expected -= 24*60*60*1000; // move to previous day
    } else if(d < expected){
      // gap detected, break streak
      break;
    }
  }
}

qs('#summaryStreak').textContent = streak + ' days';



  // ---------- DAILY CALORIES ----------
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dayIndex = {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
  const caloriesConsumed = [0,0,0,0,0,0,0];
  const caloriesBurned = [0,0,0,0,0,0,0];

  const now = Date.now();
  const sevenDaysAgo = now - 7*24*60*60*1000; // timestamp 7 days ago
  
  meals.forEach(m => {
    if(!m.date || m.date < sevenDaysAgo) return; // ignore meals older than 7 days
    const idx = dayIndex[m.day] ?? 0;
    caloriesConsumed[idx] += m.cals;
  });
  
  wks.forEach(w => {
    if(!w.done || !w.date || w.date < sevenDaysAgo) return; // ignore old or incomplete workouts
    const idx = dayIndex[w.day] ?? 0;
    caloriesBurned[idx] += estimateCalories(w.duration,w.name);
  });


  chart.data.datasets[0].data = caloriesConsumed;
  chart.data.datasets[1].data = caloriesBurned;
  chart.update();

  // ---------- TOTALS ----------
  const totalConsumed = caloriesConsumed.reduce((a,b)=>a+b,0);
  const totalBurned = caloriesBurned.reduce((a,b)=>a+b,0);
  qs('#summaryCalories').textContent = `Consumed: ${totalConsumed} kcal | Burned: ${totalBurned} kcal`;

  // ---------- GOALS PROGRESS ----------
const goals = DB.get('goals', {});
qs('#goalBurnVal').textContent = goals.burn;
qs('#goalWorkoutVal').textContent = goals.workouts;
qs('#goalCalsVal').textContent = goals.cals;

// Calculate percentages (can exceed 100%)
const burnPct = Math.round((totalBurned / (goals.burn || 1)) * 100);
const workoutPct = Math.round((wks.filter(w => w.done).length / (goals.workouts || 1)) * 100);
const calsPct = Math.round((totalConsumed / (goals.cals || 1)) * 100);

// Update progress bars
qs('#goalBurnProgress').style.width = burnPct + '%';
qs('#goalBurnPct').textContent = burnPct + '%';

qs('#goalWorkoutProgress').style.width = workoutPct + '%';
qs('#goalWorkoutPct').textContent = workoutPct + '%';

qs('#goalCalsProgress').style.width = calsPct + '%';
qs('#goalCalsPct').textContent = calsPct + '%';




 
  // ---------- SMART TIP ----------
  const tip = generateTip(wks, meals);
  qs('#dailyTip').textContent = tip;

  // ---------- UPDATE GREETING ----------
  updateDashboardGreeting();
}



updateDashboard();

function updateDashboardGreeting(){
  const profile = DB.get('profile', {});
  const name = profile.name ? profile.name.split(' ')[0] : '';
  const greeting = name ? `Hi ${name} — Weekly Summary` : 'Weekly Summary';
  qs('#dashboardGreeting').textContent = greeting;
}

// ---------- Smart Recommendations ----------
function generateTip(workouts, meals){
  const totalBurned = workouts.reduce((s,w)=>s+estimateCalories(w.duration,w.name),0);
  const totalConsumed = meals.reduce((s,m)=>s+m.cals,0);
  const goals = DB.get('goals', {});
  if(totalConsumed > 2000) return "You ate a bit high today. Try lighter dinner & hydrate.";
  if(totalBurned < 150) return "Try a 10-minute brisk walk to boost metabolism.";
  if(workouts.length >= 3) return "Great consistency! Keep going!";
  if(totalBurned < (goals.burn / 7)) return "Do a short HIIT session today to reach your burn goal.";
  return "Small steps matter — do one quick workout today!";
}

// ---------- Water Tracker (improved) ----------
const add250 = qs('#add250'), add500 = qs('#add500'), add750 = qs('#add750'), resetWater = qs('#resetWater');
const waterTodayEl = qs('#waterToday'), waterGoalLabel = qs('#waterGoalLabel'), waterGoalInput = qs('#waterGoalInput'), saveWaterGoal = qs('#saveWaterGoal');
const waterHistoryEl = qs('#waterHistory'), waterPctEl = qs('#waterPct');
const waterCtx = document.getElementById('waterChart').getContext('2d');

let waterChart = new Chart(waterCtx, {
  type: 'doughnut',
  data: { labels: ['Consumed','Remaining'], datasets: [{ data: [0,2000], backgroundColor: ['rgba(108,99,255,0.85)','rgba(230,230,230,0.6)'] }] },
  options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
});

function renderWater(){
  const wl = DB.get('waterLog', {});
  const today = wl.today || 0;
  const goal = wl.goal || 2000;
  waterTodayEl.textContent = today;
  waterGoalLabel.textContent = goal;
  const pct = goal ? Math.round((today / goal) * 100) : 0;
  waterPctEl.textContent = `${pct}%`;
  waterChart.data.datasets[0].data = [Math.min(today,goal), Math.max(0, goal - today)];
  waterChart.update();

  // render history (last 7 days)
  const hist = wl.history || {};
  const keys = Object.keys(hist).sort().reverse().slice(0,7);
  waterHistoryEl.innerHTML = '';
  if(!keys.length) waterHistoryEl.innerHTML = '<div class="muted">No history yet.</div>';
  else keys.forEach(k => {
    const v = hist[k];
    const div = document.createElement('div');
    div.innerHTML = `<strong>${k}</strong> — ${v} ml`;
    waterHistoryEl.appendChild(div);
  });
}

add250.addEventListener('click', ()=> modifyWater(250));
add500.addEventListener('click', ()=> modifyWater(500));
add750.addEventListener('click', ()=> modifyWater(750));
resetWater.addEventListener('click', ()=> { 
  if(confirm('Reset today\'s water intake?')){
    const wl = DB.get('waterLog', {today:0, goal:2000, history:{}});
    const todayKey = new Date().toISOString().slice(0,10);
    wl.history[todayKey] = 0;
    wl.today = 0;
    DB.set('waterLog', wl); 
    renderWater(); 
  }
});

saveWaterGoal.addEventListener('click', ()=>{
  const g = parseInt(waterGoalInput.value);
  if(!g || g<=0) return alert('Enter a valid goal (ml).');
  const wl = DB.get('waterLog', { today:0, goal:2000, history:{} });
  wl.goal = g;
  DB.set('waterLog', wl);
  renderWater();
});

function modifyWater(amt){
  const wl = DB.get('waterLog', { today:0, goal:2000, history:{} });
  wl.today = (wl.today || 0) + amt;
  wl.history = wl.history || {};
  const key = new Date().toISOString().slice(0,10);
  wl.history[key] = wl.today;
  DB.set('waterLog', wl);
  renderWater();
}
renderWater();

// ---------- Populate exercise select helper ----------
const timerExerciseSelect = qs('#exerciseSelect'); // matches your Timer card
const stopwatchExerciseSelect = qs('#stopwatchExerciseSelect'); // already matches

function populateExerciseSelects(){
  const set = new Set(Object.keys(METS));
  DB.get('workouts',[]).forEach(w => set.add(w.name));

  [timerExerciseSelect, stopwatchExerciseSelect].forEach(select => {
    select.innerHTML = '';
    Array.from(set).forEach(n => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      select.appendChild(o);
    });
  });
}
populateExerciseSelects();


// ---------- Initial population of profile fields & goals ----------
populateProfile();

// ---------- Utility: Update certain displays on load every few actions ----------
window.addEventListener('load', ()=> {
  updateDashboard();
  renderWorkouts();
  renderMeals();
  renderWater();
});

// ---------- Extra: allow adding a workout from session end (optional) ----------

function addWorkoutFromSession(name, duration){
  const wks = DB.get('workouts', []);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayDay = dayNames[new Date().getDay()];
  // add workout as done with today's date
  wks.push({
    id: UID(),
    name,
    duration,
    day: todayDay,
    date: Date.now(),
    done: true
  });
  DB.set('workouts', wks);
  renderWorkouts(); 
  updateDashboard();
  populateExerciseSelects();
}

// ---------- Save Timer Session ----------
qs('#saveSessionTimer').addEventListener('click', () => {
  if(sessionRemaining > 0){
    if(!confirm('Session not completed. Do you still want to save it?')) return;
  }
  const exercise = exerciseSelect.value || 'Timer Session';

  // Calculate minutes actually completed
  const totalSeconds = parseInt(qs('#sessionDuration').value)*60 - sessionRemaining;
  const mins = Math.ceil(totalSeconds / 60); // round up partial minutes

  addWorkoutFromSession(exercise, mins);

  alert(`Timer session saved! Calories burned: ${estimateCalories(mins, exercise)} kcal`);

  sessionRemaining = 0;
  sessionDisplay.textContent = '00:00';
  sessionCalories.textContent = 'Estimated: 0 kcal';
  if(sessionTimer){ clearInterval(sessionTimer); sessionTimer = null; }
});



// ---------- Save Stopwatch Session ----------
qs('#saveStopwatch').addEventListener('click', () => {
  if(stopwatchElapsed <= 0) return alert('No time recorded.');
  if(!confirm('Save this workout session?')) return;

  const exercise = stopwatchExerciseSelect.value || 'Stopwatch';
  const mins = Math.ceil(stopwatchElapsed/60);
  const calories = estimateCalories(mins, exercise);

  addWorkoutFromSession(exercise, mins);

  alert(`Stopwatch session saved! Calories burned: ${calories} kcal`);

  stopwatchElapsed = 0;
  stopwatchDisplay.textContent = '00:00';
  qs('#stopwatchCalories').textContent = 'Estimated: 0 kcal';
  if(stopwatchTimer){ clearInterval(stopwatchTimer); stopwatchTimer = null; }
});


// ---------- Small helpers ----------
function safeNum(v){ return isNaN(Number(v)) ? 0 : Number(v); }

// ---------- End of file ----------
