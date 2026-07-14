function conditionLevel(row) {
  const raw = row?.review?.condition_level;
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function signalLevel(row) {
  const value = Number(row?.forecast?.signal);
  return Number.isFinite(value) ? value : 0;
}

function careCount(row) {
  return Array.isArray(row?.care_actions) ? row.care_actions.length : 0;
}

/**
 * condition_level is stored as 0=×, 1=△, 2=○.
 * Forecast signal is separate: 0=安定, 1=いたわり, 2=守り.
 */
export function buildLiveSupportGreeting({ todayRow = null, yesterdayRow = null, hour = 12 } = {}) {
  const yesterdayCondition = conditionLevel(yesterdayRow);
  const yesterdayCareCount = careCount(yesterdayRow);
  const todaySignal = signalLevel(todayRow);
  const todayCareCount = careCount(todayRow);

  if (yesterdayCondition === 0) {
    return "昨日はつらい記録でしたね。その後、少しでも変化はありましたか？まとまっていなくても大丈夫です。";
  }
  if (yesterdayCondition === 1) {
    return "昨日は少しゆらいだ記録でしたね。今日はどんな調子でしょう。気になることから聞かせてください。";
  }
  if (todayCareCount > 0) {
    return "今日は対策ケアを取り入れられたんですね。やってみた後の調子や、まだ気になることはありますか？";
  }
  if (todaySignal === 2) {
    return "今日は守りの予報です。頑張る前に、今つらいことや気になっていることを聞かせてください。";
  }
  if (todaySignal === 1) {
    return "今日は少しゆらぎやすい日です。無理する前に、今の調子を一緒に整理しませんか？";
  }
  if (yesterdayCondition === 2 && yesterdayCareCount > 0) {
    return "昨日はケアを取り入れながら、穏やかに過ごせたんですね。今日の調子はどうですか？";
  }
  if (yesterdayCondition === 2) {
    return "昨日は穏やかに過ごせたんですね。今日は何か気になる変化がありますか？";
  }
  if (Number(hour) >= 20 || Number(hour) < 5) {
    return "今日もお疲れさまでした。寝る前に、今夜気になっていることを少し話していきませんか？";
  }
  return "今の調子はどうですか？小さな違和感でも、うまくまとまっていなくても大丈夫です。";
}
