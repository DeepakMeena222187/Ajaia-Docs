"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { RichTextEditor } from "@/components/RichTextEditor";

type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error";

type OwnerInfo = {
  id: string;
  name: string;
  email: string;
};

type ShareUser = {
  id: string;
  name: string;
  email: string;
  permission: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

export default function EditorPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUsers, setShareUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareActionLoading, setShareActionLoading] = useState<string | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [shares, setShares] = useState<ShareUser[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const originalTitleRef = useRef("");

  const refreshDocument = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to load document");
      }

      const doc = await response.json();
      setTitle(doc.title);
      setContent(doc.content);
      setOwner(doc.owner ?? null);
      setShares(doc.shares ?? []);
    } catch (err) {
      console.error("Failed to refresh document", err);
    }
  }, [params.id]);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/documents/${params.id}`);

        if (response.status === 404) {
          setError("Document not found");
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setError("You don't have access to this document");
          return;
        }

        if (!response.ok) {
          setError("Failed to load document");
          return;
        }

        const doc = await response.json();
        setTitle(doc.title);
        setContent(doc.content);
        setOwner(doc.owner ?? null);
        setShares(doc.shares ?? []);
      } catch (err) {
        setError("Failed to load document");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [params.id]);

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const users = (await response.json()) as UserOption[];
      const excludedUserIds = new Set<string>(
        [owner?.id ?? "", ...shares.map((share) => share.id)]
      );

      const filtered = users.filter(
        (user) => user.id !== owner?.id && !excludedUserIds.has(user.id)
      );
      setShareUsers(filtered);
      setSelectedUserId(filtered[0]?.id ?? "");
    } catch (err) {
      console.error(err);
      setShareError("Unable to load people to share with");
    }
  };

  const openShareDialog = async () => {
    setShareError(null);
    setShareSuccess(null);
    setSelectedUserId("");
    setIsShareOpen(true);
    await loadAvailableUsers();
  };

  const handleShareUser = async () => {
    if (!selectedUserId) {
      setShareError("Select a person first");
      return;
    }

    setIsSharing(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(`/api/documents/${params.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          permission: "edit",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setShareError(data.error || "Unable to share this document");
        return;
      }

      const sharedUser = shareUsers.find((user) => user.id === selectedUserId);
      setShareSuccess(
        sharedUser
          ? `${sharedUser.name} now has access to this document.`
          : "Access granted."
      );
      setSelectedUserId("");
      await refreshDocument();
      await loadAvailableUsers();
    } catch (err) {
      console.error(err);
      setShareError("Unable to share this document right now.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    setShareActionLoading(userId);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(`/api/documents/${params.id}/share/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setShareError(data.error || "Unable to remove access.");
        return;
      }

      await refreshDocument();
      await loadAvailableUsers();
      setShareSuccess("Access removed.");
    } catch (err) {
      console.error(err);
      setShareError("Unable to remove access right now.");
    } finally {
      setShareActionLoading(null);
    }
  };

  // Debounced autosave
  const handleSave = useCallback(
    async (newTitle: string, newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("saving");

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/documents/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: newTitle,
              content: newContent,
            }),
          });

          if (!response.ok) {
            setSaveStatus("error");
            console.error("Failed to save document");
            return;
          }

          setSaveStatus("saved");
          setTimeout(() => {
            if (saveStatus !== "saving") {
              setSaveStatus("idle");
            }
          }, 2000);
        } catch (err) {
          setSaveStatus("error");
          console.error("Save failed:", err);
        }
      }, 700);
    },
    [params.id, saveStatus]
  );

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus("unsaved");
    handleSave(title, newContent);
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus("unsaved");
    handleSave(newTitle, content);
  };

  // Handle title edit finish
  const handleTitleEditFinish = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() && editTitle !== originalTitleRef.current) {
      handleTitleChange(editTitle);
    } else {
      setEditTitle(originalTitleRef.current);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link
              href="/"
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-blue-600 hover:underline flex items-center gap-2 shrink-0"
          >
            ← Back
          </Link>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleEditFinish}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleEditFinish();
                  } else if (e.key === "Escape") {
                    setIsEditingTitle(false);
                    setEditTitle(originalTitleRef.current);
                  }
                }}
                autoFocus
                className="text-lg font-semibold w-full px-2 py-1 rounded border border-blue-500 focus:outline-none"
              />
            ) : (
              <h1
                onClick={() => {
                  setIsEditingTitle(true);
                  originalTitleRef.current = title;
                  setEditTitle(title);
                }}
                className="text-lg font-semibold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded truncate"
              >
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-sm text-gray-500">
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && (
                <span className="text-green-600">Saved</span>
              )}
              {saveStatus === "unsaved" && "Unsaved changes"}
              {saveStatus === "error" && (
                <span className="text-red-600">Couldn&apos;t save</span>
              )}
              {saveStatus === "idle" && ""}
            </div>
            <button
              onClick={openShareDialog}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
            >
              Share
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded border border-gray-200 shadow-sm">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            disabled={false}
          />
        </div>
      </main>

      {isShareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 id="share-dialog-title" className="text-lg font-semibold text-gray-900">
                Share &quot;{title || "Untitled Document"}&quot;
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsShareOpen(false);
                  setShareError(null);
                  setShareSuccess(null);
                  setSelectedUserId("");
                }}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close share dialog"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4">
              {shareError && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {shareError}
                </div>
              )}

              {shareSuccess && (
                <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {shareSuccess}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select a person...
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setShareError(null);
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a person...</option>
                  {shareUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleShareUser}
                  disabled={isSharing || !selectedUserId}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSharing ? "Sharing..." : "Share"}
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  People with access
                </h3>

                <div className="space-y-3">
                  {owner && (
                    <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
                      <div>
                        <div className="font-medium text-gray-900">{owner.name}</div>
                        <div className="text-sm text-gray-500">{owner.email}</div>
                      </div>
                      <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                        Owner
                      </span>
                    </div>
                  )}

                  {shares.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
                      No shared users yet.
                    </div>
                  ) : (
                    shares.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            Can edit
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveShare(user.id)}
                            disabled={shareActionLoading === user.id}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {shareActionLoading === user.id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
