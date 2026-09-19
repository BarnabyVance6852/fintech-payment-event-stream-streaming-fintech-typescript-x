const response = await fetch("http://localhost:3000/payment-events/stream", {
  method: "POST",
  headers: { "content-type": "application/json", accept: "text/event-stream" },
  body: JSON.stringify({
    paymentId: "pay_launch_1042",
    amountCents: 12900,
    currency: "USD",
    merchant: "Northwind Office Supply",
    riskScore: 18,
    occurredAt: "2026-09-05T10:30:00.000Z",
  }),
});

if (!response.ok || !response.body) {
  throw new Error(`Stream request failed with HTTP ${response.status}`);
}

const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  process.stdout.write(value);
}
