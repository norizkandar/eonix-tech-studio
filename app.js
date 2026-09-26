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
    ["notes", "✎", "Notes"],
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

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", state.user.id)
      .maybeSingle();

  if (error) {
    console.warn(
      "Profile error:",
      error
    );
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

  console.log("CURRENT ROLE:", role);
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
      .eq(
        "student_id",
        state.user.id
      )
      .eq(
        "status",
        "active"
      );

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
      .eq(
        "is_published",
        true
      )
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

                        <button
                          class="primary-btn"
                          onclick="openCreateLessonModal('${c.id}')">

                          + Add Lesson

                        </button>

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
   QUIZ
========================================================= */

async function renderQuiz() {
  if (!state.user) return;

  if (state.role === "teacher") {
    await renderTeacherQuiz();
  } else {
    await renderStudentQuiz();
  }
}


/* =========================================================
   TEACHER QUIZ
========================================================= */

async function renderTeacherQuiz() {

  const { data: classes, error } =
    await supabaseClient
      .from("classes")
      .select("id, title")
      .eq("teacher_id", state.user.id)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    showToast(error.message);
    return;
  }

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          QUIZ
        </div>

        <h1>
          Create Quiz
        </h1>

        <p>
          Create quizzes for your students.
        </p>

      </div>

      <button
        class="primary-btn"
        onclick="openCreateQuizModal()">

        + Create Quiz

      </button>

    </div>

    <div class="panel">

      <h2>
        Your Quizzes
      </h2>

      <div id="teacherQuizList">
        Loading quizzes...
      </div>

    </div>
  `;

  await loadTeacherQuizzes();
}


/* =========================================================
   LOAD TEACHER QUIZZES
========================================================= */

async function loadTeacherQuizzes() {

  const box =
    $("#teacherQuizList");

  if (!box) return;

  const { data, error } =
    await supabaseClient
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        time_limit_minutes,
        created_at,
        classes (
          title
        )
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    box.innerHTML = `
      <div class="empty">

        ${escapeHtml(
          error.message
        )}

      </div>
    `;

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {

    box.innerHTML = `
      <div class="empty">

        <h3>
          No quizzes yet
        </h3>

        <p>
          Create your first quiz
          for your students.
        </p>

      </div>
    `;

    return;
  }

  box.innerHTML = data
    .map(
      (quiz) => `

        <div
          class="list-item"
          style="margin-bottom:16px;">

          <strong>

            📝

            ${escapeHtml(
              quiz.title ||
              "Untitled Quiz"
            )}

          </strong>

          <p>

            ${escapeHtml(
              quiz.description ||
              "No description"
            )}

          </p>

          <small>

            Class:

            ${escapeHtml(
              quiz.classes?.title ||
              "Unknown class"
            )}

            •

            ${quiz.time_limit_minutes || 0}
            minutes

          </small>

          <div
            style="
              margin-top:16px;
              display:flex;
              gap:10px;
              flex-wrap:wrap;
            ">

            <button
              class="primary-btn"
              onclick="viewQuizResults(
                '${quiz.id}',
                '${escapeHtml(
                  quiz.title ||
                  "Untitled Quiz"
                ).replace(
                  /'/g,
                  "\\'"
                )}'
              )">

              View Results

            </button>

          </div>

        </div>

      `
    )
    .join("");
}


/* =========================================================
   TEACHER QUIZ RESULTS
========================================================= */

async function viewQuizResults(
  quizId,
  quizTitle
) {

  const { data, error } =
    await supabaseClient
      .from("quiz_attempts")
      .select(`
        id,
        score,
        started_at,
        completed_at,
        profiles:student_id (
          full_name
        )
      `)
      .eq("quiz_id", quizId)
      .order("score", {
        ascending: false
      });

  if (error) {

    console.error(error);

    showToast(
      error.message
    );

    return;
  }

  openModal(`
    <div class="modal-card">

      <h2>
        Quiz Results
      </h2>

      <p
        style="
          margin-bottom:20px;
        ">

        ${escapeHtml(
          quizTitle ||
          "Quiz"
        )}

      </p>

      ${
        data &&
        data.length > 0

          ? `

            <div>

              ${data
                .map(
                  (
                    attempt,
                    index
                  ) => `

                    <div
                      class="list-item"
                      style="
                        margin-bottom:12px;
                      ">

                      <strong>

                        ${index + 1}.

                        ${escapeHtml(
                          attempt
                            .profiles
                            ?.full_name ||
                          "Student"
                        )}

                      </strong>

                      <p>

                        Score:

                        <strong>

                          ${Number(
                            attempt.score || 0
                          )}%

                        </strong>

                      </p>

                      <small>

                        Completed:

                        ${
                          attempt.completed_at
                            ? new Date(
                                attempt.completed_at
                              ).toLocaleString()
                            : "-"
                        }

                      </small>

                    </div>

                  `
                )
                .join("")}

            </div>

          `

          : `

            <div class="empty">

              <h3>
                No attempts yet
              </h3>

              <p>
                No student has completed
                this quiz.
              </p>

            </div>

          `
      }

    </div>
  `);
}

/* =========================================================
   CREATE QUIZ MODAL
========================================================= */

async function openCreateQuizModal() {

  const { data: classes, error } =
    await supabaseClient
      .from("classes")
      .select("id, title")
      .eq("teacher_id", state.user.id)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    showToast(error.message);
    return;
  }

  openModal(`
    <div class="modal-card">

      <h2>
        Create Quiz
      </h2>

      <form
        id="createQuizForm"
        style="margin-top:20px;">

        <label>
          Quiz Title
        </label>

        <input
          id="quizTitle"
          type="text"
          placeholder="Example: Mathematics Chapter 1"
          required
        >

        <label>
          Description
        </label>

        <textarea
          id="quizDescription"
          placeholder="Enter quiz description..."
          rows="4"
        ></textarea>

        <label>
          Class
        </label>

        <select
          id="quizClass"
          required>

          <option value="">
            Select class
          </option>

          ${
            (classes || [])
              .map(
                (item) => `
                  <option value="${item.id}">
                    ${escapeHtml(item.title)}
                  </option>
                `
              )
              .join("")
          }

        </select>

        <label>
          Time Limit (minutes)
        </label>

        <input
          id="quizTime"
          type="number"
          min="1"
          value="30"
          required
        >

        <button
          class="primary-btn"
          type="submit"
          style="margin-top:20px;">

          Create Quiz

        </button>

      </form>

    </div>
  `);

  const form = $("#createQuizForm");

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const title =
        $("#quizTitle").value.trim();

      const description =
        $("#quizDescription").value.trim();

      const classId =
        $("#quizClass").value;

      const time =
        Number(
          $("#quizTime").value
        );

      if (!title || !classId) {
        showToast(
          "Please fill in all required fields."
        );
        return;
      }

      const { data, error } =
        await supabaseClient
          .from("quizzes")
          .insert({
            class_id: Number(classId),
            title,
            description,
            time_limit_minutes: time
          })
          .select()
          .single();

      if (error) {
        console.error(error);
        showToast(error.message);
        return;
      }

      closeModal();

      showToast(
        "Quiz created successfully!"
      );

      await renderQuiz();

      if (data?.id) {
        setTimeout(() => {
          openAddQuizQuestionModal(data.id);
        }, 300);
      }

    }
  );
}


/* =========================================================
   ADD QUIZ QUESTION
========================================================= */

function openAddQuizQuestionModal(
  quizId
) {

  openModal(`
    <div class="modal-card">

      <h2>
        Add Question
      </h2>

      <form
        id="addQuizQuestionForm"
        style="margin-top:20px;">

        <label>
          Question
        </label>

        <textarea
          id="questionText"
          rows="4"
          placeholder="Enter your question..."
          required
        ></textarea>

        <label>
          Option A
        </label>

        <input
          id="optionA"
          required
          placeholder="Option A"
        >

        <label>
          Option B
        </label>

        <input
          id="optionB"
          required
          placeholder="Option B"
        >

        <label>
          Option C
        </label>

        <input
          id="optionC"
          required
          placeholder="Option C"
        >

        <label>
          Option D
        </label>

        <input
          id="optionD"
          required
          placeholder="Option D"
        >

        <label>
          Correct Answer
        </label>

        <select
          id="correctAnswer"
          required>

          <option value="A">
            A
          </option>

          <option value="B">
            B
          </option>

          <option value="C">
            C
          </option>

          <option value="D">
            D
          </option>

        </select>

        <div
          style="
            display:flex;
            gap:10px;
            margin-top:20px;
            flex-wrap:wrap;
          ">

          <button
            class="primary-btn"
            type="submit">

            Save & Add Another

          </button>

          <button
            type="button"
            class="secondary-btn"
            onclick="finishAddingQuizQuestions('${quizId}')">

            Done

          </button>

        </div>

      </form>

    </div>
  `);

  const form =
    $("#addQuizQuestionForm");

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const question =
        $("#questionText")
          .value
          .trim();

      const optionA =
        $("#optionA")
          .value
          .trim();

      const optionB =
        $("#optionB")
          .value
          .trim();

      const optionC =
        $("#optionC")
          .value
          .trim();

      const optionD =
        $("#optionD")
          .value
          .trim();

      const correctAnswer =
        $("#correctAnswer")
          .value;

      if (
        !question ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
      ) {

        showToast(
          "Please fill in all fields."
        );

        return;
      }

      const { error } =
        await supabaseClient
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            question,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_answer:
              correctAnswer
          });

      if (error) {

        console.error(error);

        showToast(
          error.message
        );

        return;
      }

      showToast(
        "Question added successfully!"
      );

      /*
       * Open a fresh form for the next question.
       */
      openAddQuizQuestionModal(
        quizId
      );

    }
  );
}


/* =========================================================
   FINISH ADDING QUESTIONS
========================================================= */

async function finishAddingQuizQuestions(
  quizId
) {

  closeModal();

  showToast(
    "Quiz questions saved successfully!"
  );

  await renderQuiz();
}


/* =========================================================
   STUDENT QUIZ
========================================================= */

async function renderStudentQuiz() {

  const box = $("#content");

  if (!box) return;

  const { data: quizzes, error: quizError } =
    await supabaseClient
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        time_limit_minutes,
        created_at,
        classes (
          title
        )
      `)
      .order("created_at", {
        ascending: false
      });

  if (quizError) {

    console.error(quizError);

    box.innerHTML = `
      <div class="empty">
        ${escapeHtml(
          quizError.message
        )}
      </div>
    `;

    return;
  }


  /* =====================================================
     GET STUDENT ATTEMPTS
  ===================================================== */

  const { data: attempts, error: attemptError } =
    await supabaseClient
      .from("quiz_attempts")
      .select(`
        id,
        quiz_id,
        score,
        started_at,
        completed_at
      `)
      .eq(
        "student_id",
        state.user.id
      )
      .order(
        "completed_at",
        {
          ascending: false
        }
      );

  if (attemptError) {

    console.error(attemptError);

    box.innerHTML = `
      <div class="empty">
        ${escapeHtml(
          attemptError.message
        )}
      </div>
    `;

    return;
  }


  /* =====================================================
     CREATE ATTEMPT MAP
  ===================================================== */

  const attemptMap = {};

  (attempts || []).forEach(
    (attempt) => {

      /*
       * Keep latest attempt
       */
      if (
        !attemptMap[
          attempt.quiz_id
        ]
      ) {

        attemptMap[
          attempt.quiz_id
        ] = attempt;

      }

    }
  );


  /* =====================================================
     PAGE
  ===================================================== */

  box.innerHTML = `

    <div class="page-head">

      <div>

        <div class="eyebrow">
          QUIZ
        </div>

        <h1>
          My Quizzes
        </h1>

        <p>
          Test your knowledge and track your results.
        </p>

      </div>

    </div>


    <!-- QUIZ LIST -->

    <div class="panel">

      <h2>
        Available Quizzes
      </h2>

      <div
        style="
          margin-top:18px;
        ">

        ${
          quizzes &&
          quizzes.length > 0

            ? quizzes
                .map(
                  (quiz) => {

                    const attempt =
                      attemptMap[
                        quiz.id
                      ];

                    return `

                      <div
                        class="list-item"
                        style="
                          margin-bottom:16px;
                        ">

                        <strong>

                          📝

                          ${escapeHtml(
                            quiz.title ||
                            "Untitled Quiz"
                          )}

                        </strong>


                        <p>

                          ${escapeHtml(
                            quiz.description ||
                            "No description"
                          )}

                        </p>


                        <small>

                          📚

                          ${escapeHtml(
                            quiz.classes?.title ||
                            "Unknown class"
                          )}

                          &nbsp; • &nbsp;

                          ⏱

                          ${
                            quiz.time_limit_minutes ||
                            0
                          }

                          minutes

                        </small>


                        <div
                          style="
                            margin-top:14px;
                            display:flex;
                            align-items:center;
                            gap:12px;
                            flex-wrap:wrap;
                          ">

                          ${
                            attempt
                              ? `

                                <span
                                  style="
                                    font-weight:700;
                                  ">

                                  Score:
                                  ${Number(
                                    attempt.score || 0
                                  )}%

                                </span>

                                <span
                                  style="
                                    opacity:.7;
                                  ">

                                  Completed:

                                  ${
                                    attempt.completed_at
                                      ? new Date(
                                          attempt.completed_at
                                        ).toLocaleDateString()
                                      : "-"
                                  }

                                </span>

                              `
                              : `

                                <span
                                  style="
                                    opacity:.7;
                                  ">

                                  Not attempted yet

                                </span>

                              `
                          }

                        </div>


                        <br>


                        <button
                          class="primary-btn"
                          onclick="startQuiz('${quiz.id}')">

                          ${
                            attempt
                              ? "Retake Quiz"
                              : "Start Quiz"
                          }

                        </button>

                      </div>

                    `;

                  }
                )
                .join("")

            : `

              <div class="empty">

                <h3>
                  No quizzes available
                </h3>

                <p>
                  Your teacher hasn't created
                  a quiz yet.
                </p>

              </div>

            `
        }

      </div>

    </div>


    <!-- QUIZ HISTORY -->

    <div
      class="panel"
      style="
        margin-top:20px;
      ">

      <h2>
        Quiz History
      </h2>

      <div
        style="
          margin-top:18px;
        ">

        ${
          attempts &&
          attempts.length > 0

            ? attempts
                .map(
                  (attempt) => {

                    const quiz =
                      (quizzes || [])
                        .find(
                          (item) =>
                            String(
                              item.id
                            ) ===
                            String(
                              attempt.quiz_id
                            )
                        );

                    return `

                      <div
                        class="list-item"
                        style="
                          margin-bottom:12px;
                        ">

                        <strong>

                          🏆

                          ${escapeHtml(
                            quiz?.title ||
                            "Quiz"
                          )}

                        </strong>

                        <p>

                          Score:

                          <strong>

                            ${Number(
                              attempt.score || 0
                            )}%

                          </strong>

                        </p>

                        <small>

                          Completed:

                          ${
                            attempt.completed_at
                              ? new Date(
                                  attempt.completed_at
                                ).toLocaleString()
                              : "-"
                          }

                        </small>

                      </div>

                    `;

                  }
                )
                .join("")

            : `

              <div class="empty">

                <h3>
                  No quiz history yet
                </h3>

                <p>
                  Complete a quiz to see
                  your results here.
                </p>

              </div>

            `
        }

      </div>

    </div>

  `;
}

