-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid REFERENCES auth.users on delete cascade not null primary key,
  username text unique,
  email text unique,
  full_name text,
  employee_number text,
  role text default 'user',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Policy: Admin can view all profiles (assuming admin role check or service key bypass)
-- Note: Service Role bypasses RLS automatically.
-- If we want generic read access for app logic that isn't service role:
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Policy: Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
