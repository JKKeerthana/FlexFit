// ---------- Helpers ----------
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

// ---------- Navigation ----------
qsa('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    qsa('.view').forEach(v => v.classList.add('hidden'));
    qs('#' + view).classList.remove('hidden');
    if(view==='dashboard') updateDashboard();
  });
});

// ---------- Theme Toggle ----------
const themeToggle = qs('#themeToggle');
themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  themeToggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
});

// ---------- LocalStorage ----------
const DB = {
  get(key, fallback=[]) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)) }
};

// ---------- Workouts ----------
const wkName = qs('#wkName'), 
      wkDuration = qs('#wkDuration'), 
      wkDay = qs('#wkDay'), 
      addWorkoutBtn = qs('#addWorkoutBtn'), 
      wkListEl = qs('#workoutList');

function renderWorkouts() {
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
        div.innerHTML = `<div><strong>${w.name}</strong> (${w.duration} min)</div><button data-del="${wks.indexOf(w)}" class="btn ghost">Del</button>`;
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
  wks.push({name, duration, day, date: Date.now()});
  DB.set('workouts', wks);
  wkName.value=''; wkDuration.value=''; renderWorkouts(); updateDashboard(); populateExerciseSelect();
});

wkListEl.addEventListener('click', e=>{
  if(e.target.dataset.del !== undefined){
    const idx = Number(e.target.dataset.del);
    const wks = DB.get('workouts', []);
    wks.splice(idx,1); DB.set('workouts', wks); renderWorkouts(); updateDashboard(); populateExerciseSelect();
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
        div.innerHTML = `<div><strong>${m.name}</strong> ${m.cals} kcal</div><button data-del="${meals.indexOf(m)}" class="btn ghost">Del</button>`;
        mealListEl.appendChild(div);
      });
    }
  });
}

addMealBtn.addEventListener('click', ()=>{
  const name = mealName.value.trim(),
        cals = parseInt(mealCals.value),
        day = mealDay.value;
  if(!name || !cals || !day) return;
  const meals = DB.get('meals', []);
  meals.push({name, cals, day, date: Date.now()});
  DB.set('meals', meals);
  mealName.value=''; mealCals.value=''; renderMeals(); updateDashboard();
});

mealListEl.addEventListener('click', e=>{
  if(e.target.dataset.del !== undefined){
    const idx = Number(e.target.dataset.del);
    const meals = DB.get('meals', []);
    meals.splice(idx,1); DB.set('meals', meals); renderMeals(); updateDashboard();
  }
});
renderMeals();

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
const METS={'Running (10 km/h)':9.8,'Cycling (moderate)':7.5,'Walking (5 km/h)':3.5,'Yoga':3,'HIIT':8,'Bodyweight':6,'Jump Rope':12};

function populateExerciseSelect(){
  const set=new Set(Object.keys(METS));
  DB.get('workouts',[]).forEach(w=>set.add(w.name));
  exerciseSelect.innerHTML='';
  Array.from(set).forEach(n=>{
    const o=document.createElement('option'); o.value=n; o.textContent=n; exerciseSelect.appendChild(o);
  });
}
populateExerciseSelect();

function estimateCalories(mins,activity){let w=parseFloat(qs('#weight').value)||70; return Math.round(mins*(METS[activity]||4)*3.5*w/200);}
qs('#startSession').addEventListener('click', ()=>{
  const mins=parseInt(qs('#sessionDuration').value)||20; sessionRemaining=mins*60; if(sessionTimer) clearInterval(sessionTimer);
  sessionTimer=setInterval(()=>{
    if(sessionRemaining<=0){clearInterval(sessionTimer);sessionTimer=null;alert('Session complete!');updateDashboard();return;}
    sessionRemaining--; 
    const mm=String(Math.floor(sessionRemaining/60)).padStart(2,'0'); 
    const ss=String(sessionRemaining%60).padStart(2,'0');
    sessionDisplay.textContent=`${mm}:${ss}`; 
    sessionCalories.textContent='Estimated: '+estimateCalories(Math.ceil((mins*60-sessionRemaining)/60),exerciseSelect.value)+' kcal';
  },1000);
});
qs('#pauseSession').addEventListener('click', ()=>{if(sessionTimer){clearInterval(sessionTimer);sessionTimer=null;}});
qs('#resetSession').addEventListener('click', ()=>{if(sessionTimer) clearInterval(sessionTimer); sessionTimer=null; sessionRemaining=0; sessionDisplay.textContent='00:00'; sessionCalories.textContent='Estimated: 0 kcal';});

// ---------- Dashboard / Chart ----------
const ctx = document.getElementById('weeklyChart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      {
        label: 'Calories Consumed',
        data: [0,0,0,0,0,0,0],
        backgroundColor: 'rgba(108,99,255,0.7)'
      },
      {
        label: 'Calories Burned',
        data: [0,0,0,0,0,0,0],
        backgroundColor: 'rgba(255,99,132,0.7)'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

function updateDashboard(){
  const wks = DB.get('workouts', []);
  const meals = DB.get('meals', []);

  qs('#summaryWorkouts').textContent = wks.length;

  // Streak (based on workouts)
  const ordered = wks.slice().sort((a,b)=>b.date-a.date);
  let streak=0, lastDay=null;
  for(let i=0;i<ordered.length;i++){
    const d = new Date(ordered[i].date).toDateString();
    if(i===0){ streak=1; lastDay=d; }
    else {
      const diff = (new Date(lastDay) - new Date(ordered[i].date)) / (1000*60*60*24);
      if(diff <= 1){ streak++; lastDay=d; }
      else break;
    }
  }
  qs('#summaryStreak').textContent = streak + ' days';

  // Daily calories
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const caloriesConsumed = days.map(day => meals.filter(m=>m.day===day).reduce((s,m)=>s+m.cals,0));
  const caloriesBurned = days.map(day => wks.filter(w=>w.day===day).reduce((s,w)=>s+estimateCalories(w.duration,w.name),0));

  chart.data.datasets[0].data = caloriesConsumed;
  chart.data.datasets[1].data = caloriesBurned;
  chart.update();

  // Show totals separately
  const totalConsumed = caloriesConsumed.reduce((a,b)=>a+b,0);
  const totalBurned = caloriesBurned.reduce((a,b)=>a+b,0);
  const summaryCaloriesEl = qs('#summaryCalories');
  summaryCaloriesEl.textContent = `Consumed: ${totalConsumed} kcal | Burned: ${totalBurned} kcal`;
  summaryCaloriesEl.style.fontSize = '12px'; // smaller font
}
updateDashboard();
