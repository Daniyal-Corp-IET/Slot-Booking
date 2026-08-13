import { UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../../utils/cn";
import { surface } from "../AdminPanel.view";

export function NotFoundView() {
    return (
        <div className={cn(surface, "mx-auto max-w-xl p-10 text-center text-itx-ink")}>
            <UserRound className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-xl font-bold">Admin page not found</h2>
            <p className="mt-2 text-sm text-slate-500">Return to the operations overview to continue.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-[#3096A7] px-4 py-2.5 text-xs font-bold text-white" to="/admin">
                Back to overview
            </Link>
        </div>
    );
}
