create table if not exists public.messages (
  id uuid not null default gen_random_uuid(),
  sender_id uuid null,
  receiver_id uuid null,
  message text not null,
  created_at timestamp without time zone null default now(),
  order_id uuid null,
  read boolean null default false,
  constraint messages_pkey primary key (id),
  constraint messages_receiver_id_fkey foreign key (receiver_id) references auth.users (id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id) references auth.users (id) on delete cascade
);

-- Add RLS policies
alter table public.messages enable row level security;

create policy "Users can read their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can update messages they received"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
