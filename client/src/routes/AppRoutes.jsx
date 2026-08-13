import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShellSkeleton } from "../components/Feedback/AppShellSkeleton";
import { useLogin } from "../context/LoginContext";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";

const AdminPanelPage = lazy(() => import("../pages/AdminPanelPage"));
const StudentPortalPage = lazy(() => import("../pages/StudentPortalPage"));
const StudentHomePage = lazy(() => import("../pages/student/StudentHomePage"));
const StudentAvailabilityPage = lazy(() => import("../pages/student/StudentAvailabilityPage"));
const StudentBookSlotPage = lazy(() => import("../pages/student/StudentBookSlotPage"));
const StudentHistoryPage = lazy(() => import("../pages/student/StudentHistoryPage"));
const StudentNotFoundPage = lazy(() => import("../pages/student/StudentNotFoundPage"));
const AdminOverviewPage = lazy(() => import("../pages/admin/AdminOverviewPage"));
const AdminSystemsPage = lazy(() => import("../pages/admin/AdminSystemsPage"));
const AdminBookingsPage = lazy(() => import("../pages/admin/AdminBookingsPage"));
const AdminStudentsPage = lazy(() => import("../pages/admin/AdminStudentsPage"));
const AdminCoursesPage = lazy(() => import("../pages/admin/AdminCoursesPage"));
const AdminReportsPage = lazy(() => import("../pages/admin/AdminReportsPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const AdminNotFoundPage = lazy(() => import("../pages/admin/AdminNotFoundPage"));

function ProtectedRoute({ children, role }) {
    const { loading, user } = useLogin();

    if (loading) return <AppShellSkeleton />;
    if (!user) return <Navigate replace to="/" />;
    if (user.role !== role) {
        let homePage = "/portal";
        if (user.role === "admin") homePage = "/admin";
        return <Navigate replace to={homePage} />;
    }

    return children;
}

export default function AppRoutes() {
    const location = useLocation();
    let routeGroup = "login";
    if (location.pathname.startsWith("/portal")) routeGroup = "student";
    if (location.pathname.startsWith("/admin")) routeGroup = "admin";

    return (
        <Routes key={routeGroup} location={location}>
            <Route
                element={
                    <div className="ui-page-enter">
                        <LoginPage />
                    </div>
                }
                path="/"
            />
            <Route
                element={
                    <ProtectedRoute role="student">
                        <div className="ui-page-enter">
                            <Suspense fallback={<AppShellSkeleton />}>
                                <StudentPortalPage />
                            </Suspense>
                        </div>
                    </ProtectedRoute>
                }
                path="/portal"
            >
                <Route element={<StudentHomePage />} index />
                <Route element={<StudentAvailabilityPage />} path="availability" />
                <Route element={<StudentBookSlotPage />} path="book" />
                <Route element={<StudentHistoryPage />} path="history" />
                <Route element={<StudentNotFoundPage />} path="*" />
            </Route>
            <Route
                element={
                    <ProtectedRoute role="admin">
                        <div className="ui-page-enter">
                            <Suspense fallback={<AppShellSkeleton />}>
                                <AdminPanelPage />
                            </Suspense>
                        </div>
                    </ProtectedRoute>
                }
                path="/admin"
            >
                <Route element={<AdminOverviewPage />} index />
                <Route element={<AdminSystemsPage />} path="systems" />
                <Route element={<AdminBookingsPage />} path="bookings" />
                <Route element={<AdminStudentsPage />} path="students" />
                <Route element={<AdminCoursesPage />} path="courses" />
                <Route element={<AdminReportsPage />} path="reports" />
                <Route element={<AdminSettingsPage />} path="settings" />
                <Route element={<AdminNotFoundPage />} path="*" />
            </Route>
            <Route element={<NotFoundPage />} path="*" />
        </Routes>
    );
}
