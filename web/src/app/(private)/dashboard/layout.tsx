"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AuthGuard from "@/components/AuthGuard";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true}>
      <SubscriptionProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[260px_1fr] bg-accent-dark text-neutral-100">
            {/* Sidebar - Hidden on mobile, shown on lg+ */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            <div className="flex flex-col flex-1 lg:col-start-2">
              <Topbar />
              <main className="flex-1 overflow-auto p-2 sm:p-4">{children}</main>
            </div>
          </div>
        </ErrorBoundary>
      </SubscriptionProvider>
    </AuthGuard>
  );
}
