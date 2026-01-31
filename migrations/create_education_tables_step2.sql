-- Step 2: Create indexes for class_sessions
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_deleted_at ON public.class_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_day_of_week ON public.class_sessions(day_of_week);

-- Verify
SELECT 'Indexes created successfully' as status;