/* =========================================================
   START QUIZ
========================================================= */

async function startQuiz(
  quizId
) {

  const { data: quiz, error } =
    await supabaseClient
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

  if (error) {
    showToast(error.message);
    return;
  }

  const { data: questions, error: questionError } =
    await supabaseClient
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("id", {
        ascending: true
      });

  if (questionError) {
    showToast(questionError.message);
    return;
  }

  if (
    !questions ||
    questions.length === 0
  ) {
    showToast(
      "This quiz has no questions yet."
    );
    return;
  }

  const timeLimit =
    Number(
      quiz.time_limit_minutes || 30
    );

  let timeLeft =
    timeLimit * 60;

  let submitted = false;

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          QUIZ
        </div>

        <h1>
          ${escapeHtml(
            quiz.title
          )}
        </h1>

        <p>
          ${escapeHtml(
            quiz.description || ""
          )}
        </p>

      </div>

      <div
        class="panel"
        style="
          margin-top:16px;
          text-align:center;
        ">

        <div
          style="
            font-size:14px;
            opacity:.7;
          ">

          TIME REMAINING

        </div>

        <div
          id="quizTimer"
          style="
            font-size:28px;
            font-weight:800;
            margin-top:4px;
          ">

          ${formatQuizTime(
            timeLeft
          )}

        </div>

      </div>

    </div>

    <div class="panel">

      <form id="studentQuizForm">

        ${questions
          .map(
            (q, index) => `

              <div
                class="list-item"
                style="
                  margin-bottom:18px;
                ">

                <strong>

                  ${index + 1}.
                  ${escapeHtml(
                    q.question
                  )}

                </strong>

                <div
                  style="
                    margin-top:14px;
                  ">

                  ${[
                    "a",
                    "b",
                    "c",
                    "d"
                  ]
                    .map(
                      (letter) => `

                        <label
                          style="
                            display:block;
                            margin:10px 0;
                            cursor:pointer;
                          ">

                          <input
                            type="radio"
                            name="q_${q.id}"
                            value="${letter.toUpperCase()}"
                            required
                          >

                          ${letter.toUpperCase()}.

                          ${escapeHtml(
                            q[
                              `option_${letter}`
                            ]
                          )}

                        </label>

                      `
                    )
                    .join("")}

                </div>

              </div>

            `
          )
          .join("")}

        <button
          class="primary-btn"
          type="submit">

          Submit Quiz

        </button>

      </form>

    </div>
  `;

  const form =
    $("#studentQuizForm");

  async function submitQuiz() {

    if (submitted) return;

    submitted = true;

    let correct = 0;

    questions.forEach(
      (q) => {

        const answer =
          document.querySelector(
            `input[name="q_${q.id}"]:checked`
          )?.value;

        if (
          answer &&
          answer.toUpperCase() ===
            String(
              q.correct_answer
            ).toUpperCase()
        ) {

          correct++;

        }

      }
    );

    const score =
      Number(
        (
          (correct /
            questions.length) *
          100
        ).toFixed(2)
      );

    const { error } =
      await supabaseClient
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          student_id: state.user.id,
          score,
          started_at:
            new Date(
              Date.now() -
              (
                (timeLimit * 60 -
                  timeLeft) *
                1000
              )
            ).toISOString(),
          completed_at:
            new Date().toISOString()
        });

    if (error) {

      console.error(error);

      submitted = false;

      showToast(
        error.message
      );

      return;
    }

    clearInterval(
      quizTimerInterval
    );

    $("#content").innerHTML = `

      <div class="panel">

        <div class="empty">

          <h2>
            Quiz Completed 🎉
          </h2>

          <p>
            Your score:
            <strong>
              ${score}%
            </strong>
          </p>

          <p>
            ${correct}
            / ${questions.length}
            correct
          </p>

          <button
            class="primary-btn"
            onclick="renderQuiz()">

            Back to Quiz

          </button>

        </div>

      </div>

    `;

  }

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await submitQuiz();

    }
  );

  window.quizTimerInterval =
    setInterval(
      async () => {

        timeLeft--;

        const timer =
          $("#quizTimer");

        if (timer) {

          timer.textContent =
            formatQuizTime(
              timeLeft
            );

        }

        if (
          timeLeft <= 0
        ) {

          clearInterval(
            quizTimerInterval
          );

          showToast(
            "Time is up! Quiz submitted automatically."
          );

          await submitQuiz();

        }

      },
      1000
    );
}


/* =========================================================
   QUIZ TIMER FORMAT
========================================================= */

function formatQuizTime(
  seconds
) {

  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(
      safeSeconds / 60
    );

  const remainingSeconds =
    safeSeconds % 60;

  return (
    String(minutes)
      .padStart(2, "0") +
    ":" +
    String(
      remainingSeconds
    ).padStart(2, "0")
  );
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
                    <button
                      class="primary-btn"
                      onclick="openCreateLessonModal('${c.id}')">

                      + Add Lesson

                    </button>

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
   LESSONS
========================================================= */

async function loadClassLessons(classId) {

  const { data, error } =
    await supabaseClient
      .from("lessons")
      .select(`
        id,
        class_id,
        teacher_id,
        title,
        description,
        video_url,
        lesson_type,
        created_at
      `)
      .eq(
        "class_id",
        classId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Load lessons:",
      error
    );

    return [];
  }

  return data || [];
}

/* =========================================================
   SHOW CLASS LESSONS
========================================================= */

async function openLessons(classId) {

  const cls =
    state.classes.find(
      (c) =>
        String(c.id) ===
        String(classId)
    );

  if (!cls) {

    showToast(
      "Class not found."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      LESSONS
    </div>

    <h2>
      ${escapeHtml(cls.title)}
    </h2>

    <p>
      Lessons and learning materials for this class.
    </p>

    <div
      id="classLessonsList"
      class="card-grid">

      <div class="empty">
        Loading lessons...
      </div>

    </div>
  `);

  const lessons =
    await loadClassLessons(
      classId
    );

  const list =
    $("#classLessonsList");

  if (!list) return;

  if (!lessons.length) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          📚 No lessons yet
        </h3>

        <p>
          Your teacher hasn't added any lessons yet.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    lessons
      .map(
        (lesson, index) => `
          <article class="class-card">

            <div class="class-thumb">
              ${
                lesson.lesson_type === "recorded"
                  ? "🎥"
                  : "📖"
              }
            </div>

            <div class="class-info">

              <span class="badge">
                Lesson ${index + 1}
              </span>

              <h3>
                ${escapeHtml(
                  lesson.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  lesson.description ||
                  "No description provided."
                )}
              </p>

              ${
                lesson.video_url
                  ? `
                    <button
                      class="primary-btn"
                      onclick="openLessonVideo('${lesson.id}')">

                      ▶ Watch Lesson

                    </button>
                  `
                  : `
                    <span class="badge">
                      📖 Reading lesson
                    </span>
                  `
              }

            </div>

          </article>
        `
      )
      .join("");
}

