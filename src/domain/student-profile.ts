export type StudentAcademicSystem = "ENGLISH" | "SCOTTISH" | "MATURE" | "PRIVATE" | "INTERNATIONAL";

const ACADEMIC_SYSTEMS: StudentAcademicSystem[] = ["ENGLISH", "SCOTTISH", "MATURE", "PRIVATE", "INTERNATIONAL"];

export function isStudentAcademicSystem(value: string): value is StudentAcademicSystem {
  return ACADEMIC_SYSTEMS.includes(value as StudentAcademicSystem);
}

export function validateAcademicYear(system: StudentAcademicSystem, value: string): string | null {
  const year = value.trim().toUpperCase();
  if (system === "ENGLISH") return /^Y(?:[5-9]|1[0-3])$/.test(year) ? year : null;
  if (system === "SCOTTISH") return /^(?:P[67]|S[1-6])$/.test(year) ? year : null;
  return { MATURE: "Mature", PRIVATE: "Private", INTERNATIONAL: "International" }[system];
}

function academicBoundaryYear(value: string): number {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return month > 8 || (month === 8 && day >= 15) ? year : year - 1;
}

function advanceYear(value: string, steps: number): string {
  if (steps <= 0) return value;
  if (/^Y\d+$/.test(value)) return `Y${Math.min(13, Number(value.slice(1)) + steps)}`;
  if (value === "P6") return steps === 1 ? "P7" : `S${Math.min(6, steps - 1)}`;
  if (value === "P7") return `S${Math.min(6, steps)}`;
  if (/^S[1-5]$/.test(value)) return `S${Math.min(6, Number(value.slice(1)) + steps)}`;
  return value;
}

export function currentAcademicYear(
  system: StudentAcademicSystem,
  value: string,
  anchorDate: string | null,
  now: string
): { value: string; anchorDate: string | null } {
  if (system !== "ENGLISH" && system !== "SCOTTISH") {
    return { value: validateAcademicYear(system, value) ?? value, anchorDate: null };
  }
  const validValue = validateAcademicYear(system, value);
  if (!validValue) return { value, anchorDate };
  const anchor = anchorDate ?? now.slice(0, 10);
  const steps = Math.max(0, academicBoundaryYear(now) - academicBoundaryYear(anchor));
  return { value: advanceYear(validValue, steps), anchorDate: anchor };
}

export function academicYearOptions(system: StudentAcademicSystem, selected: string): string {
  const values = system === "ENGLISH"
    ? Array.from({ length: 9 }, (_, index) => `Y${index + 5}`)
    : system === "SCOTTISH"
      ? ["P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"]
      : ["Mature", "Private", "International"];
  return values.map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`).join("");
}
