const SUPABASE_URL = "https://efeayniqqqthzfkmwkia.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sB4e5aWKf_dmlwmwJWDxjg_r2YBleoD";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = {
  user: null,
  profile: null,
  page: "home",
  role: "student",
  replayCache: []
};

const $ = (s) => document.querySelector(s);

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function showToast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.style.display = "none", 2800);
}

function openModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
function closeModal(){ $("#modal").classList.add("hidden"); }
window.closeModal = closeModal;

const NAV = {
  student: [
    ["home","⌂","Home"],["classes","▣","Classes"],["replay","▶","Replay"],
    ["homework","✓","Homework"],["notes","✎","Notes"],["quiz","?","Quiz"],
    ["progress","↗","Progress"],["chat","◌","Messages"],["notifications","🔔","Notifications"],
    ["profile","◉","Profile"]
  ],
  teacher: [
    ["home","⌂","Dashboard"],["classes","▣","Classes"],["replay","▶","Replay"],
    ["chat","◌","Messages"],["earnings","RM","Earnings"],["profile","◉","Profile"]
  ],
  parent: [
    ["home","⌂","Home"],["classes","▣","Classes"],["replay","▶","Replay"],
    ["notifications","🔔","Notifications"],["profile","◉","Profile"]
  ]
};

function renderNav(){
  const items = NAV[state.role] || NAV.student;
  $("#sidebarNav").innerHTML = items.map(([id,icon,label]) =>
    `<button data-page="${id}" class="${state.page===id?"active":""}">${icon} ${label}</button>`
  ).join("");
  $("#mobileNav").innerHTML = items.slice(0,5).map(([id,icon,label]) =>
    `<button data-page="${id}" class="${state.page===id?"active":""}">${icon}<br>${label}</button>`
  ).join("");
}

async function loadProfile(){
  if(!state.user) return;
  const {data,error} = await supabaseClient
    .from("profiles").select("*").eq("id",state.user.id).maybeSingle();
  if(error) console.warn(error);
  state.profile = data || {full_name: state.user.email?.split("@")[0], role:"student"};
  state.role = state.profile.role || "student";
}

async function startApp(){
  const {data} = await supabaseClient.auth.getSession();
  if(data.session){
    state.user = data.session.user;
    await loadProfile();
    $("#splash").classList.add("hidden");
    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#avatar").textContent = (state.profile.full_name || "N")[0].toUpperCase();
    renderNav();
    renderPage();
  } else {
    setTimeout(() => {
      $("#splash").classList.add("hidden");
      $("#authScreen").classList.remove("hidden");
    }, 900);
  }
}

function renderHome(){
  const name = state.profile?.full_name || "Student";
  if(state.role === "teacher"){
    $("#content").innerHTML = `
      <div class="page-head"><div><div class="eyebrow">TEACHER DASHBOARD</div><h1>Welcome, ${escapeHtml(name)}.</h1><p>Manage classes, replays and earnings.</p></div></div>
      <div class="stats-grid">
        <div class="stat-card"><span>👥</span><strong>0</strong><small>Students</small></div>
        <div class="stat-card"><span>🎥</span><strong>0</strong><small>Replays</small></div>
        <div class="stat-card"><span>📚</span><strong>0</strong><small>Classes</small></div>
        <div class="stat-card"><span>💰</span><strong>RM0</strong><small>Earnings</small></div>
      </div>
      <div class="panel"><h2>Teacher tools</h2><div class="card-grid">
        <div class="feature-card"><h3>🔴 LIVE Classroom</h3><p>Start authenticated tuition sessions.</p></div>
        <div class="feature-card"><h3>🎥 Class Replay</h3><p>Manage recordings after LIVE classes.</p></div>
        <div class="feature-card"><h3>📊 Analytics</h3><p>Track attendance and learning activity.</p></div>
      </div></div>`;
    return;
  }
  if(state.role === "parent"){
    $("#content").innerHTML = `
      <div class="page-head"><div><div class="eyebrow">PARENT HOME</div><h1>Hello, ${escapeHtml(name)}.</h1><p>Monitor learning progress in one place.</p></div></div>
      <div class="stats-grid">
        <div class="stat-card"><span>👧</span><strong>0</strong><small>Children</small></div>
        <div class="stat-card"><span>📚</span><strong>0</strong><small>Classes</small></div>
        <div class="stat-card"><span>🎯</span><strong>0%</strong><small>Progress</small></div>
        <div class="stat-card"><span>🔔</span><strong>0</strong><small>Notifications</small></div>
      </div>`;
    return;
  }
  $("#content").innerHTML = `
    <div class="page-head"><div><div class="eyebrow">STUDENT HOME</div><h1>Keep learning, ${escapeHtml(name)}.</h1><p>Learn smarter. Go beyond the grade.</p></div>
      <button class="primary-btn" data-page="classes">Find a Class</button></div>
    <div class="stats-grid">
      <div class="stat-card"><span>⚡</span><strong>0 XP</strong><small>Total XP</small></div>
      <div class="stat-card"><span>🔥</span><strong>0 days</strong><small>Study Streak</small></div>
      <div class="stat-card"><span>🎥</span><strong>0</strong><small>Class Replays</small></div>
      <div class="stat-card"><span>🏆</span><strong>#—</strong><small>Ranking</small></div>
    </div>
    <div class="two-col">
      <div class="panel"><h2>Continue learning</h2><div class="empty">Your enrolled classes will appear here.</div></div>
      <div class="panel"><h2>Daily Mission</h2><div class="list-item">🎯 Watch a class replay<br><small>Earn XP after backend verification.</small></div></div>
    </div>`;
}

