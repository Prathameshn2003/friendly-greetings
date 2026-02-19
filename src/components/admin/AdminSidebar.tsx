import { useAuth } from "@/hooks/useAuth";
import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  BookOpen,
  FileText,
  Stethoscope,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "Schemes", url: "/admin/schemes", icon: FileText },
  { title: "Add Doctor", url: "/admin/add-doctor", icon: Stethoscope }, // ✅ Updated icon
];

export const AdminSidebar = () => {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // 🔒 If not admin → do not show sidebar
  if (!isAdmin) return null;

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 🔹 Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 lg:hidden shadow-lg bg-card h-12 w-12"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* 🔹 Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🔹 Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-16 sm:top-20 left-0 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] w-64 bg-card border-r border-border z-40 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4 px-3">
            Admin Panel
          </h2>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive(item.url)
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive(item.url)
                      ? "text-destructive"
                      : "group-hover:text-destructive"
                  )}
                />

                <span className="flex-1">{item.title}</span>

                {isActive(item.url) && (
                  <ChevronRight className="w-4 h-4 text-destructive" />
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};
