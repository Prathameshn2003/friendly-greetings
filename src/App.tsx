import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
// ScrollToTop handled by useScrollToTop hook in DashboardLayout

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Lazy load other pages
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const Profile = lazy(() => import("./pages/Profile"));
const Modules = lazy(() => import("./pages/Modules"));
const PCOSModule = lazy(() => import("./pages/PCOSModule"));
const MenstrualModule = lazy(() => import("./pages/MenstrualModule"));
const MenopauseModule = lazy(() => import("./pages/MenopauseModule"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const Doctors = lazy(() => import("./pages/Doctors"));
const Schemes = lazy(() => import("./pages/Schemes"));
const HealthResources = lazy(() => import("./pages/HealthResources"));
const Hygiene = lazy(() => import("./pages/Hygiene"));
const Education = lazy(() => import("./pages/Education"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));

const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages - lazy loaded
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminDoctorsPage = lazy(() => import("./pages/admin/AdminDoctorsPage"));
const AdminResourcesPage = lazy(() => import("./pages/admin/AdminResourcesPage"));
const AdminSchemesPage = lazy(() => import("./pages/admin/AdminSchemesPage"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse flex flex-col items-center gap-2">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
              <Route path="/modules/pcos" element={<ProtectedRoute><PCOSModule /></ProtectedRoute>} />
              <Route path="/modules/menstrual" element={<ProtectedRoute><MenstrualModule /></ProtectedRoute>} />
              <Route path="/modules/menopause" element={<ProtectedRoute><MenopauseModule /></ProtectedRoute>} />
              <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
              <Route path="/doctors" element={<ProtectedRoute><Doctors /></ProtectedRoute>} />
              <Route path="/schemes" element={<ProtectedRoute><Schemes /></ProtectedRoute>} />
              <Route path="/health-resources" element={<ProtectedRoute><HealthResources /></ProtectedRoute>} />
              <Route path="/hygiene" element={<ProtectedRoute><Hygiene /></ProtectedRoute>} />
              <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
              
              {/* Redirect old education paths to modules */}
              <Route path="/education/pcos" element={<Navigate to="/modules/pcos" replace />} />
              <Route path="/education/menopause" element={<Navigate to="/modules/menopause" replace />} />
              <Route path="/education/menstrual" element={<Navigate to="/modules/menstrual" replace />} />
              
              {/* Admin routes - protected and require admin role */}
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>} />
              <Route path="/admin/doctors" element={<ProtectedRoute requireAdmin><AdminDoctorsPage /></ProtectedRoute>} />
              <Route path="/admin/resources" element={<ProtectedRoute requireAdmin><AdminResourcesPage /></ProtectedRoute>} />
              <Route path="/admin/schemes" element={<ProtectedRoute requireAdmin><AdminSchemesPage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
