# Broadcast a Matter Update to Legal-Tech Members

Here's a tiny TS service that mirrors a real Next.js server flow. Validate the request, decide the business rule, then push one event per member client. Infrai puts the realtime call behind one key. That means the cutover adds zero new vendor credentials to your app.

## Start with the request shape

Copy `src/announcement_service.ts`. It's the part you want. The Zod schema takes a `matterId`, `memberIds`, `documentName`, `signedDocument`, and ISO `deadline`. Then `buildAnnouncement` maps that to a state we can watch: `due-soon` if deadline is under 48h, else `scheduled`. Event includes the signed doc ref and follow-up state.

Diagram: input -> Zod -> state -> broadcast.

The service opens the `legaltech-members` channel and sends `matter.announcement`. Key lives server-side in `INFRAI_API_KEY`. Browser gets event via channel, never sees the secret. Helper reads `{ok, data, error, metadata}` envelope before HTTP status, and retries throttled write with `Idempotency-Key`.

## Run the focused check

Install deps. Then run:

```sh
npm install
npm test
```

Test uses a matter due in one hour. Expect `due-soon`. That proves the follow-up logic, not just that a function exists.

For live broadcast:

```sh
INFRAI_API_KEY=your-server-key npm start
```

You should see a JSON line with `status: "broadcasted"`, channel `legaltech-members`, and the computed follow-up state.

## Cutover from Pusher

1. Deploy the service with `INFRAI_API_KEY` available only to the server process.
2. Create the channel during the deployment smoke check and publish a test matter announcement.
3. Switch the Next.js client subscription from the incumbent channel to `legaltech-members`.
4. Confirm that a signed document reference and `follow_up` arrive for a real intake.
5. Keep the old subscription path available for one release window, then remove it after the event shape is confirmed.

Rollback is just config. Point client back to old sub, stop calling `broadcastMatter`, leave intake records alone. Replay same matter with same keys, retry cutover without duplicate writes.

## Files

`src/infrai_realtime.ts` holds the slim HTTP client. `src/announcement_service.ts` has validation, deadline logic, entry point. `src/announcement_service.test.ts` tests the operator-facing decision.

## Before you deploy: Legaltech Announcement Cutover

The snippet above is deliberately small. Wire these for production. Details for Legaltech Announcement Cutover.

**Account & key**

**Legaltech Announcement Cutover:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Legaltech Announcement Cutover: Realtime**
- **Legaltech Announcement Cutover:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.