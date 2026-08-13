import { cn } from "../../utils/cn";
import { Skeleton } from "../ui/Skeleton";

const CARD_SURFACE = "admin-surface overflow-hidden rounded-[22px] border";

// Mirrors the student card grid rendered by StudentsView so the loading
// state keeps the same rhythm and card shapes as the real content.
export function StudentCardSkeletonGrid({ count = 4 }) {
    return (
        <div aria-hidden="true" className="grid gap-5 p-4 sm:p-6 xl:grid-cols-2" role="presentation">
            {Array.from({ length: count }, (_, index) => (
                <div className={cn(CARD_SURFACE, "border-[#cadcdf]")} key={index}>
                    <div className="flex items-start gap-3.5 border-b border-[#dce9ea] bg-[linear-gradient(135deg,#f7fbfb_0%,#eef7f7_100%)] p-4 sm:px-5">
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2 py-0.5">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                    </div>
                    <div className="space-y-4 p-4 sm:p-5">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Skeleton className="h-10 rounded-xl" />
                            <Skeleton className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Mirrors the course card grid rendered by CoursesView.
export function CourseCardSkeletonGrid({ count = 3 }) {
    return (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="presentation">
            {Array.from({ length: count }, (_, index) => (
                <div className={cn(CARD_SURFACE, "border-[#cfe1e3] p-4")} key={index}>
                    <div className="flex items-center gap-3">
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-11 w-14 shrink-0 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Mirrors the timeline + segment table rendered once a system's day
// schedule finishes loading.
export function TimelineSkeleton() {
    return (
        <div aria-hidden="true" className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]" role="presentation">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <div className="overflow-hidden rounded-2xl border border-itx-border bg-slate-50">
                <div className="space-y-2 border-b border-itx-border bg-slate-50 px-4 py-3.5">
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                </div>
                <div className="space-y-3 p-4">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton className="h-8 w-full rounded-lg" key={index} />
                    ))}
                </div>
            </div>
        </div>
    );
}
