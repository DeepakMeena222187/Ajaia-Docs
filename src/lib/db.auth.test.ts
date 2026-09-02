import { beforeEach, describe, expect, it } from "vitest";
import { prisma, getDocumentById, createDocument, updateDocument, shareDocument, removeDocumentShare } from "./db";

describe("document authorization and sharing", () => {
  beforeEach(async () => {
    await prisma.documentShare.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.createMany({
      data: [
        { id: "owner-user", name: "Owner User", email: "owner@example.com" },
        { id: "shared-user", name: "Shared User", email: "shared@example.com" },
        { id: "unrelated-user", name: "Unrelated User", email: "unrelated@example.com" },
      ],
    });
  });

  it("allows ownership, edit permissions, and blocks unauthorized access and stale shares", async () => {
    const createdDoc = await createDocument("owner-user", "Shared Draft", "initial");

    const ownerRead = await getDocumentById(createdDoc.id, "owner-user");
    expect(ownerRead).not.toBeNull();
    expect(ownerRead?.ownerId).toBe("owner-user");

    await shareDocument(createdDoc.id, "owner-user", "shared-user", "edit");

    const sharedRead = await getDocumentById(createdDoc.id, "shared-user");
    expect(sharedRead).not.toBeNull();
    expect(sharedRead?.id).toBe(createdDoc.id);

    const updated = await updateDocument(createdDoc.id, "shared-user", "Shared Draft Updated", "updated-by-shared-user");
    expect(updated.title).toBe("Shared Draft Updated");
    expect(updated.content).toBe("updated-by-shared-user");

    await expect(getDocumentById(createdDoc.id, "unrelated-user")).rejects.toThrow(
      "Unauthorized: User does not have access to this document"
    );

    await removeDocumentShare(createdDoc.id, "owner-user", "shared-user");

    await expect(getDocumentById(createdDoc.id, "shared-user")).rejects.toThrow(
      "Unauthorized: User does not have access to this document"
    );
  });

  it("rejects self-sharing and duplicate share creation", async () => {
    const createdDoc = await createDocument("owner-user", "Self Share Test", "hello");

    await expect(shareDocument(createdDoc.id, "owner-user", "owner-user", "edit")).rejects.toThrow(
      "Cannot share a document with the owner"
    );

    await shareDocument(createdDoc.id, "owner-user", "shared-user", "edit");
    const afterFirst = await shareDocument(createdDoc.id, "owner-user", "shared-user", "edit");

    expect(afterFirst.permission).toBe("edit");

    const document = await prisma.document.findUnique({
      where: { id: createdDoc.id },
      include: { shares: true },
    });
    expect(document?.shares).toHaveLength(1);
  });
});
