import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  prisma,
  getDocumentsForUser,
  createDocument as dbCreateDocument,
} from "@/lib/db";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const documents = await getDocumentsForUser(user.id);

    // Separate owned and shared documents
    const ownedDocuments = documents.filter((doc) => doc.ownerId === user.id);
    const sharedDocuments = documents.filter((doc) => doc.ownerId !== user.id);

    const ownerIds = Array.from(
      new Set([...ownedDocuments, ...sharedDocuments].map((doc) => doc.ownerId))
    );

    const owners = await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    });

    const ownerNameMap = new Map(
      owners.map((owner) => [owner.id, owner.name] as const)
    );

    return NextResponse.json({
      owned: ownedDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId,
        ownerName: ownerNameMap.get(doc.ownerId) ?? "Unknown user",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      shared: sharedDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId,
        ownerName: ownerNameMap.get(doc.ownerId) ?? "Unknown user",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    if ((error as Error).message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const { title, content } = body;

    // Validate title
    let normalizedTitle = title?.trim() || "";
    if (!normalizedTitle) {
      normalizedTitle = "Untitled Document";
    }

    // Validate content
    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content must be a string" },
        { status: 400 }
      );
    }

    // Create the document with the current user as owner
    const document = await dbCreateDocument(user.id, normalizedTitle, content);

    return NextResponse.json(
      {
        id: document.id,
        title: document.title,
        content: document.content,
        ownerId: document.ownerId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documents error:", error);
    if ((error as Error).message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
