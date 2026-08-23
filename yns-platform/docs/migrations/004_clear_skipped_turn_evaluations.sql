BEGIN;

-- Reports built from hallucinated evaluations must be regenerated from the
-- remaining answered turns.
DELETE FROM public.session_reports AS report
USING public.interview_turns AS turn
WHERE report.session_id = turn.session_id
  AND NULLIF(BTRIM(turn.answer_text), '') IS NULL
  AND turn.evaluation IS NOT NULL;

UPDATE public.interview_turns
SET evaluation = NULL
WHERE NULLIF(BTRIM(answer_text), '') IS NULL
  AND evaluation IS NOT NULL;

COMMIT;
