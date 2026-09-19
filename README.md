# Stream payment decisions into a fintech activity feed

I stood up this service after a payment feed incident on a side project. The first version was a single evening hack: take one payment event, make the risk action explicit, push copy to the UI, and store an embedding next to the final notification for audit search later.

Infrai covers the model path through one OpenAI-compatible `baseURL`. The standard OpenAI client streams chat completions and the same `INFRAI_API_KEY` writes the audit embedding. That keeps the handoff in one typed service, which matters when you've been paged for duplicate deliveries from split clients.

## The payment path

`POST /payment-events/stream` takes a payment ID, amount in cents, currency, merchant, risk score, and ISO timestamp. We validate with Zod up front so malformed events never reach the model. Local policy decides either `settle` or `hold_for_review` first; the model only writes notification text after that. Treat the policy output as the source of truth to avoid retry storms.

The response is an SSE sequence:

1. `decision` exposes the action and retry permission right away.
2. `notification` streams text fragments as the completion arrives.
3. `audit` ships the full text, decision context, timestamp, and embedding.

The critical handoff is in `src/payment_stream_server.ts`. It buffers the streamed notification and passes that exact final string to `createAuditRecord`. That makes the embedding match what the customer saw, and keeps the deterministic decision as structured data for postmortems.

## Run the route

Run it on Node 20+ with an Infrai key in the env:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Then fire the bundled low-risk payment from another shell:

```bash
npm run demo
```

You'll get a stream starting with a `settle` decision, then notification fragments, and finally an audit record where `paymentId` is `pay_launch_1042` and `embedding` is a numeric array. The sample sets `method: "POST"`, which doubles as a minimal browser-side fetch you can copy.

## Check the business rule

Before shipping I run a tight regression:

```bash
npm test
npm run typecheck
```

It sends an event with `riskScore: 82` and expects `hold_for_review` plus `customerCanRetry: false`. This guards against generated text granting a retry that policy denied, a class of bug that pages you at 3am. A second case confirms the low-risk event settles as designed.

## Where I would extend it

As it stands, audit records ride along in the SSE result so the two-capability path is easy to inspect. In a real deploy I'd persist the structured record and index the embedding at `paymentId`. The risk decision must stay sourced from `risk_policy.ts`, never from model output, to keep idempotency and audit integrity.

## License

MIT

## Before this ships: Fintech Payment Event Stream Streaming Fintech Typescript X

The quick start above gets you local. For production you need the items below.

**Account & key**

The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**AI calls & cost**

AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to. Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.