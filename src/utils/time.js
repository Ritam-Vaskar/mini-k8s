import cronParser from "cron-parser";

export function computeNextRunAt(input, from) {
  if (input.type === "once") {
    return input.runAt ? new Date(input.runAt) : new Date(from);
  }
  if (input.type === "interval") {
    return new Date(from.getTime() + input.seconds * 1000);
  }

  const interval = cronParser.parseExpression(input.cron, { currentDate: from });
  return interval.next().toDate();
}
