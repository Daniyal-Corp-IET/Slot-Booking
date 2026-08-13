import { Skeleton } from "../ui/Skeleton";

// Shown on the login route while the existing session is being checked.
// Mirrors the login card's shape on the same dark canvas so there is no
// color flash before the real form (or a redirect) takes over.
export function LoginCardSkeleton() {
    return (
        <main
            aria-label="Checking your session"
            className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#06191f] px-5"
            role="status"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_46%,rgba(48,150,167,0.22),transparent_28rem),linear-gradient(145deg,#06181e_0%,#07313a_52%,#041419_100%)]"
            />
            <div className="w-full max-w-[27rem] overflow-hidden rounded-[26px] border border-white/10 bg-white/95 px-6 py-7 shadow-[0_38px_110px_-32px_rgba(0,0,0,0.6)] sm:px-9 sm:py-9">
                <div className="mb-7 flex flex-col items-center gap-4">
                    <Skeleton className="h-11 w-40 rounded-lg" />
                    <Skeleton className="h-3.5 w-56 rounded" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-[52px] w-full rounded-xl" />
                    <Skeleton className="h-[52px] w-full rounded-xl" />
                    <Skeleton className="h-[52px] w-full rounded-xl" />
                </div>
            </div>
        </main>
    );
}
