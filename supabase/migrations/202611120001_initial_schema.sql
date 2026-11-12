
-- =========================================================
-- HanZi: initial database schema
-- =========================================================

-- ---------------------------------------------------------
-- 1. Profiles
-- One profile per Supabase Auth user.
-- ---------------------------------------------------------

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_display_name_length
        check (
            display_name is null
            or char_length(display_name) between 1 and 80
        )
);

-- ---------------------------------------------------------
-- 2. User settings
-- Individual settings for each account.
-- The JSON structure can evolve with the application.
-- ---------------------------------------------------------

create table public.user_settings (
    user_id uuid primary key references auth.users (id) on delete cascade,
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint user_settings_object
        check (jsonb_typeof(settings) = 'object')
);

-- ---------------------------------------------------------
-- 3. Learning records
-- Append-only learning history.
-- record_data stores the complete LearningRecord object.
-- Other columns support efficient filtering.
-- ---------------------------------------------------------

create table public.learning_records (
    id uuid primary key,
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,

    record_type text not null,
    activity text,

    item_kind text not null,
    item_id text not null,

    occurred_at timestamptz not null,
    record_data jsonb not null,

    created_at timestamptz not null default now(),

    constraint learning_records_record_type
        check (record_type in ('attempt', 'status-changed')),

    constraint learning_records_activity
        check (
            activity is null
            or activity in (
                'writing',
                'speaking',
                'listening',
                'recognition',
                'flashcard'
            )
        ),

    constraint learning_records_item_kind
        check (item_kind in ('character', 'vocabulary')),

    constraint learning_records_type_activity
        check (
            (record_type = 'attempt' and activity is not null)
            or
            (record_type = 'status-changed' and activity is null)
        ),

    constraint learning_records_data_object
        check (jsonb_typeof(record_data) = 'object'),

    constraint learning_records_data_id
        check (record_data ->> 'id' = id::text),

    constraint learning_records_data_type
        check (record_data ->> 'recordType' = record_type),

    constraint learning_records_data_item
        check (
            record_data -> 'item' ->> 'kind' = item_kind
            and record_data -> 'item' ->> 'id' = item_id
        ),

    constraint learning_records_data_activity
        check (
            (
                record_type = 'attempt'
                and record_data ->> 'activity' = activity
            )
            or
            (
                record_type = 'status-changed'
                and not (record_data ? 'activity')
            )
        ),

    constraint learning_records_data_occurred_at
        check (
            (record_data ->> 'occurredAt')::timestamptz = occurred_at
        )
);

-- ---------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------

create index learning_records_user_occurred_at_idx
    on public.learning_records (user_id, occurred_at desc);

create index learning_records_user_item_idx
    on public.learning_records (
        user_id,
        item_kind,
        item_id,
        occurred_at desc
    );

create index learning_records_user_activity_idx
    on public.learning_records (
        user_id,
        activity,
        occurred_at desc
    );

-- ---------------------------------------------------------
-- 5. Updated-at trigger
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 6. Automatically create profile and settings
-- when a new Auth user is created.
-- ---------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'display_name', ''),
            split_part(coalesce(new.email, ''), '@', 1)
        )
    );

    insert into public.user_settings (user_id)
    values (new.id);

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 7. Enable Row Level Security
-- ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.learning_records enable row level security;

-- ---------------------------------------------------------
-- 8. Profiles policies
-- ---------------------------------------------------------

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---------------------------------------------------------
-- 9. User settings policies
-- ---------------------------------------------------------

create policy "Users can read their own settings"
on public.user_settings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own settings"
on public.user_settings
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------
-- 10. Learning records policies
-- ---------------------------------------------------------

create policy "Users can read their own learning records"
on public.learning_records
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own learning records"
on public.learning_records
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------
-- 11. Explicit table privileges
-- ---------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_settings from anon, authenticated;
revoke all on public.learning_records from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, insert, update
on public.user_settings to authenticated;

grant select, insert
on public.learning_records to authenticated;