window.openLessons =
  openLessons;

/* =========================================================
   OPEN LESSON VIDEO
========================================================= */

async function openLessonVideo(
  lessonId
) {

  const {
    data: lesson,
    error
  } =
    await supabaseClient
      .from("lessons")
      .select(`
        id,
        title,
        description,
        video_url,
        lesson_type
      `)
      .eq(
        "id",
        lessonId
      )
      .maybeSingle();

  if (
    error ||
    !lesson
  ) {

    console.error(
      "Lesson:",
      error
    );

    showToast(
      "Lesson not found."
    );

    return;
  }

  if (!lesson.video_url) {

    showToast(
      "This lesson has no video."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      LESSON
    </div>

    <h2>
      ${escapeHtml(
        lesson.title
      )}
    </h2>

    <p>
      ${escapeHtml(
        lesson.description ||
        ""
      )}
    </p>

    <div style="
      margin-top:20px;
      overflow:hidden;
      border-radius:18px;
    ">

      <video
        controls
        playsinline
        preload="metadata"
        style="
          width:100%;
          display:block;
          border-radius:18px;
        ">

        <source
          src="${escapeHtml(
            lesson.video_url
          )}"
          type="video/mp4">

        Your browser does not support video playback.

      </video>

    </div>
  `);
}

window.openLessonVideo =
  openLessonVideo;

/* =========================================================
   CLASS DETAILS
========================================================= */

async function openClassDetails(id) {

  const cls =
    state.classes.find(
      (c) =>
        String(c.id) ===
        String(id)
    );

  if (!cls) {

    showToast(
      "Class not found."
    );

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

    <div style="
      margin-top:18px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    ">

      ${
        state.role === "student"
          ? `
            <button
              class="primary-btn"
              onclick="openLessons('${cls.id}')">

              📚 View Lessons

            </button>

            <button
              class="primary-btn"
              onclick="joinClass('${cls.id}')">

              Join Class

            </button>
          `
          : ""
      }

      ${
        state.role === "teacher"
          ? `
            <button
              class="primary-btn"
              onclick="openCreateLessonModal('${cls.id}')">

              + Add Lesson

            </button>
          `
          : ""
      }

    </div>
  `);
}

