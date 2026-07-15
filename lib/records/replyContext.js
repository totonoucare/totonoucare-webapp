function cleanText(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

export function normalizeReplyToFollowUp(value) {
  if (!value || typeof value !== "object") return null;
  const question = cleanText(value.question, 180);
  const assistantMessageId = cleanText(value.assistant_message_id, 100);
  if (!question || !assistantMessageId) return null;
  return {
    assistant_message_id: assistantMessageId,
    question,
    selected_option: cleanText(value.selected_option, 80),
    kind: cleanText(value.kind, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(value.date || "")) ? String(value.date) : "",
  };
}

export function replyToFollowUpFromMetadata(metadata) {
  return normalizeReplyToFollowUp(metadata?.reply_to_follow_up);
}

export function replyContextForAssistantMessage(followUp, assistantMessageId, selectedOption = "") {
  return normalizeReplyToFollowUp({
    assistant_message_id: assistantMessageId,
    question: followUp?.question,
    selected_option: selectedOption,
    kind: followUp?.kind,
    date: followUp?.date,
  });
}

export function conversationMessageForAi(row) {
  const replyToFollowUp = replyToFollowUpFromMetadata(row?.metadata);
  if (!replyToFollowUp) {
    return { role: row.role, content: row.content };
  }
  return {
    role: row.role,
    content: row.content,
    reply_to_follow_up: {
      question: replyToFollowUp.question,
      selected_option: replyToFollowUp.selected_option,
      assistant_message_id: replyToFollowUp.assistant_message_id,
    },
    natural_context: `Ekkenの確認「${replyToFollowUp.question}」への回答：${row.content}`,
  };
}

export function verifiedReplyToFollowUp(candidate, assistantMessage) {
  const normalized = normalizeReplyToFollowUp(candidate);
  if (!normalized || !assistantMessage || assistantMessage.role !== "assistant") return null;
  if (String(assistantMessage.id || "") !== normalized.assistant_message_id) return null;

  const followUp = assistantMessage.follow_up && typeof assistantMessage.follow_up === "object"
    ? assistantMessage.follow_up
    : null;
  const question = cleanText(followUp?.question, 180);
  if (!question || question !== normalized.question) return null;

  const options = Array.isArray(followUp?.options)
    ? followUp.options.map((item) => cleanText(item, 80)).filter(Boolean)
    : [];
  const selectedOption = normalized.selected_option && options.includes(normalized.selected_option)
    ? normalized.selected_option
    : "";

  return {
    assistant_message_id: normalized.assistant_message_id,
    question,
    selected_option: selectedOption,
    kind: cleanText(followUp?.kind, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(followUp?.date || "")) ? String(followUp.date) : "",
  };
}
