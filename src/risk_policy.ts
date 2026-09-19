export type PaymentEvent = {
  paymentId: string;
  amountCents: number;
  currency: "USD" | "EUR" | "GBP";
  merchant: string;
  riskScore: number;
  occurredAt: string;
};

export type RiskDecision = {
  action: "settle" | "hold_for_review";
  customerCanRetry: boolean;
  reason: string;
};

export function decidePaymentAction(event: PaymentEvent): RiskDecision {
  if (event.riskScore >= 70 || event.amountCents >= 500_000) {
    return {
      action: "hold_for_review",
      customerCanRetry: false,
      reason: event.riskScore >= 70 ? "elevated risk score" : "high-value payment",
    };
  }

  return {
    action: "settle",
    customerCanRetry: true,
    reason: "payment is within automatic settlement policy",
  };
}
