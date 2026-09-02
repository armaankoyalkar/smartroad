/**
 * Route table (docs/architecture.md section 4). Every page is lazy-loaded from a fixed path
 * under src/pages so page work can proceed without touching this file.
 *
 *   /            /login  /register  /admin/login  /map          PublicLayout
 *   /app/...                                                    AppLayout   (RequireAuth)
 *   /admin/...                                                  AdminLayout (RequireAuth + RequireRole admin)
 *   *                                                           NotFound inside PublicLayout
 */
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireRole } from "@/auth/RequireRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { PageSkeleton } from "@/components/ui/Skeleton";

// Public
const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const LoginPage = lazy(() => import("@/pages/public/LoginPage"));
const AdminLoginPage = lazy(() => import("@/pages/public/AdminLoginPage"));
const RegisterPage = lazy(() => import("@/pages/public/RegisterPage"));
const MapPage = lazy(() => import("@/pages/public/MapPage"));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));

// Citizen
const CitizenDashboardPage = lazy(() => import("@/pages/citizen/CitizenDashboardPage"));
const ReportIncidentPage = lazy(() => import("@/pages/citizen/ReportIncidentPage"));
const EditIncidentPage = lazy(() => import("@/pages/citizen/EditIncidentPage"));
const MyReportsPage = lazy(() => import("@/pages/citizen/MyReportsPage"));
const IncidentDetailsPage = lazy(() => import("@/pages/citizen/IncidentDetailsPage"));
const ProfilePage = lazy(() => import("@/pages/citizen/ProfilePage"));

// Admin
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const IncidentManagementPage = lazy(() => import("@/pages/admin/IncidentManagementPage"));
const AdminIncidentDetailsPage = lazy(() => import("@/pages/admin/AdminIncidentDetailsPage"));
const AdminMapPage = lazy(() => import("@/pages/admin/AdminMapPage"));
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"));
const RiskEstimationPage = lazy(() => import("@/pages/admin/RiskEstimationPage"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="app" element={<AppLayout />}>
              <Route index element={<CitizenDashboardPage />} />
              <Route path="report" element={<ReportIncidentPage />} />
              <Route path="reports" element={<MyReportsPage />} />
              <Route path="reports/:id" element={<IncidentDetailsPage />} />
              <Route path="reports/:id/edit" element={<EditIncidentPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route element={<RequireRole role="admin" />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="incidents" element={<IncidentManagementPage />} />
                <Route path="incidents/:id" element={<AdminIncidentDetailsPage />} />
                <Route path="map" element={<AdminMapPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="risk" element={<RiskEstimationPage />} />
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
