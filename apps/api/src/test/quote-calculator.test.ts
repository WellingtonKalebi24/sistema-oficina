import { describe, expect, it } from "vitest";

import { calculateQuoteTotals } from "../quotes/quoteCalculator.js";

describe("quote calculator", () => {
  it("QTE-05/D-07 calculates item, quote-level and final totals exactly", () => {
    const totals = calculateQuoteTotals({
      discountWarningPercent: "10.00",
      items: [
        {
          discountAmount: "20.00",
          quantity: "2.000",
          surchargeAmount: "5.00",
          unitPrice: "150.00",
        },
        {
          discountAmount: "10.00",
          quantity: "3.000",
          surchargeAmount: "15.00",
          unitPrice: "80.00",
        },
      ],
      quoteDiscountAmount: "50.00",
      quoteSurchargeAmount: "12.00",
    });

    expect(totals).toMatchObject({
      discountAmount: "80.00",
      discountPercent: "14.81",
      discountWarning: {
        message: "Desconto total de 14.81% acima do limite configurado de 10.00%.",
        percent: "10.00",
        triggered: true,
      },
      itemDiscountAmount: "30.00",
      itemSurchargeAmount: "20.00",
      quoteDiscountAmount: "50.00",
      quoteSurchargeAmount: "12.00",
      subtotalAmount: "540.00",
      surchargeAmount: "32.00",
      totalAmount: "492.00",
    });
    expect(totals.items.map((item) => item.totalAmount)).toEqual(["285.00", "245.00"]);
  });

  it("QTE-06/D-08 keeps above-limit discounts as warning metadata only", () => {
    const totals = calculateQuoteTotals({
      discountWarningPercent: "20.00",
      items: [
        {
          discountAmount: "5.00",
          quantity: "1.000",
          surchargeAmount: "0.00",
          unitPrice: "100.00",
        },
      ],
      quoteDiscountAmount: "0.00",
      quoteSurchargeAmount: "0.00",
    });

    expect(totals).toMatchObject({
      discountPercent: "5.00",
      discountWarning: {
        message: null,
        percent: "20.00",
        triggered: false,
      },
      totalAmount: "95.00",
    });
  });
});
