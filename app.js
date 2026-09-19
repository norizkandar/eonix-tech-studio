const SUPABASE_URL = "https://efeayniqqqthzfkmwkia.supabase.co";
const SUPABASE_KEY = "sb_publishable_sB4e5aWKf_dmlwmwJWDxjg_r2YBleoD";
const state = {
  user: JSON.parse(localStorage.getItem("st_user") || "null"),
  page: "home",
  role: localStorage.getItem("st_role") || "student",
  notifications: 3,
  chats: [
    {id:1,name:"Cikgu Aina",role:"Matematik",last:"Jangan lupa latihan Bab 4 ya!",time:"2m",initial:"A"},
    {id:2,name:"Form 2 Mathematics",role:"Class Group",last:"Cikgu Aina: Kelas bermula 8:00 PM",time:"15m",initial:"M"},
    {id:3,name:"Cikgu Daniel",role:"English",last:"Your essay feedback is ready.",time:"1h",initial:"D"}
  ],
  messages: [
    {me:false,text:"Hi! Dah semak nota Matematik terbaru?",time:"2:14 PM"},
    {me:true,text:"Belum lagi cikgu, nanti saya semak.",time:"2:15 PM"},
    {me:false,text:"Baik 👍 Jangan lupa latihan Bab 4 ya!",time:"2:16 PM"}
  ],
  homework: [
    {subject:"Mathematics",title:"Algebra — Practice Set 04",due:"Tomorrow, 11:59 PM",status:"In Progress",mark:"—"},
    {subject:"Science",title:"Chapter 5: Energy",due:"25 Sep 2026",status:"Not Started",mark:"—"},
    {subject:"English",title:"Descriptive Essay",due:"28 Sep 2026",status:"Marked",mark:"86%"}
  ],
  classes: [
    {subject:"Mathematics",teacher:"Cikgu Aina",time:"8:00 PM",date:"Today",duration:"60 min",status:"LIVE"},
    {subject:"Science",teacher:"Cikgu Hakim",time:"9:00 PM",date:"Today",duration:"60 min",status:"UPCOMING"},
    {subject:"English",teacher:"Cikgu Daniel",time:"4:00 PM",date:"22 Sep",duration:"60 min",status:"UPCOMING"}
  ]
};

