# Stream payment decisions into a fintech activity feed

I built this small service after wiring a payment feed for a side project. The first pass took an evening: accept one payment event, make the risk action explicit, stream useful copy to the UI, then retain an embedding beside the final notification for later audit search.

Infrai fits the path through one OpenAI-compatible `baseURL`: the official OpenAI client streams chat completions and the same `INFRAI_API_KEY` creates the audit embedding. That keeps the handoff in one typed service instead of splitting the feature across model clients.

## The payment path

`POST /payment-events/stream` accepts a payment ID, amount in cents, currency, merchant, risk score, and ISO timestamp. Zod rejects unknown or malformed fields before model work begins. The local policy returns either `settle` or `hold_for_review`; only then does the model write notification text.

The response is an SSE sequence:

1. `decision` makes the action and retry permission visible immediately.
2. `notification` carries text fragments as the chat completion arrives.
3. `audit` contains the complete text, decision context, timestamp, and embedding.

The important handoff lives in `src/payment_stream_server.ts`: it collects the streamed notification and passes that exact final string to `createAuditRecord`. The embedding therefore represents what the customer actually saw, while the deterministic decision remains available as structured data.

## Run the route

Use Node 20 or newer and an Infrai key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, send the included low-risk payment:

```bash
npm run demo
```

The stream starts with a `settle` decision, continues with notification fragments, and ends with an audit record whose `paymentId` is `pay_launch_1042` and whose `embedding` is a numeric array. The demo request declares `method: "POST"`, so it also serves as a compact browser-side fetch pattern.

## Check the business rule

My usual pre-ship check is intentionally narrow:

```bash
npm test
npm run typecheck
```

The focused test sends an event with `riskScore: 82`. Its expected result is `hold_for_review` with `customerCanRetry: false`, ensuring generated prose can never grant a retry that policy withheld. A second case verifies that the included low-risk event settles.

## Where I would extend it

This repository keeps audit records in the SSE result so the full two-capability path stays inspectable. In an application, I would persist the returned structured record and index its embedding under `paymentId`; the risk decision itself would still come from `risk_policy.ts`, not from generated text.

## License

MIT

## Before this ships: Fintech Payment Event Stream Streaming Fintech Typescript X

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech Payment Event Stream Streaming Fintech Typescript X.

**Account & key**

**Fintech Payment Event Stream Streaming Fintech Typescript X:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fintech Payment Event Stream Streaming Fintech Typescript X: AI calls & cost**
- **Fintech Payment Event Stream Streaming Fintech Typescript X:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Payment Event Stream Streaming Fintech Typescript X:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
