export type AutoReplyRule =
  | { type: "exact"; pattern: string; reply: string }
  | { type: "contains"; pattern: string; reply: string }
  | { type: "regex"; pattern: string; reply: string };

const cooldowns = new Map<string, number>();

function parseTime(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const hour = Number(hoursText);
  const minute = Number(minutesText);
  return {
    hour: Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : 0,
    minute: Number.isFinite(minute) && minute >= 0 && minute < 60 ? minute : 0,
  };
}

function isWithinQuietWindow(start: string, end: string) {
  const now = new Date();
  const { hour: startHour, minute: startMinute } = parseTime(start);
  const { hour: endHour, minute: endMinute } = parseTime(end);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function matchesRule(text: string, rule: AutoReplyRule) {
  const lower = text.toLowerCase();
  if (rule.type === "exact") {
    return lower === rule.pattern.toLowerCase();
  }

  if (rule.type === "contains") {
    return lower.includes(rule.pattern.toLowerCase());
  }

  if (rule.type === "regex") {
    return new RegExp(rule.pattern, "i").test(text);
  }

  return false;
}

export function getAutoReply(
  text: string,
  jid: string,
  rules: AutoReplyRule[],
  quietStart: string,
  quietEnd: string,
  cooldownSeconds: number
): string | undefined {
  if (isWithinQuietWindow(quietStart, quietEnd)) {
    return undefined;
  }

  const lastReply = cooldowns.get(jid) ?? 0;
  if (Date.now() - lastReply < cooldownSeconds * 1000) {
    return undefined;
  }

  for (const rule of rules) {
    if (matchesRule(text, rule)) {
      cooldowns.set(jid, Date.now());
      return rule.reply;
    }
  }

  return undefined;
}
