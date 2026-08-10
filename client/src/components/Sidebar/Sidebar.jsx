import { ChevronRight, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import itxLogo from "../../assets/itx-logo.png";
import { useLogin } from "../../context/LoginContext";
import { ADMIN_NAVIGATION } from "../Admin/AdminPanel.helpers";
import { STUDENT_NAVIGATION } from "../Portal/StudentPortal.helpers";

const ROLE_SIDEBAR = {
    admin: {
        navigation: ADMIN_NAVIGATION,
        ariaLabel: "Admin navigation",
        showLiveBadge: true,
    },
    student: {
        navigation: STUDENT_NAVIGATION,
        ariaLabel: "Student navigation",
        showLiveBadge: false,
    },
};

function navigationLinkClass(isActive) {
    if (isActive) return "admin-nav-link admin-nav-link-active";
    return "admin-nav-link";
}

function navigationIconClass(isActive) {
    if (isActive) return "admin-nav-icon admin-nav-icon-active";
    return "admin-nav-icon";
}

function navigationArrowClass(isActive) {
    if (isActive) return "admin-nav-arrow admin-nav-arrow-active";
    return "admin-nav-arrow";
}

// Sidebar content shared between the fixed desktop rail and the mobile slide-out drawer.
// Navigation links and branding are selected from the signed-in user's role.
export function Sidebar({ identity, onNavigate }) {
    const navigate = useNavigate();
    const { logout, user } = useLogin();
    const role = user?.role === "admin" ? "admin" : "student";
    const config = ROLE_SIDEBAR[role];

    async function signOut() {
        try {
            await logout();
        } finally {
            navigate("/", { replace: true });
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex min-h-18 shrink-0 items-center justify-between gap-3 border-b border-itx-border px-6 xl:min-h-20">
                <img alt="ITX Learning Hub" className="h-8 w-auto object-contain" src={itxLogo} />
                {config.showLiveBadge && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-itx-success/25 bg-itx-success/10 px-2.5 py-1 text-[10px] font-bold text-itx-success">
                        <span className="size-1.5 rounded-full bg-itx-success shadow-[0_0_10px_rgba(23,168,112,0.6)]" />
                        LIVE
                    </span>
                )}
            </div>

            <nav aria-label={config.ariaLabel} className="hidden-scrollbar flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
                {config.navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink className={({ isActive }) => navigationLinkClass(isActive)} end={item.end} key={item.path} onClick={onNavigate} to={item.path}>
                            {({ isActive }) => (
                                <>
                                    <span className={navigationIconClass(isActive)}>
                                        <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
                                    </span>
                                    <span>{item.label}</span>
                                    {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b9f5ee]" />}
                                    <ChevronRight className={navigationArrowClass(isActive)} />
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-itx-border bg-white/95 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-itx-border bg-slate-50 p-3 shadow-inner">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#ffd487,#eaaa4b)] text-xs font-black text-[#5a3a10] shadow-[0_8px_20px_-12px_rgba(244,189,104,0.6)]">
                        {identity.initials}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-itx-ink">{identity.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{identity.subtitle}</p>
                    </div>
                </div>
                <button
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-500 transition duration-300 hover:border-itx-border hover:bg-slate-100 hover:text-itx-ink"
                    onClick={signOut}
                    type="button"
                >
                    <LogOut className="h-4 w-4" />
                    Log out
                </button>
            </div>
        </div>
    );
}
