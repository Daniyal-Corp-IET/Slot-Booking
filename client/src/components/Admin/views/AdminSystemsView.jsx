import { useEffect, useState } from "react";
import { Check, Monitor, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { isSystemUnavailable } from "../../../context/LabContext.helpers";
import { useToast } from "../../../hooks/useToast";
import { apiRequest } from "../../../utils/apiClient";
import { cn } from "../../../utils/cn";
import { formatActivityMinutes } from "../../../utils/sessionActivity";
import { AppDialog, ConfirmDialog, EmptyState, LoadingState, Toast } from "../../Feedback/Feedback";
import { EditableSystemTimeline } from "../../SystemCanvas/EditableSystemTimeline";
import { SYSTEM_STYLES, formatMinutes, historyDates } from "../AdminPanel.helpers";
import { AdminAction, AdminReveal, surface } from "../AdminPanel.view";
import { StatusBadge } from "../../ui/StatusBadge";

function getSystemHistory(systemId, date) {
    return apiRequest(`/systems/${systemId}/history?date=${date}`);
}

function clearSystemOutage(systemId, outageId) {
    return apiRequest(`/systems/${systemId}/outages/${outageId}`, "DELETE");
}

function updateSystemOutage(systemId, outageId, startsAt, endsAt) {
    const values = {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
    };

    return apiRequest(`/systems/${systemId}/outages/${outageId}`, "PATCH", values);
}

// System management page
export function SystemsView() {
    const { addSystem, bookings, markSystemAvailable, markSystemUnavailable, policy, removeSystem, systems: savedSystems, systemOutages } = useLab();
    const [filter, setFilter] = useState("all");
    const [selectedId, setSelectedId] = useState(1);
    const [historyDate, setHistoryDate] = useState(() => historyDates()[0].key);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [pendingTimelineAction, setPendingTimelineAction] = useState(null);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const { dismissToast, showToast, toastMessage } = useToast();
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [historySegments, setHistorySegments] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const systems = [];

    for (const savedSystem of savedSystems) {
        const hasActiveOutage = isSystemUnavailable(systemOutages, savedSystem.id, now);
        let status = "available";

        if (savedSystem.status === "unavailable" || hasActiveOutage) {
            status = "offline";
        }

        systems.push({ ...savedSystem, status });
    }

    const selected = systems.find((system) => system.id === selectedId) ?? systems[0];
    const selectedOutage = systemOutages.find((outage) => outage.systemId === selected?.id && isSystemUnavailable([outage], selected?.id, now));

    function systemHasBookings(systemId) {
        for (const booking of bookings) {
            const bookingEnd = booking.startsAt + booking.bookedMinutes * 60_000;

            const belongsToSystem = booking.systemId === systemId;
            const isStillRelevant = booking.status !== "Cancelled" && booking.status !== "Completed";
            const hasNotEnded = bookingEnd > now;

            if (belongsToSystem && isStillRelevant && hasNotEnded) return true;
        }

        return false;
    }

    const selectedHasBookings = systemHasBookings(selected?.id);
    const visibleSystems = [];

    for (const system of systems) {
        if (filter === "all" || system.status === filter) visibleSystems.push(system);
    }
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!selected?.id || !historyVisible) return;
        let pageIsOpen = true;

        async function loadHistory() {
            try {
                const data = await getSystemHistory(selected.id, historyDate);
                if (pageIsOpen) setHistorySegments(data.segments);
            } catch (error) {
                if (pageIsOpen) showToast(error.message);
            } finally {
                if (pageIsOpen) setHistoryLoading(false);
            }
        }

        loadHistory();

        return () => {
            pageIsOpen = false;
        };
    }, [bookings, historyDate, historyVisible, selected?.id, showToast, systemOutages]);
    const refreshHistory = async (systemId = selected.id) => {
        if (!historyVisible) return;
        const data = await getSystemHistory(systemId, historyDate);
        setHistorySegments(data.segments);
        setHistoryLoading(false);
    };
    const makeAvailable = async (system = selected) => {
        try {
            setSelectedId(system.id);
            await markSystemAvailable(system.id);
            await refreshHistory(system.id);
            showToast(`System ${String(system.id).padStart(2, "0")} is available again.`);
        } catch (error) {
            showToast(error.message);
        }
    };
    const openStatusDialog = (system = selected) => {
        setSelectedId(system.id);
        setStatusDialogOpen(true);
    };
    const showSystemHistory = (system = selected) => {
        setSelectedId(system.id);
        setPendingTimelineAction(null);
        setHistoryVisible(true);
    };
    const makeUnavailable = async () => {
        try {
            await markSystemUnavailable(selected.id, null);
            await refreshHistory(selected.id);
            setStatusDialogOpen(false);
            showToast(`System ${String(selected.id).padStart(2, "0")} is now unavailable.`);
        } catch (error) {
            showToast(error.message);
        }
    };
    const saveTimelineAction = async () => {
        if (!pendingTimelineAction) return;
        const [year, month, day] = historyDate.split("-").map(Number);
        const selectedStart = new Date(year, month - 1, day, 0, pendingTimelineAction.startMinutes).getTime();
        let startsAt = selectedStart;
        const resizingStartedOutage =
            pendingTimelineAction.action === "resize-unavailable" && pendingTimelineAction.actualStartsAt < Date.now();

        if (resizingStartedOutage) startsAt = pendingTimelineAction.actualStartsAt;
        const endsAt = new Date(year, month - 1, day, 0, pendingTimelineAction.endMinutes).getTime();

        try {
            if (pendingTimelineAction.action === "manage-unavailable") {
                await clearSystemOutage(selected.id, pendingTimelineAction.referenceId);
            } else if (pendingTimelineAction.action === "resize-unavailable") {
                await updateSystemOutage(selected.id, pendingTimelineAction.referenceId, startsAt, endsAt);
            } else {
                await markSystemUnavailable(selected.id, endsAt, startsAt);
            }
            let actionMessage = "Unavailable time added";

            if (pendingTimelineAction.action === "manage-unavailable") {
                actionMessage = "Unavailable period removed";
            } else if (pendingTimelineAction.action === "resize-unavailable") {
                actionMessage = "Unavailable period updated";
            }
            setPendingTimelineAction(null);
            await refreshHistory(selected.id);
            showToast(`${actionMessage} for System ${String(selected.id).padStart(2, "0")}.`);
        } catch (error) {
            showToast(error.message);
        }
    };
    const addNewSystem = async () => {
        try {
            setSaving(true);
            const system = await addSystem();
            setSelectedId(system.id);
            setFilter("all");
            showToast(`System ${String(system.id).padStart(2, "0")} was added.`);
        } catch (error) {
            showToast(error.message);
        } finally {
            setSaving(false);
        }
    };
    const confirmRemove = async () => {
        try {
            await removeSystem(selected.id);
            setRemoveDialogOpen(false);

            const nextSystem = systems.find((system) => system.id !== selected.id);
            setSelectedId(nextSystem?.id ?? 0);
            showToast(`System ${String(selected.id).padStart(2, "0")} was removed.`);
        } catch (error) {
            setRemoveDialogOpen(false);
            showToast(error.message);
        }
    };
    const currentDateTime = new Date(now);
    const nextAvailableInterval = Math.ceil((currentDateTime.getHours() * 60 + currentDateTime.getMinutes()) / 5) * 5;
    const todayHistoryKey = historyDates()[0].key;
    const historyCanBeEdited = historyDate >= todayHistoryKey;
    let historyMinimumMinutes = policy.openMinutes;
    if (historyDate === todayHistoryKey) historyMinimumMinutes = nextAvailableInterval;
    return (
        <div className="mx-auto max-w-400 space-y-5">
            <AdminReveal className="grid gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
                <section className={cn(surface, "overflow-hidden p-5 text-itx-ink sm:p-6")}>
                    <div className="relative -mx-5 -mt-5 overflow-hidden border-b border-itx-border bg-slate-50 p-5 sm:-mx-6 sm:-mt-6 sm:p-6">
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#3096A7]">Lab operations</p>
                                <h2 className="mt-2 text-lg font-bold">System inventory</h2>
                                <p className="mt-1 text-sm text-slate-500">{systems.length} workstations currently registered in the lab.</p>
                            </div>
                            <AdminAction
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-4 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(48,150,167,0.55)] transition hover:bg-[#287f8e] disabled:opacity-60"
                                disabled={saving}
                                onClick={addNewSystem}
                                type="button"
                            >
                                <Plus className="size-4" />
                                {saving ? "Adding..." : "Add system"}
                            </AdminAction>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-itx-border bg-slate-50 p-1.5 shadow-inner">
                        {["all", "available", "offline"].map((option) => (
                            <button
                                className={cn(
                                    "relative min-h-9 overflow-hidden rounded-xl px-3 py-2 text-xs font-bold capitalize transition",
                                    filter === option
                                        ? "text-white shadow-[0_8px_18px_-12px_rgba(18,138,147,0.6)]"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-itx-ink",
                                )}
                                key={option}
                                onClick={() => setFilter(option)}
                                type="button"
                            >
                                {filter === option && <span aria-hidden="true" className="absolute inset-0 bg-[#3096A7]" />}
                                <span className="relative">{option === "offline" ? "Unavailable" : option}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-500">Around five systems are shown at once. Scroll inside the list for more.</p>
                    <div className="mt-3 hidden max-h-104 snap-y overflow-auto rounded-2xl border border-itx-border shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_16px_38px_-34px_rgba(15,23,42,0.2)] md:block">
                        <table className="w-full border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-extrabold uppercase tracking-[0.09em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-3.5">System</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-4 py-3.5">Availability</th>
                                    <th className="px-4 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-transparent">
                                {visibleSystems.map((system) => {
                                    const outage = systemOutages.find((item) => item.systemId === system.id && isSystemUnavailable([item], system.id, now));
                                    const hasBookings = systemHasBookings(system.id);
                                    return (
                                        <tr
                                            className={cn(
                                                "group cursor-pointer snap-start transition-colors duration-150 hover:bg-slate-50",
                                                selected.id === system.id && "bg-[#3096A7]/8",
                                            )}
                                            key={system.id}
                                            onClick={() => showSystemHistory(system)}
                                        >
                                            <td className="px-4 py-4">
                                                <button
                                                    className="flex items-center gap-3 text-left"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        showSystemHistory(system);
                                                    }}
                                                    type="button"
                                                >
                                                    <span className="flex size-10 items-center justify-center rounded-xl border border-itx-border bg-white text-[#3096A7] shadow-sm transition-colors duration-150 group-hover:border-[#3096A7]/40">
                                                        <Monitor className="size-4.5" />
                                                    </span>
                                                    <span className="text-sm font-extrabold text-itx-ink">System {String(system.id).padStart(2, "0")}</span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge
                                                    dotClassName={system.status === "available" ? "bg-itx-success" : "bg-slate-400"}
                                                    emphasis="medium"
                                                    label={system.status === "available" ? "Available" : "Unavailable"}
                                                    toneClassName={system.status === "available" ? "bg-itx-success/12 text-itx-success" : "bg-slate-100 text-slate-500"}
                                                />
                                            </td>
                                            <td className="px-4 py-4 text-sm font-medium text-slate-500">
                                                {outage
                                                    ? outage.endsAt
                                                        ? `Until ${new Date(outage.endsAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                                        : "Until changed by admin"
                                                    : "Open for bookings"}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {system.status === "available" ? (
                                                        <button
                                                            className={cn(
                                                                "rounded-xl px-3 py-2 text-xs font-bold transition",
                                                                hasBookings
                                                                    ? "bg-itx-warning/15 text-[#8a5a13] hover:bg-itx-warning/25"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                                                            )}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openStatusDialog(system);
                                                            }}
                                                            type="button"
                                                        >
                                                            {hasBookings ? "Booking scheduled" : "Mark unavailable"}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="rounded-xl bg-itx-success/12 px-3 py-2 text-xs font-bold text-itx-success transition hover:bg-itx-success/20"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                makeAvailable(system);
                                                            }}
                                                            type="button"
                                                        >
                                                            Make available
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 grid max-h-104 snap-y gap-3 overflow-y-auto pr-1 md:hidden">
                        {visibleSystems.map((system) => (
                            <button
                                className={cn(
                                    "flex snap-start items-center gap-3 rounded-2xl border p-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.15)] transition-colors duration-150",
                                    selected.id === system.id
                                        ? "border-[#3096A7] bg-[#3096A7]/8 ring-2 ring-[#3096A7]/15"
                                        : "border-itx-border bg-slate-50",
                                )}
                                key={system.id}
                                onClick={() => showSystemHistory(system)}
                                type="button"
                            >
                                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-[#3096A7] shadow-sm">
                                    <Monitor className="size-5" />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-sm font-extrabold text-itx-ink">System {String(system.id).padStart(2, "0")}</span>
                                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                                        {system.status === "available" ? "Open for bookings" : "Unavailable to students"}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "size-2.5 rounded-full shadow-[0_0_9px_currentColor]",
                                        system.status === "available" ? "bg-itx-success text-itx-success" : "bg-slate-300 text-slate-300",
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    {visibleSystems.length === 0 && (
                        <div className="mt-5">
                            <EmptyState message="No systems match this filter." />
                        </div>
                    )}
                </section>

                <aside className={cn(surface, "h-fit overflow-hidden 2xl:sticky 2xl:top-28")}>
                    <div className="premium-hero relative overflow-hidden p-6 text-itx-ink">
                        <div className="flex items-start justify-between">
                            <span className="relative flex h-13 w-13 items-center justify-center rounded-2xl border border-itx-border bg-white/70 shadow-inner backdrop-blur-sm">
                                <Monitor className="h-6 w-6" />
                            </span>
                            <StatusBadge
                                className="relative border"
                                dotClassName={selected.status === "available" ? "bg-itx-success shadow-[0_0_9px_rgba(23,168,112,0.6)]" : "bg-slate-400"}
                                label={SYSTEM_STYLES[selected.status].label}
                                toneClassName={
                                    selected.status === "available"
                                        ? "border-itx-success/20 bg-itx-success/12 text-itx-success"
                                        : "border-itx-border bg-white/70 text-slate-600"
                                }
                            />
                        </div>
                        <p className="mt-6 text-xs font-semibold text-slate-600">Selected workstation</p>
                        <h3 className="mt-1 text-3xl font-bold tracking-[-0.05em] text-itx-ink">System {String(selected.id).padStart(2, "0")}</h3>
                    </div>
                    <div className="p-6">
                        <div
                            className={cn(
                                "rounded-2xl border p-4",
                                selected.status === "available" ? "border-itx-success/25 bg-itx-success/10" : "border-itx-border bg-slate-50",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn("size-3 rounded-full", selected.status === "available" ? "bg-itx-success" : "bg-slate-400")} />
                                <div>
                                    <p className="text-sm font-bold text-itx-ink">{selected.status === "available" ? "Ready for bookings" : "Not available to students"}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {selectedOutage
                                            ? selectedOutage.endsAt
                                                ? `Automatically available ${new Date(selectedOutage.endsAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                                : "Stays unavailable until an admin changes it"
                                            : "Open for student bookings"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {selected.status === "offline" && (
                                <AdminAction
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-itx-success px-4 text-sm font-bold text-white shadow-[0_14px_26px_-17px_rgba(23,168,112,0.6)] transition hover:bg-[#128a5c]"
                                    onClick={() => makeAvailable(selected)}
                                    type="button"
                                >
                                    <Check className="size-4" /> Mark available now
                                </AdminAction>
                            )}
                            {selected.status === "available" && (
                                <AdminAction
                                    className={cn(
                                        "min-h-12 w-full rounded-2xl border px-4 text-sm font-bold transition",
                                        selectedHasBookings
                                            ? "border-itx-warning/30 bg-itx-warning/15 text-[#8a5a13] hover:bg-itx-warning/25"
                                            : "border-itx-border text-itx-ink transition hover:bg-slate-100",
                                    )}
                                    onClick={() => openStatusDialog(selected)}
                                    type="button"
                                >
                                    {selectedHasBookings ? "Cancel booked slots first" : "Unavailable until changed"}
                                </AdminAction>
                            )}
                            <button
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-itx-danger/30 bg-itx-danger/10 px-4 text-sm font-bold text-itx-danger transition hover:bg-itx-danger/20"
                                onClick={() => setRemoveDialogOpen(true)}
                                type="button"
                            >
                                <Trash2 className="size-4" /> Remove system
                            </button>
                        </div>
                    </div>
                </aside>
            </AdminReveal>
            {historyVisible && (
                <AdminReveal className={cn(surface, "overflow-hidden p-5 text-itx-ink sm:p-6")}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3096A7]">Next seven days</p>
                            <h2 className="mt-2 text-xl font-bold">System {String(selected.id).padStart(2, "0")} day schedule</h2>
                            <p className="mt-1 text-sm text-slate-500">Review bookings and manage system availability from today onward.</p>
                        </div>
                        <button
                            className="min-h-10 rounded-xl border border-itx-border px-4 text-xs font-bold text-itx-ink transition hover:border-[#3096A7]/40"
                            onClick={() => setHistoryVisible(false)}
                            type="button"
                        >
                            Hide schedule
                        </button>
                    </div>
                    <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
                        {historyDates().map((date) => (
                            <button
                                aria-pressed={historyDate === date.key}
                                className={cn(
                                    "min-w-21 rounded-xl border px-3 py-2.5 text-left transition",
                                    historyDate === date.key ? "border-[#3096A7] bg-[#3096A7]/12 text-[#287f8e]" : "border-itx-border bg-slate-50 text-slate-500",
                                )}
                                key={date.key}
                                onClick={() => {
                                    setHistoryDate(date.key);
                                    setPendingTimelineAction(null);
                                }}
                                type="button"
                            >
                                <span className="block text-xs font-bold">{date.day}</span>
                                <span className="mt-0.5 block text-sm font-extrabold">{date.label}</span>
                            </button>
                        ))}
                    </div>
                    {historyLoading ? (
                        <div className="mt-5">
                            <LoadingState message="Loading day history..." />
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
                            <div>
                                <EditableSystemTimeline
                                    closeMinutes={policy.closeMinutes}
                                    currentTime={now}
                                    editable={historyCanBeEdited}
                                    minEditableMinutes={historyMinimumMinutes}
                                    onSelectRange={setPendingTimelineAction}
                                    openMinutes={policy.openMinutes}
                                    segments={historySegments}
                                    selectedRange={pendingTimelineAction}
                                />
                                {pendingTimelineAction && (
                                    <div className="ui-fade-in mt-3 flex flex-col gap-3 rounded-2xl border border-itx-danger/25 bg-itx-danger/8 p-4 shadow-[0_14px_30px_-24px_rgba(224,99,122,0.35)] sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-itx-danger">
                                                {pendingTimelineAction.action === "make-unavailable"
                                                    ? "Selected available time"
                                                    : "Selected unavailable period"}
                                            </p>
                                            <p className="mt-1 text-base font-bold tabular-nums text-itx-ink">
                                                {formatMinutes(pendingTimelineAction.startMinutes)} – {formatMinutes(pendingTimelineAction.endMinutes)}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                {formatActivityMinutes(pendingTimelineAction.endMinutes - pendingTimelineAction.startMinutes)} selected
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="min-h-11 rounded-xl border border-itx-border px-4 text-sm font-bold text-itx-ink transition hover:bg-slate-100"
                                                onClick={() => setPendingTimelineAction(null)}
                                                type="button"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                className="min-h-11 rounded-xl bg-itx-danger px-4 text-sm font-bold text-white transition hover:bg-[#c94f63]"
                                                onClick={saveTimelineAction}
                                                type="button"
                                            >
                                                {pendingTimelineAction.action === "manage-unavailable"
                                                    ? "Remove unavailable period"
                                                    : pendingTimelineAction.action === "resize-unavailable"
                                                      ? "Save new time"
                                                      : "Make unavailable"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-itx-border bg-slate-50">
                                <div className="border-b border-itx-border bg-slate-50 px-4 py-3.5">
                                    <h3 className="text-sm font-bold text-itx-ink">Daily availability table</h3>
                                    <p className="mt-1 text-xs text-slate-500">A simple summary of the continuous timeline.</p>
                                </div>
                                <div className="max-h-120 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-slate-100 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3">From</th>
                                                <th className="px-4 py-3">To</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historySegments.map((segment, index) => (
                                                <tr className="transition hover:bg-slate-100" key={`${segment.startMinutes}-${segment.status}-${index}`}>
                                                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-600">
                                                        {formatMinutes(segment.startMinutes)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-600">
                                                        {formatMinutes(segment.endMinutes)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge
                                                            className="tracking-[0.05em]"
                                                            label={segment.status}
                                                            toneClassName={cn(
                                                                segment.status === "available" && "bg-itx-success/12 text-itx-success",
                                                                segment.status === "booked" && "bg-itx-info/12 text-itx-info",
                                                                segment.status === "unavailable" && "bg-itx-danger/12 text-itx-danger",
                                                            )}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminReveal>
            )}
            <AppDialog
                description={
                    selectedHasBookings
                        ? "This system already has an active or upcoming booking."
                        : "Use this only when the system should remain unavailable with no automatic return time."
                }
                footer={
                    <>
                        <button
                            className="min-h-12 rounded-2xl border border-itx-border px-5 text-sm font-bold text-itx-ink transition hover:bg-slate-100"
                            onClick={() => setStatusDialogOpen(false)}
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            className="min-h-12 rounded-2xl bg-itx-danger px-5 text-sm font-bold text-white transition hover:bg-[#c94f63] disabled:cursor-not-allowed disabled:bg-itx-danger/30"
                            disabled={selectedHasBookings}
                            onClick={makeUnavailable}
                            type="button"
                        >
                            Confirm until changed
                        </button>
                    </>
                }
                onClose={() => setStatusDialogOpen(false)}
                open={statusDialogOpen}
                title={`System ${String(selected.id).padStart(2, "0")} availability`}
            >
                {selectedHasBookings ? (
                    <div className="rounded-2xl border border-itx-warning/30 bg-itx-warning/10 p-4">
                        <p className="text-sm font-bold text-[#8a5a13]">Cancel booked slots first</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Cancel this system's active or upcoming bookings before making it unavailable until changed.
                        </p>
                        <Link
                            className="mt-3 inline-flex rounded-xl bg-itx-success px-4 py-2.5 text-xs font-bold text-white"
                            onClick={() => setStatusDialogOpen(false)}
                            to="/admin/bookings"
                        >
                            Open booking management
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-itx-danger/30 bg-itx-danger/10 p-4">
                        <p className="text-sm font-bold text-itx-danger">Unavailable until manually restored</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Students will see this system in red and cannot book it until an administrator restores availability.
                        </p>
                    </div>
                )}
                <p className="mt-4 text-sm leading-6 text-slate-500">
                    For a specific temporary period, open the system’s day history and select an available timestamp.
                </p>
            </AppDialog>
            <ConfirmDialog
                confirmLabel="Remove system"
                description={`System ${String(selected.id).padStart(2, "0")} will no longer appear to students. Its previous booking and availability history will be preserved.`}
                onClose={() => setRemoveDialogOpen(false)}
                onConfirm={confirmRemove}
                open={removeDialogOpen}
                title="Remove this system?"
            />
            {toastMessage && <Toast message={toastMessage} onClose={dismissToast} />}
        </div>
    );
}
