-- Apply before deploying v7.79.107. No existing rows are changed.
-- Saving a completed check and choosing the forecast's constitution are separate.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.attach_diagnosis_v77990(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb)') IS NULL THEN
   RAISE EXCEPTION 'v7.79.90 atomic save migration is required before v7.79.107';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.save_diagnosis_v779107(
 p_event_id uuid, p_user_id uuid, p_expected_user_id uuid,
 p_expected_answers jsonb, p_expected_computed jsonb,
 p_event_payload jsonb, p_profile_payload jsonb,
 p_confirm_replace boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
 d public.diagnosis_events%ROWTYPE;
 e public.constitution_events%ROWTYPE;
 next_profile public.constitution_profiles%ROWTYPE;
 ce_id uuid;
 current_event_id uuid;
 current_source_id uuid;
 current_core_code text;
 has_profile boolean;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'User required' USING ERRCODE='22023'; END IF;
 -- Same account lock as v106; concurrent checks cannot both become the first.
 -- Never lock a profile row before the diagnosis row (body-line save ordering).
 PERFORM pg_advisory_xact_lock(hashtextextended('constitution-adoption:' || p_user_id::text, 0));
 SELECT p.latest_event_id,active_event.source_event_id,p.core_code
 INTO current_event_id,current_source_id,current_core_code
 FROM public.constitution_profiles p
 LEFT JOIN public.constitution_events active_event ON active_event.id=p.latest_event_id AND active_event.user_id=p.user_id
 WHERE p.user_id=p_user_id;
 has_profile := FOUND;

 IF NOT has_profile OR p_confirm_replace IS TRUE THEN
   -- Initial adoption / explicit choice use the existing atomic transaction.
   ce_id := public.attach_diagnosis_v77990(
     p_event_id,p_user_id,p_expected_user_id,p_expected_answers,p_expected_computed,
     p_event_payload,p_profile_payload);
   SELECT p.latest_event_id,active_event.source_event_id,p.core_code
   INTO current_event_id,current_source_id,current_core_code
   FROM public.constitution_profiles p
   JOIN public.constitution_events active_event ON active_event.id=p.latest_event_id AND active_event.user_id=p.user_id
   WHERE p.user_id=p_user_id;
 ELSE
   -- Archive only. In particular, retrying an already-current result must not
   -- reset an independently changed symptom focus or other profile fields.
   SELECT * INTO d FROM public.diagnosis_events WHERE id=p_event_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Diagnosis not found' USING ERRCODE='P0002'; END IF;
   IF d.user_id IS DISTINCT FROM p_expected_user_id
      OR d.answers::jsonb IS DISTINCT FROM p_expected_answers
      OR d.computed::jsonb IS DISTINCT FROM p_expected_computed THEN
     RAISE EXCEPTION 'Diagnosis changed; reload before saving' USING ERRCODE='40001';
   END IF;
   IF d.user_id IS NOT NULL AND d.user_id<>p_user_id THEN
     RAISE EXCEPTION 'Wrong owner' USING ERRCODE='42501';
   END IF;
   SELECT * INTO e FROM public.constitution_events WHERE source_event_id=p_event_id
     ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
   IF FOUND THEN
     IF e.user_id IS DISTINCT FROM p_user_id THEN
       RAISE EXCEPTION 'Wrong event owner' USING ERRCODE='42501';
     END IF;
     ce_id := e.id;
   END IF;
   e := jsonb_populate_record(e,p_event_payload || jsonb_build_object('user_id',p_user_id,'source_event_id',p_event_id));
   IF ce_id IS NULL THEN
     INSERT INTO public.constitution_events (user_id,symptom_focus,answers,thermo,resilience,is_mixed,
       qi,blood,fluid,primary_meridian,secondary_meridian,core_code,sub_labels,engine_version,
       source_event_id,notes,ai_explain_text,ai_explain_model,ai_explain_created_at)
     VALUES (e.user_id,e.symptom_focus,e.answers,e.thermo,e.resilience,e.is_mixed,
       e.qi,e.blood,e.fluid,e.primary_meridian,e.secondary_meridian,e.core_code,e.sub_labels,e.engine_version,
       e.source_event_id,e.notes,e.ai_explain_text,e.ai_explain_model,e.ai_explain_created_at)
     RETURNING id INTO ce_id;
   ELSE
     UPDATE public.constitution_events SET symptom_focus=e.symptom_focus,answers=e.answers,
       thermo=e.thermo,resilience=e.resilience,is_mixed=e.is_mixed,qi=e.qi,blood=e.blood,fluid=e.fluid,
       primary_meridian=e.primary_meridian,secondary_meridian=e.secondary_meridian,
       core_code=e.core_code,sub_labels=e.sub_labels,engine_version=e.engine_version,notes=e.notes,
       ai_explain_text=e.ai_explain_text,ai_explain_model=e.ai_explain_model,ai_explain_created_at=e.ai_explain_created_at
       WHERE id=ce_id;
   END IF;
   next_profile := jsonb_populate_record(NULL::public.constitution_profiles,p_profile_payload);
   UPDATE public.diagnosis_events SET user_id=p_user_id,answers=next_profile.answers,
     computed=next_profile.computed WHERE id=p_event_id;
   UPDATE public.diagnosis_guest_access SET claimed_at=now(),updated_at=now() WHERE event_id=p_event_id;
 END IF;

 RETURN jsonb_build_object(
   'constitution_event_id',ce_id,
   'current_event_id',current_event_id,
   'has_current_profile',true,
   'is_current',current_source_id IS NOT DISTINCT FROM p_event_id,
   'current_core_code',current_core_code);
END $$;
REVOKE ALL ON FUNCTION public.save_diagnosis_v779107(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_diagnosis_v779107(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
