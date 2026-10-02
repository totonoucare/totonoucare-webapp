-- Optional repair for the TWO profiles confirmed by the 2026-10-01 audit.
-- Apply after the v7.79.90 migration and app deployment.
-- Changes organs ONLY. No scoring/answers/line/type/forecast/care rewrite.
-- Targets must still have the same latest event, source diagnosis and primary line.
-- Rows changed since the audit are skipped; inspect the returned report.
BEGIN;
CREATE TEMP TABLE organs_repair_result(user_hash text,primary_meridian text,organs jsonb) ON COMMIT DROP;
DO $$
DECLARE p public.constitution_profiles%ROWTYPE;
BEGIN
 FOR p IN
   SELECT cp.* FROM public.constitution_profiles cp
   JOIN auth.users u ON u.id=cp.user_id
   JOIN public.constitution_events ce ON ce.id=cp.latest_event_id AND ce.user_id=cp.user_id
   JOIN public.diagnosis_events d ON d.id=ce.source_event_id AND d.user_id=cp.user_id
   JOIN (VALUES
     ('6c71a627939147954a93c7b612c4f003','lung_li','33044886-f776-40b0-a8eb-f3b70c2cd974'::uuid,'e2504f24-b181-4836-9cb1-d36d72b6139d'::uuid),
     ('746ed3a03a7a10b0feb6a108d44cfc4a','kidney_bl','9c5c439c-32c9-4a47-a6a1-5e1676a97ea9'::uuid,'b77a44cd-b34e-4a19-a73b-570f8155833c'::uuid)
   ) AS target(user_hash,line,event_id,diagnosis_id)
     ON target.user_hash=md5('movement-audit:'||cp.user_id::text)
     AND cp.primary_meridian=target.line AND ce.id=target.event_id AND d.id=target.diagnosis_id
   WHERE u.created_at >= TIMESTAMPTZ '2026-09-25 00:00:00+09'
     AND to_jsonb(cp.organs)='[]'::jsonb
     AND cp.computed::jsonb->>'primary_meridian'=cp.primary_meridian
     AND cp.answers::jsonb=d.answers::jsonb AND cp.answers::jsonb=ce.answers::jsonb
     AND cp.computed::jsonb=d.computed::jsonb
     AND cp.core_code=cp.computed::jsonb->>'core_code'
     AND to_jsonb(cp.sub_labels)=cp.computed::jsonb->'sub_labels'
   FOR UPDATE OF cp
 LOOP
   p := jsonb_populate_record(p,jsonb_build_object('organs',jsonb_build_array(p.primary_meridian)));
   UPDATE public.constitution_profiles SET organs=p.organs
     WHERE user_id=p.user_id AND latest_event_id=p.latest_event_id;
   INSERT INTO organs_repair_result VALUES(md5('movement-audit:'||p.user_id::text),p.primary_meridian,to_jsonb(p.organs));
 END LOOP;
END $$;
SELECT count(*) AS repaired_profiles,coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) AS repaired
FROM organs_repair_result r;
COMMIT;
-- Expected first run: up to 2 (unchanged audited rows). Repeat run: 0.
-- 0 may also mean already fixed by the new save path, or latest diagnosis changed.
-- Re-run burden-line-audit-new-users.sql afterwards. Do not broaden this WHERE clause.
