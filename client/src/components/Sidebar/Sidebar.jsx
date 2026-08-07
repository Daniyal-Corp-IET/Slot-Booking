import { ChevronRight, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import itxLogo from "../../assets/itx-logo.png";
import { useLogin } from "../../context/LoginContext";
import { ADMIN_NAVIGATION } from "../Admin/AdminPanel.helpers";
import { STUDENT_NAVIGATION } from "../Portal/StudentPortal.helpers";

const ROLE_SIDEBAR = {
    admin: {
        navigation: ADMIN_NAVIGATION,
        tagline: "Administration",
        ariaLabel: "Admin navigation",
        showLiveBadge: true,
    },
    student: {
        navigation: STUDENT_NAVIGATION,
        tagline: "Student workspace",
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
            <div className="border-b border-white/8 px-6 py-6">
                <div className="brand-pass relative overflow-hidden rounded-2xl border border-white/8 px-4 py-3 shadow-[0_16px_35px_-24px_rgba(83,198,207,0.75)]">
                    <span aria-hidden="true" className="absolute -right-8 -top-8 size-20 rounded-full bg-[#53c6cf]/10 blur-xl" />
                    <img alt="ITX Learning Hub" className="h-auto w-full object-contain" src={itxLogo} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#53c6cf]">LabSlot</p>
                        <p className="mt-1 text-sm font-semibold text-white">{config.tagline}</p>
                    </div>
                    {config.showLiveBadge && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#65d4b0]/20 bg-[#65d4b0]/8 px-2.5 py-1 text-[10px] font-bold text-[#8be6c7]">
                            <span className="size-1.5 rounded-full bg-[#65d4b0] shadow-[0_0_10px_rgba(101,212,176,0.8)]" />
                            LIVE
                        </span>
                    )}
                </div>
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

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/8 bg-[#082a35]/95 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/6 bg-white/5 p-3 shadow-inner">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#ffd487,#eaaa4b)] text-xs font-black text-[#17303c] shadow-[0_8px_20px_-12px_rgba(244,189,104,0.9)]">
                        {identity.initials}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{identity.name}</p>
                        <p className="truncate text-[11px] text-white/65">{identity.subtitle}</p>
                    </div>
                </div>
                <button
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-white/65 transition duration-300 hover:border-white/8 hover:bg-white/7 hover:text-white"
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