const navItems = [
  ["home","⌂","Home"],["classes","▣","Classes"],["homework","✓","Homework"],["chat","◌","Chat"],["replay","▶","Replay"],["notes","▤","Notes"],["quiz","?","Quiz"],["timetable","▦","Timetable"],["progress","◔","Progress"]
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function save(){localStorage.setItem("st_user",JSON.stringify(state.user));localStorage.setItem("st_role",state.role)}
function initials(name="Student"){return name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}

function start(){
  setTimeout(()=>{$("#splash").classList.add("hidden"); if(state.user) showApp(); else $("#auth").classList.remove("hidden")},1500);
}
function showApp(){
  $("#auth").classList.add("hidden");$("#app").classList.remove("hidden");
  $("#profileAvatar").textContent=initials(state.user?.name);
  renderNav();renderMobileNav();renderPage();
}
function renderNav(){
  $("#sideNav").innerHTML=navItems.map(([id,ic,label])=>`<button class="nav-btn ${state.page===id?"active":""}" data-page="${id}"><span>${ic}</span>${label}</button>`).join("");
  $$("#sideNav [data-page]").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
}
function renderMobileNav(){
  const ids=["home","classes","homework","chat","profile"];
  $("#mobileNav").innerHTML=ids.map(id=>`<button class="${state.page===id?"active":""}" data-page="${id}">${id==="home"?"⌂":id==="classes"?"▣":id==="homework"?"✓":id==="chat"?"◌":"●"}<br>${id[0].toUpperCase()+id.slice(1)}</button>`).join("");
  $$("#mobileNav [data-page]").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
}
function navigate(page){state.page=page;renderNav();renderMobileNav();renderPage();window.scrollTo({top:0,behavior:"smooth"})}
function pageTitle(title,sub,action=""){return `<div class="page-title"><div><h2>${title}</h2><p>${sub}</p></div>${action}</div>`}
function classCard(c){
  const icon=c.subject==="Mathematics"?"∑":c.subject==="Science"?"⚗":"Aa";
  return `<article class="card class-card"><div class="class-top"><div class="subject-icon">${icon}</div><span class="status ${c.status==="LIVE"?"live":""}">${c.status}</span></div><div><h4>${c.subject}</h4><p>${c.teacher} · ${c.date} · ${c.time}</p></div><p>${c.duration}</p><div class="card-actions"><button onclick="openClass('${c.subject}')">Details</button><button class="primary" onclick="joinClass('${c.subject}')">${c.status==="LIVE"?"Join Live":"View Class"}</button></div></article>`
}
function openClass(subject){modal(`<h2>${subject} Class</h2><p class="muted">Live classroom workspace</p><div class="hero-card" style="margin-top:18px"><p>Teacher</p><h3>${state.classes.find(c=>c.subject===subject)?.teacher||"Teacher"}</h3><div class="hero-meta"><span>▣ 60 minutes</span><span>◉ Attendance enabled</span><span>◌ Class chat</span></div></div><div class="card" style="margin-top:12px"><b>Class resources</b><p class="muted">Notes, homework and replay will appear here.</p></div>`)}
function joinClass(subject){showToast(`${subject}: opening live classroom…`);setTimeout(()=>modal(`<h2>🔴 ${subject} Live Class</h2><p class="muted">You are entering the live classroom.</p><div style="aspect-ratio:16/9;border-radius:16px;background:radial-gradient(circle,#173f4c,#06111d);display:grid;place-items:center;margin:18px 0;border:1px solid var(--line)"><div style="text-align:center"><div class="brand-mark small">ST</div><p>Live classroom video</p><span class="tag">Camera & microphone ready</span></div></div><button class="primary-btn" onclick="closeModal()">Enter Classroom →</button>`),500)}
function renderHome(){
  const name=state.user?.name?.split(" ")[0]||"Student";
  return `<div class="greeting"><div><h2>Good afternoon, ${name} 👋</h2><p>Ready to make progress today?</p></div><span class="tag">● Learning streak: 7 days</span></div>
  <div class="hero-grid"><div class="hero-card"><span class="tag">NEXT CLASS · IN 35 MIN</span><h3>Mathematics — Algebra</h3><p>Cikgu Aina · Today at 8:00 PM · 60 minutes</p><div class="hero-meta"><span>◷ Starts in 00:35:12</span><span>◉ 24 students</span></div><br><button class="primary-btn" onclick="joinClass('Mathematics')">Join Class →</button></div><div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><span class="muted">Overall progress</span><h3 style="margin:7px 0">78%</h3></div><div class="ring" style="--p:78%"><b>78%</b></div></div><div class="metric-row"><span>Lessons completed</span><span>32 / 41</span></div><div class="progress-line"><span style="width:78%"></span></div></div></div>
  <div class="section-head"><h3>Quick actions</h3></div><div class="quick"><button onclick="navigate('classes')"><span>▣</span>Live Classes</button><button onclick="navigate('replay')"><span>▶</span>Replay</button><button onclick="navigate('notes')"><span>▤</span>Notes</button><button onclick="navigate('homework')"><span>✓</span>Homework</button><button onclick="navigate('quiz')"><span>?</span>Quiz</button><button onclick="navigate('timetable')"><span>▦</span>Timetable</button><button onclick="navigate('chat')"><span>◌</span>Chat</button><button onclick="navigate('progress')"><span>◔</span>Progress</button></div>
  <div class="section-head"><h3>Today's schedule</h3><button class="text-btn" onclick="navigate('timetable')">View timetable →</button></div><div class="grid grid-3">${state.classes.filter(c=>c.date==="Today").map(classCard).join("")}</div>
  <div class="section-head"><h3>Learning snapshot</h3></div><div class="grid grid-4"><div class="card stat"><div><small>Attendance</small><strong>94%</strong></div><div class="stat-icon">◉</div></div><div class="card stat"><div><small>Homework</small><strong>87%</strong></div><div class="stat-icon">✓</div></div><div class="card stat"><div><small>Quiz average</small><strong>82%</strong></div><div class="stat-icon">?</div></div><div class="card stat"><div><small>Learning hours</small><strong>18.5h</strong></div><div class="stat-icon">◷</div></div></div>`;
}
function renderClasses(){return pageTitle("Classes","Join live lessons and access your class resources.","<button class='primary-btn' onclick=\"showToast('Class schedule opened')\">＋ Browse Classes</button>")+`<div class="section-head"><h3>Today's classes</h3></div><div class="grid grid-3">${state.classes.map(classCard).join("")}</div><div class="section-head"><h3>Upcoming</h3></div><div class="grid grid-3">${state.classes.filter(c=>c.date!=="Today").map(classCard).join("")}</div>`}
function renderHomework(){
 return pageTitle("Homework","Stay on top of deadlines and teacher feedback.")+`<div class="grid grid-3">${state.homework.map((h,i)=>`<article class="card class-card"><div class="class-top"><span class="tag">${h.subject}</span><span class="status">${h.status}</span></div><h4>${h.title}</h4><p>Due ${h.due}</p><div class="progress-line"><span style="width:${h.status==="Marked"?100:h.status==="In Progress"?55:5}%"></span></div><div class="card-actions"><button onclick="viewHomework(${i})">Open</button><button class="primary" onclick="submitHomework(${i})">${h.status==="Marked"?"View Mark":"Submit"}</button></div></article>`).join("")}</div>`}
function viewHomework(i){const h=state.homework[i];modal(`<h2>${h.title}</h2><p class="muted">${h.subject} · Due ${h.due}</p><div class="card" style="margin-top:15px"><b>Question 1</b><p>Explain the main concept from today's lesson in your own words.</p><textarea id="answer" rows="5" placeholder="Type your answer..."></textarea></div><button class="primary-btn" style="margin-top:12px" onclick="submitHomework(${i})">Submit Homework →</button>`)}
function submitHomework(i){state.homework[i].status="Submitted";closeModal();showToast("Homework submitted successfully ✓");renderPage()}
function renderReplay(){const vids=[["Mathematics","Algebra: Linear Equations","Cikgu Aina","42:18",72],["Science","Energy & Heat","Cikgu Hakim","51:04",35],["English","Writing Better Essays","Cikgu Daniel","38:42",100],["History","Kesultanan Melayu Melaka","Cikgu Farah","45:20",12]];return pageTitle("Replay Library","Resume lessons whenever you need them.")+`<div class="grid grid-4">${vids.map(v=>`<article class="card class-card"><div style="aspect-ratio:16/9;border-radius:12px;background:linear-gradient(135deg,#123d3a,#102b52);display:grid;place-items:center;font-size:28px">▶</div><span class="tag">${v[0]}</span><h4>${v[1]}</h4><p>${v[2]} · ${v[3]}</p><div><small>${v[4]}% watched</small><div class="progress-line"><span style="width:${v[4]}%"></span></div></div><button class="primary-btn" onclick="playVideo('${v[1]}')">Continue Watching</button></article>`).join("")}</div>`}
function playVideo(title){modal(`<h2>${title}</h2><div style="aspect-ratio:16/9;border-radius:15px;background:#030b12;display:grid;place-items:center;margin:18px 0"><div style="text-align:center"><div style="font-size:42px">▶</div><p class="muted">Replay player</p></div></div><p class="muted">Playback position is ready to be connected to a real video storage/CDN.</p>`)}
function renderNotes(){const notes=[["Mathematics","Algebra Formula Sheet","PDF · 2.4 MB"],["Science","Energy — Chapter 5 Notes","PDF · 4.1 MB"],["Bahasa Melayu","Karangan: Teknik Menulis","PDF · 1.8 MB"],["English","Essay Structure Guide","PDF · 3.0 MB"],["History","Bab 2 — Kesultanan Melayu","PDF · 5.2 MB"]];return pageTitle("Note Bank","Search, bookmark and download your learning notes.","<button class='text-btn' onclick=\"showToast('Filters opened')\">Filter ▾</button>")+`<div class="search" style="max-width:none;margin-bottom:15px"><span>⌕</span><input id="noteSearch" placeholder="Search notes..."></div><div class="grid grid-3">${notes.map(n=>`<article class="card class-card"><div class="class-top"><div class="subject-icon">▤</div><span class="tag">${n[0]}</span></div><h4>${n[1]}</h4><p>${n[2]}</p><div class="card-actions"><button onclick="showToast('Note preview opened')">View</button><button class="primary" onclick="showToast('Download ready')">Download</button></div></article>`).join("")}</div>`}
function renderQuiz(){return pageTitle("Quizzes","Test your knowledge and track your performance.")+`<div class="grid grid-3"><article class="card class-card"><span class="tag">MATHEMATICS</span><h4>Algebra Checkpoint</h4><p>20 questions · 15 minutes · Multiple choice</p><div class="card-actions"><button class="primary" onclick="startQuiz()">Start Quiz →</button></div></article><article class="card class-card"><span class="tag">SCIENCE</span><h4>Energy & Heat</h4><p>15 questions · 10 minutes · Mixed</p><div class="card-actions"><button class="primary" onclick="startQuiz()">Start Quiz →</button></div></article><article class="card class-card"><span class="tag">ENGLISH</span><h4>Grammar Sprint</h4><p>25 questions · 12 minutes · MCQ</p><div class="card-actions"><button class="primary" onclick="startQuiz()">Start Quiz →</button></div></article></div><div class="section-head"><h3>Recent results</h3></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Quiz</th><th>Score</th><th>Date</th><th>Status</th></tr></thead><tbody><tr><td>Grammar Sprint</td><td>88%</td><td>18 Sep</td><td><span class="status">Completed</span></td></tr><tr><td>Energy & Heat</td><td>76%</td><td>15 Sep</td><td><span class="status">Completed</span></td></tr></tbody></table></div>`}
function startQuiz(){let q=0;modal(`<div id="quizBox"><span class="tag">QUESTION 1 OF 5</span><h2>Which expression is equivalent to 3(x + 2)?</h2><div class="grid" style="margin-top:15px">${["3x + 2","3x + 6","x + 6","3x - 6"].map((x,i)=>`<button class="card" style="text-align:left" onclick="quizAnswer(${i})">${String.fromCharCode(65+i)}. ${x}</button>`).join("")}</div><p class="muted" style="margin-top:16px">Timer: <b id="timer">00:30</b></p></div>`)}
function quizAnswer(i){if(i===1){showToast("Correct! ✓")}else showToast("Answer recorded");closeModal();showToast("Quiz answer saved")}
function renderTimetable(){const days=["Mon 21","Tue 22","Wed 23","Thu 24","Fri 25","Sat 26","Sun 27"];return pageTitle("Timetable","Your weekly learning schedule.")+`<div class="card"><div class="calendar">${days.map((d,i)=>`<div class="day"><b>${d}</b>${i===0?'<span class="event">8:00 PM<br>Mathematics</span>':''}${i===1?'<span class="event">4:00 PM<br>English</span>':''}${i===3?'<span class="event">9:00 PM<br>Science</span>':''}</div>`).join("")}</div></div>`}
function renderProgress(){return pageTitle("My Progress","Understand your learning journey at a glance.")+`<div class="grid grid-4"><div class="card stat"><div><small>Overall</small><strong>78%</strong></div><div class="stat-icon">◔</div></div><div class="card stat"><div><small>Attendance</small><strong>94%</strong></div><div class="stat-icon">◉</div></div><div class="card stat"><div><small>Quiz avg.</small><strong>82%</strong></div><div class="stat-icon">?</div></div><div class="card stat"><div><small>Hours</small><strong>18.5</strong></div><div class="stat-icon">◷</div></div></div><div class="section-head"><h3>Subject performance</h3></div><div class="grid grid-2">${[["Mathematics",84],["Science",76],["English",88],["History",71]].map(x=>`<div class="card"><div class="metric-row"><span>${x[0]}</span><span>${x[1]}%</span></div><div class="progress-line"><span style="width:${x[1]}%"></span></div></div>`).join("")}</div>`}
function renderChat(){return pageTitle("Messages","Real-time communication with teachers and class groups.")+`<div class="chat-layout"><div class="chat-list"><div class="chat-list-header"><input class="chat-search" placeholder="Search chats..."></div>${state.chats.map((c,i)=>`<div class="conversation ${i===0?"active":""}" onclick="selectChat(${c.id})"><div class="conv-avatar">${c.initial}</div><div><b>${c.name}</b><p>${c.last}</p></div><small class="muted" style="margin-left:auto">${c.time}</small></div>`).join("")}</div><div class="chat-window"><div class="chat-head"><div class="conv-avatar">A</div><div><b id="chatName">Cikgu Aina</b><p>● Online</p></div><button class="icon-btn" style="margin-left:auto" onclick="showToast('Conversation options')">⋮</button></div><div class="messages" id="messages">${state.messages.map(m=>`<div class="bubble ${m.me?"me":""}">${m.text}<small>${m.time} ${m.me?"✓✓":""}</small></div>`).join("")}</div><div class="chat-compose"><button class="icon-btn" onclick="showToast('Attachment picker')">＋</button><input id="messageInput" placeholder="Write a message..." onkeydown="if(event.key==='Enter')sendMessage()"><button class="send" onclick="sendMessage()">➤</button></div></div></div>`}
function selectChat(id){const c=state.chats.find(x=>x.id===id);if(c){$("#chatName").textContent=c.name;showToast(`Opened ${c.name}`)}}
function sendMessage(){const input=$("#messageInput");if(!input?.value.trim())return;state.messages.push({me:true,text:input.value.trim(),time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});renderPage();setTimeout(()=>{const box=$("#messages");if(box)box.scrollTop=box.scrollHeight},30)}
function renderNotifications(){return pageTitle("Notifications","Stay updated with your classes and learning activity.","<button class='text-btn' onclick=\"state.notifications=0;showToast('All notifications marked as read');renderPage()\">Mark all read</button>")+`<div class="grid">${[["Homework assigned","Cikgu Aina assigned Algebra — Practice Set 04.","5 min ago"],["Class reminder","Mathematics live class starts in 35 minutes.","25 min ago"],["New replay","Science — Energy & Heat replay is now available.","2 hours ago"],["Announcement","Form 2 Mathematics — Class A has a new announcement.","Yesterday"]].map((n,i)=>`<div class="notification ${i<state.notifications?"unread":""}"><div class="stat-icon">${i===0?"✓":i===1?"◷":"♢"}</div><div><b>${n[0]}</b><p>${n[1]}</p><small class="muted">${n[2]}</small></div></div>`).join("")}</div>`}
function renderProfile(){return pageTitle("Profile","Manage your Smart Tuisyen account.")+`<div class="grid grid-2"><div class="card"><div style="display:flex;gap:15px;align-items:center"><div class="brand-mark small">${initials(state.user?.name)}</div><div><h3 style="margin:0">${state.user?.name||"Student"}</h3><p class="muted">${state.user?.email||"student@example.com"}</p><span class="tag">STUDENT</span></div></div></div><div class="card"><b>Learning profile</b><div class="metric-row"><span>Form / Year</span><span>Form 2</span></div><div class="metric-row"><span>School</span><span>Smart Learning School</span></div><div class="metric-row"><span>Subjects</span><span>4 enrolled</span></div></div></div>`}
function renderSettings(){return pageTitle("Settings","Preferences, privacy and account controls.")+`<div class="card form-card"><label>Display name<input value="${state.user?.name||""}" id="settingName"></label><label>Language<select><option>Bahasa Melayu</option><option>English</option></select></label><label>Theme<select><option>Dark / Futuristic</option><option>System</option></select></label><label class="check"><input type="checkbox" checked> Class reminders</label><label class="check"><input type="checkbox" checked> Chat notifications</label><button class="primary-btn" onclick="state.user.name=$('#settingName').value;save();showApp();showToast('Profile updated ✓')">Save Changes</button></div>`}
function renderSearch(){const q=$("#globalSearch").value.trim();if(!q)return;return pageTitle(`Search results`,`Results for “${q}”`)+`<div class="search-results">${["Mathematics — Algebra","Cikgu Aina","Algebra Formula Sheet","Algebra Checkpoint","Form 2 Mathematics — Class A"].map(x=>`<div class="result"><b>${x}</b><p>Smart Tuisyen result matching “${q}”</p></div>`).join("")}</div>`}
function renderPage(){
  let html;
  if($("#globalSearch")?.value.trim()) html=renderSearch();
  else switch(state.page){case"home":html=renderHome();break;case"classes":html=renderClasses();break;case"homework":html=renderHomework();break;case"replay":html=renderReplay();break;case"notes":html=renderNotes();break;case"quiz":html=renderQuiz();break;case"timetable":html=renderTimetable();break;case"progress":html=renderProgress();break;case"chat":html=renderChat();break;case"notifications":html=renderNotifications();break;case"profile":html=renderProfile();break;case"settings":html=renderSettings();break;default:html=renderHome()}
  $("#content").innerHTML=html;
}
function modal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
window.closeModal=closeModal;window.joinClass=joinClass;window.openClass=openClass;window.submitHomework=submitHomework;window.viewHomework=viewHomework;window.playVideo=playVideo;window.startQuiz=startQuiz;window.quizAnswer=quizAnswer;window.sendMessage=sendMessage;window.selectChat=selectChat;

$$("[data-auth]").forEach(b=>b.onclick=()=>{$$("[data-auth]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#signinForm").classList.toggle("hidden",b.dataset.auth!=="signin");$("#signupForm").classList.toggle("hidden",b.dataset.auth!=="signup")});
$$("[data-toggle]").forEach(b=>b.onclick=()=>{const i=$("#"+b.dataset.toggle);i.type=i.type==="password"?"text":"password"});
$("#signinForm").onsubmit=e=>{e.preventDefault();state.user={name:"Norizkandar",email:$("#loginId").value,phone:"",role:"student"};state.role="student";save();showToast("Welcome back 👋");setTimeout(showApp,350)};
$("#signupForm").onsubmit=e=>{e.preventDefault();if($("#signupPassword").value!==$("#signupConfirm").value)return showToast("Passwords do not match");state.user={name:$("#signupName").value,email:$("#signupEmail").value,phone:$("#signupPhone").value,role:$("#signupRole").value};state.role=state.user.role;save();showToast("Account created ✓");setTimeout(showApp,350)};
$("#logout").onclick=()=>{localStorage.removeItem("st_user");localStorage.removeItem("st_role");location.reload()};
$("#profileAvatar").onclick=()=>navigate("profile");
$$("[data-page]").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
$("#globalSearch").addEventListener("input",()=>{if(state.user)renderPage()});
$("#globalSearch").addEventListener("keydown",e=>{if(e.key==="Escape"){e.target.value="";renderPage()}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
$(".modal-close").onclick=closeModal;
$("#mobileMenu").onclick=()=>showToast("Use the bottom navigation to switch sections");
$("#sideNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)navigate(b.dataset.page)});
start();
