-- Apply BEFORE deploying v7.79.90. No existing rows are changed.
-- Service-role only: API routes authenticate the owner / guest token first.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_diagnosis_body_lines_v77990(
 p_event_id uuid, p_expected_user_id uuid, p_expected_answers jsonb,
 p_expected_computed jsonb, p_primary text, p_secondary text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
 d public.diagnosis_events%ROWTYPE;
 p public.constitution_profiles%ROWTYPE;
 ce public.constitution_events%ROWTYPE;
 line_map jsonb := '{"A":"kidney_bl","B":"spleen_st","C":"liver_gb","D":"heart_si","E":"lung_li","F":"pc_sj"}'::jsonb;
 primary_line text;
 secondary_line text;
 answer_patch jsonb;
 computed_patch jsonb;
 profile_updated boolean := false;
BEGIN
 IF p_primary IS NULL OR p_secondary IS NULL
    OR p_primary NOT IN ('A','B','C','D','E','F','none')
    OR p_secondary NOT IN ('A','B','C','D','E','F','none') THEN
   RAISE EXCEPTION 'Invalid body line' USING ERRCODE='22023';
 END IF;
 IF p_primary='none' OR p_primary=p_secondary THEN p_secondary := 'none'; END IF;
 SELECT * INTO d FROM public.diagnosis_events WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Diagnosis not found' USING ERRCODE='P0002'; END IF;
 IF d.user_id IS DISTINCT FROM p_expected_user_id
    OR d.answers::jsonb IS DISTINCT FROM p_expected_answers
    OR d.computed::jsonb IS DISTINCT FROM p_expected_computed THEN
   RAISE EXCEPTION 'Diagnosis changed; reload before saving' USING ERRCODE='40001';
 END IF;
 IF jsonb_typeof(d.answers::jsonb) IS DISTINCT FROM 'object'
    OR jsonb_typeof(d.computed::jsonb) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Diagnosis requires review' USING ERRCODE='22023';
 END IF;
 primary_line := line_map->>p_primary;
 secondary_line := line_map->>p_secondary;
 answer_patch := jsonb_build_object('body_line_primary',p_primary,'body_line_secondary',p_secondary);
 computed_patch := jsonb_build_object('primary_meridian',primary_line,'secondary_meridian',secondary_line);
 -- Always lock in diagnosis -> constitution events -> profile order, as attach does.
 FOR ce IN SELECT * FROM public.constitution_events
   WHERE source_event_id=p_event_id ORDER BY id FOR UPDATE
 LOOP
   IF ce.user_id IS DISTINCT FROM d.user_id OR d.user_id IS NULL THEN
     RAISE EXCEPTION 'Diagnosis attachment changed' USING ERRCODE='40001';
   END IF;
   IF (ce.answers::jsonb - 'body_line_primary' - 'body_line_secondary')
      IS DISTINCT FROM (d.answers::jsonb - 'body_line_primary' - 'body_line_secondary') THEN
     RAISE EXCEPTION 'Linked diagnosis answers differ; review required' USING ERRCODE='22023';
   END IF;
 END LOOP;
 IF d.user_id IS NOT NULL THEN
   SELECT * INTO p FROM public.constitution_profiles WHERE user_id=d.user_id FOR UPDATE;
   IF FOUND AND EXISTS (SELECT 1 FROM public.constitution_events e
       WHERE e.id=p.latest_event_id AND e.source_event_id=p_event_id AND e.user_id=d.user_id) THEN
     IF (p.answers::jsonb - 'body_line_primary' - 'body_line_secondary')
        IS DISTINCT FROM (d.answers::jsonb - 'body_line_primary' - 'body_line_secondary')
        OR jsonb_typeof(p.computed::jsonb) IS DISTINCT FROM 'object' THEN
       RAISE EXCEPTION 'Current profile requires review' USING ERRCODE='22023';
     END IF;
     -- Populate the real row type: organs may be text[] or jsonb in deployed schemas.
     p := jsonb_populate_record(p,jsonb_build_object(
       'answers',p.answers::jsonb || answer_patch,
       'computed',p.computed::jsonb || computed_patch,
       'primary_meridian',primary_line,'secondary_meridian',secondary_line,
       'organs',CASE WHEN primary_line IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(primary_line) END));
     UPDATE public.constitution_profiles SET answers=p.answers,computed=p.computed,
       primary_meridian=p.primary_meridian,secondary_meridian=p.secondary_meridian,organs=p.organs
       WHERE user_id=d.user_id AND latest_event_id=p.latest_event_id;
     profile_updated := true;
   END IF;
 END IF;
 UPDATE public.constitution_events SET
   answers=answers::jsonb || answer_patch,
   primary_meridian=primary_line,secondary_meridian=secondary_line
   WHERE source_event_id=p_event_id AND user_id=d.user_id;
 UPDATE public.diagnosis_events SET answers=d.answers::jsonb || answer_patch,
   computed=d.computed::jsonb || computed_patch WHERE id=p_event_id
   RETURNING * INTO d;
 RETURN jsonb_build_object('answers',d.answers,'computed',d.computed,'profile_updated',profile_updated);
END $$;
REVOKE ALL ON FUNCTION public.save_diagnosis_body_lines_v77990(uuid,uuid,jsonb,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_diagnosis_body_lines_v77990(uuid,uuid,jsonb,jsonb,text,text) TO service_role;

-- Attachment shares the diagnosis lock. A concurrent line save/claim either
-- completes atomically or returns a conflict; stale answers never overwrite it.
CREATE OR REPLACE FUNCTION public.attach_diagnosis_v77990(
 p_event_id uuid, p_user_id uuid, p_expected_user_id uuid,
 p_expected_answers jsonb, p_expected_computed jsonb,
 p_event_payload jsonb, p_profile_payload jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
 d public.diagnosis_events%ROWTYPE;
 e public.constitution_events%ROWTYPE;
 p public.constitution_profiles%ROWTYPE;
 ce_id uuid;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'User required' USING ERRCODE='22023'; END IF;
 SELECT * INTO d FROM public.diagnosis_events WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Diagnosis not found' USING ERRCODE='P0002'; END IF;
 IF d.user_id IS DISTINCT FROM p_expected_user_id
    OR d.answers::jsonb IS DISTINCT FROM p_expected_answers
    OR d.computed::jsonb IS DISTINCT FROM p_expected_computed THEN
   RAISE EXCEPTION 'Diagnosis changed; reload before attaching' USING ERRCODE='40001';
 END IF;
 IF d.user_id IS NOT NULL AND d.user_id<>p_user_id THEN
   RAISE EXCEPTION 'Wrong owner' USING ERRCODE='42501';
 END IF;
 SELECT * INTO e FROM public.constitution_events WHERE source_event_id=p_event_id
   ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
   IF e.user_id IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Wrong event owner' USING ERRCODE='42501'; END IF;
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
 p := jsonb_populate_record(NULL::public.constitution_profiles,
   p_profile_payload || jsonb_build_object('user_id',p_user_id,'latest_event_id',ce_id));
 INSERT INTO public.constitution_profiles (user_id,latest_event_id,symptom_focus,active_symptom_focus,
   qi,blood,fluid,cold_heat,resilience,primary_meridian,secondary_meridian,organs,answers,computed,
   thermo,is_mixed,core_code,sub_labels,engine_version,version)
 VALUES (p.user_id,p.latest_event_id,p.symptom_focus,p.active_symptom_focus,p.qi,p.blood,p.fluid,
   p.cold_heat,p.resilience,p.primary_meridian,p.secondary_meridian,p.organs,p.answers,p.computed,
   p.thermo,p.is_mixed,p.core_code,p.sub_labels,p.engine_version,p.version)
 ON CONFLICT (user_id) DO UPDATE SET latest_event_id=EXCLUDED.latest_event_id,
   symptom_focus=EXCLUDED.symptom_focus,active_symptom_focus=EXCLUDED.active_symptom_focus,
   qi=EXCLUDED.qi,blood=EXCLUDED.blood,fluid=EXCLUDED.fluid,cold_heat=EXCLUDED.cold_heat,
   resilience=EXCLUDED.resilience,primary_meridian=EXCLUDED.primary_meridian,
   secondary_meridian=EXCLUDED.secondary_meridian,organs=EXCLUDED.organs,
   answers=EXCLUDED.answers,computed=EXCLUDED.computed,thermo=EXCLUDED.thermo,
   is_mixed=EXCLUDED.is_mixed,core_code=EXCLUDED.core_code,sub_labels=EXCLUDED.sub_labels,
   engine_version=EXCLUDED.engine_version,version=EXCLUDED.version;
 UPDATE public.diagnosis_events SET user_id=p_user_id,answers=p.answers,computed=p.computed WHERE id=p_event_id;
 UPDATE public.diagnosis_guest_access SET claimed_at=now(),updated_at=now() WHERE event_id=p_event_id;
 RETURN ce_id;
END $$;
REVOKE ALL ON FUNCTION public.attach_diagnosis_v77990(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_diagnosis_v77990(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) TO service_role;
COMMIT;
