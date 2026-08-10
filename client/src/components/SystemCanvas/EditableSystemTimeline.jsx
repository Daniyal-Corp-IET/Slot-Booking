import { useRef, useState } from "react";

const SNAP_MINUTES = 5;

function formatTime(minutes) {
    return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) return `${remainingMinutes} min`;
    if (!remainingMinutes) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

export function EditableSystemTimeline({ closeMinutes, currentTime, editable, minEditableMinutes, onSelectRange, openMinutes, selectedRange, segments }) {
    const [drag, setDrag] = useState(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const totalMinutes = Math.max(60, closeMinutes - openMinutes);
    const timeMarkers = [];

    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += SNAP_MINUTES) {
        timeMarkers.push(minutes);
    }

    let passedMinutes = openMinutes;
    if (editable) passedMinutes = clamp(minEditableMinutes, openMinutes, closeMinutes);

    const visibleSelection = drag ?? selectedRange;
    let selectionLabel = "Make unavailable";

    if (visibleSelection?.action === "resize-unavailable") {
        selectionLabel = "Resize unavailable period";
    } else if (visibleSelection?.action === "manage-unavailable") {
        selectionLabel = "Unavailable period";
    }

    function minuteFromPointer(event) {
        const bounds = canvasRef.current.getBoundingClientRect();
        const position = clamp(event.clientY - bounds.top, 0, bounds.height);
        return openMinutes + (position / bounds.height) * totalMinutes;
    }

    function startSelecting(event) {
        if (!editable || event.button !== 0) return;

        const pointerMinute = minuteFromPointer(event);
        const segment = segments.find((item) => pointerMinute >= item.startMinutes && pointerMinute < item.endMinutes);
        if (!segment || segment.status === "booked") return;
        if (pointerMinute < minEditableMinutes) return;

        const allowedStart = Math.max(segment.startMinutes, minEditableMinutes);
        const allowedEnd = Math.min(segment.endMinutes, closeMinutes);
        if (allowedEnd - allowedStart < SNAP_MINUTES) return;

        const anchor = clamp(Math.floor(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES, allowedStart, allowedEnd - SNAP_MINUTES);
        let action = "make-unavailable";
        if (segment.status === "unavailable") action = "manage-unavailable";

        const selection = {
            action,
            mode: "select",
            startMinutes: anchor,
            endMinutes: anchor + SNAP_MINUTES,
            referenceId: segment.referenceId,
            segmentStart: segment.startMinutes,
            segmentEnd: segment.endMinutes,
            allowedStart,
            allowedEnd,
            anchor,
            pointerStart: event.clientY,
            moved: false,
        };

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = selection;
        setDrag(selection);
    }

    function startResizing(event, segment, edge) {
        event.preventDefault();
        event.stopPropagation();

        const startHasPassed = segment.actualStartsAt && segment.actualStartsAt <= currentTime;
        if (!editable || segment.endMinutes <= minEditableMinutes || (edge === "start" && startHasPassed)) return;

        let previousBlock;
        let nextBlock;

        for (const item of segments) {
            if (item.status === "available") continue;
            if (item.endMinutes <= segment.startMinutes) previousBlock = item;

            if (!nextBlock && item.startMinutes >= segment.endMinutes) {
                nextBlock = item;
            }
        }

        let resizeMode = "resize-end";
        if (edge === "start") resizeMode = "resize-start";

        let previousEnd = openMinutes;
        if (previousBlock) previousEnd = previousBlock.endMinutes;

        let nextStart = closeMinutes;
        if (nextBlock) nextStart = nextBlock.startMinutes;

        const selection = {
            action: "resize-unavailable",
            mode: resizeMode,
            startMinutes: segment.startMinutes,
            endMinutes: segment.endMinutes,
            referenceId: segment.referenceId,
            actualStartsAt: segment.actualStartsAt,
            allowedStart: Math.max(openMinutes, minEditableMinutes, previousEnd),
            allowedEnd: Math.min(closeMinutes, nextStart),
            pointerStart: event.clientY,
            moved: false,
        };

        canvasRef.current.setPointerCapture(event.pointerId);
        dragRef.current = selection;
        setDrag(selection);
    }

    function continueSelecting(event) {
        const currentDrag = dragRef.current;
        if (!currentDrag) return;

        const pointerMinute = minuteFromPointer(event);
        if (currentDrag.mode === "resize-start") {
            const startMinutes = clamp(
                Math.floor(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES,
                currentDrag.allowedStart,
                currentDrag.endMinutes - SNAP_MINUTES,
            );
            const nextDrag = { ...currentDrag, startMinutes, moved: true };
            dragRef.current = nextDrag;
            setDrag(nextDrag);
            return;
        }
        if (currentDrag.mode === "resize-end") {
            const minimumEnd = Math.max(currentDrag.startMinutes + SNAP_MINUTES, minEditableMinutes);
            const endMinutes = clamp(Math.ceil(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES, minimumEnd, currentDrag.allowedEnd);
            const nextDrag = { ...currentDrag, endMinutes, moved: true };
            dragRef.current = nextDrag;
            setDrag(nextDrag);
            return;
        }

        const snappedStart = Math.floor(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES;
        const snappedEnd = Math.ceil(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES;
        const startMinutes = clamp(Math.min(currentDrag.anchor, snappedStart), currentDrag.allowedStart, currentDrag.allowedEnd - SNAP_MINUTES);
        const endMinutes = clamp(Math.max(currentDrag.anchor + SNAP_MINUTES, snappedEnd), startMinutes + SNAP_MINUTES, currentDrag.allowedEnd);
        const nextDrag = {
            ...currentDrag,
            startMinutes,
            endMinutes,
            moved: currentDrag.moved || Math.abs(event.clientY - currentDrag.pointerStart) > 4,
        };
        dragRef.current = nextDrag;
        setDrag(nextDrag);
    }

    function finishSelecting(event) {
        const completedDrag = dragRef.current;
        if (!completedDrag) return;

        if (canvasRef.current.hasPointerCapture(event.pointerId)) {
            canvasRef.current.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setDrag(null);
        const managesWholeOutage = completedDrag.action === "manage-unavailable";
        let startMinutes = completedDrag.startMinutes;
        let endMinutes = completedDrag.endMinutes;

        if (managesWholeOutage) {
            startMinutes = completedDrag.segmentStart;
            endMinutes = completedDrag.segmentEnd;
        }

        onSelectRange({
            action: completedDrag.action,
            startMinutes,
            endMinutes,
            referenceId: completedDrag.referenceId,
            actualStartsAt: completedDrag.actualStartsAt,
        });
    }

    function cancelSelecting() {
        dragRef.current = null;
        setDrag(null);
    }

    return (
        <section className="relative isolate overflow-hidden rounded-2xl border border-itx-border bg-slate-50 shadow-inner shadow-white/40">
            <div className="border-b border-itx-border bg-slate-50 px-4 py-3.5 shadow-[0_8px_22px_-22px_rgba(15,23,42,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold tabular-nums text-itx-ink">
                            {formatTime(openMinutes)} – {formatTime(closeMinutes)}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                            Drag empty time to block it · drag a red block’s top or bottom edge to resize it.
                        </p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${editable ? "bg-itx-info/12 text-itx-info" : "bg-slate-100 text-slate-400"}`}>
                        {editable ? "Drag to select" : "Past day · read only"}
                    </span>
                </div>
            </div>

            <div
                aria-label="Daily system occupancy timeline"
                className="max-h-120 overflow-y-auto overscroll-contain scroll-smooth py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#128a93] motion-reduce:scroll-auto"
                tabIndex={0}
            >
                <div
                    className={`relative select-none ${editable ? "cursor-crosshair" : "cursor-default"}`}
                    onPointerCancel={cancelSelecting}
                    onPointerDown={startSelecting}
                    onPointerMove={continueSelecting}
                    onPointerUp={finishSelecting}
                    ref={canvasRef}
                    style={{ height: `${(totalMinutes / 60) * 15}rem`, minHeight: "90rem", touchAction: "pan-y" }}
                >
                    {timeMarkers.map((minutes) => {
                        const showTimestamp = minutes % 15 === 0;
                        return (
                            <div
                                className="pointer-events-none absolute inset-x-0 z-[1] flex items-start"
                                key={minutes}
                                style={{ top: `${((minutes - openMinutes) / totalMinutes) * 100}%` }}
                            >
                                <span
                                    className={`w-14 px-1.5 text-right font-extrabold tabular-nums text-slate-500 sm:w-24 sm:px-3 ${showTimestamp ? "-translate-y-2 text-[11px] sm:text-sm" : "text-transparent"}`}
                                >
                                    {showTimestamp ? formatTime(minutes) : "·"}
                                </span>
                                <span className={`flex-1 ${showTimestamp ? "h-0.5 bg-slate-300" : "h-px bg-slate-200"}`} />
                            </div>
                        );
                    })}

                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-0 left-14 right-2 top-0 rounded-xl border border-itx-border bg-white shadow-inner shadow-white/60 sm:left-24 sm:right-4"
                    />

                    {passedMinutes > openMinutes && (
                        <div
                            aria-label="Elapsed time is unavailable"
                            className="pointer-events-none absolute left-14 right-2 top-0 z-[2] rounded-t-xl border border-itx-border bg-slate-100 text-slate-400 sm:left-24 sm:right-4"
                            style={{ height: `${((passedMinutes - openMinutes) / totalMinutes) * 100}%` }}
                        >
                            <span className="absolute bottom-3 left-1/2 max-w-[calc(100%-1.25rem)] -translate-x-1/2 rounded-xl border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-center text-[10px] font-extrabold leading-tight text-white/90 sm:max-w-none sm:whitespace-nowrap sm:rounded-full sm:px-3 sm:text-xs">
                                Time passed · unavailable for booking
                            </span>
                        </div>
                    )}
                    {passedMinutes > openMinutes && passedMinutes < closeMinutes && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute left-14 right-2 z-[11] h-0.5 bg-slate-400 sm:left-24 sm:right-4"
                            style={{ top: `${((passedMinutes - openMinutes) / totalMinutes) * 100}%` }}
                        />
                    )}

                    {segments.map((segment, index) => {
                        const start = Math.max(openMinutes, segment.startMinutes);
                        const end = Math.min(closeMinutes, segment.endMinutes);
                        if (end <= start || segment.status === "available") return null;

                        const duration = end - start;
                        const style =
                            segment.status === "booked"
                                ? "border-itx-success/35 bg-gradient-to-br from-[#e3f7ec] to-[#d5f0e2] text-[#166a45]"
                                : "border-itx-danger/35 bg-gradient-to-br from-[#fdecef] to-[#fbdfe3] text-[#9c3f4d]";

                        return (
                            <div
                                className={`pointer-events-none absolute left-14 right-2 z-[3] overflow-hidden rounded-lg border px-2 ${style} sm:left-24 sm:right-4 sm:px-3`}
                                key={`${segment.startMinutes}-${segment.status}-${index}`}
                                style={{
                                    height: `${(duration / totalMinutes) * 100}%`,
                                    top: `${((start - openMinutes) / totalMinutes) * 100}%`,
                                }}
                            >
                                <div className="flex h-full items-center justify-between gap-2 sm:gap-3">
                                    <span className="min-w-0">
                                        <span className="block text-xs font-extrabold uppercase tracking-[0.06em]">
                                            {segment.status === "booked" ? "Booked" : "Unavailable"}
                                        </span>
                                        {segment.status === "booked" && (
                                            <span className="mt-1 block truncate text-xs font-bold sm:text-sm">
                                                {segment.studentName} · {segment.studentId}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-xs font-bold tabular-nums sm:text-sm">
                                        {formatTime(start)} – {formatTime(end)}
                                    </span>
                                </div>
                                {editable &&
                                    segment.status === "unavailable" &&
                                    segment.actualStartsAt > currentTime &&
                                    segment.startMinutes >= minEditableMinutes && (
                                        <button
                                            aria-label="Drag to change unavailable start time"
                                            className="pointer-events-auto absolute inset-x-6 top-0 h-3 cursor-ns-resize border-t-2 border-[#e0637a]"
                                            onPointerDown={(event) => startResizing(event, segment, "start")}
                                            type="button"
                                        />
                                    )}
                                {editable && segment.status === "unavailable" && segment.endMinutes > minEditableMinutes && (
                                    <button
                                        aria-label="Drag to change unavailable end time"
                                        className="pointer-events-auto absolute inset-x-6 bottom-0 h-3 cursor-ns-resize border-b-2 border-[#e0637a]"
                                        onPointerDown={(event) => startResizing(event, segment, "end")}
                                        type="button"
                                    />
                                )}
                            </div>
                        );
                    })}

                    {visibleSelection && (
                        <div
                            className="pointer-events-none absolute left-14 right-2 z-20 flex items-center justify-end gap-3 overflow-hidden rounded-lg border-2 border-itx-danger bg-itx-danger/10 px-2 text-[#9c3f4d] shadow-lg sm:left-24 sm:right-4 sm:justify-between sm:px-3"
                            style={{
                                height: `${((visibleSelection.endMinutes - visibleSelection.startMinutes) / totalMinutes) * 100}%`,
                                top: `${((visibleSelection.startMinutes - openMinutes) / totalMinutes) * 100}%`,
                            }}
                        >
                            <span className="hidden truncate text-xs font-extrabold uppercase tracking-[0.05em] sm:block">
                                {selectionLabel}
                            </span>
                            <span className="shrink-0 text-[10px] font-extrabold tabular-nums sm:text-sm">
                                {formatTime(visibleSelection.startMinutes)} – {formatTime(visibleSelection.endMinutes)} ·{" "}
                                {formatDuration(visibleSelection.endMinutes - visibleSelection.startMinutes)}
                            </span>
                        </div>
                    )}
                    {drag && (
                        <div
                            className="pointer-events-none absolute left-14 z-30 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold tabular-nums text-white shadow-lg sm:left-28"
                            style={{
                                top: `clamp(0.25rem, calc(${((drag.startMinutes - openMinutes) / totalMinutes) * 100}% - 2.75rem), calc(100% - 2.75rem))`,
                            }}
                        >
                            {formatTime(drag.startMinutes)} – {formatTime(drag.endMinutes)} · {formatDuration(drag.endMinutes - drag.startMinutes)}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
