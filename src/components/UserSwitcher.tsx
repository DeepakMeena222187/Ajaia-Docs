"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserSwitcher() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };

    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const users = await response.json();
          setUsers(users);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
    loadUsers();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const response = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsOpen(false);
        // Refresh the page to reload dashboard
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to switch user:", error);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        {currentUser?.name || "Guest"}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSwitchUser(user.id)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentUser?.id === user.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
