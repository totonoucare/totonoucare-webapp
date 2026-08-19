import { getQuestions } from "./questions.js";

const MAX_ANSWER_JSON_LENGTH = 16_000;
const MAX_INPUT_KEYS = 32;

function invalid(message, code = "INVALID_DIAGNOSIS_ANSWERS") {
  return { ok: false, error: message, code };
}

/**
 * Treat browser answers as untrusted input. Only the currently visible
 * questions and their declared option values are passed to the scoring code.
 */
export function validateDiagnosisAnswers(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return invalid("回答データの形式が正しくありません");
  }

  let serialized = "";
  try {
    serialized = JSON.stringify(input);
  } catch {
    return invalid("回答データを読み取れませんでした");
  }

  if (serialized.length > MAX_ANSWER_JSON_LENGTH || Object.keys(input).length > MAX_INPUT_KEYS) {
    return invalid("回答データが大きすぎます", "DIAGNOSIS_ANSWERS_TOO_LARGE");
  }

  const visibleQuestions = getQuestions(input);
  const answers = {};

  for (const question of visibleQuestions) {
    const allowed = new Set((question.options || []).map((option) => option.value));
    const raw = input[question.key];

    if (question.type === "multi") {
      if (!Array.isArray(raw) || raw.length === 0) {
        return invalid("未回答の質問があります");
      }

      const values = [...new Set(raw)];
      const max = Math.max(1, Number(question.max) || 1);
      if (
        values.length !== raw.length ||
        values.length > max ||
        values.some((value) => typeof value !== "string" || !allowed.has(value)) ||
        (values.includes("none") && values.length > 1)
      ) {
        return invalid("選択された回答が正しくありません");
      }

      answers[question.key] = values;
      continue;
    }

    if (typeof raw !== "string" || !allowed.has(raw)) {
      return invalid(raw == null || raw === "" ? "未回答の質問があります" : "選択された回答が正しくありません");
    }

    answers[question.key] = raw;
  }

  return { ok: true, answers };
}
