import { ChevronRight, LogOut } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
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
export function Sidebar({ collapsed = false, mobileClose = false, onNavigate }) {
    const navigate = useNavigate();
    const location = useLocation();
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
                className={`flex min-h-18 shrink-0 items-center border-b border-slate-200/80 transition-[padding] duration-300 ease-smooth xl:min-h-20 ${collapsed ? "justify-center px-3" : "px-5"} ${mobileClose ? "pr-14" : ""}`}
            >
                <Link className={mobileClose ? "min-w-0" : "shrink-0"} to="/">
                    {collapsed ? (
                            <img alt="ITX Learning Hub" className="h-14 shrink-0 object-cover object-center" src={itxShort} />
                    ) : (
                        <img
                            alt="ITX Learning Hub"
                            className={`h-9 w-auto max-w-full object-contain ${mobileClose ? "" : "shrink-0"}`}
                            src={itxLogo}
                        />
                    )}
                </Link>
            </div>

            <nav
                aria-label={config.ariaLabel}
                className={`hidden-scrollbar flex-1 space-y-2.5 overflow-y-auto py-5 transition-[padding] duration-300 ease-smooth ${collapsed ? "px-2" : "px-4"}`}
            >
                {!collapsed && <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Workspace</p>}
                {config.navigation.map((item) => {
                    const Icon = item.icon;
                    const availabilityUsesBookingEntry = item.path === "/portal/book" && location.pathname === "/portal/availability";
                    return (
                        <NavLink
                            className={({ isActive }) => `${navigationLinkClass(isActive || availabilityUsesBookingEntry)}${collapsed ? " admin-nav-link-collapsed" : ""}`}
                            end={item.end}
                            key={item.path}
                            onClick={onNavigate}
                            style={{ gap: collapsed ? "0px" : "0.75rem" }}
                            title={collapsed ? item.label : undefined}
                            to={item.path}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={navigationIconClass(isActive || availabilityUsesBookingEntry)}>
                                        <Icon className="size-[1.3rem]" strokeWidth={1.9} />
                                    </span>
                                    <span
                                        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-smooth ${collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"}`}
                                    >
                                        {item.label}
                                    </span>
                                    {!collapsed && <ChevronRight className={navigationArrowClass(isActive || availabilityUsesBookingEntry)} />}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div
                className={`sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl transition-[padding] duration-300 ease-smooth ${collapsed ? "p-2" : "p-4"}`}
            >
                <button
                    className={`flex w-full items-center rounded-xl border border-transparent py-2.5 text-sm font-semibold text-slate-500 transition-all duration-300 ease-smooth hover:border-[#e8cdd2] hover:bg-[#fff6f7] hover:text-[#a34854] ${collapsed ? "justify-center px-0" : "px-3"}`}
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
