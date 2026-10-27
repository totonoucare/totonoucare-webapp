-- v7.79.108: keep an existing forecast profile when archiving a new result.
-- Prerequisite: v107 application files and its save_diagnosis_v779107 RPC.
-- No existing rows, trigger registrations, or RPC permissions are changed.
BEGIN;

DO $prerequisites$
BEGIN
  IF to_regprocedure('public.save_diagnosis_v779107(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Apply the v7.79.107 save-history migration first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.constitution_events'::regclass
      AND tgname = 'trg_sync_constitution_profile'
      AND tgfoid = to_regprocedure('public.sync_constitution_profile_from_event()')
      AND tgtype = 5 AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected constitution profile AFTER INSERT trigger not found; review before applying';
  END IF;
END
$prerequisites$;

CREATE OR REPLACE FUNCTION public.sync_constitution_profile_from_event()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.constitution_profiles (
    user_id, symptom_focus, qi, blood, fluid, cold_heat, resilience,
    primary_meridian, secondary_meridian, answers, computed, version,
    created_at, updated_at, latest_event_id, thermo, is_mixed,
    core_code, sub_labels, engine_version
  )
  VALUES (
    NEW.user_id, coalesce(NEW.symptom_focus, 'fatigue'),
    NEW.qi, NEW.blood, NEW.fluid, NEW.thermo, NEW.resilience,
    NEW.primary_meridian, NEW.secondary_meridian, NEW.answers,
    jsonb_build_object(
      'source', 'trigger_sync', 'event_id', NEW.id,
      'core_code', NEW.core_code, 'sub_labels', NEW.sub_labels,
      'engine_version', NEW.engine_version
    ),
    'v2', now(), now(), NEW.id, NEW.thermo, NEW.is_mixed,
    NEW.core_code, NEW.sub_labels, coalesce(NEW.engine_version, 'v2')
  )
  -- Initial profile creation remains supported. Existing profiles stay intact.
  -- Explicit adoption is performed atomically by save_diagnosis_v779107.
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END
$function$;

COMMIT;

SELECT position(
  'ON CONFLICT (user_id) DO NOTHING'
  IN pg_get_functiondef('public.sync_constitution_profile_from_event()'::regprocedure)
) > 0 AS "v108適用済み";
