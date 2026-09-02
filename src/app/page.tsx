"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserSwitcher } from "@/components/UserSwitcher";
import {
  markdownToTipTapDocument,
  validateImportFile,
} from "@/lib/import";

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  ownerId: string;
  ownerName?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ownedDocs, setOwnedDocs] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const handleFileImport = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validateImportFile(file);
    if (!validation.valid) {
      setImportStatus({
        type: "error",
        text: validation.error ?? "The file could not be imported.",
      });
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus({ type: "info", text: "Importing file..." });

      const text = await file.text();
      if (!text.trim()) {
        setImportStatus({ type: "error", text: "The file is empty after reading it." });
        return;
      }

      const title = validation.title;
      const importedDocument = markdownToTipTapDocument(text);
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: JSON.stringify(importedDocument),
        }),
      });

      if (!response.ok) {
        throw new Error("Document creation failed");
      }

      const doc = await response.json();
      setImportStatus({
        type: "success",
        text: `Imported and created “${title}”.`,
      });
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      console.error(err);
      setImportStatus({
        type: "error",
        text: "The file could not be imported. Please try another .txt or .md file.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setError(null);

        // Get current user
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.push("/");
          return;
        }
        const user = await userRes.json();
        setCurrentUser(user);

        // Get documents
        const docsRes = await fetch("/api/documents");
        if (!docsRes.ok) {
          setError("Failed to load documents");
          return;
        }
        const docs = await docsRes.json();
        setOwnedDocs(docs.owned || []);
        setSharedDocs(docs.shared || []);
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const handleNewDocument = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
          content: JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph" }],
          }),
        }),
      });

      if (response.ok) {
        const doc = await response.json();
        router.push(`/documents/${doc.id}`);
      } else {
        setError("Failed to create document");
      }
    } catch (err) {
      setError("Failed to create document");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Ajaia Docs</h1>
            <UserSwitcher />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Ajaia Docs</h1>
          <UserSwitcher />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Welcome, {currentUser?.name}
            </h2>
            <p className="text-gray-600">Start writing or open a document</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isCreating}
              className="px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded font-medium hover:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 transition"
            >
              {isImporting ? "Importing..." : "Import .txt / .md"}
            </button>
            <button
              onClick={handleNewDocument}
              disabled={isCreating || isImporting}
              className="px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {isCreating ? "Creating..." : "+ New Document"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleFileImport(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {importStatus && (
          <div
            className={`mb-6 rounded border px-4 py-3 text-sm ${
              importStatus.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : importStatus.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {importStatus.text}
          </div>
        )}

        {ownedDocs.length === 0 && sharedDocs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create a new document to get started
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isCreating}
                className="px-5 py-2 bg-white text-gray-700 border border-gray-200 rounded font-medium hover:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 transition"
              >
                {isImporting ? "Importing..." : "Import .txt / .md"}
              </button>
              <button
                onClick={handleNewDocument}
                disabled={isCreating || isImporting}
                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isCreating ? "Creating..." : "+ New Document"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {ownedDocs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  My Documents
                </h3>
                <div className="grid gap-4">
                  {ownedDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="p-4 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow transition"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {doc.title}
                        </h4>
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          You own this
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Last updated {formatDate(doc.updatedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sharedDocs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Shared with Me
                </h3>
                <div className="grid gap-4">
                  {sharedDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="p-4 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow transition"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {doc.title}
                        </h4>
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          Shared
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Owner: {doc.ownerName || "Unknown user"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Last updated {formatDate(doc.updatedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
