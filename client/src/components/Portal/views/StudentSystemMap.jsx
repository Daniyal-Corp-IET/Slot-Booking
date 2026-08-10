import { LabFloorCanvas } from "../../SystemCanvas/LabFloorCanvas";

export function SystemMap({ bookedSystems, onSelect, selectedSystem, selectionPending, systemIds, unavailableSystems }) {
    const blockedSystems = new Set([...bookedSystems, ...unavailableSystems]);
    const systems = [];

    for (const systemId of systemIds) {
        if (blockedSystems.has(systemId)) continue;

        let state = "available";
        if (selectedSystem === systemId) state = "selected";
        systems.push({ id: systemId, state, disabled: selectionPending });
    }

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-itx-ink">System availability</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        {selectionPending ? "Checking and holding your system..." : `${systems.length} systems match your selected date, time, and duration`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm border border-itx-border bg-white" /> Available
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-[#2da56f]" /> Selected
                    </span>
                </div>
            </div>
            {systems.length ? (
                <LabFloorCanvas ariaLabel="Choose an available computer system" items={systems} onSelect={onSelect} selectedId={selectedSystem} />
            ) : (
                <div className="rounded-3xl border border-dashed border-itx-border bg-slate-50 px-5 py-12 text-center">
                    <p className="text-sm font-bold text-itx-ink">No systems are available for this booking.</p>
                    <p className="mt-1 text-xs text-slate-500">Return to Step 2 and choose another time or duration.</p>
                </div>
            )}
        </div>
    );
}
