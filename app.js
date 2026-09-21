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
  const content = $("#modalContent");
  const modal = $("#modal");

  if (!content || !modal) return;

  content.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal() {
  $("#modal")?.classList.add("hidden");
}

window.closeModal = closeModal;

/* =========================================================
   CLASS CODE GENERATOR
========================================================= */

function generateClassCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code +=
      characters[
        Math.floor(
          Math.random() * characters.length
        )
      ];
  }

  return `ST-${code}`;
}

/* =========================================================
   ROLE HELPERS
========================================================= */

const VALID_ROLES = [
  "student",
  "teacher",
  "parent"
];

function getAuthRole(user = state.user) {
  const role = user?.user_metadata?.role;

  if (VALID_ROLES.includes(role)) {
    return role;
  }

  return null;
}

function getDisplayName(user = state.user) {
  return (
    state.profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

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

  const sidebar = $("#sidebarNav");
  const mobile = $("#mobileNav");

  if (sidebar) {
    sidebar.innerHTML = items
      .map(
        ([id, icon, label]) => `
          <button
            data-page="${id}"
            class="${state.page === id ? "active" : ""}">
            ${icon} ${escapeHtml(label)}
          </button>
        `
      )
      .join("");
  }

  if (mobile) {
    mobile.innerHTML = items
      .slice(0, 5)
      .map(
        ([id, icon, label]) => `
          <button
            data-page="${id}"
            class="${state.page === id ? "active" : ""}">
            ${icon}<br>${escapeHtml(label)}
          </button>
        `
      )
      .join("");
  }
}

/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  if (!state.user) return;

  const metadata = state.user.user_metadata || {};

  const metadataRole = getAuthRole(state.user);

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile error:", error);
  }

  const databaseRole =
    VALID_ROLES.includes(data?.role)
      ? data.role
      : null;

  const role =
    databaseRole ||
    metadataRole ||
    "student";

  state.profile = {
    ...(data || {}),

    id: state.user.id,

    full_name:
      data?.full_name ||
      metadata.full_name ||
      state.user.email?.split("@")[0] ||
      "User",

    role
  };

  state.role = role;
}

/* =========================================================
   SHOW APP
========================================================= */

async function showApp() {
  $("#splash")?.classList.add("hidden");
  $("#authScreen")?.classList.add("hidden");
  $("#appShell")?.classList.remove("hidden");

  updateAvatar();

  state.page = "home";

  await renderPage();
}

/* =========================================================
   START APP
========================================================= */

async function startApp() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      "Session error:",
      error
    );
  }

  if (data?.session) {
    state.user = data.session.user;

    await loadProfile();

    await showApp();

    return;
  }

  setTimeout(() => {
    $("#splash")?.classList.add("hidden");
    $("#authScreen")?.classList.remove("hidden");
  }, 900);
}

/* =========================================================
   AVATAR
========================================================= */

function updateAvatar() {
  const avatar = $("#avatar");

  if (!avatar) return;

  const name = getDisplayName();

  avatar.textContent =
    name
      .trim()
      .charAt(0)
      .toUpperCase() || "N";
}

/* =========================================================
   DATABASE LOADERS
========================================================= */

async function loadStudentClasses() {
  if (!state.user) return [];

  const { data, error } =
    await supabaseClient
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
          class_code,
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
    console.warn(
      "Student classes:",
      error
    );

    return [];
  }

  return (data || [])
    .map((item) => item.classes)
    .filter(Boolean);
}

async function loadTeacherClasses() {
  if (!state.user) return [];

  const { data, error } =
    await supabaseClient
      .from("classes")
      .select(`
        id,
        title,
        description,
        price,
        schedule_text,
        is_published,
        class_code,
        created_at,
        subjects (
          id,
          name
        )
      `)
      .eq("teacher_id", state.user.id)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    console.warn(
      "Teacher classes:",
      error
    );

    return [];
  }

  return data || [];
}

async function loadPublishedClasses() {
  const { data, error } =
    await supabaseClient
      .from("classes")
      .select(`
        id,
        title,
        description,
        price,
        schedule_text,
        is_published,
        class_code,
        teacher_id,
        created_at,
        subjects (
          id,
          name
        ),
        profiles:teacher_id (
          full_name
        )
      `)
      .eq("is_published", true)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    console.warn(
      "Published classes:",
      error
    );

    return [];
  }

  return data || [];
}

