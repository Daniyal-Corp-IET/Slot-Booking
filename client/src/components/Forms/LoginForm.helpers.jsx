import { ArrowRight, Eye, EyeOff, Monitor } from "lucide-react";
import itxLogo from "../../assets/itx-logo.png";
const BOOKING_STEPS = [
    { number: "01", label: "Check", detail: "See available systems" },
    { number: "02", label: "Choose", detail: "Pick your preferred slot" },
    { number: "03", label: "Confirm", detail: "Reserve in seconds" },
];
const LOGIN_FORM_CONFIG = {
    ids: {
        username: "username",
        password: "password",
        passwordHelp: "password-help",
    },
    copy: {
        usernameLabel: "Student ID",
        usernamePlaceholder: "Enter your student ID",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter password",
        forgotPassword: "Forgot password?",
        passwordHelp: "Forgot your password? Please contact the lab administrator to have it reset.",
        showPassword: "Show password",
        hidePassword: "Hide password",
        submit: "Log in",
    },
};
const LOGIN_STYLES = {
    canvas: "booking-canvas relative min-h-screen overflow-hidden bg-itx-canvas font-sans text-itx-ink",
    page: "relative mx-auto flex min-h-screen w-full max-w-[86rem] items-center px-4 py-5 sm:px-7 sm:py-8 lg:px-12 xl:px-14",
    layout: "grid w-full min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,32rem)] lg:gap-12 xl:gap-20",
    formSection: "relative mx-auto w-full min-w-0 max-w-128 lg:mx-0 lg:justify-self-end",
    label: "text-sm font-bold text-slate-700",
    help: "mt-2 rounded-xl bg-slate-100 px-3 py-2.5 text-xs leading-5 text-slate-600",
    forgotButton:
        "rounded text-[11px] font-bold text-[#0ea5e9] outline-none transition hover:text-[#0284c7] focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/20",
    passwordToggle:
        "absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:bg-slate-100 hover:text-[#0ea5e9] focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/20",
    submitButton:
        "group flex h-12 w-full items-center justify-between rounded-xl bg-[#0ea5e9] px-4 text-sm font-bold text-white shadow-[0_15px_30px_-15px_rgba(14,165,233,0.5)] outline-none transition-colors duration-150 hover:bg-[#0284c7] focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/30 disabled:cursor-wait disabled:opacity-70",
    input: "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition duration-200 placeholder:font-medium placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#0ea5e9] focus:bg-white focus:ring-4 focus:ring-[#0ea5e9]/20",
};
function LoginVisualBackdrop() {
    return (
        <>
            <div aria-hidden="true" className="booking-orbit booking-orbit-one" />
            <div aria-hidden="true" className="booking-orbit booking-orbit-two" />
            <div aria-hidden="true" className="booking-capsule" />
            <div aria-hidden="true" className="booking-glow" />
        </>
    );
}
function BookingOverview() {
    return (
        <section className="hidden text-slate-900 lg:block">
            <div className="max-w-131">
                <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/50 px-4 py-2 backdrop-blur-sm">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">Computer lab booking portal</span>
                </div>

                <h1 className="max-w-lg text-[50px] font-semibold leading-[1.02] tracking-[-0.055em] xl:text-[64px]">Your system is ready when you are.</h1>
                <p className="mt-6 max-w-md text-[16px] leading-7 text-slate-600">Log in, find an open computer, and reserve the lab time that fits your day.</p>

                <div className="mt-12 grid max-w-119 grid-cols-3 gap-3">
                    {BOOKING_STEPS.map((step, index) => (
                        <div
                            className={`booking-step relative min-h-35 overflow-hidden rounded-[22px] border p-4 transition-colors duration-150 ${index === 1
                                ? "translate-y-5 border-[#0ea5e9]/30 bg-[#0ea5e9]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                                }`}
                            key={step.number}
                        >
                            <span className={`text-[10px] font-extrabold tracking-[0.2em] ${index === 1 ? 'text-white/70' : 'text-slate-400'}`}>{step.number}</span>
                            <p className={`mt-8 text-sm font-bold ${index === 1 ? 'text-white' : 'text-slate-900'}`}>{step.label}</p>
                            <p className={`mt-1 text-[11px] leading-4 ${index === 1 ? 'text-white/90' : 'text-slate-500'}`}>{step.detail}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
function BookingPass({ children }) {
    return (
        <>
            <div aria-hidden="true" className="absolute inset-3 rotate-[2.5deg] rounded-[36px] bg-[#0ea5e9] sm:inset-4 sm:rounded-[44px]" />
            <div aria-hidden="true" className="absolute -left-3 top-20 h-20 w-6 rounded-full bg-[#f59e0b] sm:-left-5 sm:h-28 sm:w-10" />
            <div className="booking-ticket relative rounded-[30px] border border-slate-100 bg-white px-5 py-6 shadow-[0_35px_90px_-30px_rgba(0,0,0,0.15)] sm:rounded-[40px] sm:px-10 sm:py-9 lg:px-12 lg:py-11">
                {children}
            </div>
        </>
    );
}
function LoginCardHeader() {
    return (
        <>
            <div className="flex items-start justify-between gap-4" role="banner">
                <div>
                    <img alt="ITX Learning Hub" className="h-auto w-51 max-w-[62vw] object-contain object-left sm:w-65" src={itxLogo} />
                    <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0ea5e9] sm:text-[11px]">LabSlot · Secure access</p>
                </div>
                <div className="hidden h-12 w-12 shrink-0 rotate-6 items-center justify-center rounded-2xl bg-[#f0f9ff] text-[#0ea5e9] shadow-[0_10px_22px_-12px_rgba(14,165,233,0.3)] sm:flex">
                    <Monitor aria-hidden="true" size={23} strokeWidth={2.2} />
                </div>
            </div>

            <div className="my-6 flex items-center gap-3 sm:my-8">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="h-2 w-2 rotate-45 bg-[#0ea5e9]" />
                <span className="h-px w-12 bg-slate-200" />
            </div>

            <div className="mb-7 sm:mb-8">
                <h2 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] text-slate-900 sm:text-[36px]">Welcome back</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">Log in to manage your computer lab bookings.</p>
            </div>
        </>
    );
}
function LoginCopyright() {
    return <p className="relative mt-8 text-center text-[13px] font-medium text-slate-400 sm:text-[11px]">© 2026 ITX Learning Hub · Computer Lab Portal</p>;
}
export function LoginView({ error, formData, isSubmitting, onChange, onForgotPassword, onSubmit, onTogglePassword, passwordHelpVisible, showPassword }) {
    const { copy, ids } = LOGIN_FORM_CONFIG;
    return (
        <main className={LOGIN_STYLES.canvas}>
            <LoginVisualBackdrop />

            <div className={LOGIN_STYLES.page}>
                <div className={LOGIN_STYLES.layout}>
                    <BookingOverview />

                    <section className={LOGIN_STYLES.formSection}>
                        <BookingPass>
                            <LoginCardHeader />

                            <form className="space-y-4" onSubmit={onSubmit}>
                                <div>
                                    <div className="mb-2">
                                        <label className={LOGIN_STYLES.label} htmlFor={ids.username}>
                                            {copy.usernameLabel}
                                        </label>
                                    </div>
                                    <input
                                        autoCapitalize="none"
                                        autoComplete="username"
                                        className={LOGIN_STYLES.input}
                                        id={ids.username}
                                        name="username"
                                        onChange={onChange}
                                        placeholder={copy.usernamePlaceholder}
                                        required
                                        spellCheck={false}
                                        value={formData.username}
                                    />
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-4">
                                        <label className={LOGIN_STYLES.label} htmlFor={ids.password}>
                                            {copy.passwordLabel}
                                        </label>
                                        <button
                                            aria-controls={ids.passwordHelp}
                                            aria-expanded={passwordHelpVisible}
                                            className={LOGIN_STYLES.forgotButton}
                                            onClick={onForgotPassword}
                                            type="button"
                                        >
                                            {copy.forgotPassword}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            aria-describedby={passwordHelpVisible ? ids.passwordHelp : undefined}
                                            autoComplete="current-password"
                                            className={`${LOGIN_STYLES.input} pr-12`}
                                            id={ids.password}
                                            name="password"
                                            onChange={onChange}
                                            placeholder={copy.passwordPlaceholder}
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                        />
                                        <button
                                            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                                            aria-pressed={showPassword}
                                            className={LOGIN_STYLES.passwordToggle}
                                            onClick={onTogglePassword}
                                            type="button"
                                        >
                                            {showPassword ? (
                                                <EyeOff aria-hidden="true" className="size-4.5" />
                                            ) : (
                                                <Eye aria-hidden="true" className="size-4.5" />
                                            )}
                                        </button>
                                    </div>
                                    {passwordHelpVisible && (
                                        <p className={LOGIN_STYLES.help} id={ids.passwordHelp} role="status">
                                            {copy.passwordHelp}
                                        </p>
                                    )}
                                </div>

                                {error && (
                                    <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300" role="alert">
                                        {error}
                                    </p>
                                )}

                                <button className={`ui-press ${LOGIN_STYLES.submitButton}`} disabled={isSubmitting} type="submit">
                                    <span>{isSubmitting ? "Logging in..." : copy.submit}</span>
                                    <span
                                        aria-hidden="true"
                                        className="flex size-8 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30"
                                    >
                                        <ArrowRight className="size-4" />
                                    </span>
                                </button>
                            </form>
                        </BookingPass>
                        <LoginCopyright />
                    </section>
                </div>
            </div>
        </main>
    );
}
