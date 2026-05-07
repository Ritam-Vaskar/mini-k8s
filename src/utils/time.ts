import cronParser from "cron-parser";

export type ScheduleInput =
  | { type: "cron"; cron: string }
  | { type: "interval"; seconds: number }
  | { type: "once"; runAt?: Date | null };

export function computeNextRunAt(input: ScheduleInput, from: Date): Date | null {
  if (input.type === "once") {
    return input.runAt ? new Date(input.runAt) : new Date(from);
  }
  if (input.type === "interval") {
    return new Date(from.getTime() + input.seconds * 1000);
  }

  const interval = cronParser.parseExpression(input.cron, { currentDate: from });
  return interval.next().toDate();
}
