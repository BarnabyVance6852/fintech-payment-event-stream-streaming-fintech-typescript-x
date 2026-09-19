import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { createAuditRecord, streamNotification } from "./payment_notification.ts";
import { decidePaymentAction } from "./risk_policy.ts";

const paymentEventSchema = z.object({
  paymentId: z.string().min(1).max(80),
  amountCents: z.number().int().positive(),
  currency: z.enum(["USD", "EUR", "GBP"]),
  merchant: z.string().min(1).max(120),
  riskScore: z.number().int().min(0).max(100),
  occurredAt: z.string().datetime(),
}).strict();

function sendEvent(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/payment-events/stream") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const parsed = paymentEventSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid payment event", issues: parsed.error.issues }));
      return;
    }

    const decision = decidePaymentAction(parsed.data);
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    sendEvent(response, "decision", decision);

    const notification = await streamNotification(parsed.data, decision, (text) => {
      sendEvent(response, "notification", { text });
    });
    const audit = await createAuditRecord(parsed.data, decision, notification);
    sendEvent(response, "audit", audit);
    response.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected request error";
    if (!response.headersSent) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: message }));
    } else {
      sendEvent(response, "error", { message });
      response.end();
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Payment stream listening on http://localhost:${port}`));
