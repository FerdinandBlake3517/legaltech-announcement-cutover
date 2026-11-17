import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnouncement, matterIntakeSchema } from "./announcement_service.ts";

test("marks a matter for follow-up when its deadline is within 48 hours", () => {
  const input = matterIntakeSchema.parse({
    matterId: "matter-test",
    memberIds: ["member-1"],
    documentName: "signed-order.pdf",
    signedDocument: "https://files.example.test/signed/order",
    deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  assert.equal(buildAnnouncement(input).follow_up, "due-soon");
});
