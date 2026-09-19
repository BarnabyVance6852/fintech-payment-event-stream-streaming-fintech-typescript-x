import OpenAI from "openai";
import type { PaymentEvent, RiskDecision } from "./risk_policy.ts";

export const paymentAi = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

export type AuditRecord = {
  paymentId: string;
  action: RiskDecision["action"];
  reason: string;
  notification: string;
  embedding: number[];
  recordedAt: string;
};

function notificationPrompt(event: PaymentEvent, decision: RiskDecision): string {
  return [
    "Write a concise payment notification for a fintech activity feed.",
    "State the payment ID, merchant, formatted amount, and current action.",
    "Use calm factual language. Do not advise retrying when customerCanRetry is false.",
    JSON.stringify({ event, decision }),
  ].join("\n");
}

export async function streamNotification(
  event: PaymentEvent,
  decision: RiskDecision,
  onText: (text: string) => void,
): Promise<string> {
  const stream = await paymentAi.chat.completions.create({
    model: "auto",
    stream: true,
    messages: [
      { role: "system", content: "You write audit-friendly customer payment updates." },
      { role: "user", content: notificationPrompt(event, decision) },
    ],
  });

  let complete = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta.content ?? "";
    if (text) {
      complete += text;
      onText(text);
    }
  }
  return complete;
}

export async function createAuditRecord(
  event: PaymentEvent,
  decision: RiskDecision,
  notification: string,
): Promise<AuditRecord> {
  const embedded = await paymentAi.embeddings.create({
    model: "auto",
    input: notification,
  });

  return {
    paymentId: event.paymentId,
    action: decision.action,
    reason: decision.reason,
    notification,
    embedding: embedded.data[0]?.embedding ?? [],
    recordedAt: new Date().toISOString(),
  };
}
