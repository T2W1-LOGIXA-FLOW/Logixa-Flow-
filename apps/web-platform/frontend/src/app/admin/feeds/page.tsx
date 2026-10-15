"use client";

import React from "react";
import FeedManager from "../../../components/FeedManager";

export default function FeedsPage() {
  return (
    <main className="page-shell">
      <div className="admin-panel">
        <h1 className="text-2xl font-bold mb-4">Feed Management</h1>
        <FeedManager />
      </div>
    </main>
  );
}
