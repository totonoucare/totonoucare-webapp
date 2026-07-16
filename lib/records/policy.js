/**
 * 記録・Ekken運用ポリシー
 *
 * このファイルは、公開期間・利用上限・利用モデルなどの「秘密ではない運用値」を
 * 一か所で管理するための設定です。Netlify / Vercel の同名環境変数は参照しません。
 * 変更時はこのファイルを修正してデプロイします。
 *
 * APIキー、Supabase service role keyなどのSecretは、引き続き環境変数で管理します。
 */
export const RECORDS_POLICY = Object.freeze({
  recordsEnabled: true,
  editLookbackDays: 7,

  ai: Object.freeze({
    enabled: true,

    beta: Object.freeze({
      enabled: true,
      startsAt: "2026-07-15",
      endsAt: "2026-08-31",
    }),

    entitlementProducts: Object.freeze([
      "radar_ai",
      "radar_subscription",
    ]),

    limits: Object.freeze({
      monthlyChat: 100,
      dailyAnalysis: 1,
      perMinute: 6,
    }),

    models: Object.freeze({
      analysis: "gpt-5.6-luna",
      periodChat: "gpt-5.6-luna",
      liveChat: "gpt-5.6-luna",
    }),

    estimatedPricingUsdPerMillionTokens: Object.freeze({
      input: 1,
      output: 6,
    }),
  }),
});

export const RECORDS_ENABLED = RECORDS_POLICY.recordsEnabled;
export const RECORDS_EDIT_LOOKBACK_DAYS = RECORDS_POLICY.editLookbackDays;

export const RECORDS_AI_ENABLED = RECORDS_POLICY.ai.enabled;
export const RECORDS_AI_BETA = RECORDS_POLICY.ai.beta;
export const RECORDS_AI_ENTITLEMENT_PRODUCTS = RECORDS_POLICY.ai.entitlementProducts;

export const RECORDS_AI_MONTHLY_CHAT_LIMIT = RECORDS_POLICY.ai.limits.monthlyChat;
export const RECORDS_AI_DAILY_ANALYSIS_LIMIT = RECORDS_POLICY.ai.limits.dailyAnalysis;
export const RECORDS_AI_PER_MINUTE_LIMIT = RECORDS_POLICY.ai.limits.perMinute;

export const OPENAI_RECORDS_ANALYSIS_MODEL = RECORDS_POLICY.ai.models.analysis;
export const OPENAI_RECORDS_CHAT_MODEL = RECORDS_POLICY.ai.models.periodChat;
export const OPENAI_RECORDS_LIVE_CHAT_MODEL = RECORDS_POLICY.ai.models.liveChat;

export const OPENAI_RECORDS_INPUT_USD_PER_MTOK =
  RECORDS_POLICY.ai.estimatedPricingUsdPerMillionTokens.input;
export const OPENAI_RECORDS_OUTPUT_USD_PER_MTOK =
  RECORDS_POLICY.ai.estimatedPricingUsdPerMillionTokens.output;
