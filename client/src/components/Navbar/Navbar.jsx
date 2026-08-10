import { Bell, Menu } from "lucide-react";

// Sticky top bar shared by both roles: mobile menu button, page title, notifications, user avatar
export function Navbar({ identity, onMenuOpen, onNotificationsOpen, page }) {
    return (
        <header className="shell-topbar sticky top-0 z-30 border-b shadow-[0_14px_35px_-32px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
            <div className="flex min-h-18 items-center gap-4 px-4 sm:px-6 lg:px-8 xl:min-h-20 xl:px-10">
                <button
                    aria-label="Open navigation"
                    className="ui-press rounded-xl border border-itx-border bg-white p-2.5 text-itx-ink shadow-sm xl:hidden"
                    onClick={onMenuOpen}
                    type="button"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-bold tracking-[-0.03em] text-itx-ink sm:text-2xl">{page.title}</h1>
                    {page.description && <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{page.description}</p>}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        aria-label="Notifications"
                        className="ui-press relative rounded-xl border border-itx-border bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-[#128a93]/40 hover:text-[#128a93] hover:shadow-[0_10px_25px_-17px_rgba(18,138,147,0.5)]"
                        onClick={onNotificationsOpen}
                        type="button"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e3ac5c] shadow-[0_0_9px_rgba(227,172,92,0.7)] ring-2 ring-white" />
                    </button>
                    <div className="hidden items-center gap-3 border-l border-itx-border pl-3 sm:flex">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#128a93,#0d6169)] text-xs font-black text-white shadow-[0_10px_22px_-14px_rgba(13,97,105,0.65)]">
                            {identity.initials}
                        </span>
                        <div className="hidden xl:block">
                            <p className="text-xs font-bold text-itx-ink">{identity.name}</p>
                            <p className="text-[11px] text-slate-500">{identity.subtitle}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
