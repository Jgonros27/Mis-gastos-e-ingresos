import { it, expect } from "vitest";
import {
  effectiveDays,
  previousDays,
  comparePercent,
  monthEnd,
} from "./analytics";
import { blankFilter } from "./model";
it("medias: incluye días vacíos y respeta meses no consecutivos y rango", () => {
  expect(
    effectiveDays([], { ...blankFilter(), months: ["2026-01", "2026-03"] }),
  ).toHaveLength(62);
  expect(
    effectiveDays([], {
      ...blankFilter(),
      months: ["2026-01", "2026-03"],
      from: "2026-01-15",
      to: "2026-03-02",
    }),
  ).toHaveLength(19);
  expect(
    effectiveDays([], {
      ...blankFilter(),
      from: "2026-10-01",
      to: "2026-10-31",
    }),
  ).toHaveLength(31);
});
it("comparaciones: denominador cero y ajuste de año bisiesto", () => {
  expect(comparePercent(200, 0)).toBeNull();
  expect(comparePercent(150, 100)).toBe(50);
  expect(previousDays(["2024-02-29"], true)).toEqual(["2023-02-28"]);
  expect(previousDays(["2026-10-01", "2026-10-02"])).toEqual([
    "2026-09-29",
    "2026-09-30",
  ]);
  expect(monthEnd("2026-02")).toBe("2026-02-28");
});
