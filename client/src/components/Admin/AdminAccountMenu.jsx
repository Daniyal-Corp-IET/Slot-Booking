import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../../context/LoginContext";
import { AppDialog, Toast } from "../Feedback/Feedback";
import { joinClasses } from "./AdminPanel.helpers";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, method, values) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: values ? JSON.stringify(values) : undefined,
        });
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
}

const formField =
    "h-12 w-full rounded-xl border border-itx-border bg-white px-3.5 text-sm font-semibold text-itx-ink outline-none transition focus:border-[#128a93] focus:ring-4 focus:ring-[#128a93]/10";

function PasswordField({ autoComplete, id, label, onChange, value }) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label className="block text-sm font-bold text-slate-600" htmlFor={id}>
                {label}
            </label>
            <div className="relative mt-2">
                <input
                    autoComplete={autoComplete}
                    className={`${formField} pr-12`}
                    id={id}
                    minLength="8"
                    onChange={onChange}
                    required
                    type={visible ? "text" : "password"}
                    value={value}
                />
                <button
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#128a93]/10 hover:text-[#128a93]"
                    onClick={() => setVisible((current) => !current)}
                    type="button"
                >
                    {visible ? <EyeOff aria-hidden="true" className="size-4.5" /> : <Eye aria-hidden="true" className="size-4.5" />}
                </button>
            </div>
        </div>
    );
}