window.openClassDetails =
  openClassDetails;

/* =========================================================
   CREATE LESSON MODAL
========================================================= */

async function openCreateLessonModal(
  selectedClassId = ""
) {

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

    console.error(
      "Lesson classes:",
      error
    );

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
      Create Lesson
    </h2>

    <p>
      Add a recorded lesson or learning material to your class.
    </p>

    <form
      id="createLessonForm">

      <label>
        Class
      </label>

      <select
        id="lessonClass"
        required>

        <option value="">
          Select class
        </option>

        ${classes
          .map(
            (c) => `
              <option
                value="${c.id}"
                ${
                  String(c.id) ===
                  String(selectedClassId)
                    ? "selected"
                    : ""
                }>

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
        Lesson Title
      </label>

      <input
        id="lessonTitle"
        type="text"
        placeholder="e.g. Chapter 1 — Algebra"
        required
      >

      <label>
        Description
      </label>

      <textarea
        id="lessonDescription"
        rows="5"
        placeholder="Explain what students will learn..."
      ></textarea>

      <label>
        Video URL
      </label>

      <input
        id="lessonVideoUrl"
        type="url"
        placeholder="https://..."
      >

      <label>
        Lesson Type
      </label>

      <select
        id="lessonType">

        <option value="recorded">
          Recorded Video
        </option>

        <option value="reading">
          Reading Material
        </option>

      </select>

      <button
        class="primary-btn"
        type="submit">

        Create Lesson

      </button>

    </form>
  `);

  $("#createLessonForm")
    ?.addEventListener(
      "submit",
      createLesson
    );
}

window.openCreateLessonModal =
  openCreateLessonModal;

/* =========================================================
   CREATE LESSON ACTION
========================================================= */

async function createLesson(
  event
) {

  event.preventDefault();

  if (
    !state.user ||
    state.role !== "teacher"
  ) {

    showToast(
      "Teacher access required."
    );

    return;
  }

  const classId =
    $("#lessonClass")
      ?.value;

  const title =
    $("#lessonTitle")
      ?.value
      .trim();

  const description =
    $("#lessonDescription")
      ?.value
      .trim();

  const videoUrl =
    $("#lessonVideoUrl")
      ?.value
      .trim();

  const lessonType =
    $("#lessonType")
      ?.value ||
    "recorded";

  if (
    !classId ||
    !title
  ) {

    showToast(
      "Please complete the required fields."
    );

    return;
  }

  const {
    data: lesson,
    error
  } =
    await supabaseClient
      .from("lessons")
      .insert({
        class_id:
          classId,

        teacher_id:
          state.user.id,

        title,

        description:
          description || null,

        video_url:
          videoUrl || null,

        lesson_type:
          lessonType
      })
      .select()
      .single();

  if (error) {

    console.error(
      "Create lesson:",
      error
    );

    showToast(
      error.message ||
      "Could not create lesson."
    );

    return;
  }

  console.log(
    "Lesson created:",
    lesson
  );

  closeModal();

  showToast(
    "Lesson created successfully!"
  );

  state.page =
    "classes";

  await renderPage();
}

/* =========================================================
   JOIN CLASS BY DATABASE ID
========================================================= */

async function joinClass(
  classId
) {

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
        class_id:
          classId,

        student_id:
          state.user.id,

        status:
          "active"
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

  state.page =
    "home";

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

async function joinClassByCode(
  event
) {

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

  const input =
    $("#joinClassCode");

  let classCode =
    input?.value
      ?.trim()
      .toUpperCase();

  if (!classCode) {

    showToast(
      "Please enter a class code."
    );

    return;
  }

  const {
    data: cls,
    error: classError
  } =
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

  if (classError) {

    console.error(
      "Find class by code:",
      classError
    );

    showToast(
      classError.message ||
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

  const {
    data: existingMember,
    error: existingError
  } =
    await supabaseClient
      .from("class_members")
      .select(`
        id,
        class_id,
        student_id,
        status
      `)
      .eq(
        "class_id",
        cls.id
      )
      .eq(
        "student_id",
        state.user.id
      )
      .maybeSingle();

  if (existingError) {

    console.error(
      "Check existing membership:",
      existingError
    );

    showToast(
      existingError.message ||
      "Could not check enrollment."
    );

    return;
  }

  if (existingMember) {

    showToast(
      "You are already enrolled in this class."
    );

    closeModal();

    return;
  }

  const {
    data: joinedMember,
    error: joinError
  } =
    await supabaseClient
      .from("class_members")
      .insert({
        class_id:
          cls.id,

        student_id:
          state.user.id,

        status:
          "active"
      })
      .select(`
        id,
        class_id,
        student_id,
        status
      `)
      .single();

  if (joinError) {

    console.error(
      "Join class error:",
      joinError
    );

    showToast(
      joinError.message ||
      "Could not join class."
    );

    return;
  }

  if (
    !joinedMember ||
    !joinedMember.class_id
  ) {

    console.error(
      "Membership created but class_id is missing:",
      joinedMember
    );

    showToast(
      "Class joined, but class ID was not saved."
    );

    return;
  }

  console.log(
    "JOIN SUCCESS:",
    joinedMember
  );

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
          Replay recordings from your classes.
        </p>

      </div>

    </div>

    <div
      id="replayList"
      class="card-grid"
    >

      <div class="empty">
        Loading replays...
      </div>

    </div>

  `;

  await loadReplays();
}


/* =========================================================
   LOAD REPLAYS
========================================================= */

async function loadReplays() {

  const list = $("#replayList");

  if (!list || !state.user) {
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("replays")
    .select(`
      id,
      class_id,
      title,
      description,
      video_url,
      created_at,
      classes (
        id,
        title,
        subject_id
      )
    `)
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error("Replay error:", error);

    list.innerHTML = `

      <div class="empty">

        <h3>
          🎥 Unable to load replays
        </h3>

        <p>
          ${escapeHtml(error.message)}
        </p>

      </div>

    `;

    return;
  }


  state.replayCache = data || [];


  if (!state.replayCache.length) {

    list.innerHTML = `

      <div class="empty">

        <h3>
          🎥 No replay yet
        </h3>

        <p>
          Class recordings will appear here
          when a teacher adds a replay.
        </p>

      </div>

    `;

    return;
  }


  list.innerHTML =
    state.replayCache
      .map((r) => {

        const classInfo = r.classes || {};

        return `

          <article class="class-card">

            <div class="class-thumb">
              ▶
            </div>


            <div class="class-info">

              <span class="badge">
                CLASS REPLAY
              </span>


              <h3>
                ${escapeHtml(
                  r.title || "Class Replay"
                )}
              </h3>


              <p>
                📚
                ${escapeHtml(
                  classInfo.title || "Class"
                )}
              </p>


              ${
                r.description
                  ? `
                    <p>
                      ${escapeHtml(
                        r.description
                      )}
                    </p>
                  `
                  : ""
              }


              <p>
                📅
                ${new Date(
                  r.created_at
                ).toLocaleDateString()}
              </p>


              <button
                class="primary-btn"
                onclick="openReplay('${r.id}')"
              >
                ▶ Watch Replay
              </button>

            </div>

          </article>

        `;

      })
      .join("");
}


/* =========================================================
   OPEN REPLAY
========================================================= */

async function openReplay(id) {

  const replay =
    state.replayCache.find(
      (r) =>
        String(r.id) === String(id)
    );


  if (!replay) {

    showToast("Replay not found.");

    return;
  }


  const videoUrl =
    replay.video_url || "";


  /*
     Detect YouTube URL
  */

  let youtubeId = null;


  const youtubeMatch =
    videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/
    );


  if (youtubeMatch) {

    youtubeId =
      youtubeMatch[1];

  }


  /*
     YouTube replay
  */

  if (youtubeId) {

    openModal(`

      <div class="replay-player">

        <iframe
          src="https://www.youtube.com/embed/${encodeURIComponent(
            youtubeId
          )}"
          title="Class Replay"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          style="
            width:100%;
            aspect-ratio:16/9;
            border:0;
            border-radius:18px;
            background:#000;
          "
        ></iframe>

      </div>


      <div class="replay-meta">

        <div class="eyebrow">
          CLASS REPLAY
        </div>


        <h2>
          ${escapeHtml(
            replay.title ||
            "Class Replay"
          )}
        </h2>


        <p>
          📚
          ${escapeHtml(
            replay.classes?.title ||
            "Class"
          )}
        </p>


        ${
          replay.description
            ? `
              <p>
                ${escapeHtml(
                  replay.description
                )}
              </p>
            `
            : ""
        }

      </div>

    `);

    return;
  }


  /*
     Direct video / MP4 replay
  */

  openModal(`

    <div class="replay-player">

      <video
        controls
        playsinline
        preload="metadata"
        style="
          width:100%;
          border-radius:18px;
          background:#000;
        "
      >

        <source
          src="${escapeHtml(videoUrl)}"
        >

        Your browser does not support
        video playback.

      </video>

    </div>


    <div class="replay-meta">

      <div class="eyebrow">
        CLASS REPLAY
      </div>


      <h2>
        ${escapeHtml(
          replay.title ||
          "Class Replay"
        )}
      </h2>


      <p>
        📚
        ${escapeHtml(
          replay.classes?.title ||
          "Class"
        )}
      </p>


      ${
        replay.description
          ? `
            <p>
              ${escapeHtml(
                replay.description
              )}
            </p>
          `
          : ""
      }

    </div>

  `);

}


window.openReplay = openReplay;

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

          submitted_at:
            new Date().toISOString()
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

async function renderNotes() {

  if (state.role === "teacher") {
    return renderTeacherNotes();
  }

  if (state.role === "parent") {
    return renderSimple(
      "Child Notes",
      "NOTES",
      "Your child's learning notes will appear here."
    );
  }

  return renderStudentNotes();
}

/* =========================================================
   STUDENT NOTES
========================================================= */

async function renderStudentNotes() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>
        <div class="eyebrow">
          NOTES
        </div>

        <h1>
          Your Notes
        </h1>

        <p>
          Lesson notes and learning materials from your classes.
        </p>
      </div>

    </div>

    <div
      id="notesList"
      class="card-grid">

      <div class="empty">
        Loading notes...
      </div>

    </div>
  `;

  const { data, error } =
    await supabaseClient
      .from("notes")
      .select(`
        id,
        class_id,
        title,
        description,
        file_url,
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

  const list = $("#notesList");

  if (error) {

    console.error(
      "Student notes:",
      error
    );

    list.innerHTML = `
      <div class="empty">

        <h3>
          Unable to load notes
        </h3>

        <p>
          ${escapeHtml(error.message)}
        </p>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    list.innerHTML = `
      <div class="empty">

        <h3>
          📖 No notes yet
        </h3>

        <p>
          Notes from your classes will appear here.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    data
      .map(
        (note) => `
          <article class="class-card">

            <div class="class-thumb">
              📖
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  note.classes?.subjects?.name ||
                  "Note"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  note.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  note.description ||
                  "No description provided."
                )}
              </p>

              <p>
                📚
                ${escapeHtml(
                  note.classes?.title ||
                  "Class"
                )}
              </p>

              ${
                note.file_url
                  ? `
                    <button
                      class="primary-btn"
                      onclick="openNote('${note.id}')">

                      📄 Open Note

                    </button>
                  `
                  : `
                    <span class="badge">
                      📝 Text Note
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
   TEACHER NOTES
========================================================= */

async function renderTeacherNotes() {

  $("#content").innerHTML = `
    <div class="page-head">

      <div>

        <div class="eyebrow">
          TEACHER
        </div>

        <h1>
          Notes Manager
        </h1>

        <p>
          Create learning notes and share them with your students.
        </p>

      </div>

      <button
        class="primary-btn"
        onclick="openCreateNoteModal()">

        + Add Note

      </button>

    </div>

    <div
      id="teacherNotesList"
      class="card-grid">

      <div class="empty">
        Loading notes...
      </div>

    </div>
  `;

  const { data, error } =
    await supabaseClient
      .from("notes")
      .select(`
        id,
        class_id,
        title,
        description,
        file_url,
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
    $("#teacherNotesList");

  if (error) {

    console.error(
      "Teacher notes:",
      error
    );

    list.innerHTML = `
      <div class="empty">

        <h3>
          Unable to load notes
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
          📖 No notes yet
        </h3>

        <p>
          Create your first learning note.
        </p>

      </div>
    `;

    return;
  }

  list.innerHTML =
    data
      .map(
        (note) => `
          <article class="class-card">

            <div class="class-thumb">
              📖
            </div>

            <div class="class-info">

              <span class="badge">
                ${escapeHtml(
                  note.classes?.subjects?.name ||
                  "Note"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  note.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  note.description ||
                  "No description provided."
                )}
              </p>

              <p>
                📚
                ${escapeHtml(
                  note.classes?.title ||
                  "Class"
                )}
              </p>

              ${
                note.file_url
                  ? `
                    <button
                      class="primary-btn"
                      onclick="openNote('${note.id}')">

                      📄 Open Note

                    </button>
                  `
                  : ""
              }

            </div>

          </article>
        `
      )
      .join("");
}

/* =========================================================
   CREATE NOTE MODAL
========================================================= */

async function openCreateNoteModal() {

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

    console.error(
      "Note classes:",
      error
    );

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
      Add Note
    </h2>

    <p>
      Share a learning note with your class.
    </p>

    <form
      id="createNoteForm">

      <label>
        Class
      </label>

      <select
        id="noteClass"
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
        Note Title
      </label>

      <input
        id="noteTitle"
        type="text"
        placeholder="e.g. Chapter 1 — Algebra"
        required
      >

      <label>
        Description
      </label>

      <textarea
        id="noteDescription"
        rows="6"
        placeholder="Explain the topic or note..."
      ></textarea>

      <label>
        File URL
      </label>

      <input
        id="noteFileUrl"
        type="url"
        placeholder="https://..."
      >

      <button
        class="primary-btn"
        type="submit">

        Save Note

      </button>

    </form>
  `);

  $("#createNoteForm")
    ?.addEventListener(
      "submit",
      createNote
    );
}

window.openCreateNoteModal =
  openCreateNoteModal;

/* =========================================================
   CREATE NOTE ACTION
========================================================= */

async function createNote(event) {

  event.preventDefault();

  if (
    !state.user ||
    state.role !== "teacher"
  ) {
    showToast("Teacher access required.");
    return;
  }

  const classId =
    $("#noteClass")?.value;

  const title =
    $("#noteTitle")?.value.trim();

  const description =
    $("#noteDescription")?.value.trim();

  const fileUrl =
    $("#noteFileUrl")?.value.trim();

  if (!classId || !title) {
    showToast(
      "Please complete the required fields."
    );
    return;
  }

  const { error } =
    await supabaseClient
      .from("notes")
      .insert({
        class_id: classId,
        title: title,
        description: description || null,
        file_url: fileUrl || null
      });

  if (error) {

    console.error(
      "Create note:",
      error
    );

    showToast(
      error.message ||
      "Could not create note."
    );

    return;
  }

  closeModal();

  showToast(
    "Note created successfully!"
  );

  state.page = "notes";

  await renderPage();
}

/* =========================================================
   OPEN NOTE
========================================================= */

async function openNote(
  noteId
) {

  const {
    data: note,
    error
  } =
    await supabaseClient
      .from("notes")
      .select(`
        id,
        class_id,
        title,
        description,
        file_url,
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
        noteId
      )
      .maybeSingle();

  if (
    error ||
    !note
  ) {

    console.error(
      "Open note:",
      error
    );

    showToast(
      "Note not found."
    );

    return;
  }

  openModal(`
    <div class="eyebrow">
      NOTE
    </div>

    <h2>
      ${escapeHtml(
        note.title
      )}
    </h2>

    <p>
      ${escapeHtml(
        note.description ||
        "No description provided."
      )}
    </p>

    <div class="panel">

      <p>
        <strong>
          Class:
        </strong>

        ${escapeHtml(
          note.classes?.title ||
          "Class"
        )}
      </p>

      <p>
        <strong>
          Subject:
        </strong>

        ${escapeHtml(
          note.classes?.subjects?.name ||
          "Subject"
        )}
      </p>

    </div>

    ${
      note.file_url
        ? `
          <div style="
            margin-top:18px;
          ">

            <a
              href="${escapeHtml(
                note.file_url
              )}"
              target="_blank"
              rel="noopener noreferrer"
              class="primary-btn"
              style="
                display:inline-block;
                text-decoration:none;
              ">

              📄 Open File

            </a>

          </div>
        `
        : ""
    }
  `);
}

