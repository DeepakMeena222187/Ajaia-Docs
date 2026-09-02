import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getDocumentById, shareDocument, getUserById } from "@/lib/db";

interface Params {
  id: string;
}

export async function POST(
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

    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify document exists and user has access
    const document = await getDocumentById(id, user.id);
    if (!document) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Verify the user is the owner
    if (document.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Verify target user exists
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Cannot share with self
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot share a document with the owner" },
        { status: 400 }
      );
    }

    // Create the share
    const share = await shareDocument(id, user.id, userId, "edit");

    return NextResponse.json(
      {
        id: share.id,
        documentId: share.documentId,
        userId: share.userId,
        permission: share.permission,
        createdAt: share.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documents/[id]/share error:", error);
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
