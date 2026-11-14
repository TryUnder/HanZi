-- =========================================================
-- HanZi: learning sessions
-- Tracks the lifecycle and progress of learning exercises.
-- =========================================================

create table public.learning_sessions (
    id uuid primary key,

    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,

    exercise_type text not null,
    status text not null default 'in-progress',

    started_at timestamptz not null,
    completed_at timestamptz,

    total_items integer not null,
    completed_items integer not null default 0,

    context jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint learning_sessions_exercise_type
        check (
            exercise_type in (
                'vocabulary-recognition',
                'writing-practice',
                'memory-writing',
                'flashcards'
            )
        ),

    constraint learning_sessions_status
        check (
            status in (
                'in-progress',
                'completed',
                'abandoned'
            )
        ),

    constraint learning_sessions_total_items
        check (total_items > 0),

    constraint learning_sessions_completed_items
        check (
            completed_items >= 0
            and completed_items <= total_items
        ),

    constraint learning_sessions_context
        check (
            context is null
            or (
                jsonb_typeof(context) = 'object'
                and context ?& array['courseId', 'lessonId', 'activityId']
                and jsonb_typeof(context -> 'courseId') = 'string'
                and jsonb_typeof(context -> 'lessonId') = 'string'
                and jsonb_typeof(context -> 'activityId') = 'string'
                and length(trim(context ->> 'courseId')) > 0
                and length(trim(context ->> 'lessonId')) > 0
                and length(trim(context ->> 'activityId')) > 0
            )
        ),

    constraint learning_sessions_completion_state
        check (
            (
                status = 'completed'
                and completed_at is not null
                and completed_items = total_items
            )
            or
            (
                status in ('in-progress', 'abandoned')
                and completed_at is null
            )
        ),

    constraint learning_sessions_data_dates
        check (
            completed_at is null
            or completed_at >= started_at
        )
);

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------

create index learning_sessions_user_started_at_idx
    on public.learning_sessions (user_id, started_at desc);

create index learning_sessions_user_status_idx
    on public.learning_sessions (user_id, status, started_at desc);

create index learning_sessions_user_exercise_type_idx
    on public.learning_sessions (user_id, exercise_type, started_at desc);

-- ---------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------

create trigger learning_sessions_set_updated_at
before update on public.learning_sessions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------

alter table public.learning_sessions enable row level security;

create policy "Users can read their own learning sessions"
on public.learning_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own learning sessions"
on public.learning_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own learning sessions"
on public.learning_sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------
-- Explicit table privileges
-- ---------------------------------------------------------

revoke all on public.learning_sessions from anon, authenticated;

grant select, insert
on public.learning_sessions to authenticated;

grant update (status, completed_at, completed_items)
on public.learning_sessions to authenticated;




