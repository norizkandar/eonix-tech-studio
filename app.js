const SUPABASE_URL = "https://efeayniqqqthzfkmwkia.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_sB4e5aWKf_dmlwmwJWDxjg_r2YBleoD";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   STATE
========================================================= */

const state = {
  user: null,
  profile: null,
  page: "home",
  role: "student",
  replayCache: [],
  classes: [],
  notifications: []
};

/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function showToast(message) {
  const el = $("#toast");
  if (!el) return;

  el.textContent = message;
  el.style.display = "block";

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    el.style.display = "none";
  }, 2800);
}

function openModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
}

function closeModal() {
  $("#modal").classList.add("hidden");
}

window.closeModal = closeModal;

/* =========================================================
   NAVIGATION
========================================================= */

const NAV = {
  student: [
    ["home", "⌂", "Home"],
    ["classes", "▣", "Classes"],
    ["replay", "▶", "Replay"],
    ["homework", "✓", "Homework"],
    ["notes", "✎", "Notes"],
    ["quiz", "?", "Quiz"],
    ["progress", "↗", "Progress"],
    ["chat", "◌", "Messages"],
    ["notifications", "🔔", "Notifications"],
    ["profile", "◉", "Profile"]
  ],

  teacher: [
    ["home", "⌂", "Dashboard"],
    ["classes", "▣", "Classes"],
    ["replay", "▶", "Replay"],
    ["homework", "✓", "Homework"],
    ["quiz", "?", "Quiz"],
    ["chat", "◌", "Messages"],
    ["notifications", "🔔", "Notifications"],
    ["earnings", "RM", "Earnings"],
    ["profile", "◉", "Profile"]
  ],

  parent: [
    ["home", "⌂", "Home"],
    ["classes", "▣", "Classes"],
    ["replay", "▶", "Replay"],
    ["progress", "↗", "Progress"],
    ["notifications", "🔔", "Notifications"],
    ["profile", "◉", "Profile"]
  ]
};

function renderNav() {
  const items = NAV[state.role] || NAV.student;

  $("#sidebarNav").innerHTML = items
    .map(
      ([id, icon, label]) => `
        <button data-page="${id}" class="${
        state.page === id ? "active" : ""
      }">
          ${icon} ${label}
        </button>
      `
    )
    .join("");

  $("#mobileNav").innerHTML = items
    .slice(0, 5)
    .map(
      ([id, icon, label]) => `
        <button data-page="${id}" class="${
        state.page === id ? "active" : ""
      }">
          ${icon}<br>${escapeHtml(label)}
        </button>
      `
    )
    .join("");
}

/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  if (!state.user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile error:", error);
  }

  state.profile =
    data || {
      id: state.user.id,
      full_name: state.user.email?.split("@")[0] || "User",
      role: "student"
    };

  state.role = state.profile.role || "student";
}

/* =========================================================
   AUTH / START
========================================================= */

async function startApp() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    state.user = data.session.user;

    await loadProfile();

    $("#splash").classList.add("hidden");
    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");

    updateAvatar();

    renderNav();
    await renderPage();
  } else {
    setTimeout(() => {
      $("#splash").classList.add("hidden");
      $("#authScreen").classList.remove("hidden");
    }, 900);
  }
}

function updateAvatar() {
  const name =
    state.profile?.full_name ||
    state.user?.email ||
    "N";

  $("#avatar").textContent = name
    .trim()
    .charAt(0)
    .toUpperCase();
}

/* =========================================================
   DATABASE LOADERS
========================================================= */

async function loadStudentClasses() {
  if (!state.user) return [];

  const { data, error } = await supabaseClient
    .from("class_members")
    .select(`
      id,
      class_id,
      status,
      classes (
        id,
        title,
        description,
        price,
        schedule_text,
        is_published,
        teacher_id,
        subjects (
          id,
          name
        ),
        profiles:teacher_id (
          full_name
        )
      )
    `)
    .eq("student_id", state.user.id)
    .eq("status", "active");

  if (error) {
    console.warn("Student classes:", error);
    return [];
  }

  return (data || [])
    .map((item) => item.classes)
    .filter(Boolean);
}

