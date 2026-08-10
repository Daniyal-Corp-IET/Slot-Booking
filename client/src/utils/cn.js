// Joins conditional className fragments, dropping falsy values.
export function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