window.openNote =
  openNote;

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

  /* =======================================================
     PARENT
  ======================================================= */

  if (state.role === "parent") {

    return renderSimple(
      "Child Progress",
      "PROGRESS",
      "Your child's learning progress will appear here."
    );

  }


  /* =======================================================
     GET QUIZ ATTEMPTS
  ======================================================= */

  const {
    data: attempts,
    error: attemptError
  } = await supabaseClient
    .from("quiz_attempts")
    .select(`
      id,
      quiz_id,
      score,
      completed_at,
      quizzes (
        title
      )
    `)
    .eq(
      "student_id",
      state.user.id
    )
    .order(
      "completed_at",
      {
        ascending: false
      }
    );


  if (attemptError) {

    console.error(
      attemptError
    );

    showToast(
      attemptError.message
    );

    return;

  }


  /* =======================================================
     QUIZ STATISTICS
  ======================================================= */

  const quizAttempts =
    attempts || [];

  const quizCount =
    quizAttempts.length;

  let quizAverage = 0;

  if (quizCount > 0) {

    const totalScore =
      quizAttempts.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.score || 0
          ),
        0
      );

    quizAverage =
      Math.round(
        totalScore /
        quizCount
      );

  }


  /* =======================================================
     OVERALL PROGRESS
  ======================================================= */

  /*
   * Simple progress calculation:
   * quiz average = main progress indicator
   */

  const overallProgress =
    quizCount > 0
      ? quizAverage
      : 0;


  /* =======================================================
     RECENT QUIZZES
  ======================================================= */

  const recentQuizzes =
    quizAttempts
      .slice(0, 5);


  /* =======================================================
     RENDER
  ======================================================= */

  $("#content").innerHTML = `

    <div class="page-head">

      <div>

        <div class="eyebrow">
          PROGRESS
        </div>

        <h1>
          Learning Progress
        </h1>

        <p>
          Track your learning activity,
          results and achievements.
        </p>

      </div>

    </div>


    <!-- OVERALL PROGRESS -->

    <div
      class="panel"
      style="
        margin-bottom:20px;
      ">

      <h2>
        Overall Progress
      </h2>

      <div
        style="
          display:flex;
          align-items:center;
          gap:24px;
          margin-top:20px;
          flex-wrap:wrap;
        ">

        <div
          style="
            width:120px;
            height:120px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:28px;
            font-weight:800;
            background:
              conic-gradient(
                #00e5a8
                ${overallProgress * 3.6}deg,
                rgba(255,255,255,.08)
                0deg
              );
          ">

          <div
            style="
              width:92px;
              height:92px;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#07131f;
            ">

            ${overallProgress}%

          </div>

        </div>


        <div>

          <h3>
            ${
              quizCount > 0
                ? "Keep going! 🚀"
                : "Start learning! 🚀"
            }
          </h3>

          <p
            style="
              opacity:.7;
              margin-top:6px;
            ">

            ${
              quizCount > 0
                ? `You have completed ${quizCount} quiz${quizCount > 1 ? "zes" : ""}.`
                : "Complete your first quiz to start tracking your progress."
            }

          </p>

        </div>

      </div>

    </div>


    <!-- STATISTICS -->

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px, 1fr)
          );
        gap:16px;
        margin-bottom:20px;
      ">


      <div class="panel">

        <div
          style="
            font-size:13px;
            opacity:.7;
          ">

          QUIZZES COMPLETED

        </div>

        <div
          style="
            font-size:32px;
            font-weight:800;
            margin-top:8px;
          ">

          ${quizCount}

        </div>

      </div>


      <div class="panel">

        <div
          style="
            font-size:13px;
            opacity:.7;
          ">

          QUIZ AVERAGE

        </div>

        <div
          style="
            font-size:32px;
            font-weight:800;
            margin-top:8px;
          ">

          ${quizAverage}%

        </div>

      </div>


      <div class="panel">

        <div
          style="
            font-size:13px;
            opacity:.7;
          ">

          BEST SCORE

        </div>

        <div
          style="
            font-size:32px;
            font-weight:800;
            margin-top:8px;
          ">

          ${
            quizCount > 0
              ? Math.max(
                  ...quizAttempts.map(
                    (item) =>
                      Number(
                        item.score || 0
                      )
                  )
                )
              : 0
          }%

        </div>

      </div>

    </div>


    <!-- RECENT QUIZ RESULTS -->

    <div class="panel">

      <h2>
        Recent Quiz Results
      </h2>


      <div
        style="
          margin-top:18px;
        ">

        ${
          recentQuizzes.length > 0

            ? recentQuizzes
                .map(
                  (attempt) => `

                    <div
                      class="list-item"
                      style="
                        margin-bottom:12px;
                      ">

                      <strong>

                        📝

                        ${escapeHtml(
                          attempt
                            .quizzes
                            ?.title ||
                          "Quiz"
                        )}

                      </strong>


                      <p>

                        Score:

                        <strong>

                          ${Number(
                            attempt.score || 0
                          )}%

                        </strong>

                      </p>


                      <small>

                        Completed:

                        ${
                          attempt.completed_at
                            ? new Date(
                                attempt.completed_at
                              ).toLocaleString()
                            : "-"
                        }

                      </small>

                    </div>

                  `
                )
                .join("")

            : `

              <div class="empty">

                <h3>
                  No quiz results yet
                </h3>

                <p>
                  Complete a quiz to see
                  your progress here.
                </p>

              </div>

            `
        }

      </div>

    </div>

  `;
}