async function renderReplay(){
  $("#content").innerHTML = `
    <div class="page-head">
      <div><div class="eyebrow">CLASS REPLAY</div><h1>Watch your classes again.</h1>
      <p>Secure recordings from your enrolled classes.</p></div>
    </div>
    <div id="replayList" class="card-grid"><div class="empty">Loading replays...</div></div>`;
  await loadReplays();
}

async function loadReplays(){
  const list = $("#replayList");
  if(!list) return;

  if(!state.user){
    list.innerHTML = `<div class="empty">Please sign in first.</div>`;
    return;
  }

  const {data,error} = await supabaseClient
    .from("class_replays")
    .select(`
      id,title,subject,teacher_name,recorded_at,duration_seconds,
      class_id,storage_path
    `)
    .order("recorded_at",{ascending:false});

  if(error){
    console.warn(error);
    list.innerHTML = `
      <div class="empty">
        <h3>No replay available yet</h3>
        <p>When your teacher publishes a verified class recording, it will appear here.</p>
      </div>`;
    return;
  }

  state.replayCache = data || [];

  if(!state.replayCache.length){
    list.innerHTML = `<div class="empty"><h3>🎥 No replay yet</h3><p>Your class recordings will appear here after a LIVE session is published.</p></div>`;
    return;
  }

  list.innerHTML = state.replayCache.map(r => `
    <article class="class-card">
      <div class="class-thumb">▶</div>
      <div class="class-info">
        <span class="badge">${escapeHtml(r.subject || "Class")}</span>
        <h3>${escapeHtml(r.title)}</h3>
        <p>👨‍🏫 ${escapeHtml(r.teacher_name || "Teacher")}</p>
        <p>📅 ${new Date(r.recorded_at).toLocaleDateString()}</p>
        <button class="primary-btn" onclick="openReplay('${r.id}')">▶ Watch Replay</button>
      </div>
    </article>
  `).join("");
}

async function openReplay(id){
  const replay = state.replayCache.find(r => r.id === id);
  if(!replay) return showToast("Replay not found.");

  openModal(`
    <div class="replay-player">
      <div id="replayVideoArea" class="empty">Checking replay access...</div>
    </div>
    <div class="replay-meta">
      <div class="eyebrow">${escapeHtml(replay.subject || "CLASS")}</div>
      <h2>${escapeHtml(replay.title)}</h2>
      <p>👨‍🏫 ${escapeHtml(replay.teacher_name || "Teacher")}</p>
    </div>
  `);

  const {data,error} = await supabaseClient.functions.invoke("create-replay-access", {
    body:{replay_id:id}
  });

  const area = $("#replayVideoArea");
  if(error || !data?.signed_url){
    area.innerHTML = `
      <div style="padding:35px">
        <div style="font-size:42px">🔒</div>
        <h3>Replay access unavailable</h3>
        <p>This recording requires an authenticated enrollment and a secure backend-generated video URL.</p>
      </div>`;
    return;
  }

  area.innerHTML = `
    <video controls playsinline preload="metadata">
      <source src="${escapeHtml(data.signed_url)}" type="video/mp4">
      Your browser does not support video playback.
    </video>`;
}

