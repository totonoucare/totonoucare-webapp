-- One request for this check’s constitution explanation, independent of account-wide AI consent.
ALTER TABLE public.diagnosis_events
  ADD COLUMN IF NOT EXISTS result_ai_requested_at timestamptz;

NOTIFY pgrst, 'reload schema';
