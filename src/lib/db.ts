import { PrismaClient, DocumentShare } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export { prisma };

// ==============================================================================
// User Functions
// ==============================================================================

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

// ==============================================================================
// Document Functions
// ==============================================================================

export async function getDocumentsForUser(userId: string) {
  // Get documents the user owns
  const ownedDocuments = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });

  // Get documents shared with the user
  const sharedDocuments = await prisma.document.findMany({
    where: {
      shares: {
        some: {
          userId: userId,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Combine and deduplicate
  const documentIds = new Set<string>();
  const allDocuments = [...ownedDocuments, ...sharedDocuments];

  const uniqueDocuments = allDocuments.filter((doc) => {
    if (documentIds.has(doc.id)) {
      return false;
    }
    documentIds.add(doc.id);
    return true;
  });

  return uniqueDocuments;
}

export async function getDocumentById(documentId: string, userId?: string) {
  if (!documentId || typeof documentId !== "string" || !documentId.trim()) {
    throw new Error("Invalid document ID");
  }

  const normalizedId = documentId.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(normalizedId) || normalizedId.length < 6) {
    throw new Error("Invalid document ID");
  }

  const document = await prisma.document.findUnique({
    where: { id: normalizedId },
    include: {
      shares: true,
    },
  });

  if (userId && document) {
    const isOwner = document.ownerId === userId;
    const hasShare = document.shares.some((share: DocumentShare) => share.userId === userId);

    if (!isOwner && !hasShare) {
      throw new Error("Unauthorized: User does not have access to this document");
    }
  }

  return document;
}

export async function createDocument(
  userId: string,
  title: string,
  content: string
) {
  const document = await prisma.document.create({
    data: {
      title,
      content,
      ownerId: userId,
    },
  });

  return document;
}

export async function updateDocument(
  documentId: string,
  userId: string,
  title: string,
  content: string
) {
  // Get the document and check authorization
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const isOwner = document.ownerId === userId;
  const hasEditShare = document.shares.some(
    (share: DocumentShare) => share.userId === userId && share.permission === "edit"
  );

  if (!isOwner && !hasEditShare) {
    throw new Error("Unauthorized: User cannot update this document");
  }

  // Update the document
  const updatedDocument = await prisma.document.update({
    where: { id: documentId },
    data: {
      title,
      content,
    },
  });

  return updatedDocument;
}

// ==============================================================================
// Document Share Functions
// ==============================================================================

export async function shareDocument(
  documentId: string,
  ownerId: string,
  targetUserId: string,
  permission: string = "edit"
) {
  if (!documentId || !documentId.trim()) {
    throw new Error("Invalid document ID");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.ownerId !== ownerId) {
    throw new Error("Unauthorized: Only the document owner can share");
  }

  if (targetUserId === ownerId) {
    throw new Error("Cannot share a document with the owner");
  }

  const existingShare = await prisma.documentShare.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId: targetUserId,
      },
    },
  });

  if (existingShare) {
    return prisma.documentShare.update({
      where: { id: existingShare.id },
      data: { permission },
    });
  }

  return prisma.documentShare.create({
    data: {
      documentId,
      userId: targetUserId,
      permission,
    },
  });
}

export async function removeDocumentShare(
  documentId: string,
  ownerId: string,
  targetUserId: string
) {
  // Verify the user making the request is the document owner
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.ownerId !== ownerId) {
    throw new Error("Unauthorized: Only the document owner can remove shares");
  }

  // Delete the share
  return prisma.documentShare.deleteMany({
    where: {
      documentId,
      userId: targetUserId,
    },
  });
}
