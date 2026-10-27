-- Apply before deploying v7.79.106. No existing rows are changed.
-- The v90 transaction continues to own diagnosis/profile/history/body-line writes.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.attach_diagnosis_v77990(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb)') IS NULL THEN
   RAISE EXCEPTION 'v7.79.90 atomic save migration is required before v7.79.106';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.attach_diagnosis_v779106(
 p_event_id uuid, p_user_id uuid, p_expected_user_id uuid,
 p_expected_answers jsonb, p_expected_computed jsonb,
 p_event_payload jsonb, p_profile_payload jsonb,
 p_confirm_replace boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
 current_source_id uuid;
 has_profile boolean;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'User required' USING ERRCODE='22023'; END IF;
 -- Serialize profile adoption for one account, including two first checks in tabs.
 -- Do not lock a profile row before the v90 diagnosis-row lock (body-line safety).
 PERFORM pg_advisory_xact_lock(hashtextextended('constitution-adoption:' || p_user_id::text, 0));
 SELECT e.source_event_id INTO current_source_id
 FROM public.constitution_profiles p
 LEFT JOIN public.constitution_events e ON e.id=p.latest_event_id AND e.user_id=p.user_id
 WHERE p.user_id=p_user_id;
 has_profile := FOUND;
 IF has_profile AND current_source_id IS DISTINCT FROM p_event_id
    AND p_confirm_replace IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'PROFILE_UPDATE_CONFIRMATION_REQUIRED' USING ERRCODE='P0106';
 END IF;
 RETURN public.attach_diagnosis_v77990(
   p_event_id,p_user_id,p_expected_user_id,p_expected_answers,p_expected_computed,
   p_event_payload,p_profile_payload);
END $$;
REVOKE ALL ON FUNCTION public.attach_diagnosis_v779106(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_diagnosis_v779106(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
