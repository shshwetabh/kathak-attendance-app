-- Kathak Dance Class Database Schema for Supabase PostgreSQL

-- 1. Create Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    schedule_days TEXT NOT NULL, -- e.g. "Tue, Thu, Sat"
    timing TEXT NOT NULL,        -- e.g. "5:00 PM - 6:30 PM"
    monthly_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Default 2 Batches (Kids Batch & Adults Batch)
INSERT INTO public.batches (name, schedule_days, timing, monthly_fee)
VALUES 
    ('Kids Batch', 'Tue, Thu, Sat', '5:00 PM - 6:30 PM', 2500),
    ('Adults Batch', 'Wed, Fri, Sun', '6:30 PM - 8:00 PM', 3000)
ON CONFLICT DO NOTHING;

-- 2. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    parent_phone TEXT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attendance_date DATE NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_daily_student_attendance UNIQUE (attendance_date, student_id)
);

-- 4. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- e.g. "2026-09"
    amount_due NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'partial')),
    payment_date DATE,
    payment_mode TEXT, -- e.g. 'UPI', 'Cash', 'Bank Transfer'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_monthly_student_payment UNIQUE (student_id, month_year)
);

-- Enable Row Level Security (RLS) and permit anonymous access for app usage
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to batches" ON public.batches FOR ALL USING (true);
CREATE POLICY "Allow public full access to students" ON public.students FOR ALL USING (true);
CREATE POLICY "Allow public full access to attendance" ON public.attendance FOR ALL USING (true);
CREATE POLICY "Allow public full access to payments" ON public.payments FOR ALL USING (true);
