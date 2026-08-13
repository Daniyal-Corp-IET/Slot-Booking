import { Bell, ChevronDown, Menu } from "lucide-react";
import { useLogin } from "../../context/LoginContext";
import { AdminAccountMenu } from "../Admin/AdminAccountMenu";

// Sticky top bar shared by both roles: mobile menu button, page title, notifications, user avatar
export function Navbar({ identity, onMenuOpen, onNotificationsOpen, page }) {
    const { user } = useLogin();
    const isAdmin = user?.role === "admin";
    const avatar = (
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#073844] text-xs font-black text-white shadow-[0_12px_24px_-14px_rgba(7,56,68,0.7)]">
            {identity.initials}
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#3ee7c2]" />
        </span>
    );
    const nameBlock = (
        <div className="hidden min-w-0 text-left lg:block">
            <p className="max-w-36 truncate text-xs font-extrabold text-itx-ink">{identity.name}</p>
            <p className="mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-400">{identity.subtitle}</p>
        </div>
    );

    return (
        <header className="shell-topbar sticky top-0 z-30 border-b backdrop-blur-2xl">
            <div className="flex min-h-18 items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:min-h-20 xl:px-10">
                <button
                    aria-label="Open navigation"
                    className="ui-press flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#073844] shadow-[0_8px_20px_-14px_rgba(7,56,68,0.4)] hover:border-[#3096A7]/35 hover:text-[#3096A7] xl:hidden"
                    onClick={onMenuOpen}
                    type="button"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-bold tracking-[-0.035em] text-itx-ink sm:text-2xl">{page.title}</h1>
                    {page.description && <p className="mt-0.5 hidden text-[11px] font-medium text-slate-400 xl:block">{page.description}</p>}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        aria-label="Notifications"
                        className="ui-press relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_-14px_rgba(7,56,68,0.35)] hover:border-[#3096A7]/35 hover:text-[#3096A7] sm:size-11"
                        onClick={onNotificationsOpen}
                        type="button"
                    >
                        <Bell className="size-[18px]" strokeWidth={1.9} />
                        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#3096A7] shadow-[0_0_8px_rgba(48,150,167,0.55)] ring-2 ring-white" />
                    </button>
                    <div className="hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 shadow-[0_10px_28px_-20px_rgba(7,56,68,0.36)] sm:flex">
                        {isAdmin ? (
                            <AdminAccountMenu
                                trigger={
                                    <>
                                        {avatar}
                                        {nameBlock}
                                        <ChevronDown className="hidden size-3.5 shrink-0 text-slate-400 lg:block" />
                                    </>
                                }
                            />
                        ) : (
                            <>
                                {avatar}
                                {nameBlock}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
