/* SMART ACADEMY
   Frontend architecture:
   Auth -> Supabase Auth
   Data -> Supabase/PostgreSQL
   Realtime -> Supabase Realtime / external RTC integration
   Payment -> backend/webhook integration ONLY
*/

const SUPABASE_URL = "https://efeayniqqqthzfkmwkia.supabase.co";
const SUPABASE_KEY = "sb_publishable_sB4e5aWKf_dmlwmwJWDxjg_r2YBleoD";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const onboardingSlides = [
  ["LEARN SMARTER","Discover tuition, notes, quizzes and a learning experience built around you."],
  ["LEARN LIVE","Join secure LIVE tuition classes with chat, camera, microphone and future RTC integrations."],
  ["CONNECT","Message teachers, join class groups and receive announcements."],
  ["TRACK YOUR PROGRESS","Earn XP, build streaks, unlock achievements and monitor your progress."],
  ["BECOME YOUR BEST","Everything connected in one education ecosystem."]
];

const demoClasses = [
  {id:"math2",subject:"Mathematics",title:"Form 2 Mathematics",teacher:"Cikgu Amir",rating:4.9,students:1240,price:45,schedule:"Monday · 8:00 PM",live:true,progress:80},
  {id:"science2",subject:"Science",title:"Form 2 Science",teacher:"Cikgu Sarah",rating:4.8,students:980,price:45,schedule:"Tuesday · 8:00 PM",live:false,progress:70},
  {id:"english2",subject:"English",title:"Form 2 English",teacher:"Cikgu Daniel",rating:4.9,students:760,price:45,schedule:"Wednesday · 9:00 PM",live:false,progress:90}
];

