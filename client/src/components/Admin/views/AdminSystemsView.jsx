import { useEffect, useState } from "react";
import { Check, Monitor, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { isSystemUnavailable } from "../../../context/LabContext.helpers";
import { formatActivityMinutes } from "../../../utils/sessionActivity";
import { AppDialog, ConfirmDialog, EmptyState, Toast } from "../../Feedback/Feedback";
import { EditableSystemTimeline } from "../../SystemCanvas/EditableSystemTimeline";
import { SYSTEM_STYLES, formatMinutes, historyDates, joinClasses } from "../AdminPanel.helpers";
import { AdminAction, AdminReveal, surface } from "../AdminPanel.view";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, method = "GET", values) {
    let response;
    const requestOptions = {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    };

    if (values) requestOptions.body = JSON.stringify(values);

    try {
        response = await fetch(`${API_URL}${path}`, requestOptions);
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

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
    const [toast, setToast] = useState("");
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
                if (pageIsOpen) setToast(error.message);
            } finally {
                if (pageIsOpen) setHistoryLoading(false);
            }
        }

        loadHistory();

        return () => {
            pageIsOpen = false;
        };
    }, [bookings, historyDate, historyVisible, selected?.id, systemOutages]);
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
            setToast(`System ${String(system.id).padStart(2, "0")} is available again.`);
        } catch (error) {
            setToast(error.message);
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
            setToast(`System ${String(selected.id).padStart(2, "0")} is now unavailable.`);
        } catch (error) {
            setToast(error.message);
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
            setToast(`${actionMessage} for System ${String(selected.id).padStart(2, "0")}.`);
        } catch (error) {
            setToast(error.message);
        }
    };
    const addNewSystem = async () => {
        try {
            setSaving(true);
            const system = await addSystem();
            setSelectedId(system.id);
            setFilter("all");
            setToast(`System ${String(system.id).padStart(2, "0")} was added.`);
        } catch (error) {
            setToast(error.message);
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
            setToast(`System ${String(selected.id).padStart(2, "0")} was removed.`);
        } catch (error) {
            setRemoveDialogOpen(false);
            setToast(error.message);
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
                <section className={joinClasses(surface, "overflow-hidden p-5 text-white sm:p-6")}>
                    <div className="relative -mx-5 -mt-5 overflow-hidden border-b border-white/10 bg-white/5 p-5 sm:-mx-6 sm:-mt-6 sm:p-6">
                        <span aria-hidden="true" className="absolute -right-14 -top-16 size-40 rounded-full bg-[#2f9db0]/10 blur-2xl" />
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#2f9db0]">Lab operations</p>
                                <h2 className="mt-2 text-lg font-bold">System inventory</h2>
                                <p className="mt-1 text-sm text-white/60">{systems.length} workstations currently registered in the lab.</p>
                            </div>
                            <AdminAction
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#2f9db0,#128793)] px-4 text-sm font-bold text-[#082330] shadow-[0_14px_28px_-16px_rgba(31,184,196,0.75)] transition hover:shadow-[0_18px_30px_-16px_rgba(31,184,196,0.9)] disabled:opacity-60"
                                disabled={saving}
                                onClick={addNewSystem}
                                type="button"
                            >
                                <Plus className="size-4" />
                                {saving ? "Adding..." : "Add system"}
                            </AdminAction>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner">
                        {["all", "available", "offline"].map((option) => (
                            <button
                                className={joinClasses(
                                    "relative min-h-9 overflow-hidden rounded-xl px-3 py-2 text-xs font-bold capitalize transition",
                                    filter === option
                                        ? "text-[#082330] shadow-[0_8px_18px_-12px_rgba(31,184,196,0.85)]"
                                        : "text-white/60 hover:bg-white/10 hover:text-white",
                                )}
                                key={option}
                                onClick={() => setFilter(option)}
                                type="button"
                            >
                                {filter === option && <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(110deg,#2f9db0,#3ee7c2)]" />}
                                <span className="relative">{option === "offline" ? "Unavailable" : option}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-white/50">Around five systems are shown at once. Scroll inside the list for more.</p>
                    <div className="mt-3 hidden max-h-104 snap-y overflow-auto rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_38px_-34px_rgba(2,10,14,0.85)] md:block">
                        <table className="w-full border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-[#0f2f38] text-[11px] font-extrabold uppercase tracking-[0.09em] text-white/60">
                                <tr>
                                    <th className="px-4 py-3.5">System</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-4 py-3.5">Availability</th>
                                    <th className="px-4 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 bg-transparent">
                                {visibleSystems.map((system) => {
                                    const outage = systemOutages.find((item) => item.systemId === system.id && isSystemUnavailable([item], system.id, now));
                                    const hasBookings = systemHasBookings(system.id);
                                    return (
                                        <tr
                                            className={joinClasses(
                                                "group cursor-pointer snap-start transition-colors duration-150 hover:bg-white/5",
                                                selected.id === system.id && "bg-[#2f9db0]/10 shadow-[inset_3px_0_0_#2f9db0]",
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
                                                    <span className="flex size-10 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[#2f9db0] shadow-sm transition-colors duration-150 group-hover:border-[#2f9db0]/40">
                                                        <Monitor className="size-4.5" />
                                                    </span>
                                                    <span className="text-sm font-extrabold text-white">System {String(system.id).padStart(2, "0")}</span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={joinClasses(
                                                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
                                                        system.status === "available" ? "bg-[#3ee7c2]/15 text-[#5fe3b8]" : "bg-white/10 text-white/60",
                                                    )}
                                                >
                                                    <span
                                                        className={joinClasses(
                                                            "size-2 rounded-full",
                                                            system.status === "available" ? "bg-[#3ddc97]" : "bg-white/40",
                                                        )}
                                                    />
                                                    {system.status === "available" ? "Available" : "Unavailable"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-medium text-white/60">
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
                                                            className={joinClasses(
                                                                "rounded-xl px-3 py-2 text-xs font-bold transition",
                                                                hasBookings
                                                                    ? "bg-[#f0b65e]/15 text-[#f0b65e] hover:bg-[#f0b65e]/25"
                                                                    : "bg-white/10 text-white/70 hover:bg-white/15",
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
                                                            className="rounded-xl bg-[#3ee7c2]/15 px-3 py-2 text-xs font-bold text-[#5fe3b8] transition hover:bg-[#3ee7c2]/25"
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
                                className={joinClasses(
                                    "flex snap-start items-center gap-3 rounded-2xl border p-4 text-left shadow-[0_12px_30px_-26px_rgba(2,10,14,0.7)] transition-colors duration-150",
                                    selected.id === system.id
                                        ? "border-[#2f9db0] bg-[#2f9db0]/10 ring-2 ring-[#2f9db0]/15"
                                        : "border-white/10 bg-white/5",
                                )}
                                key={system.id}
                                onClick={() => showSystemHistory(system)}
                                type="button"
                            >
                                <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-[#2f9db0] shadow-sm">
                                    <Monitor className="size-5" />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-sm font-extrabold text-white">System {String(system.id).padStart(2, "0")}</span>
                                    <span className="mt-1 block text-xs font-semibold text-white/60">
                                        {system.status === "available" ? "Open for bookings" : "Unavailable to students"}
                                    </span>
                                </span>
                                <span
                                    className={joinClasses(
                                        "size-2.5 rounded-full shadow-[0_0_9px_currentColor]",
                                        system.status === "available" ? "bg-[#3ddc97] text-[#3ddc97]" : "bg-white/40 text-white/40",
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

                <aside className={joinClasses(surface, "h-fit overflow-hidden 2xl:sticky 2xl:top-28")}>
                    <div className="premium-hero relative overflow-hidden p-6 text-white">
                        <span aria-hidden="true" className="absolute -right-14 -top-14 size-40 rounded-full border border-white/8" />
                        <span aria-hidden="true" className="absolute -bottom-16 right-8 size-32 rounded-full bg-[#2f9db0]/20 blur-2xl" />
                        <div className="flex items-start justify-between">
                            <span className="relative flex h-13 w-13 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner backdrop-blur-sm">
                                <Monitor className="h-6 w-6" />
                            </span>
                            <span
                                className={joinClasses(
                                    "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase",
                                    selected.status === "available"
                                        ? "border-[#65d4b0]/15 bg-[#65d4b0]/15 text-[#82dfc1]"
                                        : "border-white/8 bg-white/10 text-white/70",
                                )}
                            >
                                <span
                                    className={joinClasses(
                                        "size-1.5 rounded-full",
                                        selected.status === "available" ? "bg-[#65d4b0] shadow-[0_0_9px_rgba(101,212,176,0.85)]" : "bg-white/50",
                                    )}
                                />
                                {SYSTEM_STYLES[selected.status].label}
                            </span>
                        </div>
                        <p className="mt-6 text-xs font-semibold text-white/65">Selected workstation</p>
                        <h3 className="mt-1 text-3xl font-bold tracking-[-0.05em]">System {String(selected.id).padStart(2, "0")}</h3>
                    </div>
                    <div className="p-6">
                        <div
                            className={joinClasses(
                                "rounded-2xl border p-4",
                                selected.status === "available" ? "border-[#3ee7c2]/25 bg-[#3ee7c2]/10" : "border-white/12 bg-white/5",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={joinClasses("size-3 rounded-full", selected.status === "available" ? "bg-[#3ddc97]" : "bg-white/40")} />
                                <div>
                                    <p className="text-sm font-bold text-white">{selected.status === "available" ? "Ready for bookings" : "Not available to students"}</p>
                                    <p className="mt-1 text-xs leading-5 text-white/60">
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
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3ee7c2] px-4 text-sm font-bold text-[#082330] shadow-[0_14px_26px_-17px_rgba(79,216,189,0.6)] transition hover:bg-[#6ee2cb]"
                                    onClick={() => makeAvailable(selected)}
                                    type="button"
                                >
                                    <Check className="size-4" /> Mark available now
                                </AdminAction>
                            )}
                            {selected.status === "available" && (
                                <AdminAction
                                    className={joinClasses(
                                        "min-h-12 w-full rounded-2xl border px-4 text-sm font-bold transition",
                                        selectedHasBookings
                                            ? "border-[#f0b65e]/30 bg-[#f0b65e]/15 text-[#f0b65e] hover:bg-[#f0b65e]/25"
                                            : "border-white/20 text-white transition hover:bg-white/10",
                                    )}
                                    onClick={() => openStatusDialog(selected)}
                                    type="button"
                                >
                                    {selectedHasBookings ? "Cancel booked slots first" : "Unavailable until changed"}
                                </AdminAction>
                            )}
                            <button
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f0576a]/30 bg-[#f0576a]/10 px-4 text-sm font-bold text-[#f29aa4] transition hover:bg-[#f0576a]/20"
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
                <AdminReveal className={joinClasses(surface, "overflow-hidden p-5 text-white sm:p-6")}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f9db0]">Next seven days</p>
                            <h2 className="mt-2 text-xl font-bold">System {String(selected.id).padStart(2, "0")} day schedule</h2>
                            <p className="mt-1 text-sm text-white/60">Review bookings and manage system availability from today onward.</p>
                        </div>
                        <button
                            className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-bold text-white transition hover:border-[#2f9db0]/40"
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
                                className={joinClasses(
                                    "min-w-21 rounded-xl border px-3 py-2.5 text-left transition",
                                    historyDate === date.key ? "border-[#2f9db0] bg-[#2f9db0]/15 text-[#5fd3dc]" : "border-white/10 bg-white/5 text-white/60",
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
                        <div className="mt-5 flex min-h-48 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white/60">
                            Loading day history...
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
                                    <div className="ui-fade-in mt-3 flex flex-col gap-3 rounded-2xl border border-[#f0576a]/25 bg-[#f0576a]/10 p-4 shadow-[0_14px_30px_-24px_rgba(240,87,106,0.4)] sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#f29aa4]">
                                                {pendingTimelineAction.action === "make-unavailable"
                                                    ? "Selected available time"
                                                    : "Selected unavailable period"}
                                            </p>
                                            <p className="mt-1 text-base font-bold tabular-nums text-white">
                                                {formatMinutes(pendingTimelineAction.startMinutes)} – {formatMinutes(pendingTimelineAction.endMinutes)}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold text-white/60">
                                                {formatActivityMinutes(pendingTimelineAction.endMinutes - pendingTimelineAction.startMinutes)} selected
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                                                onClick={() => setPendingTimelineAction(null)}
                                                type="button"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                className="min-h-11 rounded-xl bg-[#f0576a] px-4 text-sm font-bold text-white transition hover:bg-[#d84459]"
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
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                                <div className="border-b border-white/10 bg-white/5 px-4 py-3.5">
                                    <h3 className="text-sm font-bold text-white">Daily availability table</h3>
                                    <p className="mt-1 text-xs text-white/50">A simple summary of the continuous timeline.</p>
                                </div>
                                <div className="max-h-120 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-[#0f2f38] text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/50">
                                            <tr>
                                                <th className="px-4 py-3">From</th>
                                                <th className="px-4 py-3">To</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {historySegments.map((segment, index) => (
                                                <tr className="transition hover:bg-white/5" key={`${segment.startMinutes}-${segment.status}-${index}`}>
                                                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-white/80">
                                                        {formatMinutes(segment.startMinutes)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-white/80">
                                                        {formatMinutes(segment.endMinutes)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={joinClasses(
                                                                "inline-flex rounded-full px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em]",
                                                                segment.status === "available" && "bg-[#3ee7c2]/15 text-[#5fe3b8]",
                                                                segment.status === "booked" && "bg-[#2f9db0]/15 text-[#5fd3dc]",
                                                                segment.status === "unavailable" && "bg-[#f0576a]/15 text-[#f29aa4]",
                                                            )}
                                                        >
                                                            {segment.status}
                                                        </span>
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
                            className="min-h-12 rounded-2xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                            onClick={() => setStatusDialogOpen(false)}
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            className="min-h-12 rounded-2xl bg-[#f0576a] px-5 text-sm font-bold text-white transition hover:bg-[#d84459] disabled:cursor-not-allowed disabled:bg-[#f0576a]/30"
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
                    <div className="rounded-2xl border border-[#f0b65e]/30 bg-[#f0b65e]/10 p-4">
                        <p className="text-sm font-bold text-[#f0b65e]">Cancel booked slots first</p>
                        <p className="mt-1 text-sm leading-6 text-white/70">
                            Cancel this system's active or upcoming bookings before making it unavailable until changed.
                        </p>
                        <Link
                            className="mt-3 inline-flex rounded-xl bg-[#3ee7c2] px-4 py-2.5 text-xs font-bold text-[#082330]"
                            onClick={() => setStatusDialogOpen(false)}
                            to="/admin/bookings"
                        >
                            Open booking management
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-[#f0576a]/30 bg-[#f0576a]/10 p-4">
                        <p className="text-sm font-bold text-[#f29aa4]">Unavailable until manually restored</p>
                        <p className="mt-1 text-sm leading-6 text-white/70">
                            Students will see this system in red and cannot book it until an administrator restores availability.
                        </p>
                    </div>
                )}
                <p className="mt-4 text-sm leading-6 text-white/60">
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
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
        </div>
    );
}
