import { useNavigate } from "react-router-dom";
import { PortalLoader } from "../components/Feedback/PortalLoader";
import { StudentPortalView } from "../components/Portal/StudentPortal.view";
import { useLogin } from "../context/LoginContext";
import { StudentProvider, useStudent } from "../context/StudentContext";

function StudentPortalContent() {
    const navigate = useNavigate();
    const { clearSession, logout } = useLogin();
    const { error, loading, student } = useStudent();

    const handleSignOut = async () => {
        try {
            await logout();
        } catch (error) {
            console.warn(error.message);
        } finally {
            navigate("/", { replace: true });
        }
    };

    const handlePasswordChanged = () => {
        clearSession();
        navigate("/", { replace: true });
    };

    if (loading) return <PortalLoader />;

    if (!student) {
        return (
            <main className="portal-canvas flex min-h-screen items-center justify-center p-5 text-itx-ink">
                <section className="portal-surface w-full max-w-lg rounded-4xl border p-7 text-center sm:p-9">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#128a93]">Student portal</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-itx-ink">No student profile is available.</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {error || "Ask the lab administrator to create your account, then log in with the assigned student ID."}
                    </p>
                    <button className="mt-6 h-12 rounded-2xl bg-[#128a93] px-6 text-sm font-bold text-white" onClick={handleSignOut} type="button">
                        Return to login
                    </button>
                </section>
            </main>
        );
    }

    return <StudentPortalView onPasswordChanged={handlePasswordChanged} student={student} />;
}

export default function StudentPortalPage() {
    return (
        <StudentProvider>
            <StudentPortalContent />
        </StudentProvider>
    );
}
