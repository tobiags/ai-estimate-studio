import { describe, expect, it } from "vitest";
import { PricingError, evaluateStudioEstimate } from "./index.js";

const catalog = {
  bases: [{ code: "P4", priceMinor: 329000 }],
  walls: [
    { code: "M1", priceMinor: 69000 },
    { code: "M8", priceMinor: 249000 },
  ],
  accessories: [{ code: "CLAUSTRA", priceMinor: 49000 }],
};

const defaultStudioConfiguration = {
  baseCode: "P4",
  walls: [
    { id: "wall-1", code: "M1" },
    { id: "wall-2", code: "M8" },
  ],
  accessories: [
    { id: "accessory-1", code: "CLAUSTRA", targetWallId: "wall-2" },
  ],
};

describe("Mobup studio estimates", () => {
  it("prices the approved default composition in integer cents", () => {
    const estimate = evaluateStudioEstimate({
      configuration: defaultStudioConfiguration,
      catalog,
    });

    expect(estimate.subtotalMinor).toBe("696000");
    expect(estimate.taxMinor).toBe("139200");
    expect(estimate.totalMinor).toBe("835200");
    expect(estimate.lines.map((item) => item.label)).toEqual([
      "P4",
      "M1",
      "M8",
      "CLAUSTRA",
    ]);
  });

  it("removes an accessory line without changing facade dimensions", () => {
    const estimate = evaluateStudioEstimate({
      configuration: {
        ...defaultStudioConfiguration,
        accessories: [],
      },
      catalog,
    });
    expect(estimate.subtotalMinor).toBe("647000");
    expect(estimate.totalMinor).toBe("776400");
  });

  it("supports a zero VAT policy for a market-specific preview", () => {
    const estimate = evaluateStudioEstimate({
      configuration: defaultStudioConfiguration,
      catalog,
      taxRateBps: "0",
    });
    expect(estimate.taxMinor).toBe("0");
    expect(estimate.totalMinor).toBe("696000");
  });

  it("rejects negative catalogue amounts before producing totals", () => {
    expect(() =>
      evaluateStudioEstimate({
        configuration: defaultStudioConfiguration,
        catalog: {
          ...catalog,
          bases: [{ code: "P4", priceMinor: -1 }],
        },
      }),
    ).toThrow(PricingError);
  });
});