async function loadNotifications() {
  if (!state.user) return [];

  const { data, error } =
    await supabaseClient
      .from("notifications")
      .select("*")
      .eq(
        "user_id",
        state.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(20);

  if (error) {
    console.warn(
      "Notifications:",
      error
    );

    state.notifications = [];

    return [];
  }

  state.notifications = data || [];

  return state.notifications;
}

/* =========================================================
   STUDENT DASHBOARD
========================================================= */

async function renderStudentHome() {
  const name =
    getDisplayName();

  const classes =
    await loadStudentClasses();

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          STUDENT DASHBOARD
        </div>

        <h1>
          Keep learning,
          ${escapeHtml(name)}.
        </h1>

        <p>
          Learn smarter. Go beyond the grade.
        </p>

      </div>

      <button
        class="primary-btn"
        data-page="classes">

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

        <h2>
          My Classes
        </h2>

        ${
          classes.length
            ? classes
                .slice(0, 4)
                .map(
                  (c) => `
                    <div class="list-item">

                      <strong>
                        ${escapeHtml(c.title)}
                      </strong>

                      <br>

                      <small>
                        ${escapeHtml(
                          c.subjects?.name ||
                          "Subject"
                        )}

                        ${
                          c.schedule_text
                            ? " · " +
                              escapeHtml(
                                c.schedule_text
                              )
                            : ""
                        }

                      </small>

                    </div>
                  `
                )
                .join("")
            : `
              <div class="empty">

                <h3>
                  No classes yet
                </h3>

                <p>
                  Join your first class to start learning.
                </p>

              </div>
            `
        }

      </div>

      <div class="panel">

        <h2>
          Quick Actions
        </h2>

        <div class="card-grid">

          <button
            class="feature-card"
            data-page="classes">

            <h3>
              📚 Browse Classes
            </h3>

            <p>
              Explore available tuition classes.
            </p>

          </button>

          <button
            class="feature-card"
            data-page="replay">

            <h3>
              🎥 Watch Replay
            </h3>

            <p>
              Review your previous classes.
            </p>

          </button>

          <button
            class="feature-card"
            data-page="homework">

            <h3>
              📝 Homework
            </h3>

            <p>
              Check your assignments.
            </p>

          </button>

          <button
            class="feature-card"
            data-page="quiz">

            <h3>
              ❓ Quiz
            </h3>

            <p>
              Practice your knowledge.
            </p>

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
  const name =
    getDisplayName();

  const classes =
    await loadTeacherClasses();

  let studentCount = 0;

  for (const cls of classes) {

    const { count } =
      await supabaseClient
        .from("class_members")
        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "class_id",
          cls.id
        )
        .eq(
          "status",
          "active"
        );

    studentCount += count || 0;
  }

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          TEACHER DASHBOARD
        </div>

        <h1>
          Welcome,
          ${escapeHtml(name)}.
        </h1>

        <p>
          Manage your classes and students.
        </p>

      </div>

      <button
        class="primary-btn"
        onclick="openCreateClassModal()">

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

      <h2>
        My Classes
      </h2>

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
                          ${escapeHtml(
                            c.subjects?.name ||
                            "Subject"
                          )}
                        </span>

                        <h3>
                          ${escapeHtml(c.title)}
                        </h3>

                        <p>
                          ${escapeHtml(
                            c.schedule_text ||
                            "Schedule not set"
                          )}
                        </p>

                        <div style="
                          margin:12px 0;
                          padding:10px 12px;
                          border-radius:12px;
                          background:rgba(0,200,255,.08);
                        ">

                          🔑
                          <strong>
                            Class Code:
                          </strong>

                          <strong>
                            ${escapeHtml(
                              c.class_code ||
                              "Not generated"
                            )}
                          </strong>

                        </div>

                        <p>
                          ${
                            c.is_published
                              ? "🟢 Published"
                              : "🟡 Draft"
                          }
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

              <h3>
                No classes yet
              </h3>

              <p>
                Create your first tuition class.
              </p>

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
  const name =
    getDisplayName();

  let children = [];

  const { data, error } =
    await supabaseClient
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
      .eq(
        "parent_id",
        state.user.id
      );

  if (!error) {
    children = data || [];
  }

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          PARENT DASHBOARD
        </div>

        <h1>
          Hello,
          ${escapeHtml(name)}.
        </h1>

        <p>
          Monitor your child's learning journey.
        </p>

      </div>

      <button
        class="primary-btn"
        onclick="openLinkChildModal()">

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

      <h2>
        My Children
      </h2>

      ${
        children.length
          ? children
              .map(
                (child) => `
                  <div class="list-item">

                    <strong>
                      👤
                      ${escapeHtml(
                        child.profiles?.full_name ||
                        "Student"
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

              <h3>
                No child linked
              </h3>

              <p>
                Link your child's Student account
                to monitor their learning.
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
    return renderTeacherHome();
  }

  if (state.role === "parent") {
    return renderParentHome();
  }

  return renderStudentHome();
}

/* =========================================================
   CLASSES
========================================================= */

async function renderClasses() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          CLASSES
        </div>

        <h1>
          ${
            state.role === "teacher"
              ? "My Classes"
              : "Find your next class."
          }
        </h1>

        <p>
          ${
            state.role === "teacher"
              ? "Manage your tuition classes."
              : "Teacher-led tuition with LIVE learning and replay support."
          }
        </p>

      </div>

      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      ">

        ${
          state.role === "student"
            ? `
              <button
                class="primary-btn"
                onclick="openJoinClassCodeModal()">

                🔑 Join with Class Code

              </button>
            `
            : ""
        }

        ${
          state.role === "teacher"
            ? `
              <button
                class="primary-btn"
                onclick="openCreateClassModal()">

                + Create Class

              </button>
            `
            : ""
        }

      </div>

    </div>

    <div
      id="classesList"
      class="card-grid">

      <div class="empty">
        Loading classes...
      </div>

    </div>
  `;

  let classes = [];

  if (state.role === "teacher") {
    classes =
      await loadTeacherClasses();
  } else {
    classes =
      await loadPublishedClasses();
  }

  state.classes =
    classes || [];

  const list =
    $("#classesList");

  if (!state.classes.length) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          No classes available
        </h3>

        <p>
          New classes will appear here.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    state.classes
      .map(
        (c) => `
          <article class="class-card">

            <div class="class-thumb">
              📚
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  c.subjects?.name ||
                  "Subject"
                )}
              </span>

              <h3>
                ${escapeHtml(c.title)}
              </h3>

              <p>
                ${escapeHtml(
                  c.description ||
                  "Teacher-led tuition class."
                )}
              </p>

              ${
                c.profiles?.full_name
                  ? `
                    <p>
                      👨‍🏫
                      ${escapeHtml(
                        c.profiles.full_name
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                c.class_code
                  ? `
                    <p>
                      🔑
                      <strong>
                        ${escapeHtml(
                          c.class_code
                        )}
                      </strong>
                    </p>
                  `
                  : ""
              }

              <p>
                RM${Number(
                  c.price || 0
                ).toFixed(2)}
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
                      ${
                        c.is_published
                          ? "Published"
                          : "Draft"
                      }
                    </span>
                  `
              }

            </div>

          </article>
        `
      )
      .join("");
}

/* =========================================================
   CLASS DETAILS
========================================================= */

async function openClassDetails(id) {

  const cls =
    state.classes.find(
      (c) => c.id === id
    );

  if (!cls) {
    showToast("Class not found.");
    return;
  }

  openModal(`
    <div class="eyebrow">
      CLASS DETAILS
    </div>

    <h2>
      ${escapeHtml(cls.title)}
    </h2>

    <p>
      ${escapeHtml(
        cls.description ||
        "No description available."
      )}
    </p>

    <div class="panel">

      <p>
        <strong>
          Subject:
        </strong>

        ${escapeHtml(
          cls.subjects?.name ||
          "—"
        )}
      </p>

      <p>
        <strong>
          Teacher:
        </strong>

        ${escapeHtml(
          cls.profiles?.full_name ||
          "—"
        )}
      </p>

      <p>
        <strong>
          Class Code:
        </strong>

        <strong>
          ${escapeHtml(
            cls.class_code ||
            "Not available"
          )}
        </strong>
      </p>

      <p>
        <strong>
          Schedule:
        </strong>

        ${escapeHtml(
          cls.schedule_text ||
          "Not set"
        )}
      </p>

      <p>
        <strong>
          Price:
        </strong>

        RM${Number(
          cls.price || 0
        ).toFixed(2)}

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

window.openClassDetails =
  openClassDetails;

/* =========================================================
   JOIN CLASS BY DATABASE ID
========================================================= */

async function joinClass(classId) {

  if (
    !state.user ||
    state.role !== "student"
  ) {
    showToast(
      "Only students can join classes."
    );

    return;
  }

  const existing =
    await supabaseClient
      .from("class_members")
      .select("id")
      .eq(
        "class_id",
        classId
      )
      .eq(
        "student_id",
        state.user.id
      )
      .maybeSingle();

  if (existing.data) {

    showToast(
      "You are already enrolled."
    );

    closeModal();

    return;
  }

  if (
    existing.error &&
    existing.error.code !== "PGRST116"
  ) {
    console.error(
      existing.error
    );
  }

  const { error } =
    await supabaseClient
      .from("class_members")
      .insert({
        class_id: classId,
        student_id: state.user.id,
        status: "active"
      });

  if (error) {

    console.error(error);

    showToast(
      error.message ||
      "Could not join class."
    );

    return;
  }

  closeModal();

  showToast(
    "Class joined successfully!"
  );

  state.page = "home";

  await renderPage();
}

window.joinClass =
  joinClass;

/* =========================================================
   JOIN CLASS BY CODE MODAL
========================================================= */

function openJoinClassCodeModal() {

  if (
    !state.user ||
    state.role !== "student"
  ) {

    showToast(
      "Only students can join classes."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      STUDENT
    </div>

    <h2>
      Join a Class
    </h2>

    <p>
      Enter the class code given by your teacher.
    </p>

    <form
      id="joinClassCodeForm">

      <input
        id="joinClassCode"
        type="text"
        placeholder="Example: ST-K7P2Q9"
        maxlength="9"
        autocomplete="off"
        required
      >

      <button
        class="primary-btn"
        type="submit">

        Join Class

      </button>

    </form>
  `);

  $("#joinClassCode")
    ?.focus();

  $("#joinClassCodeForm")
    ?.addEventListener(
      "submit",
      joinClassByCode
    );
}

window.openJoinClassCodeModal =
  openJoinClassCodeModal;

/* =========================================================
   JOIN CLASS BY CODE ACTION
========================================================= */

async function joinClassByCode(event) {

  event.preventDefault();

  if (
    !state.user ||
    state.role !== "student"
  ) {

    showToast(
      "Only students can join classes."
    );

    return;
  }

  let classCode =
    $("#joinClassCode")
      ?.value
      .trim()
      .toUpperCase();

  if (!classCode) {

    showToast(
      "Please enter a class code."
    );

    return;
  }

  const { data: cls, error } =
    await supabaseClient
      .from("classes")
      .select(`
        id,
        title,
        class_code,
        is_published
      `)
      .eq(
        "class_code",
        classCode
      )
      .maybeSingle();

  if (error) {

    console.error(
      "Find class by code:",
      error
    );

    showToast(
      error.message ||
      "Could not find class."
    );

    return;
  }

  if (!cls) {

    showToast(
      "Invalid class code."
    );

    return;
  }

  if (!cls.is_published) {

    showToast(
      "This class is not published yet."
    );

    return;
  }

  const existing =
    await supabaseClient
      .from("class_members")
      .select("id")
      .eq(
        "class_id",
        cls.id
      )
      .eq(
        "student_id",
        state.user.id
      )
      .maybeSingle();

  if (existing.data) {

    showToast(
      "You are already enrolled in this class."
    );

    closeModal();

    return;
  }

  if (
    existing.error &&
    existing.error.code !== "PGRST116"
  ) {

    console.error(
      "Existing membership:",
      existing.error
    );

    showToast(
      existing.error.message ||
      "Could not check enrollment."
    );

    return;
  }

  const { error: joinError } =
    await supabaseClient
      .from("class_members")
      .insert({
        class_id:
          cls.id,

        student_id:
          state.user.id,

        status:
          "active"
      });

  if (joinError) {

    console.error(
      "Join class:",
      joinError
    );

    showToast(
      joinError.message ||
      "Could not join class."
    );

    return;
  }

  closeModal();

  showToast(
    `Joined ${cls.title} successfully!`
  );

  state.page =
    "home";

  await renderPage();
}

window.joinClassByCode =
  joinClassByCode;

/* =========================================================
   REPLAY
========================================================= */

async function renderReplay() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          CLASS REPLAY
        </div>

        <h1>
          Watch your classes again.
        </h1>

        <p>
          Secure recordings from your enrolled classes.
        </p>

      </div>

    </div>

    <div
      id="replayList"
      class="card-grid">

      <div class="empty">
        Loading replays...
      </div>

    </div>
  `;

  await loadReplays();
}

async function loadReplays() {

  const list =
    $("#replayList");

  if (
    !list ||
    !state.user
  ) {
    return;
  }

  const { data, error } =
    await supabaseClient
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
      .order(
        "recorded_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.warn(error);

    list.innerHTML = `
      <div class="empty">

        <h3>
          🎥 No replay available
        </h3>

        <p>
          Verified class recordings will appear here.
        </p>

      </div>
    `;

    return;
  }

  state.replayCache =
    data || [];

  if (
    !state.replayCache.length
  ) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          🎥 No replay yet
        </h3>

        <p>
          Your class recordings will appear here
          after a LIVE session is published.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    state.replayCache
      .map(
        (r) => `
          <article class="class-card">

            <div class="class-thumb">
              ▶
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  r.subject ||
                  "Class"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  r.title
                )}
              </h3>

              <p>
                👨‍🏫
                ${escapeHtml(
                  r.teacher_name ||
                  "Teacher"
                )}
              </p>

              <p>
                📅
                ${new Date(
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

  const replay =
    state.replayCache.find(
      (r) => r.id === id
    );

  if (!replay) {
    showToast(
      "Replay not found."
    );

    return;
  }

  openModal(`
    <div class="replay-player">

      <div
        id="replayVideoArea"
        class="empty">

        Checking replay access...

      </div>

    </div>

    <div class="replay-meta">

      <div class="eyebrow">
        ${escapeHtml(
          replay.subject ||
          "CLASS"
        )}
      </div>

      <h2>
        ${escapeHtml(
          replay.title
        )}
      </h2>

      <p>
        👨‍🏫
        ${escapeHtml(
          replay.teacher_name ||
          "Teacher"
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

    const area =
      $("#replayVideoArea");

    if (!area) return;

    if (
      error ||
      !data?.signed_url
    ) {

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
          src="${escapeHtml(
            data.signed_url
          )}"
          type="video/mp4">

        Your browser does not support video playback.

      </video>
    `;

  } catch (error) {

    console.error(error);

    showToast(
      "Could not open replay."
    );
  }
}

window.openReplay =
  openReplay;

/* =========================================================
   HOMEWORK
========================================================= */

async function renderHomework() {

  if (state.role === "teacher") {
    return renderTeacherHomework();
  }

  if (state.role === "parent") {

    return renderSimple(
      "Homework",
      "HOMEWORK",
      "Your child's homework will appear here."
    );
  }

  return renderStudentHomework();
}

/* =========================================================
   STUDENT HOMEWORK
========================================================= */

async function renderStudentHomework() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          HOMEWORK
        </div>

        <h1>
          Your Assignments
        </h1>

        <p>
          Complete your homework and submit your answers.
        </p>

      </div>

    </div>

    <div
      id="homeworkList"
      class="card-grid">

      <div class="empty">
        Loading homework...
      </div>

    </div>
  `;

  const { data, error } =
    await supabaseClient
      .from("homework")
      .select(`
        id,
        class_id,
        title,
        description,
        due_at,
        created_at,
        classes (
          id,
          title,
          subjects (
            name
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  const list =
    $("#homeworkList");

  if (error) {

    console.error(
      "Student homework:",
      error
    );

    list.innerHTML = `
      <div class="empty">

        <h3>
          Unable to load homework
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          📝 No homework yet
        </h3>

        <p>
          Homework from your enrolled classes
          will appear here.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    data
      .map(
        (hw) => `
          <article class="class-card">

            <div class="class-thumb">
              📝
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  hw.classes?.subjects?.name ||
                  "Homework"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  hw.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  hw.description ||
                  "No description provided."
                )}
              </p>

              <p>
                📚
                ${escapeHtml(
                  hw.classes?.title ||
                  "Class"
                )}
              </p>

              ${
                hw.due_at
                  ? `
                    <p>
                      ⏰ Due:
                      ${new Date(
                        hw.due_at
                      ).toLocaleString()}
                    </p>
                  `
                  : `
                    <p>
                      ⏰ No deadline
                    </p>
                  `
              }

              <button
                class="primary-btn"
                onclick="openHomework('${hw.id}')">

                View Homework

              </button>

            </div>

          </article>
        `
      )
      .join("");
}

/* =========================================================
   OPEN HOMEWORK
========================================================= */

async function openHomework(
  homeworkId
) {

  const {
    data: homework,
    error
  } =
    await supabaseClient
      .from("homework")
      .select(`
        id,
        class_id,
        title,
        description,
        due_at,
        created_at,
        classes (
          id,
          title,
          subjects (
            name
          )
        )
      `)
      .eq(
        "id",
        homeworkId
      )
      .maybeSingle();

  if (
    error ||
    !homework
  ) {

    console.error(error);

    showToast(
      "Homework not found."
    );

    return;
  }

  let submission = null;

  if (
    state.role === "student"
  ) {

    const result =
      await supabaseClient
        .from(
          "homework_submissions"
        )
        .select(`
          id,
          answer,
          status,
          submitted_at
        `)
        .eq(
          "homework_id",
          homework.id
        )
        .eq(
          "student_id",
          state.user.id
        )
        .maybeSingle();

    if (!result.error) {
      submission =
        result.data;
    }
  }

  openModal(`
    <div class="eyebrow">
      HOMEWORK
    </div>

    <h2>
      ${escapeHtml(
        homework.title
      )}
    </h2>

    <p>
      ${escapeHtml(
        homework.description ||
        "No description provided."
      )}
    </p>

    <div class="panel">

      <p>
        <strong>
          Class:
        </strong>

        ${escapeHtml(
          homework.classes?.title ||
          "Class"
        )}
      </p>

      <p>
        <strong>
          Subject:
        </strong>

        ${escapeHtml(
          homework.classes?.subjects?.name ||
          "Subject"
        )}
      </p>

      <p>
        <strong>
          Due:
        </strong>

        ${
          homework.due_at
            ? new Date(
                homework.due_at
              ).toLocaleString()
            : "No deadline"
        }

      </p>

    </div>

    ${
      state.role === "student"
        ? `
          <form
            id="homeworkSubmitForm">

            <label>
              Your Answer
            </label>

            <textarea
              id="homeworkAnswer"
              rows="8"
              placeholder="Write your answer here..."
              required
            >${escapeHtml(
              submission?.answer ||
              ""
            )}</textarea>

            <button
              class="primary-btn"
              type="submit">

              ${
                submission
                  ? "Update Submission"
                  : "Submit Homework"
              }

            </button>

            ${
              submission
                ? `
                  <p>
                    ✅ Submitted:
                    ${new Date(
                      submission.submitted_at
                    ).toLocaleString()}
                  </p>
                `
                : ""
            }

          </form>
        `
        : ""
    }

  `);

  const form =
    $("#homeworkSubmitForm");

  if (form) {

    form.addEventListener(
      "submit",
      async (event) => {

        await submitHomework(
          event,
          homework.id,
          submission
        );

      }
    );
  }
}

window.openHomework =
  openHomework;

/* =========================================================
   SUBMIT HOMEWORK
========================================================= */

async function submitHomework(
  event,
  homeworkId,
  existingSubmission
) {

  event.preventDefault();

  if (
    !state.user ||
    state.role !== "student"
  ) {

    showToast(
      "Student access required."
    );

    return;
  }

  const answer =
    $("#homeworkAnswer")
      ?.value
      .trim();

  if (!answer) {

    showToast(
      "Please write your answer."
    );

    return;
  }

  let result;

  if (existingSubmission) {

    result =
      await supabaseClient
        .from(
          "homework_submissions"
        )
        .update({
          answer,
          status: "submitted",
          submitted_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          existingSubmission.id
        )
        .eq(
          "student_id",
          state.user.id
        );

  } else {

    result =
      await supabaseClient
        .from(
          "homework_submissions"
        )
        .insert({
          homework_id:
            homeworkId,
          student_id:
            state.user.id,
          answer,
          status:
            "submitted"
        });
  }

  if (result.error) {

    console.error(
      "Homework submission:",
      result.error
    );

    showToast(
      result.error.message ||
      "Could not submit homework."
    );

    return;
  }

  closeModal();

  showToast(
    existingSubmission
      ? "Homework updated successfully!"
      : "Homework submitted successfully!"
  );

  await renderPage();
}

/* =========================================================
   TEACHER HOMEWORK
========================================================= */

async function renderTeacherHomework() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          TEACHER
        </div>

        <h1>
          Homework Manager
        </h1>

        <p>
          Create and manage homework for your classes.
        </p>

      </div>

      <button
        class="primary-btn"
        onclick="openCreateHomeworkModal()">

        + Create Homework

      </button>

    </div>

    <div
      id="teacherHomeworkList"
      class="card-grid">

      <div class="empty">
        Loading homework...
      </div>

    </div>
  `;

  const { data, error } =
    await supabaseClient
      .from("homework")
      .select(`
        id,
        class_id,
        title,
        description,
        due_at,
        created_at,
        classes (
          id,
          title,
          subjects (
            name
          )
        )
      `)
      .eq(
        "teacher_id",
        state.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  const list =
    $("#teacherHomeworkList");

  if (error) {

    console.error(
      "Teacher homework:",
      error
    );

    list.innerHTML = `
      <div class="empty">

        <h3>
          Unable to load homework
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          📝 No homework yet
        </h3>

        <p>
          Create your first homework assignment.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    data
      .map(
        (hw) => `
          <article class="class-card">

            <div class="class-thumb">
              📝
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  hw.classes?.subjects?.name ||
                  "Homework"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  hw.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  hw.classes?.title ||
                  "Class"
                )}
              </p>

              ${
                hw.due_at
                  ? `
                    <p>
                      ⏰ Due:
                      ${new Date(
                        hw.due_at
                      ).toLocaleString()}
                    </p>
                  `
                  : `
                    <p>
                      ⏰ No deadline
                    </p>
                  `
              }

              <button
                class="primary-btn"
                onclick="openHomework('${hw.id}')">

                View Homework

              </button>

            </div>

          </article>
        `
      )
      .join("");
}

/* =========================================================
   CREATE HOMEWORK
========================================================= */

async function openCreateHomeworkModal() {

  if (
    !state.user ||
    state.role !== "teacher"
  ) {

    showToast(
      "Teacher access required."
    );

    return;
  }

  const {
    data: classes,
    error
  } =
    await supabaseClient
      .from("classes")
      .select(`
        id,
        title,
        subjects (
          name
        )
      `)
      .eq(
        "teacher_id",
        state.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    showToast(
      "Could not load your classes."
    );

    return;
  }

  if (!classes?.length) {

    showToast(
      "Create a class first."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      TEACHER
    </div>

    <h2>
      Create Homework
    </h2>

    <form
      id="createHomeworkForm">

      <label>
        Class
      </label>

      <select
        id="homeworkClass"
        required>

        <option value="">
          Select class
        </option>

        ${classes
          .map(
            (c) => `
              <option
                value="${c.id}">

                ${escapeHtml(
                  c.title
                )}

                ${
                  c.subjects?.name
                    ? " — " +
                      escapeHtml(
                        c.subjects.name
                      )
                    : ""
                }

              </option>
            `
          )
          .join("")}

      </select>

      <label>
        Homework Title
      </label>

      <input
        id="homeworkTitle"
        type="text"
        placeholder="e.g. Mathematics Chapter 3"
        required
      >

      <label>
        Description
      </label>

      <textarea
        id="homeworkDescription"
        rows="5"
        placeholder="Explain the homework..."
      ></textarea>

      <label>
        Due Date
      </label>

      <input
        id="homeworkDue"
        type="datetime-local"
      >

      <button
        class="primary-btn"
        type="submit">

        Create Homework

      </button>

    </form>
  `);

  $("#createHomeworkForm")
    ?.addEventListener(
      "submit",
      createHomework
    );
}

window.openCreateHomeworkModal =
  openCreateHomeworkModal;

/* =========================================================
   CREATE HOMEWORK ACTION
========================================================= */

async function createHomework(
  event
) {

  event.preventDefault();

  const classId =
    $("#homeworkClass")
      ?.value;

  const title =
    $("#homeworkTitle")
      ?.value
      .trim();

  const description =
    $("#homeworkDescription")
      ?.value
      .trim();

  const dueValue =
    $("#homeworkDue")
      ?.value;

  if (
    !classId ||
    !title
  ) {

    showToast(
      "Please complete the required fields."
    );

    return;
  }

  const { error } =
    await supabaseClient
      .from("homework")
      .insert({
        class_id:
          classId,

        teacher_id:
          state.user.id,

        title,

        description,

        due_at:
          dueValue
            ? new Date(
                dueValue
              ).toISOString()
            : null
      });

  if (error) {

    console.error(
      "Create homework:",
      error
    );

    showToast(
      error.message ||
      "Could not create homework."
    );

    return;
  }

  closeModal();

  showToast(
    "Homework created successfully!"
  );

  await renderPage();
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

  if (
    state.role === "parent"
  ) {

    return renderSimple(
      "Child Progress",
      "PROGRESS",
      "Your child's learning progress will appear here."
    );
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

        <div class="eyebrow">
          NOTIFICATIONS
        </div>

        <h1>
          Notifications
        </h1>

        <p>
          Important updates from Smart Tuisyen.
        </p>

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
                      ${escapeHtml(
                        n.title ||
                        "Notification"
                      )}
                    </strong>

                    <p>
                      ${escapeHtml(
                        n.body ||
                        ""
                      )}
                    </p>

                    <small>
                      ${
                        n.created_at
                          ? new Date(
                              n.created_at
                            ).toLocaleString()
                          : ""
                      }
                    </small>

                  </div>
                `
              )
              .join("")
          : `
            <div class="empty">

              <h3>
                You're all caught up 🎉
              </h3>

              <p>
                No notifications yet.
              </p>

            </div>
          `
      }

    </div>
  `;
}

/* =========================================================
   PROFILE PAGE
========================================================= */

function renderProfile() {

  const p =
    state.profile || {};

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          PROFILE
        </div>

        <h1>
          Your Profile
        </h1>

        <p>
          Manage your Smart Tuisyen account.
        </p>

      </div>

    </div>

    <div class="panel">

      <div class="list-item">

        <strong>
          👤
          ${escapeHtml(
            p.full_name ||
            "User"
          )}
        </strong>

        <p>
          ${escapeHtml(
            state.user?.email ||
            ""
          )}
        </p>

        <p>
          Role:

          <strong>
            ${escapeHtml(
              String(
                p.role ||
                state.role
              ).toUpperCase()
            )}
          </strong>

        </p>

        ${
          p.phone
            ? `
              <p>
                📱
                ${escapeHtml(
                  p.phone
                )}
              </p>
            `
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

function renderSimple(
  title,
  eyebrow,
  body
) {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          ${escapeHtml(
            eyebrow
          )}
        </div>

        <h1>
          ${escapeHtml(
            title
          )}
        </h1>

        <p>
          ${escapeHtml(
            body
          )}
        </p>

      </div>

    </div>

    <div class="panel">

      <div class="empty">

        <h3>
          Coming next 🚀
        </h3>

        <p>
          This module is prepared for the Smart Tuisyen
          backend and will be connected to Supabase.
        </p>

      </div>

    </div>
  `;
}

/* =========================================================
   CREATE CLASS MODAL
========================================================= */

async function openCreateClassModal() {

  if (
    state.role !== "teacher"
  ) {

    showToast(
      "Teacher access required."
    );

    return;
  }

  const {
    data: subjects,
    error
  } =
    await supabaseClient
      .from("subjects")
      .select(
        "id,name"
      )
      .order(
        "name"
      );

  if (error) {

    console.error(error);

    showToast(
      "Could not load subjects."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      TEACHER
    </div>

    <h2>
      Create a Class
    </h2>

    <form
      id="createClassForm">

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

      <select
        id="newClassSubject">

        <option value="">
          Select subject
        </option>

        ${(subjects || [])
          .map(
            (s) => `
              <option
                value="${s.id}">

                ${escapeHtml(
                  s.name
                )}

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

  $("#createClassForm")
    ?.addEventListener(
      "submit",
      createClass
    );
}

window.openCreateClassModal =
  openCreateClassModal;

/* =========================================================
   CREATE CLASS ACTION
========================================================= */

async function createClass(
  event
) {

  event.preventDefault();

  const title =
    $("#newClassTitle")
      ?.value
      .trim();

  const description =
    $("#newClassDescription")
      ?.value
      .trim();

  const subjectId =
    $("#newClassSubject")
      ?.value ||
    null;

  const price =
    Number(
      $("#newClassPrice")
        ?.value ||
      45
    );

  const schedule =
    $("#newClassSchedule")
      ?.value
      .trim();

  const published =
    $("#newClassPublished")
      ?.checked;

  if (!title) {

    showToast(
      "Please enter a class title."
    );

    return;
  }

  /*
   * Generate a unique-looking human-friendly
   * class code.
   *
   * Example:
   * ST-K7P2Q9
   */

  let classCode =
    generateClassCode();

  /*
   * Check whether the generated code already exists.
   * If it exists, generate another one.
   */

  let codeCheck =
    await supabaseClient
      .from("classes")
      .select("id")
      .eq(
        "class_code",
        classCode
      )
      .maybeSingle();

  let attempts = 0;

  while (
    codeCheck.data &&
    attempts < 5
  ) {

    classCode =
      generateClassCode();

    codeCheck =
      await supabaseClient
        .from("classes")
        .select("id")
        .eq(
          "class_code",
          classCode
        )
        .maybeSingle();

    attempts++;
  }

  if (codeCheck.error) {

    console.warn(
      "Class code check:",
      codeCheck.error
    );

  }

  const { error } =
    await supabaseClient
      .from("classes")
      .insert({

        teacher_id:
          state.user.id,

        subject_id:
          subjectId,

        title,

        description,

        price,

        schedule_text:
          schedule,

        is_published:
          published,

        class_code:
          classCode
      });

  if (error) {

    console.error(
      "Create class:",
      error
    );

    showToast(
      error.message ||
      "Could not create class."
    );

    return;
  }

  closeModal();

  showToast(
    `Class created! Code: ${classCode}`
  );

  state.page =
    "classes";

  await renderPage();
}

/* =========================================================
   LINK CHILD
========================================================= */

async function openLinkChildModal() {

  if (
    state.role !== "parent"
  ) {

    showToast(
      "Parent access required."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      PARENT
    </div>

    <h2>
      Link Child
    </h2>

    <p>
      Enter the Student account ID.
    </p>

    <form
      id="linkChildForm">

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

  $("#linkChildForm")
    ?.addEventListener(
      "submit",
      linkChild
    );
}

window.openLinkChildModal =
  openLinkChildModal;

async function linkChild(
  event
) {

  event.preventDefault();

  const studentId =
    $("#childId")
      ?.value
      .trim();

  const {
    data: student,
    error: studentError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,role"
      )
      .eq(
        "id",
        studentId
      )
      .maybeSingle();

  if (
    studentError ||
    !student
  ) {

    showToast(
      "Student account not found."
    );

    return;
  }

  if (
    student.role !==
    "student"
  ) {

    showToast(
      "That account is not a Student."
    );

    return;
  }

  const { error } =
    await supabaseClient
      .from("parent_children")
      .insert({
        parent_id:
          state.user.id,

        student_id:
          studentId
      });

  if (error) {

    if (
      error.code ===
      "23505"
    ) {

      showToast(
        "This child is already linked."
      );

      return;
    }

    console.error(error);

    showToast(
      error.message
    );

    return;
  }

  closeModal();

  showToast(
    "Child linked successfully!"
  );

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

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-page]"
      );

    if (!button) return;

    state.page =
      button.dataset.page;

    await renderPage();
  }
);

/* =========================================================
   MODAL
========================================================= */

$("#closeModal")
  ?.addEventListener(
    "click",
    closeModal
  );

$("#modal")
  ?.addEventListener(
    "click",
    (event) => {

      if (
        event.target.id ===
        "modal"
      ) {
        closeModal();
      }

    }
  );

/* =========================================================
   AUTH TOGGLE
========================================================= */

$("#toggleAuth")
  ?.addEventListener(
    "click",
    () => {

      const login =
        $("#loginForm");

      const signup =
        $("#signupForm");

      if (
        !login ||
        !signup
      ) {
        return;
      }

      const isSignup =
        !signup.classList.contains(
          "hidden"
        );

      login.classList.toggle(
        "hidden",
        !isSignup
      );

      signup.classList.toggle(
        "hidden",
        isSignup
      );

      $("#authTitle").textContent =
        isSignup
          ? "Welcome back"
          : "Create your account";

      $("#authSubtitle").textContent =
        isSignup
          ? "Sign in to continue learning."
          : "Join Smart Tuisyen.";

      $("#toggleAuth").textContent =
        isSignup
          ? "Create a new account"
          : "Already have an account? Sign in";
    }
  );

/* =========================================================
   LOGIN
========================================================= */

$("#loginForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      $("#authMessage").textContent =
        "Signing in...";

      const email =
        $("#loginEmail")
          ?.value
          .trim();

      const password =
        $("#loginPassword")
          ?.value;

      if (
        !email ||
        !password
      ) {

        $("#authMessage").textContent =
          "Please enter your email and password.";

        return;
      }

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {

        $("#authMessage").textContent =
          error.message;

        return;
      }

      state.user =
        data.user;

      await loadProfile();

      await showApp();

      $("#authMessage").textContent =
        "";
    }
  );

/* =========================================================
   SIGNUP
========================================================= */

$("#signupForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      $("#authMessage").textContent =
        "Creating account...";

      const full_name =
        $("#signupName")
          ?.value
          .trim();

      const email =
        $("#signupEmail")
          ?.value
          .trim();

      const password =
        $("#signupPassword")
          ?.value;

      const role =
        $("#signupRole")
          ?.value;

      if (
        !full_name ||
        !email ||
        !password ||
        !VALID_ROLES.includes(
          role
        )
      ) {

        $("#authMessage").textContent =
          "Please complete all required fields.";

        return;
      }

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signUp({
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

      /*
       * CREATE PROFILE
       *
       * Do NOT add email here unless
       * profiles table has an email column.
       */

      if (data.user) {

        const {
          error: profileError
        } =
          await supabaseClient
            .from("profiles")
            .upsert({
              id:
                data.user.id,

              full_name,

              role
            });

        if (profileError) {

          console.error(
            "PROFILE CREATION ERROR:",
            profileError
          );

          $("#authMessage").textContent =
            "Account created. Profile database setup needs attention: " +
            profileError.message;

          $("#signupForm").reset();

          return;
        }
      }

      $("#authMessage").textContent =
        data.session
          ? "Account created successfully. Opening your dashboard..."
          : "Account created. You can now sign in.";

      $("#signupForm").reset();

      if (data.session) {

        state.user =
          data.user;

        await loadProfile();

        await showApp();
      }
    }
  );

/* =========================================================
   LOGOUT
========================================================= */

$("#logout")
  ?.addEventListener(
    "click",
    async () => {

      await supabaseClient
        .auth
        .signOut();

      state.user = null;
      state.profile = null;
      state.role = "student";
      state.page = "home";

      location.reload();
    }
  );

/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth
  .onAuthStateChange(
    async (
      _event,
      session
    ) => {

      if (
        session &&
        !state.user
      ) {

        state.user =
          session.user;

        await loadProfile();

        await showApp();
      }

    }
  );

/* =========================================================
   START
========================================================= */

startApp();
