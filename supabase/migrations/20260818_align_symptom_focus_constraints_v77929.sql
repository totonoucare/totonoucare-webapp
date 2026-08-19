-- v7.79.29
-- Keep database constraints aligned with the nine symptom choices exposed by
-- the diagnosis and settings screens. This is an additive relaxation only.

begin;

alter table public.constitution_events
  drop constraint if exists constitution_events_symptom_focus_check;

alter table public.constitution_events
  add constraint constitution_events_symptom_focus_check
  check (
    symptom_focus is null or symptom_focus = any (
      array[
        'fatigue'::text,
        'sleep'::text,
        'digestion'::text,
        'neck_shoulder'::text,
        'low_back_pain'::text,
        'swelling'::text,
        'headache'::text,
        'dizziness'::text,
        'mood'::text
      ]
    )
  ) not valid;

alter table public.constitution_events
  validate constraint constitution_events_symptom_focus_check;

alter table public.profiles
  drop constraint if exists profiles_symptom_focus_default_check;

alter table public.profiles
  add constraint profiles_symptom_focus_default_check
  check (
    symptom_focus_default is null or symptom_focus_default = any (
      array[
        'fatigue'::text,
        'sleep'::text,
        'digestion'::text,
        'neck_shoulder'::text,
        'low_back_pain'::text,
        'swelling'::text,
        'headache'::text,
        'dizziness'::text,
        'mood'::text
      ]
    )
  ) not valid;

alter table public.profiles
  validate constraint profiles_symptom_focus_default_check;

commit;
