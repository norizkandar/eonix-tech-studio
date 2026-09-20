-- =========================================================
-- SMART ACADEMY / SMART TUISYEN V2
-- ADDITIONAL TABLES
-- Keep your existing foundation SQL.
-- =========================================================

-- 1. LESSONS
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  content text,
  video_url text,
  notes_url text,
  created_at timestamptz not null default now()
);

-- 2. HOMEWORK
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  max_marks integer not null default 100,
  created_at timestamptz not null default now()
);

-- 3. HOMEWORK SUBMISSIONS
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answer text,
  file_url text,
  marks integer,
  feedback text,
  status text not null default 'submitted'
    check (status in ('submitted','graded','late')),
  submitted_at timestamptz not null default now(),
  unique(homework_id, student_id)
);

-- 4. QUIZZES
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  time_limit_minutes integer,
  created_at timestamptz not null default now()
);

-- 5. QUIZ QUESTIONS
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text,
  option_d text,
  correct_answer text not null
    check (correct_answer in ('A','B','C','D')),
  marks integer not null default 1
);

-- 6. QUIZ RESULTS
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  total_marks integer not null default 0,
  percentage numeric(5,2),
  completed_at timestamptz not null default now(),
  unique(quiz_id, student_id)
);

-- 7. ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null default 'present'
    check (status in ('present','absent','late','excused')),
  created_at timestamptz not null default now(),
  unique(class_id, student_id, attendance_date)
);

-- 8. PARENT -> CHILD
create table if not exists public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);

-- 9. MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.lessons enable row level security;
alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.attendance enable row level security;
alter table public.parent_children enable row level security;
alter table public.messages enable row level security;

-- =========================================================
-- LESSON POLICIES
-- =========================================================

create policy "lessons enrolled students read"
on public.lessons
for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.class_members cm
    where cm.class_id = lessons.class_id
      and cm.student_id = auth.uid()
  )
  or public.is_admin()
);

create policy "teachers create lessons"
on public.lessons
for insert
with check (teacher_id = auth.uid());

create policy "teachers update lessons"
on public.lessons
for update
using (teacher_id = auth.uid() or public.is_admin());

-- =========================================================
-- HOMEWORK POLICIES
-- =========================================================

create policy "homework students read"
on public.homework
for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.class_members cm
    where cm.class_id = homework.class_id
      and cm.student_id = auth.uid()
  )
  or public.is_admin()
);

create policy "teachers create homework"
on public.homework
for insert
with check (teacher_id = auth.uid());

create policy "teachers update homework"
on public.homework
for update
using (teacher_id = auth.uid() or public.is_admin());

-- =========================================================
-- HOMEWORK SUBMISSION POLICIES
-- =========================================================

create policy "students read own submissions"
on public.homework_submissions
for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.homework h
    where h.id = homework_submissions.homework_id
      and h.teacher_id = auth.uid()
  )
  or public.is_admin()
);

create policy "students submit homework"
on public.homework_submissions
for insert
with check (student_id = auth.uid());

create policy "students update own submission"
on public.homework_submissions
for update
using (student_id = auth.uid());

-- =========================================================
-- QUIZ POLICIES
-- =========================================================

create policy "quiz students read"
on public.quizzes
for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.class_members cm
    where cm.class_id = quizzes.class_id
      and cm.student_id = auth.uid()
  )
  or public.is_admin()
);

create policy "teachers create quizzes"
on public.quizzes
for insert
with check (teacher_id = auth.uid());

create policy "teachers update quizzes"
on public.quizzes
for update
using (teacher_id = auth.uid() or public.is_admin());

create policy "quiz questions read"
on public.quiz_questions
for select
using (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and (
        q.teacher_id = auth.uid()
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = q.class_id
            and cm.student_id = auth.uid()
        )
        or public.is_admin()
      )
  )
);

create policy "teachers create quiz questions"
on public.quiz_questions
for insert
with check (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and q.teacher_id = auth.uid()
  )
);

-- =========================================================
-- QUIZ RESULTS
-- =========================================================

create policy "students read own quiz results"
on public.quiz_results
for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.quizzes q
    where q.id = quiz_results.quiz_id
      and q.teacher_id = auth.uid()
  )
  or public.is_admin()
);

create policy "students create quiz results"
on public.quiz_results
for insert
with check (student_id = auth.uid());

-- =========================================================
-- ATTENDANCE
-- =========================================================

create policy "attendance students read"
on public.attendance
for select
using (
  student_id = auth.uid()
  or teacher_id = auth.uid()
  or exists (
    select 1
    from public.parent_children pc
    where pc.parent_id = auth.uid()
      and pc.student_id = attendance.student_id
  )
  or public.is_admin()
);

create policy "teachers create attendance"
on public.attendance
for insert
with check (teacher_id = auth.uid());

create policy "teachers update attendance"
on public.attendance
for update
using (teacher_id = auth.uid() or public.is_admin());

-- =========================================================
-- PARENT / CHILD
-- =========================================================

create policy "parent child relationship read"
on public.parent_children
for select
using (
  parent_id = auth.uid()
  or student_id = auth.uid()
  or public.is_admin()
);

create policy "parent create child relationship"
on public.parent_children
for insert
with check (parent_id = auth.uid());

-- =========================================================
-- MESSAGES
-- =========================================================

create policy "users read their messages"
on public.messages
for select
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or public.is_admin()
);

create policy "users send messages"
on public.messages
for insert
with check (sender_id = auth.uid());

create policy "receiver update messages"
on public.messages
for update
using (receiver_id = auth.uid() or public.is_admin());

-- =========================================================
-- REALTIME FOR CHAT
-- =========================================================

alter publication supabase_realtime
add table public.messages;
