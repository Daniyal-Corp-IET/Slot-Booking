import { ChevronRight, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import itxLogo from "../../assets/itx-logo.png";
import itxShort from "../../assets/short.png";
import { useLogin } from "../../context/LoginContext";
import { ADMIN_NAVIGATION } from "../Admin/AdminPanel.helpers";
import { STUDENT_NAVIGATION } from "../Portal/StudentPortal.helpers";

const ROLE_SIDEBAR = {
    admin: {
        navigation: ADMIN_NAVIGATION,
        ariaLabel: "Admin navigation",
    },
    student: {
        navigation: STUDENT_NAVIGATION,
        ariaLabel: "Student navigation",
    },
};

function navigationLinkClass(isActive) {
    return isActive ? "admin-nav-link admin-nav-link-active" : "admin-nav-link";
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
export function Sidebar({ collapsed = false, identity, onNavigate }) {
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
            <div
                className={`flex min-h-18 shrink-0 items-center border-b border-itx-border transition-[padding] duration-300 ease-smooth xl:min-h-20 ${collapsed ? "px-4" : "px-6"}`}
            >
                <Link className="shrink-0" to="/">
                    {collapsed ? (
                        <span className="block size-12 shrink-0 overflow-hidden rounded-lg">
                            <img alt="ITX Learning Hub" className="h-12 w-12 shrink-0 object-cover object-center" src={itxShort} />
                        </span>
                    ) : (
                        <img alt="ITX Learning Hub" className="h-9 w-auto max-w-full shrink-0 object-contain" src={itxLogo} />
                    )}
                </Link>
            </div>

            <nav
                aria-label={config.ariaLabel}
                className={`hidden-scrollbar flex-1 space-y-1.5 overflow-y-auto py-5 transition-[padding] duration-300 ease-smooth ${collapsed ? "px-2" : "px-4"}`}
            >
                {config.navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            className={({ isActive }) => navigationLinkClass(isActive)}
                            end={item.end}
                            key={item.path}
                            onClick={onNavigate}
                            style={{ gap: collapsed ? "0px" : "0.75rem" }}
                            title={collapsed ? item.label : undefined}
                            to={item.path}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={navigationIconClass(isActive)}>
                                        <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
                                    </span>
                                    <span
                                        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-smooth ${collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"}`}
                                    >
                                        {item.label}
                                    </span>
                                    {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b9f5ee]" />}
                                    {!collapsed && <ChevronRight className={navigationArrowClass(isActive)} />}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div
                className={`sticky bottom-0 z-10 shrink-0 border-t border-itx-border bg-white/95 backdrop-blur-xl transition-[padding] duration-300 ease-smooth ${collapsed ? "p-2" : "p-4"}`}
            >
                <div
                    className="mb-3 flex items-center rounded-2xl border border-itx-border bg-slate-50 p-3 shadow-inner"
                    style={{ gap: collapsed ? "0px" : "0.75rem" }}
                    title={collapsed ? identity.name : undefined}
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#ffd487,#eaaa4b)] text-xs font-black text-[#5a3a10] shadow-[0_8px_20px_-12px_rgba(244,189,104,0.6)]">
                        {identity.initials}
                    </span>
                    <div
                        className={`min-w-0 overflow-hidden transition-all duration-300 ease-smooth ${collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"}`}
                    >
                        <p className="truncate text-sm font-bold text-itx-ink">{identity.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{identity.subtitle}</p>
                    </div>
                </div>
                <button
                    className={`flex w-full items-center rounded-xl border border-transparent py-2.5 text-sm font-semibold text-slate-500 transition-all duration-300 ease-smooth hover:border-itx-border hover:bg-slate-100 hover:text-itx-ink ${collapsed ? "px-6" : "px-3"}`}
                    onClick={signOut}
                    style={{ gap: collapsed ? "0px" : "0.75rem" }}
                    title={collapsed ? "Log out" : undefined}
                    type="button"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span
                        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-smooth ${collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"}`}
                    >
                        Log out
                    </span>
                </button>
            </div>
        </div>
    );
}