function ProfileDialog({ onClose, open }) {
    const { updateUser, user } = useLogin();
    const [tab, setTab] = useState("details");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [detailsMessage, setDetailsMessage] = useState("");
    const [detailsSaving, setDetailsSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [toast, setToast] = useState("");

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFullName(user?.name || "");
        setEmail(user?.email || "");
        setUsername(user?.username || "");
        setPhoneNumber(user?.phoneNumber || "");
        setTab("details");
        setDetailsMessage("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMessage("");
    }, [open, user]);

    const saveDetails = async (event) => {
        event.preventDefault();
        try {
            setDetailsSaving(true);
            setDetailsMessage("");
            const data = await apiRequest("/admins/me", "PATCH", {
                fullName: fullName.trim(),
                email: email.trim(),
                username: username.trim(),
                phoneNumber: phoneNumber.trim(),
            });
            updateUser({
                email: data.admin.email,
                username: data.admin.username,
                name: data.admin.fullName,
                phoneNumber: data.admin.phoneNumber,
            });
            setToast("Profile updated successfully.");
        } catch (error) {
            setDetailsMessage(error.message);
        } finally {
            setDetailsSaving(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMessage("New password and confirmation do not match.");
            return;
        }
        try {
            setPasswordSaving(true);
            setPasswordMessage("");
            await apiRequest("/admins/me/password", "PATCH", { currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setToast("Password updated successfully.");
        } catch (error) {
            setPasswordMessage(error.message);
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <>
            <AppDialog description="Manage your administrator account details and password." onClose={onClose} open={open} title="My profile">
                <div className="mb-5 flex gap-1.5 rounded-2xl border border-itx-border bg-slate-50 p-1.5">
                    <button
                        className={joinClasses(
                            "flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                            tab === "details" ? "bg-white text-itx-ink shadow-sm" : "text-slate-500 hover:text-itx-ink",
                        )}
                        onClick={() => setTab("details")}
                        type="button"
                    >
                        Profile details
                    </button>
                    <button
                        className={joinClasses(
                            "flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                            tab === "password" ? "bg-white text-itx-ink shadow-sm" : "text-slate-500 hover:text-itx-ink",
                        )}
                        onClick={() => setTab("password")}
                        type="button"
                    >
                        Change password
                    </button>
                </div>

                {tab === "details" ? (
                    <form className="space-y-4" onSubmit={saveDetails}>
                        <label className="block text-sm font-bold text-slate-600">
                            Full name
                            <input
                                autoComplete="name"
                                className={`${formField} mt-2`}
                                onChange={(event) => setFullName(event.target.value)}
                                required
                                value={fullName}
                            />
                        </label>
                        <label className="block text-sm font-bold text-slate-600">
                            Email
                            <input
                                autoComplete="email"
                                className={`${formField} mt-2`}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                type="email"
                                value={email}
                            />
                        </label>
                        <label className="block text-sm font-bold text-slate-600">
                            Username
                            <input
                                autoCapitalize="none"
                                autoComplete="username"
                                className={`${formField} mt-2`}
                                minLength="3"
                                onChange={(event) => setUsername(event.target.value)}
                                pattern="[a-zA-Z0-9._-]{3,30}"
                                required
                                value={username}
                            />
                            <span className="mt-1.5 block text-xs font-medium text-slate-400">Use 3 to 30 letters, numbers, dots, dashes, or underscores.</span>
                        </label>
                        <label className="block text-sm font-bold text-slate-600">
                            Phone number <span className="font-medium text-slate-400">(optional)</span>
                            <input
                                autoComplete="tel"
                                className={`${formField} mt-2`}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                type="tel"
                                value={phoneNumber}
                            />
                        </label>
                        {detailsMessage && (
                            <p className="rounded-xl bg-itx-danger/15 px-3 py-2.5 text-sm font-semibold text-itx-danger" role="alert">
                                {detailsMessage}
                            </p>
                        )}
                        <button
                            className="h-12 w-full rounded-2xl bg-[#128a93] px-5 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={detailsSaving}
                            type="submit"
                        >
                            {detailsSaving ? "Saving..." : "Save changes"}
                        </button>
                    </form>
                ) : (
                    <form className="space-y-4" onSubmit={savePassword}>
                        <PasswordField
                            autoComplete="current-password"
                            id="current-password"
                            label="Current password"
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            value={currentPassword}
                        />
                        <PasswordField
                            autoComplete="new-password"
                            id="new-password"
                            label="New password"
                            onChange={(event) => setNewPassword(event.target.value)}
                            value={newPassword}
                        />
                        <PasswordField
                            autoComplete="new-password"
                            id="confirm-password"
                            label="Confirm new password"
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            value={confirmPassword}
                        />
                        <span className="block text-xs font-medium text-slate-400">Use at least 8 characters.</span>
                        {passwordMessage && (
                            <p className="rounded-xl bg-itx-danger/15 px-3 py-2.5 text-sm font-semibold text-itx-danger" role="alert">
                                {passwordMessage}
                            </p>
                        )}
                        <button
                            className="h-12 w-full rounded-2xl bg-[#128a93] px-5 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={passwordSaving}
                            type="submit"
                        >
                            {passwordSaving ? "Updating..." : "Update password"}
                        </button>
                    </form>
                )}
            </AppDialog>
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
        </>
    );
}

// Click-to-open account menu for the signed-in admin: profile editing and sign out.
// Used in both the topbar (desktop/tablet) and the sidebar (mobile drawer + desktop rail).
export function AdminAccountMenu({ align = "end", placement = "bottom", trigger }) {
    const navigate = useNavigate();
    const { logout } = useLogin();
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        function handlePointerDown(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
        }
        function handleKeyDown(event) {
            if (event.key === "Escape") setOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    async function signOut() {
        setOpen(false);
        try {
            await logout();
        } finally {
            navigate("/", { replace: true });
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                aria-expanded={open}
                aria-haspopup="menu"
                className="ui-press flex w-full items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-[#128a93]/15"
                onClick={() => setOpen((current) => !current)}
                type="button"
            >
                {trigger}
            </button>
            {open && (
                <div
                    className={joinClasses(
                        "ui-fade-in absolute z-20 w-56 overflow-hidden rounded-2xl border border-itx-border bg-white p-1.5 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.25)]",
                        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
                        align === "end" ? "right-0" : "left-0",
                    )}
                    role="menu"
                >
                    <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-itx-ink transition hover:bg-slate-100"
                        onClick={() => {
                            setOpen(false);
                            setProfileOpen(true);
                        }}
                        role="menuitem"
                        type="button"
                    >
                        <UserRound className="size-4 text-slate-500" />
                        My profile
                    </button>
                    <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                        onClick={signOut}
                        role="menuitem"
                        type="button"
                    >
                        <LogOut className="size-4 text-slate-500" />
                        Log out
                    </button>
                </div>
            )}
            <ProfileDialog onClose={() => setProfileOpen(false)} open={profileOpen} />
        </div>
    );
}
