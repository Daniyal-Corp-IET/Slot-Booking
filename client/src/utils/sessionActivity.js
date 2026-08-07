export function formatActivityMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) return `${remainder} min`;
    if (remainder === 0) return `${hours} hr`;
    return `${hours} hr ${remainder} min`;
}
