import { Bell, Menu } from "lucide-react";

// Sticky top bar shared by both roles: mobile menu button, page title, notifications, user avatar
export function Navbar({ identity, onMenuOpen, onNotificationsOpen, page }) {
    return (
        <header className="shell-topbar sticky top-0 z-30 border-b border-white/10 shadow-[0_14px_35px_-32px_rgba(10,45,56,0.85)] backdrop-blur-2xl">
            <div className="flex min-h-18 items-center gap-4 px-4 sm:px-6 lg:px-8 xl:min-h-20 xl:px-10">
                <button
                    aria-label="Open navigation"
                    className="ui-press rounded-xl border border-white/15 bg-white/5 p-2.5 text-white xl:hidden"
                    onClick={onMenuOpen}
                    type="button"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl">{page.title}</h1>
                    {page.description && <p className="mt-0.5 hidden text-xs text-white/60 sm:block">{page.description}</p>}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        aria-label="Notifications"
                        className="ui-press relative rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/70 transition hover:border-[#2f9db0]/40 hover:text-[#2f9db0] hover:shadow-[0_10px_25px_-17px_rgba(31,184,196,0.8)]"
                        onClick={onNotificationsOpen}
                        type="button"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f0b65e] shadow-[0_0_9px_rgba(240,182,94,0.85)] ring-2 ring-[#0f2f38]" />
                    </button>
                    <div className="hidden items-center gap-3 border-l border-white/15 pl-3 sm:flex">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#2f9db0,#128793)] text-xs font-black text-[#082330] shadow-[0_10px_22px_-14px_rgba(15,48,60,0.85)]">
                            {identity.initials}
                        </span>
                        <div className="hidden xl:block">
                            <p className="text-xs font-bold text-white">{identity.name}</p>
                            <p className="text-[11px] text-white/60">{identity.subtitle}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
