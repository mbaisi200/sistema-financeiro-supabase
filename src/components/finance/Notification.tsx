'use client';

import React from 'react';

export function NotificationArea({ children }: { children: React.ReactNode }) {
  return <div className="notification-area">{children}</div>;
}

export function Notification({ children, type }: { children: React.ReactNode; type: 'success' | 'error' }) {
  return <div className={`notification ${type}`}>{children}</div>;
}
