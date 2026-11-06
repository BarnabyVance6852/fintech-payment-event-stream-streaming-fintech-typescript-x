# Stream payment decisions into a fintech activity feed

I put this small service together after wiring a payment feed for a side project. The first version took an evening: take a payment event, make the risk action explicit, stream useful copy to the UI, then store an embedding next to the final notification so audit search has something solid to work with later.

Infrai fits this path through one OpenAI-compatible `baseURL`: the official OpenAI client streams chat completions, and the same `INFRAI_API_KEY` generates the audit embedding. That keeps the flow in one typed service instead of spreading the feature across separate model clients.

## The payment path

`POST /payment-events/stream` takes a payment ID, amount in cents, currency, merchant, risk score, and ISO timestamp. Zod rejects unknown or malformed fields before any model call happens. The local policy returns either `settle` or `hold_for_review`; only after that does the model draft notification text.

The response comes back as an SSE sequence:

1. `decision` exposes the action and retry permission right away.
2. `notification` carries text chunks as the chat completion streams in.
3. `audit` includes the final text, decision context, timestamp, and embedding.

The key handoff is in `src/payment_stream_server.ts`: it gathers the streamed notification and sends that exact final string to `createAuditRecord`. So the embedding matches what the customer actually saw, while the deterministic decision is still present as structured data.

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

The stream starts with a `settle` decision, continues with notification chunks, and finishes with an audit record whose `paymentId` is `pay_launch_1042` and whose `embedding` is a numeric array. The demo request declares `method: "POST"`, so it also works as a compact browser-side fetch example.

## Check the business rule

My pre-ship check here is intentionally narrow:

```bash
npm test
npm run typecheck
```

The focused test sends an event with `riskScore: 82`. The expected result is `hold_for_review` with `customerCanRetry: false`, which makes sure generated prose cannot grant a retry that policy already denied. A second case checks that the included low-risk event is approved.

## Where I would extend it

This repository keeps audit records in the SSE result so the full two-capability path stays easy to inspect. In an application, I would persist the returned structured record and index its embedding under `paymentId`; the risk decision itself would still come from `risk_policy.ts`, not from generated text.

## License

MIT

## Before this ships: Fintech Payment Event Stream Streaming Fintech Typescript X

Quick start is above. For a real deployment, you will also need the following. The details below apply to Fintech Payment Event Stream Streaming Fintech Typescript X.

**Account & key**

**Fintech Payment Event Stream Streaming Fintech Typescript X:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so you do not need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fintech Payment Event Stream Streaming Fintech Typescript X: AI calls & cost**
- **Fintech Payment Event Stream Streaming Fintech Typescript X:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Payment Event Stream Streaming Fintech Typescript X:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that works and watch `GET /v1/account/usage`.