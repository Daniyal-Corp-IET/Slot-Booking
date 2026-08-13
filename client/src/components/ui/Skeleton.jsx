import { cn } from "../../utils/cn";

// Shimmering placeholder block. Compose these into shapes that mirror the
// real content so loading states read as "this card is on its way" instead
// of a generic spinner.
export function Skeleton({ className }) {
    return <div aria-hidden="true" className={cn("ui-skeleton rounded-lg", className)} />;
}
