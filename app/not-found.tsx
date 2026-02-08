import { Header } from "@/components/header";
import { Search } from "lucide-react";
import Link from "next/link";

/**
 * Custom 404 page matching the app's visual design.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen pt-16 bg-background">
      <Header />
      <div className="flex items-center justify-center px-4 py-24">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Search className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-4xl font-bold text-foreground">404</h2>
          <p className="text-lg text-muted-foreground">
            This page doesn&apos;t exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Go Home
            </Link>
            <Link
              href="/swap"
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
            >
              Open Swap
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
