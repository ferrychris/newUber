-- Create order_status_history table
do $$
begin
    if not exists (select 1 from pg_tables where tablename = 'order_status_history') then
        create table public.order_status_history (
            id uuid primary key default gen_random_uuid(),
            order_id uuid not null references public.orders(id) on delete cascade,
            old_status text,
            new_status text not null,
            created_at timestamp with time zone default now(),
            updated_by uuid references auth.users(id) on delete set null
        );

        -- Add indexes for better query performance
        create index idx_order_status_history_order_id on public.order_status_history(order_id);
        create index idx_order_status_history_created_at on public.order_status_history(created_at);
        create index idx_order_status_history_updated_by on public.order_status_history(updated_by);

        -- Enable RLS
        alter table public.order_status_history enable row level security;

        -- Policies
        -- Users can view status history for their own orders
        create policy "Users can view their order status history"
            on public.order_status_history
            for select
            using (
                auth.uid() = (select user_id from public.orders where id = order_id)
                or 
                auth.uid() = updated_by
                or
                exists (
                    select 1 from public.orders 
                    where id = order_id and driver_id = auth.uid()
                )
            );

        -- Admins can view all status history
        create policy "Admins can view all order status history"
            on public.order_status_history
            for select
            using (
                exists (
                    select 1 from public.profiles 
                    where id = auth.uid() and is_admin = true
                )
            );

        -- Log the creation
        raise notice 'Created order_status_history table';
    else
        raise notice 'order_status_history table already exists, skipping';
    end if;
end $$;