async function loadTeacherClasses() {
  if (!state.user) return [];

  const { data, error } = await supabaseClient
    .from("classes")
    .select(`
      id,
      title,
      description,
      price,
      schedule_text,
      is_published,
      created_at,
      subjects (
        id,
        name
      )
    `)
    .eq("teacher_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Teacher classes:", error);
    return [];
  }

  return data || [];
}

async function loadPublishedClasses() {
  const { data, error } = await supabaseClient
    .from("classes")
    .select(`
      id,
      title,
      description,
      price,
      schedule_text,
      is_published,
      teacher_id,
      subjects (
        id,
        name
      ),
      profiles:teacher_id (
        full_name
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Published classes:", error);
    return [];
  }

  return data || [];
}

async function loadNotifications() {
  if (!state.user) return [];

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Notifications:", error);
    return [];
  }

  state.notifications = data || [];

  return state.notifications;
}

/* =========================================================
   STUDENT DASHBOARD
========================================================= */

async function renderStudentHome() {
  const name = state.profile?.full_name || "Student";

  const classes = await loadStudentClasses();

  $("#content").innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">STUDENT DASHBOARD</div>
        <h1>Keep learning, ${escapeHtml(name)}.</h1>
        <p>Learn smarter. Go beyond the grade.</p>
      </div>

      <button class="primary-btn" data-page="classes">
        Find a Class
      </button>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span>📚</span>
        <strong>${classes.length}</strong>
        <small>My Classes</small>
      </div>

      <div class="stat-card">
        <span>🎥</span>
        <strong>${state.replayCache.length}</strong>
        <small>Class Replays</small>
      </div>

      <div class="stat-card">
        <span>🔥</span>
        <strong>0 days</strong>
        <small>Study Streak</small>
      </div>

      <div class="stat-card">
        <span>🏆</span>
        <strong>0 XP</strong>
        <small>Total XP</small>
      </div>

    </div>

    <div class="two-col">

      <div class="panel">
        <h2>My Classes</h2>

        ${
          classes.length
            ? classes
                .slice(0, 4)
                .map(
                  (c) => `
                    <div class="list-item">
                      <strong>${escapeHtml(c.title)}</strong>
                      <br>
                      <small>
                        ${escapeHtml(c.subjects?.name || "Subject")}
                        ${
                          c.schedule_text
                            ? " · " + escapeHtml(c.schedule_text)
                            : ""
                        }
                      </small>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="empty">
                <h3>No classes yet</h3>
                <p>Join your first class to start learning.</p>
              </div>
            `
        }
      </div>

      <div class="panel">
        <h2>Quick Actions</h2>

        <div class="card-grid">

          <button class="feature-card" data-page="classes">
            <h3>📚 Browse Classes</h3>
            <p>Explore available tuition classes.</p>
          </button>

          <button class="feature-card" data-page="replay">
            <h3>🎥 Watch Replay</h3>
            <p>Review your previous classes.</p>
          </button>

          <button class="feature-card" data-page="homework">
            <h3>📝 Homework</h3>
            <p>Check your assignments.</p>
          </button>

          <button class="feature-card" data-page="quiz">
            <h3>❓ Quiz</h3>
            <p>Practice your knowledge.</p>
          </button>

        </div>
      </div>

    </div>
  `;
}

/* =========================================================
   TEACHER DASHBOARD
========================================================= */

async function renderTeacherHome() {
  const name = state.profile?.full_name || "Teacher";

  const classes = await loadTeacherClasses();

  let studentCount = 0;

  for (const cls of classes) {
    const { count } = await supabaseClient
      .from("class_members")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("class_id", cls.id)
      .eq("status", "active");

    studentCount += count || 0;
  }

  $("#content").innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">TEACHER DASHBOARD</div>
        <h1>Welcome, ${escapeHtml(name)}.</h1>
        <p>Manage your classes and students.</p>
      </div>

      <button class="primary-btn" onclick="openCreateClassModal()">
        + Create Class
      </button>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span>👥</span>
        <strong>${studentCount}</strong>
        <small>Students</small>
      </div>

      <div class="stat-card">
        <span>📚</span>
        <strong>${classes.length}</strong>
        <small>Classes</small>
      </div>

      <div class="stat-card">
        <span>🎥</span>
        <strong>${state.replayCache.length}</strong>
        <small>Replays</small>
      </div>

      <div class="stat-card">
        <span>💰</span>
        <strong>RM0</strong>
        <small>Earnings</small>
      </div>

    </div>

    <div class="panel">

      <h2>My Classes</h2>

      ${
        classes.length
          ? `
            <div class="card-grid">
              ${classes
                .map(
                  (c) => `
                    <article class="class-card">

                      <div class="class-thumb">
                        📚
                      </div>

                      <div class="class-info">

                        <span class="badge">
                          ${escapeHtml(c.subjects?.name || "Subject")}
                        </span>

                        <h3>
                          ${escapeHtml(c.title)}
                        </h3>

                        <p>
                          ${escapeHtml(
                            c.schedule_text || "Schedule not set"
                          )}
                        </p>

                        <p>
                          ${c.is_published ? "🟢 Published" : "🟡 Draft"}
                        </p>

                      </div>

                    </article>
                  `
                )
                .join("")}
            </div>
          `
          : `
            <div class="empty">
              <h3>No classes yet</h3>
              <p>Create your first tuition class.</p>
            </div>
          `
      }

    </div>
  `;
}

/* =========================================================
   PARENT DASHBOARD
========================================================= */

async function renderParentHome() {
  const name = state.profile?.full_name || "Parent";

  let children = [];

  const { data, error } = await supabaseClient
    .from("parent_children")
    .select(`
      id,
      student_id,
      profiles:student_id (
        id,
        full_name,
        role
      )
    `)
    .eq("parent_id", state.user.id);

  if (!error) {
    children = data || [];
  }

  $("#content").innerHTML = `
    <div class="page-head">

      <div>
        <div class="eyebrow">PARENT DASHBOARD</div>
        <h1>Hello, ${escapeHtml(name)}.</h1>
        <p>Monitor your child's learning journey.</p>
      </div>

      <button class="primary-btn" onclick="openLinkChildModal()">
        + Link Child
      </button>

    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span>👧</span>
        <strong>${children.length}</strong>
        <small>Children</small>
      </div>

      <div class="stat-card">
        <span>📚</span>
        <strong>—</strong>
        <small>Classes</small>
      </div>

      <div class="stat-card">
        <span>🎯</span>
        <strong>—</strong>
        <small>Progress</small>
      </div>

      <div class="stat-card">
        <span>🔔</span>
        <strong>${state.notifications.length}</strong>
        <small>Notifications</small>
      </div>

    </div>

    <div class="panel">

      <h2>My Children</h2>

      ${
        children.length
          ? children
              .map(
                (child) => `
                  <div class="list-item">

                    <strong>
                      👤 ${escapeHtml(
                        child.profiles?.full_name || "Student"
                      )}
                    </strong>

                    <br>

                    <small>
                      Student account
                    </small>

                  </div>
                `
              )
              .join("")
          : `
            <div class="empty">
              <h3>No child linked</h3>
              <p>
                Link your child's Student account to monitor
                their learning.
              </p>
            </div>
          `
      }

    </div>
  `;
}

/* =========================================================
   HOME ROUTER
========================================================= */

async function renderHome() {
  if (state.role === "teacher") {
    await renderTeacherHome();
    return;
  }

  if (state.role === "parent") {
    await renderParentHome();
    return;
  }

  await renderStudentHome();
}

/* =========================================================
   CLASSES
========================================================= */

async function renderClasses() {
  $("#content").innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">CLASSES</div>
        <h1>${
          state.role === "teacher"
            ? "My Classes"
            : "Find your next class."
        }</h1>

        <p>
          ${
            state.role === "teacher"
              ? "Manage your tuition classes."
              : "Teacher-led tuition with LIVE learning and replay support."
          }
        </p>
      </div>

      ${
        state.role === "teacher"
          ? `<button class="primary-btn" onclick="openCreateClassModal()">+ Create Class</button>`
          : ""
      }

    </div>

    <div id="classesList" class="card-grid">
      <div class="empty">Loading classes...</div>
    </div>
  `;

  let classes = [];

  if (state.role === "teacher") {
    classes = await loadTeacherClasses();
  } else if (state.role === "student") {
    classes = await loadPublishedClasses();
  } else {
    classes = await loadPublishedClasses();
  }

  state.classes = classes;

  const list = $("#classesList");

  if (!classes.length) {
    list.innerHTML = `
      <div class="empty">
        <h3>No classes available</h3>
        <p>New classes will appear here.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = classes
    .map(
      (c) => `
        <article class="class-card">

          <div class="class-thumb">
            📚
          </div>

          <div class="class-info">

            <span class="badge">
              ${escapeHtml(c.subjects?.name || "Subject")}
            </span>

            <h3>
              ${escapeHtml(c.title)}
            </h3>

            <p>
              ${escapeHtml(
                c.description || "Teacher-led tuition class."
              )}
            </p>

            ${
              c.profiles?.full_name
                ? `<p>👨‍🏫 ${escapeHtml(
                    c.profiles.full_name
                  )}</p>`
                : ""
            }

            <p>
              RM${Number(c.price || 0).toFixed(2)}
            </p>

            ${
              state.role === "student"
                ? `
                  <button
                    class="primary-btn"
                    onclick="openClassDetails('${c.id}')">
                    View Class
                  </button>
                `
                : `
                  <span class="badge">
                    ${c.is_published ? "Published" : "Draft"}
                  </span>
                `
            }

          </div>

        </article>
      `
    )
    .join("");
}

async function openClassDetails(id) {
  const cls = state.classes.find((c) => c.id === id);

  if (!cls) {
    showToast("Class not found.");
    return;
  }

  openModal(`
    <div class="eyebrow">CLASS DETAILS</div>

    <h2>${escapeHtml(cls.title)}</h2>

    <p>
      ${escapeHtml(
        cls.description || "No description available."
      )}
    </p>

    <div class="panel">

      <p>
        <strong>Subject:</strong>
        ${escapeHtml(cls.subjects?.name || "—")}
      </p>

      <p>
        <strong>Teacher:</strong>
        ${escapeHtml(cls.profiles?.full_name || "—")}
      </p>

      <p>
        <strong>Schedule:</strong>
        ${escapeHtml(cls.schedule_text || "Not set")}
      </p>

      <p>
        <strong>Price:</strong>
        RM${Number(cls.price || 0).toFixed(2)}
      </p>

    </div>

    ${
      state.role === "student"
        ? `
          <button
            class="primary-btn"
            onclick="joinClass('${cls.id}')">
            Join Class
          </button>
        `
        : ""
    }

  `);
}

/* =========================================================
   JOIN CLASS
========================================================= */

async function joinClass(classId) {
  if (!state.user || state.role !== "student") {
    showToast("Only students can join classes.");
    return;
  }

  const existing = await supabaseClient
    .from("class_members")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", state.user.id)
    .maybeSingle();

  if (existing.data) {
    showToast("You are already enrolled.");
    closeModal();
    return;
  }

  const { error } = await supabaseClient
    .from("class_members")
    .insert({
      class_id: classId,
      student_id: state.user.id,
      status: "active"
    });

  if (error) {
    console.error(error);
    showToast("Could not join class.");
    return;
  }

  closeModal();
  showToast("Class joined successfully!");

  state.page = "home";
  await renderPage();
}

window.joinClass = joinClass;

/* =========================================================
   REPLAY
========================================================= */

async function renderReplay() {
  $("#content").innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">CLASS REPLAY</div>
        <h1>Watch your classes again.</h1>
        <p>
          Secure recordings from your enrolled classes.
        </p>
      </div>
    </div>

    <div id="replayList" class="card-grid">
      <div class="empty">Loading replays...</div>
    </div>
  `;

  await loadReplays();
}

async function loadReplays() {
  const list = $("#replayList");

  if (!list || !state.user) return;

  const { data, error } = await supabaseClient
    .from("class_replays")
    .select(`
      id,
      title,
      subject,
      teacher_name,
      recorded_at,
      duration_seconds,
      class_id,
      storage_path
    `)
    .order("recorded_at", { ascending: false });

  if (error) {
    console.warn(error);

    list.innerHTML = `
      <div class="empty">
        <h3>🎥 No replay available</h3>
        <p>
          Verified class recordings will appear here.
        </p>
      </div>
    `;

    return;
  }

  state.replayCache = data || [];

  if (!state.replayCache.length) {
    list.innerHTML = `
      <div class="empty">
        <h3>🎥 No replay yet</h3>
        <p>
          Your class recordings will appear here after
          a LIVE session is published.
        </p>
      </div>
    `;

    return;
  }

  list.innerHTML = state.replayCache
    .map(
      (r) => `
        <article class="class-card">

          <div class="class-thumb">
            ▶
          </div>

          <div class="class-info">

            <span class="badge">
              ${escapeHtml(r.subject || "Class")}
            </span>

            <h3>
              ${escapeHtml(r.title)}
            </h3>

            <p>
              👨‍🏫 ${escapeHtml(
                r.teacher_name || "Teacher"
              )}
            </p>

            <p>
              📅 ${new Date(
                r.recorded_at
              ).toLocaleDateString()}
            </p>

            <button
              class="primary-btn"
              onclick="openReplay('${r.id}')">
              ▶ Watch Replay
            </button>

          </div>

        </article>
      `
    )
    .join("");
}

async function openReplay(id) {
  const replay = state.replayCache.find(
    (r) => r.id === id
  );

  if (!replay) {
    showToast("Replay not found.");
    return;
  }

  openModal(`
    <div class="replay-player">

      <div id="replayVideoArea" class="empty">
        Checking replay access...
      </div>

    </div>

    <div class="replay-meta">

      <div class="eyebrow">
        ${escapeHtml(replay.subject || "CLASS")}
      </div>

      <h2>
        ${escapeHtml(replay.title)}
      </h2>

      <p>
        👨‍🏫 ${escapeHtml(
          replay.teacher_name || "Teacher"
        )}
      </p>

    </div>
  `);

  try {
    const { data, error } =
      await supabaseClient.functions.invoke(
        "create-replay-access",
        {
          body: {
            replay_id: id
          }
        }
      );

    const area = $("#replayVideoArea");

    if (error || !data?.signed_url) {
      area.innerHTML = `
        <div style="padding:35px">

          <div style="font-size:42px">
            🔒
          </div>

          <h3>
            Replay access unavailable
          </h3>

          <p>
            This recording requires authenticated
            enrollment and secure backend access.
          </p>

        </div>
      `;

      return;
    }

    area.innerHTML = `
      <video
        controls
        playsinline
        preload="metadata"
        style="width:100%;border-radius:18px">

        <source
          src="${escapeHtml(data.signed_url)}"
          type="video/mp4">

        Your browser does not support video playback.

      </video>
    `;
  } catch (error) {
    console.error(error);
    showToast("Could not open replay.");
  }
}

window.openReplay = openReplay;

/* =========================================================
   HOMEWORK
========================================================= */

async function renderHomework() {
  if (state.role === "parent") {
    renderSimple(
      "Homework",
      "HOMEWORK",
      "Your child's homework will appear here."
    );
    return;
  }

  if (state.role === "teacher") {
    renderSimple(
      "Homework Manager",
      "TEACHER",
      "Create and manage homework for your classes."
    );
    return;
  }

  renderSimple(
    "Your Assignments",
    "HOMEWORK",
    "Your homework and assignments will appear here."
  );
}

/* =========================================================
   NOTES
========================================================= */

function renderNotes() {
  renderSimple(
    "Your Notes",
    "NOTES",
    "Keep your lesson notes in one place."
  );
}

/* =========================================================
   QUIZ
========================================================= */

function renderQuiz() {
  renderSimple(
    state.role === "teacher"
      ? "Quiz Manager"
      : "Quiz Center",
    "QUIZ",
    state.role === "teacher"
      ? "Create quizzes for your students."
      : "Practice your knowledge and track your results."
  );
}

/* =========================================================
   PROGRESS
========================================================= */

async function renderProgress() {
  if (state.role === "parent") {
    renderSimple(
      "Child Progress",
      "PROGRESS",
      "Your child's learning progress will appear here."
    );
    return;
  }

  renderSimple(
    "Learning Progress",
    "PROGRESS",
    "Track your learning activity, results and achievements."
  );
}

/* =========================================================
   CHAT
========================================================= */

async function renderChat() {
  renderSimple(
    "Messages",
    "MESSAGES",
    "Secure communication between students, teachers and parents."
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function renderNotifications() {
  await loadNotifications();

  $("#content").innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">NOTIFICATIONS</div>
        <h1>Notifications</h1>
        <p>Important updates from Smart Tuisyen.</p>
      </div>
    </div>

    <div class="panel">

      ${
        state.notifications.length
          ? state.notifications
              .map(
                (n) => `
                  <div class="list-item">

                    <strong>
                      ${escapeHtml(n.title)}
                    </strong>

                    <p>
                      ${escapeHtml(n.body)}
                    </p>

                    <small>
                      ${new Date(
                        n.created_at
                      ).toLocaleString()}
                    </small>

                  </div>
                `
              )
              .join("")
          : `
            <div class="empty">
              <h3>You're all caught up 🎉</h3>
              <p>No notifications yet.</p>
            </div>
          `
      }

    </div>
  `;
}

/* =========================================================
   PROFILE
========================================================= */

function renderProfile() {
  const p = state.profile || {};

  $("#content").innerHTML = `
    <div class="page-head">

      <div>
        <div class="eyebrow">PROFILE</div>
        <h1>Your Profile</h1>
        <p>Manage your Smart Tuisyen account.</p>
      </div>

    </div>

    <div class="panel">

      <div class="list-item">

        <strong>
          👤 ${escapeHtml(p.full_name || "User")}
        </strong>

        <p>
          ${escapeHtml(state.user?.email || "")}
        </p>

        <p>
          Role:
          <strong>
            ${escapeHtml(
              String(p.role || state.role).toUpperCase()
            )}
          </strong>
        </p>

        ${
          p.phone
            ? `<p>📱 ${escapeHtml(p.phone)}</p>`
            : ""
        }

      </div>

    </div>
  `;
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  renderSimple(
    "Settings",
    "SETTINGS",
    "Privacy, security, support and account controls."
  );
}

/* =========================================================
   EARNINGS
========================================================= */

function renderEarnings() {
  renderSimple(
    "Teacher Earnings",
    "EARNINGS",
    "Verified earnings and withdrawal records."
  );
}

/* =========================================================
   SIMPLE PAGE
========================================================= */

function renderSimple(title, eyebrow, body) {
  $("#content").innerHTML = `
    <div class="page-head">

      <div>
        <div class="eyebrow">
          ${escapeHtml(eyebrow)}
        </div>

        <h1>
          ${escapeHtml(title)}
        </h1>

        <p>
          ${escapeHtml(body)}
        </p>
      </div>

    </div>

    <div class="panel">

      <div class="empty">
        <h3>Coming next 🚀</h3>

        <p>
          This module is prepared for the Smart Tuisyen
          backend and will be connected to Supabase.
        </p>
      </div>

    </div>
  `;
}

/* =========================================================
   CREATE CLASS
========================================================= */

async function openCreateClassModal() {
  if (state.role !== "teacher") {
    showToast("Teacher access required.");
    return;
  }

  const { data: subjects } = await supabaseClient
    .from("subjects")
    .select("id,name")
    .order("name");

  openModal(`
    <div class="eyebrow">TEACHER</div>

    <h2>Create a Class</h2>

    <form id="createClassForm">

      <input
        id="newClassTitle"
        type="text"
        placeholder="Class title"
        required
      >

      <textarea
        id="newClassDescription"
        placeholder="Class description"
        rows="4"
      ></textarea>

      <select id="newClassSubject">

        <option value="">
          Select subject
        </option>

        ${(subjects || [])
          .map(
            (s) => `
              <option value="${s.id}">
                ${escapeHtml(s.name)}
              </option>
            `
          )
          .join("")}

      </select>

      <input
        id="newClassPrice"
        type="number"
        min="0"
        step="0.01"
        value="45"
        placeholder="Price"
      >

      <input
        id="newClassSchedule"
        type="text"
        placeholder="Schedule e.g. Monday 8:00 PM"
      >

      <label>
        <input
          id="newClassPublished"
          type="checkbox"
        >
        Publish class
      </label>

      <button
        class="primary-btn"
        type="submit">
        Create Class
      </button>

    </form>
  `);

  $("#createClassForm").addEventListener(
    "submit",
    createClass
  );
}

window.openCreateClassModal = openCreateClassModal;

async function createClass(event) {
  event.preventDefault();

  const title = $("#newClassTitle").value.trim();
  const description =
    $("#newClassDescription").value.trim();

  const subjectId =
    $("#newClassSubject").value || null;

  const price =
    Number($("#newClassPrice").value || 45);

  const schedule =
    $("#newClassSchedule").value.trim();

  const published =
    $("#newClassPublished").checked;

  const { error } = await supabaseClient
    .from("classes")
    .insert({
      teacher_id: state.user.id,
      subject_id: subjectId,
      title,
      description,
      price,
      schedule_text: schedule,
      is_published: published
    });

  if (error) {
    console.error(error);
    showToast(error.message);
    return;
  }

  closeModal();

  showToast("Class created successfully!");

  state.page = "classes";

  await renderPage();
}

/* =========================================================
   LINK CHILD
========================================================= */

async function openLinkChildModal() {
  if (state.role !== "parent") {
    showToast("Parent access required.");
    return;
  }

  openModal(`
    <div class="eyebrow">PARENT</div>

    <h2>Link Child</h2>

    <p>
      Enter the Student account ID.
    </p>

    <form id="linkChildForm">

      <input
        id="childId"
        type="text"
        placeholder="Student UUID"
        required
      >

      <button
        class="primary-btn"
        type="submit">
        Link Child
      </button>

    </form>
  `);

  $("#linkChildForm").addEventListener(
    "submit",
    linkChild
  );
}

window.openLinkChildModal = openLinkChildModal;

async function linkChild(event) {
  event.preventDefault();

  const studentId = $("#childId").value.trim();

  const { data: student, error: studentError } =
    await supabaseClient
      .from("profiles")
      .select("id,full_name,role")
      .eq("id", studentId)
      .maybeSingle();

  if (studentError || !student) {
    showToast("Student account not found.");
    return;
  }

  if (student.role !== "student") {
    showToast("That account is not a Student.");
    return;
  }

  const { error } = await supabaseClient
    .from("parent_children")
    .insert({
      parent_id: state.user.id,
      student_id: studentId
    });

  if (error) {
    if (error.code === "23505") {
      showToast("This child is already linked.");
    } else {
      console.error(error);
      showToast(error.message);
    }

    return;
  }

  closeModal();

  showToast("Child linked successfully!");

  await renderPage();
}

/* =========================================================
   PAGE ROUTER
========================================================= */

async function renderPage() {
  renderNav();

  switch (state.page) {
    case "home":
      await renderHome();
      break;

    case "classes":
      await renderClasses();
      break;

    case "replay":
      await renderReplay();
      break;

    case "homework":
      await renderHomework();
      break;

    case "notes":
      renderNotes();
      break;

    case "quiz":
      renderQuiz();
      break;

    case "progress":
      await renderProgress();
      break;

    case "chat":
      await renderChat();
      break;

    case "notifications":
      await renderNotifications();
      break;

    case "earnings":
      renderEarnings();
      break;

    case "profile":
      renderProfile();
      break;

    case "settings":
      renderSettings();
      break;

    default:
      await renderHome();
  }
}

/* =========================================================
   NAVIGATION CLICK
========================================================= */

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-page]");

  if (!button) return;

  state.page = button.dataset.page;

  await renderPage();
});

/* =========================================================
   MODAL
========================================================= */

$("#closeModal").addEventListener(
  "click",
  closeModal
);

$("#modal").addEventListener("click", (event) => {
  if (event.target.id === "modal") {
    closeModal();
  }
});

/* =========================================================
   AUTH TOGGLE
========================================================= */

$("#toggleAuth").addEventListener("click", () => {
  const login = $("#loginForm");
  const signup = $("#signupForm");

  const isSignup =
    !signup.classList.contains("hidden");

  login.classList.toggle("hidden", !isSignup);
  signup.classList.toggle("hidden", isSignup);

  $("#authTitle").textContent = isSignup
    ? "Welcome back"
    : "Create your account";

  $("#authSubtitle").textContent = isSignup
    ? "Sign in to continue learning."
    : "Join Smart Academy.";

  $("#toggleAuth").textContent = isSignup
    ? "Create a new account"
    : "Already have an account? Sign in";
});

/* =========================================================
   LOGIN
========================================================= */

$("#loginForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    $("#authMessage").textContent =
      "Signing in...";

    const email =
      $("#loginEmail").value.trim();

    const password =
      $("#loginPassword").value;

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      $("#authMessage").textContent =
        error.message;
      return;
    }

    state.user = data.user;

    await loadProfile();

    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");

    updateAvatar();

    state.page = "home";

    await renderPage();

    $("#authMessage").textContent = "";
  }
);

/* =========================================================
   SIGNUP
========================================================= */

$("#signupForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    $("#authMessage").textContent =
      "Creating account...";

    const full_name =
      $("#signupName").value.trim();

    const email =
      $("#signupEmail").value.trim();

    const password =
      $("#signupPassword").value;

    const role =
      $("#signupRole").value;

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role
          }
        }
      });

    if (error) {
      $("#authMessage").textContent =
        error.message;
      return;
    }

    if (data.user) {
      const { error: profileError } =
        await supabaseClient
          .from("profiles")
          .upsert({
            id: data.user.id,
            full_name,
            role
          });

      if (profileError) {
        console.warn(
          "Profile creation:",
          profileError
        );
      }
    }

    $("#authMessage").textContent =
      "Account created. Check your email if verification is required, then sign in.";

    $("#signupForm").reset();
  }
);

/* =========================================================
   LOGOUT
========================================================= */

$("#logout").addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    state.user = null;
    state.profile = null;
    state.role = "student";

    location.reload();
  }
);

/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {
    if (session && !state.user) {
      state.user = session.user;

      await loadProfile();

      $("#splash").classList.add("hidden");
      $("#authScreen").classList.add("hidden");
      $("#appShell").classList.remove("hidden");

      updateAvatar();

      state.page = "home";

      await renderPage();
    }
  }
);

/* =========================================================
   START
========================================================= */

startApp();