function renderClasses(){
  $("#content").innerHTML = `
    <div class="page-head"><div><div class="eyebrow">MARKETPLACE</div><h1>Find your next class.</h1><p>Teacher-led tuition with LIVE learning and replay support.</p></div></div>
    <div class="card-grid">
      <article class="class-card"><div class="class-thumb">📐</div><div class="class-info"><span class="badge">Mathematics</span><h3>Algebra Mastery</h3><p>👨‍🏫 Cikgu Aina</p><p>RM45 · LIVE + Replay</p><button class="primary-btn" onclick="showToast('Payment must be verified by backend before enrollment.')">View Class</button></div></article>
      <article class="class-card"><div class="class-thumb">🧪</div><div class="class-info"><span class="badge">Science</span><h3>Science Explorer</h3><p>👨‍🏫 Cikgu Daniel</p><p>RM45 · LIVE + Replay</p><button class="primary-btn" onclick="showToast('Payment must be verified by backend before enrollment.')">View Class</button></div></article>
      <article class="class-card"><div class="class-thumb">📖</div><div class="class-info"><span class="badge">English</span><h3>English Skills</h3><p>👩‍🏫 Cikgu Sarah</p><p>RM45 · LIVE + Replay</p><button class="primary-btn" onclick="showToast('Payment must be verified by backend before enrollment.')">View Class</button></div></article>
    </div>`;
}

function renderSimple(title, eyebrow, body){
  $("#content").innerHTML = `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${body}</p></div></div><div class="panel"><div class="empty">This module is connected to the Smart Academy architecture and can be expanded through Supabase.</div></div>`;
}

function renderPage(){
  renderNav();
  switch(state.page){
    case "home": renderHome(); break;
    case "classes": renderClasses(); break;
    case "replay": renderReplay(); break;
    case "homework": renderSimple("Your assignments","HOMEWORK","Submit and track assignments."); break;
    case "notes": renderSimple("Your notes","NOTES","Keep lesson notes in one place."); break;
    case "quiz": renderSimple("Quiz center","QUIZ","Practice and earn XP."); break;
    case "progress": renderSimple("Learning progress","PROGRESS","Track XP, streaks and achievements."); break;
    case "chat": renderSimple("Messages","MESSAGES","Chat with teachers and classmates securely."); break;
    case "notifications": renderSimple("Notifications","ALERTS","Important account and class updates."); break;
    case "earnings": renderSimple("Teacher earnings","EARNINGS","Verified earnings and withdrawal records."); break;
    case "profile": renderSimple("Your profile","PROFILE",state.user?.email || ""); break;
    case "settings": renderSimple("Settings","SETTINGS","Privacy, security, support and account controls."); break;
    default: renderHome();
  }
}

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-page]");
  if(btn){
    state.page = btn.dataset.page;
    renderPage();
  }
});

$("#closeModal").addEventListener("click", closeModal);
$("#modal").addEventListener("click", e => { if(e.target.id==="modal") closeModal(); });

$("#toggleAuth").addEventListener("click", () => {
  const login = $("#loginForm"), signup = $("#signupForm");
  const isSignup = !signup.classList.contains("hidden");
  login.classList.toggle("hidden", !isSignup);
  signup.classList.toggle("hidden", isSignup);
  $("#authTitle").textContent = isSignup ? "Welcome back" : "Create your account";
  $("#authSubtitle").textContent = isSignup ? "Sign in to continue learning." : "Join Smart Academy.";
  $("#toggleAuth").textContent = isSignup ? "Create a new account" : "Already have an account? Sign in";
});

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#authMessage").textContent = "Signing in...";
  const {data,error} = await supabaseClient.auth.signInWithPassword({
    email:$("#loginEmail").value.trim(),
    password:$("#loginPassword").value
  });
  if(error){ $("#authMessage").textContent = error.message; return; }
  state.user = data.user;
  await loadProfile();
  $("#authScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  renderPage();
});

$("#signupForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#authMessage").textContent = "Creating account...";
  const full_name = $("#signupName").value.trim();
  const email = $("#signupEmail").value.trim();
  const password = $("#signupPassword").value;
  const role = $("#signupRole").value;

  const {data,error} = await supabaseClient.auth.signUp({
    email,password,
    options:{data:{full_name,role}}
  });
  if(error){ $("#authMessage").textContent = error.message; return; }

  if(data.user){
    const {error:profileError} = await supabaseClient.from("profiles").upsert({
      id:data.user.id,full_name,role
    });
    if(profileError) console.warn(profileError);
  }

  $("#authMessage").textContent = "Account created. You can now sign in.";
  $("#signupForm").reset();
});

$("#logout").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

supabaseClient.auth.onAuthStateChange(async (_event,session) => {
  if(session && !state.user){
    state.user = session.user;
    await loadProfile();
    $("#splash").classList.add("hidden");
    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    renderPage();
  }
});

startApp();
