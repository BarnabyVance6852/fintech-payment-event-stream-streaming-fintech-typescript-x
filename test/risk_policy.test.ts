import assert from "node:assert/strict";
import test from "node:test";
import { decidePaymentAction, type PaymentEvent } from "../src/risk_policy.ts";

const ordinaryPayment: PaymentEvent = {
  paymentId: "pay_test_1",
  amountCents: 12900,
  currency: "USD",
  merchant: "Northwind Office Supply",
  riskScore: 18,
  occurredAt: "2026-09-05T10:30:00.000Z",
};

test("settles an ordinary low-risk payment", () => {
  assert.deepEqual(decidePaymentAction(ordinaryPayment), {
    action: "settle",
    customerCanRetry: true,
    reason: "payment is within automatic settlement policy",
  });
});

test("holds an elevated-risk payment and suppresses retry advice", () => {
  assert.deepEqual(decidePaymentAction({ ...ordinaryPayment, riskScore: 82 }), {
    action: "hold_for_review",
    customerCanRetry: false,
    reason: "elevated risk score",
  });
});
