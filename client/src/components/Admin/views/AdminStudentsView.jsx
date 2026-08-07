import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, KeyRound, Mail, Phone, Plus, Search, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { AppDialog, ConfirmDialog, EmptyState, Toast } from "../../Feedback/Feedback";
import { MONTH_OPTIONS, PROGRAM_STYLES, joinClasses, monthLabel, shiftMonth, termDuration } from "../AdminPanel.helpers";
import { AdminAction, AdminReveal, MetricCard, surface } from "../AdminPanel.view";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, method = "GET") {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

async function getNextStudentId(courseId) {
    const data = await apiRequest(`/students/next-id?courseId=${courseId}`);
    return data.studentId;
}

function resetStudentPassword(studentId) {
    return apiRequest(`/students/${studentId}/reset-password`, "POST");
}

const formField =
    "h-12 w-full rounded-xl border border-white/15 bg-[#0f2f38]/60 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-[#2f9db0] focus:ring-4 focus:ring-[#2f9db0]/10";

function TermRangePicker({ end, onChange, start }) {
    const [open, setOpen] = useState(false);
    const [activeField, setActiveField] = useState("start");
    const [year, setYear] = useState(() => Number(start?.split("-")[0]) || new Date().getFullYear());
    const pickerRef = useRef(null);
    const baseYear = Number(start?.split("-")[0]) || new Date().getFullYear();

    useEffect(() => {
        if (!open) return undefined;
        const closePicker = (event) => {
            if (!pickerRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closePicker);
        return () => document.removeEventListener("pointerdown", closePicker);
    }, [open]);

    const openCalendar = (field) => {
        let nextField = field;
        if (field === "end" && !start) nextField = "start";

        let selectedValue = end;
        if (nextField === "start") selectedValue = start;

        setActiveField(nextField);
        setYear(Number(selectedValue?.split("-")[0]) || Number(start?.split("-")[0]) || new Date().getFullYear());
        setOpen(true);
    };

    const chooseMonth = (value) => {
        if (activeField === "start") {
            let validEnd = "";
            const existingEndIsValid = end > value && end <= shiftMonth(value, 8);
            if (existingEndIsValid) validEnd = end;

            onChange(value, validEnd);
            setActiveField("end");
            return;
        }
        onChange(start, value);
        setOpen(false);
    };

    return (
        <div ref={pickerRef}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                {[
                    { field: "start", label: "Starts", value: start },
                    { field: "end", label: "Ends", value: end },
                ].map((item, index) => (
                    <div className="contents" key={item.field}>
                        {index === 1 && <span className="hidden text-xs font-black uppercase tracking-[0.1em] text-white/40 sm:block">to</span>}
                        <button
                            aria-expanded={open && activeField === item.field}
                            className={joinClasses(
                                "flex min-h-16 items-center gap-3 rounded-2xl border px-3.5 text-left transition",
                                open && activeField === item.field
                                    ? "border-[#2f9db0] bg-[#0f2f38]/60 ring-4 ring-[#2f9db0]/10"
                                    : "border-white/15 bg-[#0f2f38]/60 hover:border-[#2f9db0]/50",
                            )}
                            onClick={() => openCalendar(item.field)}
                            type="button"
                        >
                            <span
                                className={joinClasses(
                                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                    item.value ? "bg-[#2f9db0] text-[#082330]" : "bg-white/10 text-[#2f9db0]",
                                )}
                            >
                                <CalendarDays className="size-4.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-bold uppercase tracking-[0.08em] text-white/50">{item.label}</span>
                                <span className={joinClasses("mt-1 block text-sm font-extrabold", item.value ? "text-white" : "text-white/40")}>
                                    {monthLabel(item.value)}
                                </span>
                            </span>
                            <ChevronRight className={joinClasses("size-4 text-white/50 transition", open && activeField === item.field && "rotate-90")} />
                        </button>
                    </div>
                ))}
            </div>
            {open && (
                <div className="ui-fade-in mt-3 overflow-hidden rounded-3xl border border-white/12 bg-[#0f2f38] shadow-[0_20px_45px_-28px_rgba(2,10,14,0.7)]">
                    <div className="p-3">
                        <div className="flex items-center justify-between rounded-2xl bg-white/5 p-1.5">
                            <button
                                aria-label="Previous year"
                                className="flex size-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
                                onClick={() => setYear((current) => current - 1)}
                                type="button"
                            >
                                <ChevronRight className="size-4 rotate-180" />
                            </button>
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/50">Choose {activeField}</p>
                                <p className="mt-0.5 text-sm font-black text-white">{year}</p>
                            </div>
                            <button
                                aria-label="Next year"
                                className="flex size-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
                                onClick={() => setYear((current) => current + 1)}
                                type="button"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {[baseYear, baseYear + 1].map((option) => (
                                <button
                                    className={joinClasses(
                                        "rounded-xl px-3 py-2 text-xs font-extrabold transition",
                                        year === option
                                            ? "bg-[#2f9db0] text-[#082330]"
                                            : "border border-white/15 text-white/70 hover:border-[#2f9db0]/40",
                                    )}
                                    key={option}
                                    onClick={() => setYear(option)}
                                    type="button"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {MONTH_OPTIONS.map((month, index) => {
                                const monthValue = `${year}-${String(index + 1).padStart(2, "0")}`;
                                const startSelected = start === monthValue;
                                const endSelected = end === monthValue;
                                const inRange = Boolean(start && end && monthValue > start && monthValue < end);
                                const disabled = activeField === "end" && (!start || monthValue <= start || monthValue > shiftMonth(start, 8));
                                let monthStyle = "text-white/70 hover:bg-[#2f9db0]/10 hover:text-[#5fd3dc]";

                                if (disabled) monthStyle = "cursor-not-allowed bg-white/5 text-white/25";
                                if (inRange) monthStyle = "bg-[#3ee7c2]/15 text-[#5fe3b8]";
                                if (endSelected) monthStyle = "bg-[#2f9db0] text-[#082330] shadow-md";
                                if (startSelected) monthStyle = "bg-[#3ee7c2] text-[#082330] shadow-md";

                                return (
                                    <button
                                        aria-pressed={startSelected || endSelected}
                                        className={joinClasses(
                                            "min-h-11 rounded-xl text-xs font-bold transition",
                                            monthStyle,
                                        )}
                                        disabled={disabled}
                                        key={month}
                                        onClick={() => chooseMonth(monthValue)}
                                        type="button"
                                    >
                                        {month}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StudentFormDialog({ courses, onAddStudent, onClose, open }) {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        program: "",
        termStart: "",
        termEnd: "",
        email: "",
        phone: "",
    });
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [studentId, setStudentId] = useState("");
    const [idLoading, setIdLoading] = useState(false);
    const selectedCourse = courses.find((course) => course.abbreviation === form.program);
    const selectedCourseId = selectedCourse?.id;
    const duration = termDuration(form.termStart, form.termEnd);
    const formComplete = Boolean(
        form.firstName.trim() &&
        form.lastName.trim() &&
        selectedCourseId &&
        form.termStart &&
        form.termEnd &&
        form.email.trim() &&
        duration >= 2 &&
        duration <= 9,
    );

    useEffect(() => {
        if (!selectedCourseId) return;

        let active = true;
        getNextStudentId(selectedCourseId)
            .then((nextId) => {
                if (active) setStudentId(nextId);
            })
            .catch((error) => {
                if (active) setMessage(error.message);
            })
            .finally(() => {
                if (active) setIdLoading(false);
            });

        return () => {
            active = false;
        };
    }, [selectedCourseId]);

    const changeField = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        if (event.target.name === "program") {
            setStudentId("");
            setIdLoading(Boolean(event.target.value));
        }
        setMessage("");
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!selectedCourse) {
            setMessage("Choose a program before adding the student.");
            return;
        }
        if (duration < 2 || duration > 9) {
            setMessage("Choose a program duration between 2 and 9 months.");
            return;
        }

        try {
            setSaving(true);
            await onAddStudent({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                courseId: selectedCourse.id,
                programStart: form.termStart,
                programEnd: form.termEnd,
                email: form.email.trim(),
                phoneNumber: form.phone.trim(),
            });
            setForm({ firstName: "", lastName: "", program: "", termStart: "", termEnd: "", email: "", phone: "" });
            onClose();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <>
            <button className="h-12 rounded-2xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10" onClick={onClose} type="button">
                Cancel
            </button>
            <button
                className="h-12 rounded-2xl bg-[#3ee7c2] px-5 text-sm font-bold text-[#082330] shadow-lg shadow-[#3ee7c2]/20 transition hover:bg-[#6ee2cb] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                form="add-student-form"
                type="submit"
            >
                {saving ? "Adding..." : "Add student"}
            </button>
        </>
    );

    return (
        <AppDialog
            className="hidden-scrollbar"
            description="The student ID is generated automatically and cannot be edited."
            footer={footer}
            onClose={onClose}
            open={open}
            title="Add a student"
        >
            <form className="grid gap-4 sm:grid-cols-2" id="add-student-form" onSubmit={submit}>
                <label className="text-sm font-bold text-white/80">
                    First name
                    <input className={`${formField} mt-2`} name="firstName" onChange={changeField} required value={form.firstName} />
                </label>
                <label className="text-sm font-bold text-white/80">
                    Last name
                    <input className={`${formField} mt-2`} name="lastName" onChange={changeField} required value={form.lastName} />
                </label>
                <label className="text-sm font-bold text-white/80 sm:col-span-2">
                    Course
                    <select className={`${formField} mt-2`} name="program" onChange={changeField} required value={form.program}>
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                            <option key={course.abbreviation} value={course.abbreviation}>
                                {course.name} ({course.abbreviation})
                            </option>
                        ))}
                    </select>
                </label>
                <div className="rounded-3xl border border-white/12 bg-white/5 p-4 sm:col-span-2">
                    <div className="mb-4 flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f9db0] text-[#082330]">
                            <CalendarDays className="size-4.5" />
                        </span>
                        <div>
                            <p className="text-sm font-extrabold text-white">Program term</p>
                            <p className="mt-1 text-xs leading-5 text-white/60">Select start and end months. Programs can run for 2 to 9 months.</p>
                        </div>
                    </div>
                    <TermRangePicker
                        end={form.termEnd}
                        onChange={(termStart, termEnd) => {
                            setForm((current) => ({ ...current, termStart, termEnd }));
                            setMessage("");
                        }}
                        start={form.termStart}
                    />
                    <div
                        className={joinClasses(
                            "mt-4 flex flex-col gap-1 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                            duration ? "bg-[#3ee7c2]/15 text-[#5fe3b8]" : "bg-white/5 text-white/50",
                        )}
                    >
                        <span className="text-xs font-bold uppercase tracking-[0.08em]">Term duration</span>
                        <span className="text-sm font-extrabold">
                            {duration ? `${duration} months · ${monthLabel(form.termStart)} – ${monthLabel(form.termEnd)}` : "Select both months"}
                        </span>
                    </div>
                </div>
                <label className="text-sm font-bold text-white/80 sm:col-span-2">
                    Email
                    <input className={`${formField} mt-2`} name="email" onChange={changeField} required type="email" value={form.email} />
                </label>
                <label className="text-sm font-bold text-white/80 sm:col-span-2">
                    Phone number <span className="font-medium text-white/45">(optional)</span>
                    <input className={`${formField} mt-2`} name="phone" onChange={changeField} type="tel" value={form.phone} />
                </label>
                {formComplete && (
                    <div className="rounded-2xl border border-[#3ee7c2]/25 bg-[#3ee7c2]/10 px-4 py-3 text-center sm:col-span-2">
                        <p className="text-lg font-black tracking-[0.03em] text-[#5fe3b8]">{idLoading ? "Checking..." : studentId}</p>
                    </div>
                )}
                {message && (
                    <p className="text-sm font-semibold text-[#f29aa4] sm:col-span-2" role="alert">
                        {message}
                    </p>
                )}
            </form>
        </AppDialog>
    );
}

// Course management page
export function CoursesView() {
    const { addCourse: onAddCourse, courses, coursesError: error, coursesLoading: loading, loadCourses: onRetry, students } = useOutletContext();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [abbreviation, setAbbreviation] = useState("");
    const [message, setMessage] = useState("");
    const [toast, setToast] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        const shortName = abbreviation.trim().toUpperCase();
        if (!/^[A-Z0-9]{2,6}$/.test(shortName)) {
            setMessage("Use 2 to 6 letters or numbers for the abbreviation.");
            return;
        }
        if (courses.some((course) => course.name.toLowerCase() === name.trim().toLowerCase() || course.abbreviation === shortName)) {
            setMessage("This course name or abbreviation already exists.");
            return;
        }
        try {
            setSaving(true);
            await onAddCourse({ name: name.trim(), abbreviation: shortName });
            setName("");
            setAbbreviation("");
            setMessage("");
            setDialogOpen(false);
            setToast("Course added successfully.");
        } catch (error) {
            setMessage(error.message);
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <>
            <button
                className="h-12 rounded-2xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                onClick={() => setDialogOpen(false)}
                type="button"
            >
                Cancel
            </button>
            <button
                className="h-12 rounded-2xl bg-[#3ee7c2] px-5 text-sm font-bold text-[#082330] shadow-lg shadow-[#3ee7c2]/20 transition hover:bg-[#6ee2cb] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                form="add-course-form"
                type="submit"
            >
                {saving ? "Adding..." : "Add course"}
            </button>
        </>
    );

    return (
        <div className="mx-auto max-w-400 space-y-5">
            <AdminReveal className="premium-hero group relative overflow-hidden rounded-4xl border border-white/7 p-6 text-white shadow-[0_30px_70px_-40px_rgba(4,27,39,0.85)] md:p-7">
                <span aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full border border-[#67d2d5]/12" />
                <span aria-hidden="true" className="absolute -bottom-24 right-1/4 size-48 rounded-full bg-[#6376b8]/18 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#67d2d5]">Programs offered</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">Keep course information organised.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                            Course abbreviations are used automatically when new student IDs are created.
                        </p>
                    </div>
                    <AdminAction
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,#f7c574,#eaaa4d)] px-5 text-sm font-bold text-[#17303c] shadow-[0_15px_30px_-18px_rgba(240,182,94,0.85)] transition hover:shadow-[0_18px_34px_-18px_rgba(240,182,94,1)]"
                        onClick={() => setDialogOpen(true)}
                        type="button"
                    >
                        <Plus className="size-4" /> Add course
                    </AdminAction>
                </div>
            </AdminReveal>
            {loading && (
                <AdminReveal className={joinClasses(surface, "p-8 text-center text-sm font-semibold text-white/60")}>
                    <span className="inline-flex items-center gap-3">
                        <span className="size-2 rounded-full bg-[#2f9db0]" />
                        Loading courses...
                    </span>
                </AdminReveal>
            )}
            {!loading && error && (
                <AdminReveal className={joinClasses(surface, "p-8 text-center")}>
                    <p className="text-sm font-semibold text-[#f29aa4]">{error}</p>
                    <button className="mt-4 rounded-xl bg-[#3ee7c2] px-4 py-2.5 text-sm font-bold text-[#082330]" onClick={onRetry} type="button">
                        Try again
                    </button>
                </AdminReveal>
            )}
            {!loading && !error && courses.length === 0 && <EmptyState message="No courses have been added yet." />}
            {!loading && !error && courses.length > 0 && (
                <AdminReveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course, index) => {
                        const studentCount = students.filter((student) => student.program === course.name).length;
                        const colors = ["bg-[#2f9db0]", "bg-[#6376b8]", "bg-[#d89b3b]", "bg-[#3ee7c2]"];
                        return (
                            <article
                                className={joinClasses(surface, "group relative overflow-hidden p-5 text-white transition-colors duration-150 hover:border-[#3ee7c2]/30")}
                                key={course.abbreviation}
                            >
                                <span className={`absolute inset-x-0 top-0 h-1.5 ${colors[index % colors.length]}`} />
                                <span aria-hidden="true" className="absolute -right-10 -top-10 size-28 rounded-full bg-[#2f9db0]/8 blur-xl" />
                                <div className="relative flex items-start justify-between gap-4">
                                    <span
                                        className={`flex size-13 items-center justify-center rounded-2xl text-sm font-black text-[#082330] shadow-[0_12px_24px_-16px_rgba(10,45,55,0.8)] ${colors[index % colors.length]}`}
                                    >
                                        {course.abbreviation}
                                    </span>
                                    <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 shadow-sm">
                                        {studentCount} students
                                    </span>
                                </div>
                                <h3 className="relative mt-5 text-lg font-bold text-white">{course.name}</h3>
                                <p className="relative mt-1 text-sm text-white/60">
                                    ID abbreviation: <strong className="text-[#2f9db0]">{course.abbreviation}</strong>
                                </p>
                            </article>
                        );
                    })}
                </AdminReveal>
            )}
            <AppDialog
                description="The abbreviation will become part of every student ID for this course."
                footer={footer}
                onClose={() => setDialogOpen(false)}
                open={dialogOpen}
                title="Add a course"
            >
                <form className="space-y-4" id="add-course-form" onSubmit={submit}>
                    <label className="block text-sm font-bold text-white/80">
                        Course name
                        <input
                            className={`${formField} mt-2`}
                            onChange={(event) => {
                                setName(event.target.value);
                                setMessage("");
                            }}
                            placeholder="Example: Cyber Security"
                            required
                            value={name}
                        />
                    </label>
                    <label className="block text-sm font-bold text-white/80">
                        Abbreviation
                        <input
                            className={`${formField} mt-2 uppercase`}
                            maxLength={6}
                            onChange={(event) => {
                                setAbbreviation(event.target.value.replace(/[^a-z0-9]/gi, ""));
                                setMessage("");
                            }}
                            placeholder="Example: CS"
                            required
                            value={abbreviation}
                        />
                    </label>
                    <p className="text-xs leading-5 text-white/60">Use 2 to 6 letters or numbers. Spaces and symbols are removed.</p>
                    {message && (
                        <p className="text-sm font-semibold text-[#f29aa4]" role="alert">
                            {message}
                        </p>
                    )}
                </form>
            </AppDialog>
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
        </div>
    );
}

// Student management page
export function StudentsView() {
    const { addStudent: onAddStudent, courses, loadStudents: onRetry, students, studentsError: error, studentsLoading: loading } = useOutletContext();
    const [query, setQuery] = useState("");
    const [programFilter, setProgramFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [formOpen, setFormOpen] = useState(false);
    const [resetStudentId, setResetStudentId] = useState("");
    const [toast, setToast] = useState("");
    const visible = students
        .filter((student) => `${student.name} ${student.id} ${student.program} ${student.email} ${student.phone}`.toLowerCase().includes(query.toLowerCase()))
        .filter((student) => programFilter === "all" || student.program === programFilter)
        .sort((first, second) => {
            if (sortBy === "program") return first.program.localeCompare(second.program) || first.name.localeCompare(second.name);
            if (sortBy === "recent") return new Date(second.createdAt) - new Date(first.createdAt);
            return first.name.localeCompare(second.name);
        });
    const addStudent = async (studentDetails) => {
        const student = await onAddStudent(studentDetails);
        setToast(`${student.name} added. ID and initial password: ${student.id}.`);
        return student;
    };
    const studentToReset = students.find((student) => student.id === resetStudentId);
    const confirmPasswordReset = async () => {
        if (!studentToReset) return;
        try {
            await resetStudentPassword(studentToReset.id);
            setToast(`${studentToReset.name}'s password was reset to ${studentToReset.id}.`);
            setResetStudentId("");
        } catch (error) {
            setToast(error.message);
        }
    };
    return (
        <div className="mx-auto max-w-400 space-y-5">
            <AdminReveal className="premium-hero group relative overflow-hidden rounded-4xl border border-white/7 p-6 text-white shadow-[0_30px_70px_-40px_rgba(4,27,39,0.85)] md:p-7">
                <span aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full border border-[#67d2d5]/12" />
                <span aria-hidden="true" className="absolute -bottom-24 right-1/4 size-48 rounded-full bg-[#6376b8]/18 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#67d2d5]">Student directory</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">Create access in one clear step.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Select a course and term. The student ID is created automatically.</p>
                    </div>
                    <AdminAction
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,#f7c574,#eaaa4d)] px-5 text-sm font-bold text-[#17303c] shadow-[0_15px_30px_-18px_rgba(240,182,94,0.85)] transition-colors duration-150 hover:bg-[#f3bd65] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={courses.length === 0}
                        onClick={() => setFormOpen(true)}
                        type="button"
                    >
                        <UserPlus className="size-4" /> Add student
                    </AdminAction>
                </div>
            </AdminReveal>
            <AdminReveal className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    accent="bg-[#6376b8]"
                    icon={UsersRound}
                    label="Active students"
                    note={`Across ${courses.length} programs`}
                    value={students.length}
                />
                <MetricCard
                    accent="bg-[#45a982]"
                    icon={ShieldCheck}
                    label="Within limits"
                    note="Ready to make bookings"
                    value={students.filter((student) => student.status === "Active").length}
                />
                <MetricCard
                    accent="bg-[#e4a541]"
                    icon={AlertTriangle}
                    label="Near monthly limit"
                    note="Requires awareness"
                    value={students.filter((student) => student.status === "Near limit").length}
                />
            </AdminReveal>
            <AdminReveal className={joinClasses(surface, "overflow-hidden")}>
                <div className="relative overflow-hidden border-b border-white/10 bg-white/5 p-5 sm:p-6">
                    <span aria-hidden="true" className="absolute -right-14 -top-16 size-40 rounded-full bg-[#2f9db0]/10 blur-2xl" />
                    <div className="relative flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-[#2f9db0] shadow-sm">
                                <UsersRound className="size-4.5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-white">Student access</h2>
                                <p className="mt-1 text-sm text-white/60">Course enrolment and monthly lab usage.</p>
                            </div>
                        </div>
                        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-extrabold text-[#2f9db0] shadow-sm">
                            {visible.length} shown
                        </span>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_12rem]">
                        <label className="relative">
                            <span className="sr-only">Search students</span>
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                            <input
                                className="h-11 w-full rounded-xl border border-white/12 bg-[#0f2f38]/60 pl-10 pr-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:border-white/20 focus:border-[#2f9db0] focus:ring-4 focus:ring-[#2f9db0]/10"
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search name, ID or email"
                                value={query}
                            />
                        </label>
                        <label>
                            <span className="sr-only">Filter by program</span>
                            <select
                                className="h-11 w-full rounded-xl border border-white/12 bg-[#0f2f38]/60 px-3 text-sm font-bold text-white/80 shadow-sm outline-none transition hover:border-white/20 focus:border-[#2f9db0] focus:ring-4 focus:ring-[#2f9db0]/10"
                                onChange={(event) => setProgramFilter(event.target.value)}
                                value={programFilter}
                            >
                                <option value="all">All programs</option>
                                {courses.map((course) => (
                                    <option key={course.abbreviation} value={course.name}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="sr-only">Sort students</span>
                            <select
                                className="h-11 w-full rounded-xl border border-white/12 bg-[#0f2f38]/60 px-3 text-sm font-bold text-white/80 shadow-sm outline-none transition hover:border-white/20 focus:border-[#2f9db0] focus:ring-4 focus:ring-[#2f9db0]/10"
                                onChange={(event) => setSortBy(event.target.value)}
                                value={sortBy}
                            >
                                <option value="name">Name A-Z</option>
                                <option value="program">Program A-Z</option>
                                <option value="recent">Recently added</option>
                            </select>
                        </label>
                    </div>
                </div>
                {loading && <div className="p-8 text-center text-sm font-semibold text-white/60">Loading students...</div>}
                {!loading && error && (
                    <div className="p-8 text-center">
                        <p className="text-sm font-semibold text-[#f29aa4]">{error}</p>
                        <button className="mt-4 rounded-xl bg-[#3ee7c2] px-4 py-2.5 text-sm font-bold text-[#082330]" onClick={onRetry} type="button">
                            Try again
                        </button>
                    </div>
                )}
                {!loading && !error && (
                    <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-2">
                        {visible.map((student) => {
                            const programStyle = PROGRAM_STYLES[student.program] ?? PROGRAM_STYLES.default;
                            return (
                                <article
                                    className={joinClasses(surface, "group relative overflow-hidden p-5 text-white transition-colors duration-150 hover:border-[#3ee7c2]/30")}
                                    key={student.id}
                                >
                                    <span className={joinClasses("absolute inset-x-0 top-0 h-1.5", programStyle.accent)} />
                                    <div className="flex items-start gap-4">
                                        <span
                                            className={joinClasses(
                                                "flex size-13 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-[0_12px_24px_-16px_rgba(10,45,55,0.75)]",
                                                programStyle.avatar,
                                            )}
                                        >
                                            {student.initials}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-lg font-bold tracking-[-0.02em]">{student.name}</p>
                                                    <p className="mt-1 text-sm font-semibold text-white/50">{student.id}</p>
                                                </div>
                                                <span
                                                    className={joinClasses(
                                                        "rounded-full px-3 py-1.5 text-xs font-extrabold uppercase",
                                                        student.status === "Near limit" ? "bg-[#f0b65e]/15 text-[#f0b65e]" : "bg-[#3ee7c2]/15 text-[#5fe3b8]",
                                                    )}
                                                >
                                                    {student.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <span className={joinClasses("inline-flex rounded-lg px-2.5 py-1.5 text-xs font-extrabold", programStyle.badge)}>
                                            {student.program}
                                        </span>
                                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-white/50">Term</p>
                                        <p className="mt-1 text-sm font-bold text-white/80">{student.term}</p>
                                    </div>
                                    <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                                        <a
                                            className="flex min-w-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 hover:text-[#2f9db0]"
                                            href={`mailto:${student.email}`}
                                        >
                                            <Mail className="size-4 shrink-0" />
                                            <span className="truncate">{student.email}</span>
                                        </a>
                                        {student.phoneNumber ? (
                                            <a
                                                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 hover:text-[#2f9db0]"
                                                href={`tel:${student.phoneNumber}`}
                                            >
                                                <Phone className="size-4 shrink-0" />
                                                <span>{student.phoneNumber}</span>
                                            </a>
                                        ) : (
                                            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-white/45">
                                                <Phone className="size-4 shrink-0" />
                                                <span>Not provided</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-5">
                                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                            <span className="font-semibold text-white/70">Monthly usage</span>
                                            <span className="font-extrabold">
                                                {student.monthly} / {student.monthlyLimit}
                                            </span>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 shadow-inner">
                                            <div
                                                className={joinClasses(
                                                    "h-full rounded-full shadow-[0_0_12px_rgba(31,184,196,0.25)]",
                                                    student.percent >= 85 ? "bg-[#f0b65e]" : programStyle.accent,
                                                )}
                                                style={{ width: `${student.percent}%` }}
                                            />
                                        </div>
                                        <p className="mt-2 text-right text-xs font-bold text-white/50">{student.percent}% used</p>
                                    </div>
                                    <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white/80">Account security</p>
                                            <p className="mt-1 text-xs text-white/50">Restore the initial password if access is lost.</p>
                                        </div>
                                        <button
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white/80 transition hover:border-[#2f9db0]/50 hover:text-[#2f9db0]"
                                            onClick={() => setResetStudentId(student.id)}
                                            type="button"
                                        >
                                            <KeyRound className="size-4" /> Reset password
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
                {!loading && !error && visible.length === 0 && (
                    <EmptyState message={students.length === 0 ? "No students have been added yet." : "No students match the selected filters."} />
                )}
            </AdminReveal>
            <StudentFormDialog courses={courses} onAddStudent={addStudent} onClose={() => setFormOpen(false)} open={formOpen} />
            <ConfirmDialog
                confirmLabel="Reset to student ID"
                description={studentToReset ? `The password will become ${studentToReset.id}. The student can change it again after signing in.` : ""}
                onClose={() => setResetStudentId("")}
                onConfirm={confirmPasswordReset}
                open={Boolean(studentToReset)}
                title="Reset student password?"
            />
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
        </div>
    );
}