let state = {
  user: null,
  role: "student",
  page: "home",
  notifications: 4,
  wallet: 125,
  xp: 8450,
  level: 5,
  classes: JSON.parse(localStorage.getItem("sa_classes") || "null") || demoClasses,
  messages: [
    {from:"Cikgu Amir",text:"Quiz Matematik akan bermula malam ini pada 8 PM."},
    {from:"Cikgu Sarah",text:"Nota Science Chapter 4 sudah tersedia."}
  ]
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(v){return `RM${Number(v||0).toFixed(2)}`;}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
function roleLabel(){return state.role.charAt(0).toUpperCase()+state.role.slice(1);}
function saveClasses(){localStorage.setItem("sa_classes",JSON.stringify(state.classes));}
function paidKey(){return "sa_paid_"+(state.user?.email||"guest");}
function getPaid(){return JSON.parse(localStorage.getItem(paidKey())||"[]");}
function isPaid(id){return getPaid().includes(id);}
function savePaid(arr){localStorage.setItem(paidKey(),JSON.stringify(arr));}
function avatarLetter(){return (state.user?.name||"N").trim().charAt(0).toUpperCase();}

function showModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden");}
function closeModal(){$("#modal").classList.add("hidden");$("#modalContent").innerHTML="";}

function navForRole(){
  if(state.role==="teacher") return [
    ["home","⌂","Dashboard"],["classes","▣","Classes"],["live","🔴","LIVE"],["messages","◌","Messages"],["earnings","💳","Earnings"],["students","♙","Students"],["homework","✓","Assignments"],["profile","●","Profile"]
  ];
  if(state.role==="parent") return [
    ["home","⌂","Home"],["children","♙","Children"],["payments","💳","Payments"],["notifications","♢","Notifications"],["profile","●","Profile"]
  ];
  if(state.role==="admin") return [
    ["home","⌂","Dashboard"],["users","♙","Users"],["classes","▣","Classes"],["live","🔴","LIVE"],["payments","💳","Payments"],["reports","▤","Reports"],["settings","⚙","Settings"]
  ];
  return [
    ["home","⌂","Home"],["classes","▣","Classes"],["live","🔴","LIVE"],["messages","◌","Messages"],["profile","●","Profile"],["notes","📚","Notes"],["quiz","?","Quiz"],["progress","◔","Progress"],["ranking","🏆","Ranking"],["wallet","💳","Wallet"],["timetable","▦","Timetable"],["achievements","★","Achievements"]
  ];
}

function renderNav(){
  $("#sideNav").innerHTML=navForRole().map(([id,icon,label])=>`<button data-page="${id}" class="${state.page===id?"active":""}">${icon} ${label}</button>`).join("");
  const mobile=navForRole().slice(0,5);
  $("#mobileNav").innerHTML=mobile.map(([id,icon,label])=>`<button data-page="${id}" class="${state.page===id?"active":""}">${icon}<br>${label}</button>`).join("");
  $$("#sideNav button,#mobileNav button,.sidebar-bottom button,[data-page]").forEach(b=>b.onclick=()=>{if(b.dataset.page){state.page=b.dataset.page;renderPage();}});
}

function renderPage(){
  renderNav();
  const map={
    home:renderHome,classes:renderClasses,live:renderLive,messages:renderMessages,
    earnings:renderEarnings,students:renderStudents,homework:renderHomework,
    profile:renderProfile,notes:renderNotes,quiz:renderQuiz,progress:renderProgress,
    ranking:renderRanking,wallet:renderWallet,timetable:renderTimetable,achievements:renderAchievements,
    children:renderChildren,payments:renderPayments,notifications:renderNotifications,
    users:renderUsers,reports:renderReports,settings:renderSettings,about:renderAbout
  };
  (map[state.page]||renderHome)();
  $("#avatar").textContent=avatarLetter();
  $("#notifDot").style.display=state.notifications?"block":"none";
}

function shell(title,sub,body,button=""){
  $("#content").innerHTML=`<div class="page-head"><div><span class="eyebrow">SMART ACADEMY</span><h1>${title}</h1><p>${sub}</p></div>${button}</div>${body}`;
}

function renderHome(){
  if(state.role==="teacher") return teacherHome();
  if(state.role==="parent") return parentHome();
  if(state.role==="admin") return adminHome();

  const next=state.classes[0];
  shell(`Good Morning, ${esc(state.user?.name||"Student")} 👋`,"Keep learning. Go beyond the grade.",
  `<div class="card hero-card"><div class="row between"><div><span class="tag">SMART WALLET</span><div class="stat">${money(state.wallet)}</div><span class="muted">Available balance</span></div><button class="primary" data-page="wallet">TOP UP</button></div></div>
  <div class="metric-grid" style="margin-top:16px">
    <div class="metric"><span class="muted">Ranking</span><b>#24</b><span class="small">Global</span></div>
    <div class="metric"><span class="muted">XP</span><b>${state.xp.toLocaleString()}</b><span class="small">Level ${state.level}</span></div>
    <div class="metric"><span class="muted">Streak</span><b>7 🔥</b><span class="small">days</span></div>
    <div class="metric"><span class="muted">Classes</span><b>${getPaid().length}</b><span class="small">active</span></div>
  </div>
  <div class="grid grid-2" style="margin-top:18px">
    <div class="card"><h3>Continue Learning</h3><p class="muted">${esc(next.subject)} · ${esc(next.teacher)}</p><div class="progress"><span style="width:${next.progress}%"></span></div><p class="small">${next.progress}% complete</p><button class="secondary" data-page="classes">CONTINUE →</button></div>
    <div class="card"><h3>Upcoming Class</h3><p>${esc(next.subject)}</p><p class="muted">${esc(next.teacher)} · ${esc(next.schedule)}</p><button class="secondary" data-page="live">VIEW CLASS</button></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="row between"><div><span class="tag">🔴 LIVE NOW</span><h3>${esc(next.title)}</h3><p class="muted">${esc(next.teacher)} · 328 watching</p></div><button class="primary" data-page="live">JOIN LIVE</button></div></div>
  <div style="margin-top:18px"><h2>Recommended For You</h2><div class="grid">${state.classes.map(classCard).join("")}</div></div>`);
}

function teacherHome(){
  const own=state.classes.filter(c=>c.teacher===(state.user?.name||""));
  shell(`Welcome, ${esc(state.user?.name||"Teacher")} 👋`,"Teacher dashboard",
  `<div class="metric-grid"><div class="metric"><span class="muted">Gross Earnings</span><b>RM1,980</b></div><div class="metric"><span class="muted">Net Earnings</span><b>RM1,782</b></div><div class="metric"><span class="muted">Students</span><b>186</b></div><div class="metric"><span class="muted">Rating</span><b>4.9 ⭐</b></div></div>
  <div class="grid grid-2" style="margin-top:18px"><div class="card"><h3>LIVE Today</h3><p class="muted">Mathematics · 8:00 PM</p><button class="primary" data-page="live">OPEN LIVE ROOM</button></div><div class="card"><h3>Teacher Verification</h3><p class="muted">Active provider status is controlled by backend/admin verification.</p><span class="tag">VERIFICATION LAYER READY</span></div></div>
  <div class="card" style="margin-top:18px"><div class="row between"><h3>Your Classes</h3><button class="secondary" data-action="create-class">+ CREATE CLASS</button></div>${own.length?own.map(classCard).join(""):`<p class="muted">Create your first class.</p>`}</div>`);
}

function parentHome(){
  shell(`Welcome, ${esc(state.user?.name||"Parent")} 👋`,"Monitor learning without exposing private student conversations.",
  `<div class="grid grid-2"><div class="card hero-card"><span class="tag">CHILD</span><h2>Aiman</h2><p class="muted">Form 2 · Student</p><div class="progress"><span style="width:82%"></span></div><b>82% overall progress</b></div><div class="card"><span class="muted">SMART WALLET</span><div class="stat">${money(state.wallet)}</div><button class="primary" data-page="payments">PAY / TOP UP</button></div></div>
  <div class="grid" style="margin-top:18px"><div class="card"><h3>Attendance</h3><div class="stat">94%</div><p class="muted">This month</p></div><div class="card"><h3>XP</h3><div class="stat">8,450</div><p class="muted">Level 5 · #24</p></div><div class="card"><h3>Upcoming</h3><div class="stat">8 PM</div><p class="muted">Mathematics</p></div></div>`);
}

function adminHome(){
  shell("Admin Dashboard","Platform overview",
  `<div class="metric-grid">${["Students|2,480","Teachers|186","Parents|1,940","Classes|324","LIVE Sessions|12","Total Revenue|RM128K","Platform Revenue|RM12.8K","Active Users|1,120"].map(x=>{let[a,b]=x.split("|");return `<div class="metric"><span class="muted">${a}</span><b>${b}</b></div>`}).join("")}</div>
  <div class="card" style="margin-top:18px"><h3>Secure Administration</h3><p class="muted">Teacher verification, payments, wallets, reports, reviews, rankings, withdrawals and platform settings should be controlled by protected server-side functions and RLS.</p></div>`);
}

function classCard(c){
  const paid=isPaid(c.id);
  return `<div class="card class-card"><span class="tag">${c.live?"🔴 LIVE":"CLASS"}</span><p class="muted small">${esc(c.subject)}</p><div class="class-title">${esc(c.title)}</div><p class="muted">${esc(c.teacher)} · ⭐ ${c.rating}</p><p class="small">${c.students.toLocaleString()} students · ${esc(c.schedule)}</p><div class="row between"><span class="price">${money(c.price)}<small class="muted"> / month</small></span><span class="small">Progress ${c.progress||0}%</span></div><div class="actions">${state.role==="student"&&!paid?`<button class="primary" data-buy="${c.id}">SUBSCRIBE ${money(c.price)}</button>`:`<button class="secondary" data-class="${c.id}">${state.role==="teacher"?"MANAGE":"VIEW CLASS"}</button>`}<button class="secondary" data-details="${c.id}">DETAILS</button></div></div>`;
}

function renderClasses(){
  if(state.role==="teacher") return shell("Classes","Create and manage your tuition marketplace.",
    `<div class="card"><div class="row between"><div><h3>Your Tuition Classes</h3><p class="muted">Set schedule, price, notes, quizzes and LIVE sessions.</p></div><button class="primary" data-action="create-class">+ CREATE CLASS</button></div></div><div class="grid" style="margin-top:18px">${state.classes.filter(c=>c.teacher===(state.user?.name||"")).map(classCard).join("")||`<div class="card"><p class="muted">No classes yet.</p></div>`}</div>`);
  if(state.role==="parent") return shell("Children Classes","View subscriptions and classes linked to your children.",`<div class="grid">${state.classes.map(classCard).join("")}</div>`);
  shell("Find Your Class","Search teachers, subjects, forms, LIVE classes and tuition.",
    `<div class="card"><div class="grid grid-2"><div><input id="classSearch" placeholder="Search teacher, subject or class"></div><div><select id="classFilter"><option value="">All subjects</option><option>Mathematics</option><option>Science</option><option>English</option></select></div></div></div><div id="classGrid" class="grid" style="margin-top:18px">${state.classes.map(classCard).join("")}</div>`);
  $("#classSearch").oninput=filterClasses;$("#classFilter").onchange=filterClasses;
}

function filterClasses(){
  const q=$("#classSearch").value.toLowerCase(), f=$("#classFilter").value;
  $("#classGrid").innerHTML=state.classes.filter(c=>(!q||`${c.title} ${c.teacher} ${c.subject}`.toLowerCase().includes(q))&&(!f||c.subject===f)).map(classCard).join("")||`<div class="card"><p class="muted">No classes found.</p><button class="secondary" onclick="renderPage()">Retry</button></div>`;
}

function renderLive(){
  shell(state.role==="teacher"?"LIVE Studio":"LIVE Now","Secure authenticated classroom access.",
  `<div class="card hero-card"><span class="tag">🔴 LIVE ROOM</span><h2>${state.role==="teacher"?"Teacher LIVE Control":"Mathematics Revision"}</h2><p class="muted">Only enrolled students should enter private tuition LIVE classes. Camera, microphone and screen-share controls require authenticated realtime integration.</p><div class="actions">${state.role==="teacher"?`<button class="primary" data-action="start-live">START LIVE</button>`:`<button class="primary" data-action="join-live">JOIN LIVE</button>`}<button class="secondary" data-action="permissions">CAMERA / MIC</button><button class="secondary" data-action="screen">SCREEN SHARE</button></div></div>
  <div class="grid grid-2" style="margin-top:18px"><div class="card"><h3>Class Controls</h3><p class="muted">🎙 Mic · 📷 Camera · 🔊 Speaker · ✋ Raise hand · 💬 Chat · 🖥 Screen share · 🧑‍🏫 Whiteboard</p></div><div class="card"><h3>Security</h3><p class="muted">Teacher controls who can enter, speak, enable camera and share screen.</p></div></div>`);
}

function renderMessages(){
  shell("Messages","Chats, groups and announcements.",
  `<div class="grid grid-2"><div class="card"><h3>CHATS</h3><div class="list">${state.messages.map(m=>`<div class="list-item"><div><b>${esc(m.from)}</b><p class="muted small">${esc(m.text)}</p></div><span>›</span></div>`).join("")}</div></div><div class="card"><h3>GROUPS</h3><div class="list"><div class="list-item"><b>FORM 2 MATHEMATICS</b><span>42</span></div><div class="list-item"><b>SCIENCE REVISION</b><span>28</span></div></div></div></div>`);
}

function renderEarnings(){
  shell("Earnings","Teacher earnings and withdrawals.",
  `<div class="metric-grid"><div class="metric"><span class="muted">Gross</span><b>RM1,980</b></div><div class="metric"><span class="muted">Platform Fee</span><b>RM198</b></div><div class="metric"><span class="muted">Net</span><b>RM1,782</b></div><div class="metric"><span class="muted">Available</span><b>RM1,450</b></div></div><div class="card" style="margin-top:18px"><h3>Withdrawal</h3><p class="muted">Bank account and approval workflow must be handled securely by backend/admin functions.</p><button class="primary" data-action="withdraw">REQUEST WITHDRAWAL</button></div>`);
}

function renderStudents(){shell("Students","Manage enrolled students and attendance.",`<div class="card"><div class="list">${["Aiman","Sara","Daniel","Haziq"].map((n,i)=>`<div class="list-item"><div><b>${n}</b><p class="muted small">Form 2 · Attendance ${90+i}%</p></div><span class="tag">ENROLLED</span></div>`).join("")}</div></div>`);}
function renderHomework(){shell("Assignments","Create, submit, mark and return assignments.",`<div class="grid"><div class="card"><span class="tag">DUE SOON</span><h3>Algebra Practice</h3><p class="muted">Mathematics · Due Friday</p><button class="secondary">OPEN</button></div><div class="card"><span class="tag">COMPLETED</span><h3>Science Chapter 4</h3><p class="muted">Score 88%</p><button class="secondary">VIEW FEEDBACK</button></div></div>`);}
function renderProfile(){shell("Profile",`${roleLabel()} account`, `<div class="grid grid-2"><div class="card"><div class="avatar" style="display:grid;place-items:center;margin-bottom:12px">${avatarLetter()}</div><h2>${esc(state.user?.name||"User")}</h2><p class="muted">${esc(state.user?.email||"")}</p><span class="tag">${roleLabel().toUpperCase()}</span></div><div class="card"><h3>Privacy & Access</h3><p class="muted">Your role and permissions are controlled through authenticated backend data and RLS.</p><button class="secondary" data-page="settings">SECURITY SETTINGS</button></div></div>`);}
function renderNotes(){shell("Note Bank","Find notes by form, subject, chapter and topic.",`<div class="grid">${["Form 2 Mathematics · Algebra · Chapter 4","Form 2 Science · Cells · Chapter 3","Form 2 English · Grammar · Revision"].map(x=>`<div class="card"><span class="tag">PDF</span><h3>${x.split(" · ")[0]}</h3><p class="muted">${x.split(" · ").slice(1).join(" · ")}</p><div class="actions"><button class="secondary">VIEW</button><button class="secondary">SAVE</button></div></div>`).join("")}</div>`);}
function renderQuiz(){shell("Quiz","Test knowledge, get instant results and earn XP.",`<div class="grid"><div class="card"><span class="tag">10 QUESTIONS</span><h3>Algebra Challenge</h3><p class="muted">Timer · Instant result · Explanation · XP</p><button class="primary">START QUIZ</button></div><div class="card"><span class="tag">BEST 92%</span><h3>Science Chapter 4</h3><p class="muted">Previous attempt</p><button class="secondary">RETRY</button></div></div>`);}
function renderProgress(){shell("My Progress","Track learning activity and outcomes.",`<div class="grid">${[["Mathematics",80],["Science",70],["English",90]].map(x=>`<div class="card"><h3>${x[0]}</h3><div class="progress"><span style="width:${x[1]}%"></span></div><b>${x[1]}%</b></div>`).join("")}</div><div class="metric-grid" style="margin-top:18px"><div class="metric"><span class="muted">Quiz Average</span><b>88%</b></div><div class="metric"><span class="muted">Attendance</span><b>94%</b></div><div class="metric"><span class="muted">Study Hours</span><b>18h</b></div><div class="metric"><span class="muted">Streak</span><b>7🔥</b></div></div>`);}
function renderRanking(){shell("Smart Ranking","Weekly, monthly and all-time rankings.",`<div class="card hero-card"><span class="tag">🏆 GLOBAL</span><div class="stat">#24</div><p class="muted">8,450 XP · Level 5</p><div class="progress"><span style="width:84%"></span></div></div><div class="card" style="margin-top:18px"><div class="list">${["Alya · 9,820 XP","Haris · 9,100 XP","Mira · 8,700 XP","You · 8,450 XP"].map((x,i)=>`<div class="list-item"><b>#${i+21}</b><span>${x}</span></div>`).join("")}</div></div>`);}
function renderWallet(){shell("Smart Wallet","Balance is only updated after verified backend payment events.",`<div class="card hero-card"><span class="tag">AVAILABLE BALANCE</span><div class="stat">${money(state.wallet)}</div><div class="actions"><button class="primary" data-action="topup">TOP UP WALLET</button><button class="secondary" data-action="transactions">TRANSACTION HISTORY</button></div></div><div class="grid" style="margin-top:18px">${[10,20,50,100,200,500].map(v=>`<div class="card"><h3>${money(v)}</h3><p class="muted">Secure gateway required</p><button class="secondary" data-topup="${v}">TOP UP</button></div>`).join("")}</div>`);}
function renderTimetable(){shell("My Timetable","Daily, weekly and monthly learning schedule.",`<div class="card"><div class="list">${["MON · 8:00 PM · Mathematics · Cikgu Amir · 🔴 LIVE","TUE · 8:00 PM · Science · Cikgu Sarah · UPCOMING","WED · 9:00 PM · English · Cikgu Daniel · REPLAY"].map(x=>`<div class="list-item"><span>${x}</span><span>›</span></div>`).join("")}</div></div>`);}
function renderAchievements(){shell("Achievements","Earn badges as you learn.",`<div class="grid">${["🏆 First Class","🔥 7 Day Streak","📚 100 Lessons","🧠 Quiz Master","⭐ Top Student","🎯 Perfect Score","🚀 Fast Learner"].map(x=>`<div class="card"><div class="stat">${x.split(" ")[0]}</div><h3>${x.substring(x.indexOf(" ")+1)}</h3><p class="muted">Achievement badge</p></div>`).join("")}</div>`);}
function renderChildren(){shell("Children","Connect and monitor one or more student accounts.",`<div class="card"><div class="row between"><div><h2>Aiman</h2><p class="muted">Form 2 · School</p></div><span class="tag">CONNECTED</span></div><div class="metric-grid" style="margin-top:18px"><div class="metric"><span class="muted">Attendance</span><b>94%</b></div><div class="metric"><span class="muted">XP</span><b>8,450</b></div><div class="metric"><span class="muted">Progress</span><b>82%</b></div><div class="metric"><span class="muted">Rank</span><b>#24</b></div></div></div>`);}
function renderPayments(){shell("Payments","Wallet top-ups, tuition subscriptions and receipts.",`<div class="card"><h3>Payment History</h3><div class="list">${["SUBSCRIPTION · RM45 · SUCCESS","WALLET TOP-UP · RM100 · SUCCESS","TUITION · RM45 · PENDING"].map(x=>`<div class="list-item"><span>${x}</span><button class="secondary">RECEIPT</button></div>`).join("")}</div></div>`);}
function renderNotifications(){shell("Notifications","Stay updated with classes, messages and payments.",`<div class="list">${["Upcoming Mathematics class · 8 PM","New replay available","Payment successful · RM45","New teacher announcement"].map(x=>`<div class="list-item"><span>${x}</span><span>•</span></div>`).join("")}</div>`);}
function renderUsers(){shell("Users","Admin-only user management.","<div class='card'><p class='muted'>Protected admin data layer: students, teachers, parents and admins.</p></div>");}
function renderReports(){shell("Reports","Moderation, payments, withdrawals and platform reports.","<div class='card'><p class='muted'>Reports should be reviewed through protected server-side workflows.</p></div>");}
function renderSettings(){shell("Settings","Privacy, security and account controls.",`<div class="grid grid-2"><div class="card"><h3>Privacy</h3><p class="muted">Manage data access, blocked users and communication privacy.</p><button class="secondary">PRIVACY SETTINGS</button></div><div class="card"><h3>Account</h3><p class="muted">Download data or permanently delete your account.</p><div class="actions"><button class="secondary">DATA ACCESS</button><button class="secondary danger" data-action="delete-account">DELETE ACCOUNT</button></div></div></div><div class="card" style="margin-top:18px"><h3>About</h3><button class="secondary" data-page="about">ABOUT SMART ACADEMY</button></div>`);}
function renderAbout(){shell("About Smart Academy","BEYOND THE GRADE.",`<div class="card"><div class="logo-mark small">SA</div><h2>SMART ACADEMY</h2><p class="muted">Beyond The Grade.</p><p class="small">Created by Norizkandar · Eonix Tech Studio</p><p class="small">Version 1.0.0</p><div class="actions"><button class="secondary">Terms of Service</button><button class="secondary">Privacy Policy</button><button class="secondary">Help & Support</button><button class="secondary">Report a Problem</button><button class="secondary danger" data-action="delete-account">Delete Account</button></div></div>`);}

function buyClass(id){
  const c=state.classes.find(x=>x.id===id);if(!c)return;
  showModal(`<span class="tag">SUBSCRIPTION</span><h2>${esc(c.title)}</h2><p class="muted">${esc(c.teacher)} · ⭐ ${c.rating}</p><div class="stat">${money(c.price)} / month</div><div class="card"><p><b>Secure payment flow:</b></p><p class="muted">Wallet is checked server-side. The frontend must never mark a payment successful by itself.</p></div><div class="actions"><button class="primary" data-action="pay-class" data-id="${c.id}">CONTINUE TO SECURE PAYMENT</button><button class="secondary" id="modalCancel">CANCEL</button></div>`);
}

function details(id){
  const c=state.classes.find(x=>x.id===id);if(!c)return;
  showModal(`<span class="tag">${c.live?"🔴 LIVE":"CLASS"}</span><h2>${esc(c.title)}</h2><p class="muted">${esc(c.teacher)} · ⭐ ${c.rating} · ${c.students.toLocaleString()} students</p><p>${esc(c.schedule)}</p><p class="muted">RM45/month default tuition. Notes, replay, quizzes, assignments and class group are connected through the backend architecture.</p>${state.role==="student"&&!isPaid(id)?`<button class="primary" data-buy="${id}">SUBSCRIBE ${money(c.price)}</button>`:`<button class="primary" data-action="join-live">JOIN CLASS</button>`}`);
}

function createClass(){
  showModal(`<span class="tag">TEACHER</span><h2>Create Tuition Class</h2><form id="createClassForm" class="form-card"><label>Class Title<input id="newTitle" required placeholder="Form 3 Mathematics"></label><label>Subject<select id="newSubject"><option>Mathematics</option><option>Science</option><option>English</option><option>Bahasa Melayu</option></select></label><label>Schedule<input id="newSchedule" required placeholder="Friday · 8:00 PM"></label><label>Tuition Price<input id="newPrice" type="number" min="0" value="45" required></label><label>Description<textarea id="newDescription" placeholder="Describe your class..."></textarea></label><button class="primary">CREATE CLASS</button></form>`);
  $("#createClassForm").onsubmit=e=>{e.preventDefault();const c={id:"c_"+Date.now(),title:$("#newTitle").value,subject:$("#newSubject").value,teacher:state.user?.name||"Teacher",rating:0,students:0,price:Number($("#newPrice").value),schedule:$("#newSchedule").value,live:false,progress:0};state.classes.unshift(c);saveClasses();closeModal();toast("Class created. Backend publishing should be added next.");renderPage();};
}

function handleAction(action,el){
  if(action==="create-class")return createClass();
  if(action==="pay-class"){
    const id=el.dataset.id;
    closeModal();
    showModal(`<span class="tag">SECURE PAYMENT</span><h2>Payment Gateway</h2><p class="muted">This frontend is ready for a real TNG/FPX provider integration. No payment is marked successful here.</p><div class="card"><p>Backend flow:</p><p class="muted">Create payment → Gateway → Webhook → Verify → Wallet/subscription update → Transaction record.</p></div><button class="primary" data-action="payment-demo-disabled">OPEN PAYMENT PROVIDER</button>`);
    return;
  }
  if(action==="topup")return showModal(`<h2>Top Up Smart Wallet</h2><p class="muted">Choose an amount. Real TNG/FPX processing must happen through a secure payment gateway and backend webhook.</p><div class="grid">${[10,20,50,100,200,500].map(v=>`<button class="secondary" data-topup="${v}">${money(v)}</button>`).join("")}</div>`);
  if(action==="transactions")return showModal("<h2>Transaction History</h2><p class='muted'>Transaction records will come from the wallet_transactions table.</p>");
  if(action==="start-live")return showModal("<h2>Start LIVE</h2><p class='muted'>Realtime video provider integration is required. Authenticated teacher permissions should be verified server-side.</p><button class='primary' data-action='permissions'>CHECK PERMISSIONS</button>");
  if(action==="join-live")return showModal("<h2>Join LIVE</h2><p class='muted'>Only enrolled students can enter private tuition LIVE rooms. Realtime provider connection is the next integration layer.</p>");
  if(action==="permissions")return showModal("<h2>Camera & Microphone</h2><p class='muted'>Permissions should be requested only when the user enters a LIVE/call feature.</p><div class='actions'><button class='primary' data-action='request-media'>REQUEST ACCESS</button></div>");
  if(action==="request-media"){navigator.mediaDevices?.getUserMedia?navigator.mediaDevices.getUserMedia({video:true,audio:true}).then(()=>toast("Camera and microphone permission granted.")).catch(()=>toast("Permission denied. Open browser/device settings.")):toast("Media permissions are unavailable.");return;}
  if(action==="screen")return toast("Screen sharing requires a supported realtime/video provider.");
  if(action==="withdraw")return showModal("<h2>Withdrawal Request</h2><p class='muted'>Bank details and withdrawal approval must be handled by protected backend functions.</p>");
  if(action==="delete-account")return showModal("<h2>Delete Account</h2><p class='muted'>Account deletion must run through a secure backend function after confirmation. This demo does not delete accounts client-side.</p><button class='secondary danger'>REQUEST ACCOUNT DELETION</button>");
}

document.addEventListener("click",e=>{
  const p=e.target.closest("[data-page]");if(p){state.page=p.dataset.page;renderPage();return;}
  const b=e.target.closest("[data-buy]");if(b){buyClass(b.dataset.buy);return;}
  const d=e.target.closest("[data-details]");if(d){details(d.dataset.details);return;}
  const c=e.target.closest("[data-class]");if(c){state.page="live";renderPage();return;}
  const a=e.target.closest("[data-action]");if(a){handleAction(a.dataset.action,a);return;}
  const t=e.target.closest("[data-topup]");if(t){toast("Payment gateway required — wallet will only update after verified webhook.");return;}
  if(e.target.id==="modalCancel")closeModal();
});

$("#modalClose").onclick=closeModal;
$("#menuBtn").onclick=()=>toast("Use the bottom navigation on mobile.");

$$(".tabs button").forEach(btn=>btn.onclick=()=>{
  $$(".tabs button").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  $("#signinForm").classList.toggle("hidden",btn.dataset.auth!=="signin");
  $("#signupForm").classList.toggle("hidden",btn.dataset.auth!=="signup");
});

$("#signinForm").onsubmit=async e=>{
  e.preventDefault();
  const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)return toast(error.message);
  await enterUser(data.user);
};

$("#signupForm").onsubmit=async e=>{
  e.preventDefault();
  if($("#signupPassword").value!==$("#signupConfirm").value)return toast("Passwords do not match.");
  const name=$("#signupName").value.trim(),email=$("#signupEmail").value.trim(),phone=$("#signupPhone").value.trim(),role=$("#signupRole").value;
  const {data,error}=await supabaseClient.auth.signUp({email,password:$("#signupPassword").value,options:{data:{name,phone,role}}});
  if(error)return toast(error.message);
  if(data.session&&data.user){await enterUser(data.user);toast("Account created.");}
  else toast("Account created. Please verify your email before signing in.");
};

$("#forgotBtn").onclick=async()=>{
  const email=$("#loginEmail").value.trim();if(!email)return toast("Enter your email first.");
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
  toast(error?error.message:"Password reset email sent.");
};

$("#logout").onclick=async()=>{
  await supabaseClient.auth.signOut();
  localStorage.removeItem("sa_user");state.user=null;$("#app").classList.add("hidden");$("#auth").classList.remove("hidden");
};

$("#searchInput").oninput=e=>{
  const q=e.target.value.trim();if(!q)return;
  state.page="classes";renderPage();
  setTimeout(()=>{if($("#classSearch")){$("#classSearch").value=q;filterClasses();}},0);
};

async function enterUser(user){
  const meta=user.user_metadata||{};
  state.user={id:user.id,name:meta.name||user.email?.split("@")[0]||"User",email:user.email,phone:meta.phone||""};
  state.role=meta.role||"student";
  localStorage.setItem("sa_user",JSON.stringify(state.user));
  localStorage.setItem("sa_role",state.role);
  $("#auth").classList.add("hidden");$("#onboarding").classList.add("hidden");$("#app").classList.remove("hidden");
  state.page=state.role==="teacher"?"home":"home";renderPage();
}

async function start(){
  let seen=localStorage.getItem("sa_onboarded");
  setTimeout(async()=>{
    $("#splash").classList.add("hidden");
    if(!seen){$("#onboarding").classList.remove("hidden");setupOnboarding();return;}
    const {data}=await supabaseClient.auth.getSession();
    if(data.session?.user){await enterUser(data.session.user);}
    else $("#auth").classList.remove("hidden");
  },1100);
}

function setupOnboarding(){
  let i=0;
  const title=$("#onboardTitle"),text=$("#onboardText"),dots=$("#onboardDots"),btn=$("#onboardNext");
  function paint(){title.textContent=onboardingSlides[i][0];text.textContent=onboardingSlides[i][1];dots.innerHTML=onboardingSlides.map((_,n)=>`<span class="${n===i?"active":""}"></span>`).join("");btn.textContent=i===onboardingSlides.length-1?"GET STARTED →":"NEXT →";}
  btn.onclick=()=>{if(i<onboardingSlides.length-1){i++;paint();}else{localStorage.setItem("sa_onboarded","1");$("#onboarding").classList.add("hidden");$("#auth").classList.remove("hidden");}};
  paint();
}

start();