/* =========================================================
   CHAT
========================================================= */

async function renderChat() {

  const app = $("#content");

  if (!app || !state.user) return;


  /* =======================================================
     LOAD CHAT USERS
  ======================================================= */

  const targetRole =
    state.role === "teacher"
      ? "student"
      : "teacher";


  const {
    data: chatUsers,
    error
  } = await supabaseClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", targetRole)
    .order("full_name", {
      ascending: true
    });


  if (error) {

    console.error(error);

    app.innerHTML = `
      <section class="page-section">

        <div class="page-header">

          <div>

            <div class="eyebrow">
              MESSAGES
            </div>

            <h1>
              Messages
            </h1>

            <p>
              Chat with ${
                state.role === "teacher"
                  ? "your students."
                  : "your teacher."
              }
            </p>

          </div>

        </div>


        <div
          class="card"
          style="
            margin-top:20px;
            padding:30px;
          "
        >

          ${escapeHtml(error.message)}

        </div>

      </section>
    `;

    return;
  }


  /* =======================================================
     LABELS
  ======================================================= */

  const userLabel =
    state.role === "teacher"
      ? "Select Student"
      : "Select Teacher";


  const emptyText =
    state.role === "teacher"
      ? "Select a student to start chatting."
      : "Select a teacher to start chatting.";


  /* =======================================================
     CHAT PAGE
  ======================================================= */

  app.innerHTML = `

    <section class="page-section">


      <div class="page-header">

        <div>

          <div class="eyebrow">
            MESSAGES
          </div>

          <h1>
            Messages
          </h1>

          <p>
            Chat with ${
              state.role === "teacher"
                ? "your students."
                : "your teacher."
            }
          </p>

        </div>

      </div>


      <div
        class="card"
        style="
          margin-top:20px;
        "
      >


        <!-- SELECT USER -->

        <label
          style="
            display:block;
            margin-bottom:8px;
            font-weight:600;
          "
        >

          ${userLabel}

        </label>


        <select
          id="chatUser"
          style="
            width:100%;
            margin-bottom:20px;
          "
        >

          <option value="">
            ${userLabel}
          </option>


          ${
            (chatUsers || [])
              .map(
                user => `

                  <option
                    value="${user.id}"
                  >

                    ${escapeHtml(
                      user.full_name ||
                      (
                        state.role === "teacher"
                          ? "Student"
                          : "Teacher"
                      )
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>


        <!-- MESSAGES -->

        <div
          id="chatMessages"
          style="
            min-height:300px;
            max-height:400px;
            overflow-y:auto;
            padding:15px 0;
          "
        >

          <div
            style="
              text-align:center;
              opacity:.6;
              padding:100px 20px;
            "
          >

            ${emptyText}

          </div>

        </div>


        <!-- SEND MESSAGE -->

        <form
          id="chatForm"
          style="
            display:flex;
            gap:10px;
            border-top:1px solid rgba(255,255,255,.08);
            padding-top:15px;
          "
        >

          <input
            id="chatInput"
            type="text"
            placeholder="Type a message..."
            style="flex:1;"
            autocomplete="off"
            required
            disabled
          >


          <button
            type="submit"
            disabled
          >

            Send

          </button>


        </form>


      </div>


    </section>

  `;


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const userSelect =
    $("#chatUser");

  const input =
    $("#chatInput");

  const form =
    $("#chatForm");

  const sendButton =
    form.querySelector("button");


  /* =======================================================
     SELECT USER
  ======================================================= */

  userSelect.addEventListener(
    "change",
    async () => {

      const userId =
        userSelect.value;


      if (!userId) {

        input.disabled = true;

        sendButton.disabled = true;

        $("#chatMessages").innerHTML = `

          <div
            style="
              text-align:center;
              opacity:.6;
              padding:100px 20px;
            "
          >

            ${emptyText}

          </div>

        `;

        return;
      }


      input.disabled = false;

      sendButton.disabled = false;


      await loadChatMessages(
        userId
      );

    }
  );


  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const userId =
        userSelect.value;


      const text =
        input.value.trim();


      if (!userId) {

        showToast(
          state.role === "teacher"
            ? "Please select a student."
            : "Please select a teacher."
        );

        return;
      }


      if (!text) return;


      sendButton.disabled = true;


      const {
        error
      } = await supabaseClient
        .from("chat_messages")
        .insert({

          sender_id:
            state.user.id,

          receiver_id:
            userId,

          message:
            text

        });


      if (error) {

        console.error(error);

        showToast(
          error.message
        );

        sendButton.disabled = false;

        return;
      }


      input.value = "";


      await loadChatMessages(
        userId
      );


      sendButton.disabled = false;

      input.focus();

    }
  );

}


/* =========================================================
   LOAD CHAT MESSAGES
========================================================= */

async function loadChatMessages(
  userId
) {

  const box =
    $("#chatMessages");


  if (
    !box ||
    !state.user ||
    !userId
  ) {

    return;

  }


  const myId =
    state.user.id;


  const {
    data,
    error
  } = await supabaseClient
    .from("chat_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(error);

    box.innerHTML = `

      <div
        style="
          padding:40px;
          text-align:center;
        "
      >

        ${escapeHtml(error.message)}

      </div>

    `;

    return;
  }


  if (
    !data ||
    data.length === 0
  ) {

    box.innerHTML = `

      <div
        style="
          text-align:center;
          opacity:.6;
          padding:100px 20px;
        "
      >

        No messages yet 👋

      </div>

    `;

    return;
  }


  box.innerHTML =
    data
      .map(
        item => {

          const mine =
            item.sender_id === myId;


          return `

            <div
              style="
                display:flex;
                justify-content:
                  ${
                    mine
                      ? "flex-end"
                      : "flex-start"
                  };
                margin-bottom:12px;
              "
            >

              <div
                style="
                  max-width:75%;
                  padding:12px 16px;
                  border-radius:18px;
                  background:
                    ${
                      mine
                        ? "linear-gradient(135deg,#00d084,#00b7ff)"
                        : "rgba(255,255,255,.1)"
                    };
                  color:#fff;
                "
              >

                ${escapeHtml(
                  item.message
                )}

              </div>

            </div>

          `;

        }
      )
      .join("");


  box.scrollTop =
    box.scrollHeight;

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
                        n.message ||
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

async function renderProfile() {

  const p = state.profile || {};
  const user = state.user || {};
  const userId = user.id;

  const avatarUrl = p.avatar_url || "";

  const initials =
    (p.full_name || "User")
      .trim()
      .split(/\s+/)
      .map(name => name.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();


  /* =======================================================
     PROFILE UI
  ======================================================= */

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


    <div class="panel profile-card">

      <div
        style="
          display:flex;
          flex-direction:column;
          align-items:center;
          text-align:center;
          padding:20px;
        "
      >

        <div
          style="
            width:120px;
            height:120px;
            border-radius:50%;
            overflow:hidden;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:36px;
            font-weight:800;
            background:linear-gradient(135deg,#10b981,#06b6d4);
            color:white;
            margin-bottom:15px;
          "
        >

          ${
            avatarUrl
              ? `
                <img
                  src="${escapeHtml(avatarUrl)}"
                  alt="Profile photo"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                  "
                >
              `
              : `
                ${escapeHtml(initials || "U")}
              `
          }

        </div>


        <h2>
          ${escapeHtml(
            p.full_name || "User"
          )}
        </h2>


        <p>
          ${escapeHtml(
            user.email || ""
          )}
        </p>


        <button
          id="changeProfilePhoto"
          class="primary-btn"
          type="button"
          style="margin-top:10px;"
        >
          📷 Change Photo
        </button>


        <input
          id="profileImageInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
        >

      </div>


      <div class="list-item">

        <strong>
          👤 Full Name
        </strong>

        <p>
          ${escapeHtml(
            p.full_name || "User"
          )}
        </p>

      </div>


      <div class="list-item">

        <strong>
          📧 Email
        </strong>

        <p>
          ${escapeHtml(
            user.email || ""
          )}
        </p>

      </div>


      <div class="list-item">

        <strong>
          🎓 Role
        </strong>

        <p>
          ${escapeHtml(
            String(
              p.role ||
              state.role ||
              "student"
            ).toUpperCase()
          )}
        </p>

      </div>


      ${
        p.phone
          ? `
            <div class="list-item">

              <strong>
                📱 Phone
              </strong>

              <p>
                ${escapeHtml(
                  p.phone
                )}
              </p>

            </div>
          `
          : ""
      }

    </div>

  `;


  /* =======================================================
     CHANGE PHOTO BUTTON
  ======================================================= */

  const changeButton =
    $("#changeProfilePhoto");

  const imageInput =
    $("#profileImageInput");


  if (
    !changeButton ||
    !imageInput
  ) {
    return;
  }


  changeButton.addEventListener(
    "click",
    () => {
      imageInput.click();
    }
  );


  /* =======================================================
     UPLOAD PROFILE PHOTO
  ======================================================= */

  imageInput.addEventListener(
    "change",
    async () => {

      const file =
        imageInput.files?.[0];

      if (!file) {
        return;
      }


      /* FILE SIZE */

      if (
        file.size >
        5 * 1024 * 1024
      ) {

        showToast(
          "Image must be smaller than 5 MB."
        );

        imageInput.value = "";

        return;
      }


      /* FILE TYPE */

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];


      if (
        !allowedTypes.includes(
          file.type
        )
      ) {

        showToast(
          "Please use JPG, PNG or WebP."
        );

        imageInput.value = "";

        return;
      }


      try {

        /* GET SESSION */

        const {
          data: sessionData,
          error: sessionError
        } =
          await supabaseClient.auth.getSession();


        if (
          sessionError ||
          !sessionData?.session?.user
        ) {

          showToast(
            "Please log in again."
          );

          return;
        }


        const currentUser =
          sessionData.session.user;

        const currentUserId =
          currentUser.id;


        showToast(
          "Uploading photo..."
        );


        /* FILE EXTENSION */

        const extension =
          file.name
            .split(".")
            .pop()
            .toLowerCase();


        const filePath =
          `${currentUserId}/avatar.${extension}`;


        /* UPLOAD */

        const {
          error: uploadError
        } =
          await supabaseClient
            .storage
            .from("avatars")
            .upload(
              filePath,
              file,
              {
                upsert: true,
                contentType: file.type
              }
            );


        if (uploadError) {

          console.error(
            "UPLOAD ERROR:",
            uploadError
          );

          showToast(
            uploadError.message
          );

          return;
        }


        /* PUBLIC URL */

        const {
          data: publicData
        } =
          supabaseClient
            .storage
            .from("avatars")
            .getPublicUrl(
              filePath
            );


        const publicUrl =
          publicData?.publicUrl;


        if (!publicUrl) {

          showToast(
            "Could not get image URL."
          );

          return;
        }


        /* SAVE URL */

        const {
          error: profileError
        } =
          await supabaseClient
            .from("profiles")
            .update({
              avatar_url:
                publicUrl
            })
            .eq(
              "id",
              currentUserId
            );


        if (profileError) {

          console.error(
            "PROFILE UPDATE ERROR:",
            profileError
          );

          showToast(
            profileError.message
          );

          return;
        }


        /* UPDATE STATE */

        state.profile = {
          ...state.profile,
          avatar_url:
            publicUrl
        };


        imageInput.value = "";


        showToast(
          "Profile photo updated!"
        );


        /* REFRESH */

        await renderProfile();

      } catch (error) {

        console.error(
          "AVATAR ERROR:",
          error
        );

        showToast(
          error.message ||
          "Upload failed."
        );

      }

    }
  );

}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {

  const app = $("#content");

  if (!app || !state.user) return;


  const profile =
    state.profile || {};

  const name =
    profile.full_name ||
    state.user.email?.split("@")[0] ||
    "User";

  const email =
    state.user.email ||
    "No email";


  const role =
    state.role || "student";


  app.innerHTML = `

    <section class="page-section">


      <!-- HEADER -->

      <div class="page-header">

        <div>

          <div class="eyebrow">
            SETTINGS
          </div>

          <h1>
            Settings
          </h1>

          <p>
            Manage your account and preferences.
          </p>

        </div>

      </div>


      <!-- ACCOUNT -->

      <div
        class="card"
        style="margin-top:20px;"
      >

        <h3>
          Account
        </h3>

        <p
          style="
            opacity:.65;
            margin-bottom:20px;
          "
        >
          Your Smart Academy account information.
        </p>


        <div
          style="
            display:grid;
            gap:15px;
          "
        >

          <div>

            <small
              style="opacity:.6;"
            >
              Full Name
            </small>

            <div
              style="
                margin-top:5px;
                font-weight:600;
              "
            >
              ${escapeHtml(name)}
            </div>

          </div>


          <div>

            <small
              style="opacity:.6;"
            >
              Email
            </small>

            <div
              style="
                margin-top:5px;
                font-weight:600;
              "
            >
              ${escapeHtml(email)}
            </div>

          </div>


          <div>

            <small
              style="opacity:.6;"
            >
              Account Type
            </small>

            <div
              style="
                margin-top:5px;
                font-weight:600;
                text-transform:capitalize;
              "
            >
              ${escapeHtml(role)}
            </div>

          </div>

        </div>

      </div>


      <!-- APPEARANCE -->

      <div
        class="card"
        style="margin-top:20px;"
      >

        <h3>
          Appearance
        </h3>

        <p
          style="
            opacity:.65;
            margin-bottom:20px;
          "
        >
          Customize how Smart Academy looks.
        </p>


        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:20px;
          "
        >

          <div>

            <strong>
              Dark Mode
            </strong>

            <div
              style="
                opacity:.6;
                margin-top:4px;
              "
            >
              Use the dark interface.
            </div>

          </div>


          <button
            id="themeToggle"
            type="button"
            class="primary-btn"
          >
            Toggle Theme
          </button>

        </div>

      </div>


      <!-- SECURITY -->

      <div
        class="card"
        style="margin-top:20px;"
      >

        <h3>
          Security
        </h3>

        <p
          style="
            opacity:.65;
            margin-bottom:20px;
          "
        >
          Manage your account security.
        </p>


        <button
          id="changePasswordBtn"
          type="button"
          class="primary-btn"
        >
          Change Password
        </button>

      </div>


      <!-- ACCOUNT ACTIONS -->

      <div
        class="card"
        style="margin-top:20px;"
      >

        <h3>
          Account Actions
        </h3>

        <p
          style="
            opacity:.65;
            margin-bottom:20px;
          "
        >
          Sign out from your Smart Academy account.
        </p>


        <button
          id="settingsLogout"
          type="button"
          class="primary-btn"
        >
          Log Out
        </button>

      </div>


    </section>

  `;


  /* =======================================================
     THEME
  ======================================================= */

  const themeToggle =
    $("#themeToggle");


  themeToggle.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "light-mode"
      );


      const light =
        document.body.classList.contains(
          "light-mode"
        );


      localStorage.setItem(
        "smart_theme",
        light
          ? "light"
          : "dark"
      );

    }
  );


  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const changePasswordBtn =
    $("#changePasswordBtn");


  changePasswordBtn.addEventListener(
    "click",
    async () => {

      const newPassword =
        prompt(
          "Enter your new password:"
        );


      if (!newPassword) return;


      if (newPassword.length < 6) {

        showToast(
          "Password must be at least 6 characters."
        );

        return;

      }


      const {
        error
      } = await supabaseClient.auth.updateUser({
        password: newPassword
      });


      if (error) {

        console.error(error);

        showToast(
          error.message
        );

        return;

      }


      showToast(
        "Password updated successfully."
      );

    }
  );


  /* =======================================================
     LOG OUT
  ======================================================= */

  const logoutButton =
    $("#settingsLogout");


  logoutButton.addEventListener(
    "click",
    async () => {

      const {
        error
      } =
        await supabaseClient.auth.signOut();


      if (error) {

        console.error(error);

        showToast(
          error.message
        );

        return;

      }


      localStorage.removeItem(
        "st_user"
      );

      localStorage.removeItem(
        "st_role"
      );

      location.reload();

    }
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
   QUIZ
========================================================= */

async function renderQuiz() {

  if (!state.user) return;

  if (state.role === "teacher") {

    await renderTeacherQuiz();

  } else {

    await renderStudentQuiz();

  }
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

  let classCode =
    generateClassCode();

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
      await renderNotes();
      break;

    case "quiz":
      await renderQuiz();
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
      await renderEarnings();
      break;

    case "profile":
      await renderProfile();
      break;

    case "settings":
      await renderSettings();
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
