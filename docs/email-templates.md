# Transactional email templates

This is the registry contract for `lib/email/send.ts`. Anyone adding a new
template should read this end-to-end before writing the React Email
component.

## Architecture

```
caller  ──►  sendTemplate({ userId, to, templateId, props })
                 │
                 ├─► buildIdempotencyKey(userId, templateId, props)
                 │       returns `${userId}:${templateId}:${sha256(props).slice(0,16)}`
                 │
                 ├─► INSERT email_events (event_type='send_attempted', idempotency_key=key)
                 │       Postgres partial unique index on idempotency_key
                 │       └─ 23505 conflict → return { skipped: true }, no Resend call
                 │
                 ├─► Resend.emails.send({ from, to, subject, react })
                 │
                 └─► INSERT email_events (event_type='sent', resend_event_id, payload)
```

Resend delivery / engagement events come back via the webhook at
`/api/webhooks/resend` and append more rows to `email_events` keyed on
`resend_event_id`.

## How to add a new template

1. Create the React Email component in `components/emails/<Name>.tsx`.
   Use `@react-email/components` primitives only — no Tailwind, no app
   styles. Keep it inline-styled so it renders in Gmail / Outlook.

2. Register it in `lib/email/send.ts`:
   ```ts
   import { MyTemplate } from '@/components/emails/MyTemplate'

   export type TemplateId = 'email-verification' | 'my-template'

   const TEMPLATES = {
     'email-verification': { ... },
     'my-template': {
       subject: (props) => `Subject for ${props.someField}`,
       render: (props: { someField: string }) => MyTemplate(props),
     },
   } as const
   ```

3. Call it:
   ```ts
   await sendTemplate({
     userId: profile.userId,
     to: user.email,
     templateId: 'my-template',
     props: { someField: 'value' },
   })
   ```

## Idempotency

The key is `${userId}:${templateId}:${sha256(props).slice(0,16)}`. Same
inputs → same key → second call is a no-op.

If you need to re-send with the same logical intent (e.g. "resend
verification email"), change the props enough to produce a different
hash — for verification, the token in `verificationUrl` rotates per
request, so re-sends naturally get a new key.

Two events land in `email_events` per successful send:

| event_type      | idempotency_key | resend_event_id | written when |
|---|---|---|---|
| `send_attempted` | set             | null            | before Resend call |
| `sent`           | null            | Resend id       | after Resend confirms |

Webhook events (`email.delivered`, `email.bounced`, etc.) append further
rows with `resend_event_id` set and `idempotency_key` null.

## Failure modes

- **DB unavailable** before the reserve step → throws. Caller decides
  whether to retry. Nothing was sent.
- **Duplicate idempotency key** → `{ sent: false, skipped: true }`. The
  original send already went through (or is in-flight). Safe to ignore.
- **Resend rejects** (invalid recipient, rate limit, etc.) → throws. The
  `send_attempted` row stays in place; no `sent` row appears. Caller can
  inspect the row to see the attempt landed but stalled, then retry with
  fresh props (different token, etc.) so the key changes.
- **DB error writing the `sent` row** after Resend succeeded → logged,
  swallowed. The send happened; bookkeeping is best-effort.

## Environment

| Var | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key |
| `RESEND_FROM` | no | From-address. Defaults to `Ralph.world <hello@ralph.world>`. |
| `RESEND_WEBHOOK_SECRET` | yes (for `/api/webhooks/resend`) | Svix `whsec_...` secret. Prefix optional. |

## Testing

`lib/email/send.test.ts` mocks `@/lib/db` and the `resend` SDK. Pattern:

```ts
const { valuesMock, insertMock, resendSendMock } = vi.hoisted(() => ({
  valuesMock: vi.fn().mockResolvedValue(undefined),
  insertMock: vi.fn(),
  resendSendMock: vi.fn().mockResolvedValue({ data: { id: '...' }, error: null }),
}))

vi.mock('@/lib/db', () => ({ getDb: () => ({ insert: insertMock }) }))
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: resendSendMock } })),
}))
```

Call `_resetResendClient()` in `beforeEach` so the cached Resend client
picks up changes to `RESEND_API_KEY` between tests.

## Existing templates

| templateId | Component | Props | Used by |
|---|---|---|---|
| `email-verification` | `components/emails/EmailVerification.tsx` | `{ verificationUrl, recipientName? }` | Credentials provider signup + email change (Task 1.3) |
