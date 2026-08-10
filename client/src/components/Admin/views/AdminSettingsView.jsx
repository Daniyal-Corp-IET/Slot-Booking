import { useEffect, useState } from "react";
import { AlertTriangle, Check, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { useToast } from "../../../hooks/useToast";
import { AppDialog, Toast } from "../../Feedback/Feedback";
import { apiRequest } from "../../../utils/apiClient";
import { cn } from "../../../utils/cn";
import { minutesToTime, timeToMinutes } from "../AdminPanel.helpers";
import { AdminReveal, surface } from "../AdminPanel.view";
import { PasswordField } from "../../ui/PasswordField";
import { FORM_FIELD_CLASS } from "../../ui/fieldStyles";

async function createAdmin(admin) {
    const data = await apiRequest("/admins", "POST", admin, { fallbackErrorMessage: "Unable to add the administrator." });
    return data.admin;
}

const BOOKING_INCREMENT_OPTIONS = [5, 10, 15, 30];

function roundToIncrement(value, increment) {
    return Math.round(Number(value) / increment) * increment;
}

function SettingRow({ children, description, title }) {
    return (
        <div className="-mx-3 flex flex-col gap-4 rounded-2xl border-b border-itx-border px-3 py-5 text-itx-ink transition-colors duration-150 last:border-0 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
            <div className="w-full sm:w-auto sm:shrink-0">{children}</div>
        </div>
    );
}
function AdminFormDialog({ onClose, onCreated, open }) {
    const [form, setForm] = useState({ fullName: "", email: "", username: "", phoneNumber: "", password: "" });
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const changeField = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setMessage("");
    };
    const closeDialog = () => {
        setForm({ fullName: "", email: "", username: "", phoneNumber: "", password: "" });
        setMessage("");
        onClose();
    };
    const submit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const admin = await createAdmin({
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                username: form.username.trim(),
                phoneNumber: form.phoneNumber.trim(),
                password: form.password,
            });
            closeDialog();
            onCreated(admin);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setSaving(false);
        }
    };
    const footer = (
        <>
            <button className="h-12 rounded-2xl border border-itx-border px-5 text-sm font-bold text-itx-ink transition hover:bg-slate-100" onClick={closeDialog} type="button">
                Cancel
            </button>
            <button
                className="h-12 rounded-2xl bg-[#128a93] px-5 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                form="add-admin-form"
                type="submit"
            >
                {saving ? "Adding..." : "Add administrator"}
            </button>
        </>
    );
    return (
        <AppDialog
            description="Create a secure account for another lab administrator."
            footer={footer}
            onClose={closeDialog}
            open={open}
            title="Add administrator"
        >
            <form className="space-y-4" id="add-admin-form" onSubmit={submit}>
                <label className="block text-sm font-bold text-slate-600">
                    Full name
                    <input
                        autoComplete="name"
                        className={cn(FORM_FIELD_CLASS, "mt-2")}
                        name="fullName"
                        onChange={changeField}
                        required
                        value={form.fullName}
                    />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                    Email
                    <input
                        autoComplete="email"
                        className={cn(FORM_FIELD_CLASS, "mt-2")}
                        name="email"
                        onChange={changeField}
                        required
                        type="email"
                        value={form.email}
                    />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                    Username
                    <input
                        autoCapitalize="none"
                        autoComplete="username"
                        className={cn(FORM_FIELD_CLASS, "mt-2")}
                        minLength="3"
                        name="username"
                        onChange={changeField}
                        pattern="[a-zA-Z0-9._-]{3,30}"
                        required
                        value={form.username}
                    />
                    <span className="mt-1.5 block text-xs font-medium text-slate-400">Use 3 to 30 letters, numbers, dots, dashes, or underscores.</span>
                </label>
                <label className="block text-sm font-bold text-slate-600">
                    Phone number <span className="font-medium text-slate-400">(optional)</span>
                    <input
                        autoComplete="tel"
                        className={cn(FORM_FIELD_CLASS, "mt-2")}
                        name="phoneNumber"
                        onChange={changeField}
                        type="tel"
                        value={form.phoneNumber}
                    />
                </label>
                <div>
                    <PasswordField
                        autoComplete="new-password"
                        id="admin-password"
                        label="Password"
                        minLength="8"
                        name="password"
                        onChange={changeField}
                        value={form.password}
                    />
                    <span className="mt-1.5 block text-xs font-medium text-slate-400">Use at least 8 characters.</span>
                </div>
                {message && (
                    <p className="rounded-xl bg-itx-danger/15 px-3 py-2.5 text-sm font-semibold text-itx-danger" role="alert">
                        {message}
                    </p>
                )}
            </form>
        </AppDialog>
    );
}
// Settings page
export function SettingsView() {
    const { policy, systems, systemOutages, updatePolicy } = useLab();
    const [monthlyLimit, setMonthlyLimit] = useState(String(policy.monthlyLimitHours));
    const [dailyLimit, setDailyLimit] = useState(String(policy.dailyLimitHours ?? 5));
    const [bookingIncrement, setBookingIncrement] = useState(policy.bookingIncrementMinutes ?? 10);
    const [minimumDuration, setMinimumDuration] = useState(String(policy.minDurationMinutes));
    const [maximumDuration, setMaximumDuration] = useState(String(policy.maxDurationMinutes));
    const [openingTime, setOpeningTime] = useState(minutesToTime(policy.openMinutes));
    const [closingTime, setClosingTime] = useState(minutesToTime(policy.closeMinutes));
    const [cancelBefore, setCancelBefore] = useState(String(policy.cancelBeforeMinutes));
    const [sundayHoliday, setSundayHoliday] = useState(policy.sundayHoliday);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const { dismissToast: dismissMessage, showToast: setMessage, toastMessage: message } = useToast();
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const { dismissToast: dismissAdminToast, showToast: setAdminToast, toastMessage: adminToast } = useToast();
    const fieldClass =
        "h-11 min-w-0 w-full rounded-xl border border-itx-border bg-white px-3 text-right text-sm font-bold text-itx-ink outline-none focus:border-[#128a93] focus:ring-4 focus:ring-[#128a93]/10 sm:w-32";
    const unavailableSystems = systemOutages.map((outage) => String(outage.systemId).padStart(2, "0"));
    useEffect(() => {
        // Keep the editable form in sync when another administrator changes the saved policy.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMonthlyLimit(String(policy.monthlyLimitHours));
        setDailyLimit(String(policy.dailyLimitHours));
        setBookingIncrement(policy.bookingIncrementMinutes);
        setMinimumDuration(String(policy.minDurationMinutes));
        setMaximumDuration(String(policy.maxDurationMinutes));
        setOpeningTime(minutesToTime(policy.openMinutes));
        setClosingTime(minutesToTime(policy.closeMinutes));
        setCancelBefore(String(policy.cancelBeforeMinutes));
        setSundayHoliday(policy.sundayHoliday);
    }, [policy]);
    const hasChanges =
        Number(monthlyLimit) !== policy.monthlyLimitHours ||
        Number(dailyLimit) !== (policy.dailyLimitHours ?? 5) ||
        bookingIncrement !== policy.bookingIncrementMinutes ||
        Number(minimumDuration) !== policy.minDurationMinutes ||
        Number(maximumDuration) !== policy.maxDurationMinutes ||
        openingTime !== minutesToTime(policy.openMinutes) ||
        closingTime !== minutesToTime(policy.closeMinutes) ||
        Number(cancelBefore) !== policy.cancelBeforeMinutes ||
        sundayHoliday !== policy.sundayHoliday;
    const save = async () => {
        const nextMonthlyLimit = Math.max(1, Number(monthlyLimit));
        const nextDailyLimit = Math.min(24, Math.max(1, Number(dailyLimit)));
        const minDuration = Math.max(bookingIncrement, roundToIncrement(minimumDuration, bookingIncrement));
        const maxDuration = Math.max(minDuration, roundToIncrement(maximumDuration, bookingIncrement));
        const nextCancelBefore = Math.max(0, roundToIncrement(cancelBefore, bookingIncrement));
        const openMinutes = timeToMinutes(openingTime);
        const closeMinutes = timeToMinutes(closingTime);
        if (closeMinutes <= openMinutes) {
            setMessage("Closing time must be later than opening time.");
            return;
        }
        if (openMinutes % bookingIncrement !== 0 || closeMinutes % bookingIncrement !== 0) {
            setMessage(`Opening and closing times must follow the selected ${bookingIncrement}-minute interval.`);
            return;
        }
        try {
            setSaving(true);
            setMessage("");
            await updatePolicy({
                monthlyLimitHours: nextMonthlyLimit,
                dailyLimitHours: nextDailyLimit,
                bookingIncrementMinutes: bookingIncrement,
                minDurationMinutes: minDuration,
                maxDurationMinutes: maxDuration,
                openMinutes,
                closeMinutes,
                cancelBeforeMinutes: nextCancelBefore,
                sundayHoliday,
            });
            setSaved(true);
            setMessage("Booking policy updated on both portals.");
            window.setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="mx-auto max-w-300 space-y-5">
            <AdminReveal className={cn(surface, "p-5 md:p-6 xl:p-7")}>
                <div className="flex items-center gap-4 border-b border-itx-border pb-5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#128a93]/12 text-[#128a93]">
                        <SlidersHorizontal className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-itx-ink">Booking policy</h2>
                        <p className="mt-1 text-xs text-slate-500">Rules applied to all student bookings.</p>
                    </div>
                </div>
                <SettingRow description="Maximum lab time available to each student during a calendar month." title="Monthly usage limit">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input className={fieldClass} min="1" onChange={(event) => setMonthlyLimit(event.target.value)} type="number" value={monthlyLimit} />{" "}
                        hours
                    </label>
                </SettingRow>
                <SettingRow description="Maximum time one student can reserve or use on the same date." title="Daily usage limit">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input
                            className={fieldClass}
                            max="24"
                            min="1"
                            onChange={(event) => setDailyLimit(event.target.value)}
                            type="number"
                            value={dailyLimit}
                        />{" "}
                        hours
                    </label>
                </SettingRow>
                <SettingRow description="All start times and durations follow this interval." title="Booking increment">
                    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-itx-border bg-slate-50 p-1.5">
                        {BOOKING_INCREMENT_OPTIONS.map((minutes) => (
                            <button
                                aria-pressed={bookingIncrement === minutes}
                                className={cn(
                                    "min-h-10 rounded-xl px-3 text-sm font-bold transition-colors",
                                    bookingIncrement === minutes
                                        ? "bg-[#128a93] text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-itx-ink",
                                )}
                                key={minutes}
                                onClick={() => setBookingIncrement(minutes)}
                                type="button"
                            >
                                {minutes} min
                            </button>
                        ))}
                    </div>
                </SettingRow>
                <SettingRow description="Shortest session a student can reserve." title="Minimum session">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input
                            className={fieldClass}
                            min={bookingIncrement}
                            onChange={(event) => setMinimumDuration(event.target.value)}
                            step={bookingIncrement}
                            type="number"
                            value={minimumDuration}
                        />{" "}
                        minutes
                    </label>
                </SettingRow>
                <SettingRow description="Longest session a student can reserve at once." title="Maximum session">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input
                            className={fieldClass}
                            min={bookingIncrement}
                            onChange={(event) => setMaximumDuration(event.target.value)}
                            step={bookingIncrement}
                            type="number"
                            value={maximumDuration}
                        />{" "}
                        minutes
                    </label>
                </SettingRow>
                <SettingRow description="Daily opening and closing hours shown to students." title="Lab hours">
                    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <input
                            aria-label="Lab opening time"
                            className={fieldClass}
                            onChange={(event) => setOpeningTime(event.target.value)}
                            step={bookingIncrement * 60}
                            type="time"
                            value={openingTime}
                        />
                        <span className="text-sm font-semibold text-slate-600">to</span>
                        <input
                            aria-label="Lab closing time"
                            className={fieldClass}
                            onChange={(event) => setClosingTime(event.target.value)}
                            step={bookingIncrement * 60}
                            type="time"
                            value={closingTime}
                        />
                    </div>
                </SettingRow>
                <SettingRow
                    description="Students may cancel until this many minutes before a slot starts. Use 0 to allow cancellation until start time."
                    title="Cancellation cutoff"
                >
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input
                            className={fieldClass}
                            min="0"
                            onChange={(event) => setCancelBefore(event.target.value)}
                            step={bookingIncrement}
                            type="number"
                            value={cancelBefore}
                        />{" "}
                        minutes
                    </label>
                </SettingRow>
                <SettingRow description="Prevents Sunday bookings and marks the lab as closed." title="Sunday holiday">
                    <button
                        aria-checked={sundayHoliday}
                        className={cn("relative h-7 w-13 rounded-full p-1 transition", sundayHoliday ? "bg-[#128a93]" : "bg-slate-200")}
                        onClick={() => setSundayHoliday((current) => !current)}
                        role="switch"
                        type="button"
                    >
                        <span className={cn("block h-5 w-5 rounded-full bg-white shadow-sm transition", sundayHoliday && "translate-x-6")} />
                    </button>
                </SettingRow>
            </AdminReveal>
            <AdminReveal className={cn(surface, "p-5 sm:p-6")}>
                <div className="flex flex-col gap-4 text-itx-ink sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#128a93]/12 text-[#128a93]">
                            <ShieldCheck className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold">Administrator access</h2>
                            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                                Add another administrator using a unique email and username. Passwords are stored securely.
                            </p>
                        </div>
                    </div>
                    <button
                        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#128a93] px-5 text-sm font-bold text-white transition hover:bg-[#0d6169]"
                        onClick={() => setAdminDialogOpen(true)}
                        type="button"
                    >
                        <Plus className="size-4" /> Add administrator
                    </button>
                </div>
            </AdminReveal>
            <AdminReveal className={cn(surface, "p-5 sm:p-7")}>
                <div className="flex items-center gap-4 text-itx-ink">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-itx-warning/15 text-[#8a5a13]">
                        <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold">Unavailable systems</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            {unavailableSystems.length
                                ? `Systems ${unavailableSystems.join(", ")} are not available for booking.`
                                : `All ${systems.length} systems are currently available.`}
                        </p>
                    </div>
                    <Link
                        className="hidden rounded-xl border border-itx-border px-4 py-2.5 text-xs font-bold text-itx-ink transition hover:border-[#128a93]/40 hover:text-[#128a93] sm:block"
                        to="/admin/systems"
                    >
                        Open systems
                    </Link>
                </div>
            </AdminReveal>
            <div className="flex min-h-12 items-center justify-end gap-3" aria-live="polite">
                {saved && !hasChanges && (
                    <span className="ui-fade-in rounded-full bg-itx-success/12 px-4 py-2 text-xs font-bold text-itx-success">Settings saved successfully</span>
                )}
                {hasChanges && (
                    <button
                        className="ui-fade-in ui-press inline-flex items-center gap-2 rounded-2xl bg-[#128a93] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#128a93]/20 transition hover:bg-[#0d6169] disabled:cursor-wait disabled:opacity-60"
                        disabled={saving}
                        onClick={save}
                        type="button"
                    >
                        <Check className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
                    </button>
                )}
            </div>
            <AdminFormDialog
                onClose={() => setAdminDialogOpen(false)}
                onCreated={(admin) => setAdminToast(`${admin.username} was added as an administrator.`)}
                open={adminDialogOpen}
            />
            {message && <Toast message={message} onClose={dismissMessage} />}
            {adminToast && <Toast message={adminToast} onClose={dismissAdminToast} />}
        </div>
    );
}
