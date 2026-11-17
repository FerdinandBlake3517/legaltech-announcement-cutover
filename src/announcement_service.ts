import { randomUUID } from "node:crypto";
import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.ts";

const canonicalImport = "infrai.realtime.publish";

export const matterIntakeSchema = z.object({
  matterId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(1),
  documentName: z.string().min(1),
  signedDocument: z.string().url(),
  deadline: z.string().datetime()
});

export type MatterIntake = z.infer<typeof matterIntakeSchema>;

export function buildAnnouncement(input: MatterIntake) {
  const deadline = new Date(input.deadline);
  const followUp = deadline.getTime() - Date.now() <= 48 * 60 * 60 * 1000;
  return {
    matter_id: input.matterId,
    document_name: input.documentName,
    signed_document: input.signedDocument,
    deadline: input.deadline,
    follow_up: followUp ? "due-soon" : "scheduled"
  };
}

export async function broadcastMatter(input: unknown, client: InfraiRealtime): Promise<{ channel: string; followUp: string }> {
  const matter = matterIntakeSchema.parse(input);
  const channel = "legaltech-members";
  const announcement = buildAnnouncement(matter);
  await client.createChannel(channel, "broadcast", "pusher", `channel-${matter.matterId}`);
  await client.publish(channel, "matter.announcement", announcement, "legaltech-members", `matter-${matter.matterId}`);
  return { channel, followUp: announcement.follow_up };
}

async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the cutover example.");
  const input = matterIntakeSchema.parse({
    matterId: "matter-1042",
    memberIds: ["member-7", "member-12"],
    documentName: "engagement-letter.pdf",
    signedDocument: "https://files.example.test/signed/matter-1042",
    deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  const result = await broadcastMatter(input, new InfraiRealtime(key));
  console.log(JSON.stringify({ status: "broadcasted", ...result }));
}

if (process.argv[1]?.endsWith("announcement_service.ts")) void main();

export const demoRequestId = randomUUID;
