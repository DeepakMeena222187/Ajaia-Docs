import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getDocumentById, removeDocumentShare } from "@/lib/db";

interface Params {
  id: string;
  userId: string;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const user = await requireCurrentUser();
    const { id, userId } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid user ID" },
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

    if (userId === document.ownerId) {
      return NextResponse.json(
        { error: "The document owner cannot be removed" },
        { status: 400 }
      );
    }

    // Remove the share
    await removeDocumentShare(id, user.id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id]/share/[userId] error:", error);
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
