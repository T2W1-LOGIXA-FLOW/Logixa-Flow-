"use client";

import { ReactNode } from "react";
import Button from "./shadcn/Button";

interface ErrorStateProps {
  icon?: string;
  title?: string;
  description: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  action?: ReactNode;
}

export default function ErrorState({
  icon = "⚠️",
  title = "Something went wrong",
  description,
  actionLabel = "Try again",
  actionOnClick,
  action,
}: ErrorStateProps) {
  return (
    <div className="empty-state error">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {(action || actionOnClick) && (
        <div className="empty-state-action">
          {action ?? (
            <Button type="button" onClick={actionOnClick} variant="default">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
