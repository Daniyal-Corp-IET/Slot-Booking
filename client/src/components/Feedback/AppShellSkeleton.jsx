import { Skeleton } from "../ui/Skeleton";

const NAV_ROWS = 5;

// Full-page placeholder shown while the workspace shell (sidebar, navbar,
// content) is still loading — mirrors the real layout so nothing jumps once
// the actual shell mounts, instead of a centered spinner.
export function AppShellSkeleton() {
    return (
        <div aria-label="Loading your workspace" className="relative flex min-h-screen bg-itx-canvas" role="status">
            <aside className="hidden w-72 shrink-0 flex-col border-r border-itx-border bg-white/70 p-5 xl:flex">
                <Skeleton className="h-9 w-36 rounded-lg" />
                <div className="mt-8 space-y-2.5">
                    {Array.from({ length: NAV_ROWS }, (_, index) => (
                        <Skeleton className="h-12 w-full rounded-2xl" key={index} />
                    ))}
                </div>
                <Skeleton className="mt-auto h-11 w-full rounded-xl" />
            </aside>
            <div className="flex min-h-screen flex-1 flex-col">
                <header className="flex min-h-18 items-center gap-4 border-b border-itx-border bg-white/85 px-4 sm:px-6 xl:min-h-20 xl:px-10">
                    <Skeleton className="size-10 rounded-xl xl:hidden" />
                    <Skeleton className="h-6 w-40 rounded-lg" />
                    <div className="ml-auto flex items-center gap-3">
                        <Skeleton className="size-10 rounded-xl" />
                        <Skeleton className="h-10 w-10 rounded-2xl sm:w-32" />
                    </div>
                </header>
                <main className="flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6 xl:px-10 xl:py-7">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {Array.from({ length: 3 }, (_, index) => (
                            <Skeleton className="h-18 rounded-2xl" key={index} />
                        ))}
                    </div>
                    <Skeleton className="h-96 w-full rounded-[22px]" />
                </main>
            </div>
        </div>
    );
}
