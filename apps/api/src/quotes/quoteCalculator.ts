export type QuoteCalculatorItemInput = {
  discountAmount?: string | number | null;
  quantity: string | number;
  surchargeAmount?: string | number | null;
  unitPrice: string | number;
};

export type QuoteCalculatorInput = {
  discountWarningPercent: string | number;
  items: QuoteCalculatorItemInput[];
  quoteDiscountAmount?: string | number | null;
  quoteSurchargeAmount?: string | number | null;
};

export type QuoteCalculatedItem = {
  discountAmount: string;
  quantity: string;
  surchargeAmount: string;
  subtotalAmount: string;
  totalAmount: string;
  unitPrice: string;
};

export type QuoteTotals = {
  discountAmount: string;
  discountPercent: string;
  discountWarning: {
    message: string | null;
    percent: string;
    triggered: boolean;
  };
  itemDiscountAmount: string;
  itemSurchargeAmount: string;
  items: QuoteCalculatedItem[];
  quoteDiscountAmount: string;
  quoteSurchargeAmount: string;
  subtotalAmount: string;
  surchargeAmount: string;
  totalAmount: string;
};

export function calculateQuoteTotals(input: QuoteCalculatorInput): QuoteTotals {
  const itemTotals = input.items.map((item) => calculateItem(item));
  const subtotalCents = itemTotals.reduce((sum, item) => sum + moneyToCents(item.subtotalAmount), 0);
  const itemDiscountCents = itemTotals.reduce(
    (sum, item) => sum + moneyToCents(item.discountAmount),
    0,
  );
  const itemSurchargeCents = itemTotals.reduce(
    (sum, item) => sum + moneyToCents(item.surchargeAmount),
    0,
  );
  const quoteDiscountCents = moneyToCents(input.quoteDiscountAmount ?? "0.00");
  const quoteSurchargeCents = moneyToCents(input.quoteSurchargeAmount ?? "0.00");
  const discountCents = itemDiscountCents + quoteDiscountCents;
  const surchargeCents = itemSurchargeCents + quoteSurchargeCents;
  const totalCents = subtotalCents - discountCents + surchargeCents;
  const discountPercentBasisPoints =
    subtotalCents === 0 ? 0 : Math.round((discountCents * 10000) / subtotalCents);
  const warningPercentBasisPoints = percentToBasisPoints(input.discountWarningPercent);
  const triggered = discountPercentBasisPoints > warningPercentBasisPoints;
  const discountPercent = basisPointsToPercent(discountPercentBasisPoints);
  const warningPercent = basisPointsToPercent(warningPercentBasisPoints);

  return {
    discountAmount: centsToMoney(discountCents),
    discountPercent,
    discountWarning: {
      message: triggered
        ? `Desconto total de ${discountPercent}% acima do limite configurado de ${warningPercent}%.`
        : null,
      percent: warningPercent,
      triggered,
    },
    itemDiscountAmount: centsToMoney(itemDiscountCents),
    itemSurchargeAmount: centsToMoney(itemSurchargeCents),
    items: itemTotals,
    quoteDiscountAmount: centsToMoney(quoteDiscountCents),
    quoteSurchargeAmount: centsToMoney(quoteSurchargeCents),
    subtotalAmount: centsToMoney(subtotalCents),
    surchargeAmount: centsToMoney(surchargeCents),
    totalAmount: centsToMoney(totalCents),
  };
}

function calculateItem(item: QuoteCalculatorItemInput): QuoteCalculatedItem {
  const quantityThousandths = quantityToThousandths(item.quantity);
  const unitPriceCents = moneyToCents(item.unitPrice);
  const discountCents = moneyToCents(item.discountAmount ?? "0.00");
  const surchargeCents = moneyToCents(item.surchargeAmount ?? "0.00");
  const subtotalCents = Math.round((unitPriceCents * quantityThousandths) / 1000);
  const totalCents = subtotalCents - discountCents + surchargeCents;

  return {
    discountAmount: centsToMoney(discountCents),
    quantity: thousandthsToQuantity(quantityThousandths),
    surchargeAmount: centsToMoney(surchargeCents),
    subtotalAmount: centsToMoney(subtotalCents),
    totalAmount: centsToMoney(totalCents),
    unitPrice: centsToMoney(unitPriceCents),
  };
}

export function moneyToCents(value: string | number): number {
  const text = typeof value === "number" ? value.toString() : value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid money amount.");
  }

  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function centsToMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");

  return `${sign}${whole}.${fraction}`;
}

function quantityToThousandths(value: string | number): number {
  const text = typeof value === "number" ? value.toString() : value.trim();

  if (!/^\d+(\.\d{1,3})?$/.test(text)) {
    throw new Error("Invalid quantity.");
  }

  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
}

function thousandthsToQuantity(value: number): string {
  const whole = Math.floor(value / 1000);
  const fraction = String(value % 1000).padStart(3, "0");

  return `${whole}.${fraction}`;
}

function percentToBasisPoints(value: string | number): number {
  const text = typeof value === "number" ? value.toString() : value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid percent.");
  }

  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function basisPointsToPercent(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");

  return `${whole}.${fraction}`;
}
