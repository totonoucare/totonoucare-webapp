// lib/radar_v1/copy.js

export function getSignalLabel(signal) {
  if (signal === 2) return "要警戒";
  if (signal === 1) return "注意";
  return "安定";
}

export function getTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") {
    return "気圧が下がる日";
  }
  if (mainTrigger === "pressure" && triggerDir === "up") {
    return "気圧が上がる日";
  }
  if (mainTrigger === "temp" && triggerDir === "down") {
    return "冷え込みやすい日";
  }
  if (mainTrigger === "temp" && triggerDir === "up") {
    return "気温が上がりやすい日";
  }
  if (mainTrigger === "humidity" && triggerDir === "up") {
    return "湿がこもりやすい日";
  }
  if (mainTrigger === "humidity" && triggerDir === "down") {
    return "乾燥しやすい日";
  }
  return "気象の変化がある日";
}

export function getTonightNote(main, dir, tone) {
  if (main === "pressure" && dir === "down") {
    return {
      title: "今夜の注意",
      body: tone?.startsWith("supportive")
        ? "夜更かしを避けて、詰め込みすぎない夜にしたい日です。首肩に力が入り続けないようにしておくと、明日の揺れに備えやすくなります。"
        : "詰め込みすぎず、呼吸が浅くなりすぎないように過ごしたい日です。",
    };
  }

  if (main === "pressure" && dir === "up") {
    return {
      title: "今夜の注意",
      body: "張りつめたまま過ごすより、少しゆるめて眠りに入りたい日です。力みを残さない意識が合います。",
    };
  }

  if (main === "temp" && dir === "down") {
    return {
      title: "今夜の注意",
      body: "首・お腹・足元を冷やしすぎないようにしたい日です。遅い時間の消耗や、眠る前の冷えをためない意識が合います。",
    };
  }

  if (main === "temp" && dir === "up") {
    return {
      title: "今夜の注意",
      body: "のぼせや詰まりをため込みすぎないように、遅い時間まで頑張りすぎない方が合う日です。",
    };
  }

  if (main === "humidity" && dir === "up") {
    return {
      title: "今夜の注意",
      body: "重い食事や甘いもの、冷たいものを重ねすぎない方が明日が軽くなりやすい日です。",
    };
  }

  if (main === "humidity" && dir === "down") {
    return {
      title: "今夜の注意",
      body: "乾きやすさが残りやすいので、冷やしすぎや夜更かしを重ねない方が合う日です。",
    };
  }

  return {
    title: "今夜の注意",
    body: "今日は少し整えてから休むと、明日のぶれを小さくしやすい日です。",
  };
}

export function getTomorrowFoodStrings(main, dir, peakStart) {
  let timing = "昼";
  if (peakStart !== null && peakStart < 9) timing = "朝";
  else if (peakStart !== null && peakStart < 15) timing = "昼";
  else timing = "間食";

  let focus = "整えやすい食事";
  let avoid = "食べすぎ・飲みすぎを重ねない";

  if (main === "temp" && dir === "down") {
    focus = "温かくて負担の軽いもの";
    avoid = "冷たい飲み物や冷たい食事を重ねない";
  } else if (main === "humidity" && dir === "up") {
    focus = "重さをためにくい軽めのもの";
    avoid = "甘いもの・乳っぽい重さ・冷たいものを重ねない";
  } else if (main === "pressure" && dir === "down") {
    focus = "詰まりを増やしにくい、やさしい食べ方";
    avoid = "食べる量と時間帯の無理を重ねない";
  } else if (main === "pressure" && dir === "up") {
    focus = "力みを増やしにくい、軽めの食べ方";
    avoid = "刺激の強いものや食べ急ぎを重ねない";
  } else if (main === "temp" && dir === "up") {
    focus = "こもりを増やしにくい軽めのもの";
    avoid = "辛いもの・脂っこいもの・詰め込み食いを重ねない";
  } else if (main === "humidity" && dir === "down") {
    focus = "乾きを強めにくい、やさしいもの";
    avoid = "辛すぎるもの・乾いたもの・水分不足を重ねない";
  }

  return { timing, focus, avoid };
}

export function getTomorrowCaution(symptom, main, dir) {
  if (symptom === "headache") {
    if (main === "pressure" && dir === "down") {
      return "朝の立ち上がりを急ぎすぎず、首肩の力みをためないようにしたい日です。";
    }
    if (main === "temp" && dir === "down") {
      return "冷えで首肩が固まりやすいので、冷気に当たり続けないようにしたい日です。";
    }
    if (main === "humidity" && dir === "up") {
      return "重さが頭にのぼりやすいので、食べすぎと長時間の前かがみを重ねすぎない方が合う日です。";
    }
    return "頭の重さをためないように、首肩の力みと詰め込みを重ねすぎない方が合う日です。";
  }

  if (symptom === "sleep") {
    return "刺激を重ねすぎず、夜に向けて少し早めに整える意識が合います。";
  }

  if (symptom === "mood") {
    return "詰め込みすぎるより、切り替えの余白を少し作る方が合う日です。";
  }

  if (symptom === "neck_shoulder") {
    return "同じ姿勢を続けすぎず、肩の力が抜けるタイミングをこまめに作りたい日です。";
  }

  if (symptom === "fatigue") {
    if (main === "temp" && dir === "down") {
      return "消耗を重ねすぎず、冷えとだるさをためない過ごし方が合う日です。";
    }
    if (main === "pressure" && dir === "down") {
      return "頑張りきるより、余力を残す配分の方が合う日です。";
    }
    return "無理に走り切るより、だるさがふくらみすぎないペース配分が合う日です。";
  }

  if (symptom === "low_back_pain") {
    if (main === "temp" && dir === "down") {
      return "腰まわりを冷やしすぎず、同じ姿勢で固まり続けない方が合う日です。";
    }
    if (main === "humidity" && dir === "up") {
      return "重だるさが腰に残りやすいので、長い座りっぱなしを避けたい日です。";
    }
    return "腰まわりの力みをためすぎず、立ち上がりや姿勢変換を急がない方が合う日です。";
  }

  if (symptom === "swelling") {
    return "重さをためすぎないように、冷たいもの・甘いもの・座りっぱなしを重ねすぎない方が合う日です。";
  }

  if (symptom === "dizziness") {
    if (main === "pressure" && dir === "down") {
      return "朝の動き出しを急がず、立ち上がりをなめらかにした方が合う日です。";
    }
    if (main === "temp" && dir === "down") {
      return "冷えと空腹を重ねすぎない方が、ふらつきを小さくしやすい日です。";
    }
    return "急な動き出しや詰め込みを避けて、余白を残して過ごした方が合う日です。";
  }

  return "無理に頑張りきるより、少し余白を残す方が合う日です。";
}

export function getReviewSchemaCopy() {
  return {
    condition_options: [
      { value: 0, label: "崩れた" },
      { value: 1, label: "ふつう" },
      { value: 2, label: "大丈夫だった" },
    ],
    prevent_options: [
      { value: 0, label: "できなかった" },
      { value: 1, label: "一部できた" },
      { value: 2, label: "できた" },
    ],
    action_tag_options: [
      { value: "tsubo_done", label: "ツボできた" },
      { value: "food_done", label: "食を意識できた" },
      { value: "avoid_done", label: "控えたいことを意識できた" },
    ],
  };
}
