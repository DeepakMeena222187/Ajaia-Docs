import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getDocumentById,
  getUserById,
  updateDocument as dbUpdateDocument,
} from "@/lib/db";

interface Params {
  id: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document = await getDocumentById(id, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const owner = await getUserById(document.ownerId);
    const shares = await Promise.all(
      document.shares.map(async (share) => {
        const sharedUser = await getUserById(share.userId);
        return {
          id: share.userId,
          name: sharedUser?.name ?? "Unknown user",
          email: sharedUser?.email ?? "",
          permission: share.permission,
        };
      })
    );

    return NextResponse.json({
      id: document.id,
      title: document.title,
      content: document.content,
      ownerId: document.ownerId,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      shares,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }
    if (errorMessage.includes("Unauthorized")) {
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

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

    // Validate at least one field is provided
    if (title === undefined && content === undefined) {
      return NextResponse.json(
        { error: "title or content must be provided" },
        { status: 400 }
      );
    }

    // Get current document to merge changes
    const currentDocument = await getDocumentById(id, user.id);
    if (!currentDocument) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Normalize title if provided
    let normalizedTitle = currentDocument.title;
    if (title !== undefined) {
      normalizedTitle = (title as string).trim() || "Untitled Document";
    }

    // Validate content if provided
    let finalContent = currentDocument.content;
    if (content !== undefined) {
      if (typeof content !== "string") {
        return NextResponse.json(
          { error: "content must be a string" },
          { status: 400 }
        );
      }
      finalContent = content;
    }

    // Update the document
    const updated = await dbUpdateDocument(
      id,
      user.id,
      normalizedTitle,
      finalContent
    );

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error);
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
