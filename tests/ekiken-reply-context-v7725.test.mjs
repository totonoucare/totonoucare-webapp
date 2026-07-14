import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  conversationMessageForAi,
  normalizeReplyToFollowUp,
  replyContextForAssistantMessage,
  verifiedReplyToFollowUp,
} from "../lib/records/replyContext.js";

test("follow-up reply context keeps question and selected answer as one verified pair", () => {
  const followUp = {
    kind: "care_choice",
    question: "今の状態で、いちばん取り入れやすそうなのはどちらですか？",
    options: ["このまま休む", "起きてから2〜3分だけ歩く"],
    date: "2026-07-15",
  };
  const candidate = replyContextForAssistantMessage(followUp, "assistant-123", "このまま休む");
  const verified = verifiedReplyToFollowUp(candidate, {
    id: "assistant-123",
    role: "assistant",
    follow_up: followUp,
  });
  assert.deepEqual(verified, {
    assistant_message_id: "assistant-123",
    question: followUp.question,
    selected_option: "このまま休む",
    kind: "care_choice",
    date: "2026-07-15",
  });
});

test("reply context cannot claim an unrelated assistant question", () => {
  const candidate = normalizeReplyToFollowUp({
    assistant_message_id: "assistant-123",
    question: "別の質問",
    selected_option: "このまま休む",
  });
  const verified = verifiedReplyToFollowUp(candidate, {
    id: "assistant-123",
    role: "assistant",
    follow_up: {
      kind: "care_choice",
      question: "今の状態で、いちばん取り入れやすそうなのはどちらですか？",
      options: ["このまま休む"],
      date: "",
    },
  });
  assert.equal(verified, null);
});

test("AI conversation receives a natural question-answer context instead of guessing", () => {
  const row = {
    role: "user",
    content: "このまま休む",
    metadata: {
      reply_to_follow_up: {
        assistant_message_id: "assistant-123",
        question: "今の状態で、いちばん取り入れやすそうなのはどちらですか？",
        selected_option: "このまま休む",
      },
    },
  };
  const message = conversationMessageForAi(row);
  assert.equal(message.reply_to_follow_up.question, row.metadata.reply_to_follow_up.question);
  assert.equal(message.reply_to_follow_up.selected_option, "このまま休む");
  assert.match(message.natural_context, /Ekikenの確認/);
  assert.match(message.natural_context, /このまま休む/);
});

test("both chat UIs keep the question visible with the user's answer", async () => {
  const livePanel = await readFile(new URL("../components/records/LiveSupportPanel.jsx", import.meta.url), "utf8");
  const analysisPanel = await readFile(new URL("../components/records/AiAnalysisPanel.jsx", import.meta.url), "utf8");
  const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
  const chatRoute = await readFile(new URL("../app/api/records/chat/route.js", import.meta.url), "utf8");
  assert.match(livePanel, /Ekikenからの確認/);
  assert.match(livePanel, /reply_to_follow_up: replyContext/);
  assert.match(analysisPanel, /Ekikenからの確認/);
  assert.match(analysisPanel, /reply_to_follow_up: replyContext/);
  assert.match(liveRoute, /replyToFollowUpFromMetadata/);
  assert.match(chatRoute, /conversationMessageForAi/);
});

test("period review history also loads the newest 100 messages in chronological order", async () => {
  const threadsRoute = await readFile(new URL("../app/api/records/threads/route.js", import.meta.url), "utf8");
  assert.match(threadsRoute, /order\("created_at", \{ ascending: false \}\)/);
  assert.match(threadsRoute, /chronologicalFromNewest\(messages \|\| \[\], 100\)/);
});
