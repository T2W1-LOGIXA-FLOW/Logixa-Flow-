"use client";

import React from "react";
import FeedManager from "../../../components/FeedManager";

export default function FeedsPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 12 }}>Feed Management</h1>
      <FeedManager />
    </div>
  );
}
