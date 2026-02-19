import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Prevent back navigation after logout
  useEffect(() => {
    if (!user && location.pathname !== "/login" && location.pathname !== "/signup") {
      window.history.replaceState(null, "", "/login");
    }
  }, [user, location.pathname]);

  // Show loader while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin route protection
  if (requireAdmin === true && isAdmin !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content
  return <>{children}</>;
};
