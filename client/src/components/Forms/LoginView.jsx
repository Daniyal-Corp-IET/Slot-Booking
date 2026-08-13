import { CalendarCheck2, CalendarDays, Clock3, Eye, EyeOff, Monitor, MousePointerClick, ShieldCheck } from "lucide-react";
import itxLogo from "../../assets/itx-logo.png";

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
        passwordPlaceholder: "Enter your password",
        forgotPassword: "Forgot password?",
        passwordHelp: "Please contact the lab administrator to reset your password.",
        showPassword: "Show password",
        hidePassword: "Hide password",
        submit: "Login",
    },
};

const LOGIN_STYLES = {
    canvas: "login-canvas relative isolate min-h-screen overflow-hidden bg-[#06191f] font-['Plus_Jakarta_Sans',sans-serif] text-white antialiased",
    page: "relative z-10 mx-auto flex min-h-screen w-full max-w-[90rem] items-center justify-center px-4 py-10 sm:px-6",
    card: "relative mx-auto w-full max-w-[27rem] overflow-hidden rounded-[26px] border border-white/70 bg-white px-6 py-7 text-[#0d1720] shadow-[0_38px_110px_-32px_rgba(0,0,0,0.78),0_0_70px_-35px_rgba(62,231,194,0.65)] sm:px-9 sm:py-9",
    label: "mb-2 block text-[12px] font-bold tracking-[0.01em] text-slate-700",
    input: "h-[52px] w-full rounded-xl border border-slate-200 bg-[#f8fafb] px-4 text-[14px] font-semibold text-slate-900 outline-none transition duration-200 placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-[#3096a7] focus:bg-white focus:ring-4 focus:ring-[#3ee7c2]/15",
    forgotButton: "rounded-md text-[12px] font-bold text-[#177d8e] outline-none transition hover:text-[#0c5664] focus-visible:ring-4 focus-visible:ring-[#3096a7]/20",
    passwordToggle: "absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:bg-[#e9f6f5] hover:text-[#177d8e] focus-visible:ring-4 focus-visible:ring-[#3096a7]/20",
    submitButton: "mt-1 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#3096A7] px-5 text-[14px] font-extrabold text-white shadow-[0_18px_34px_-17px_rgba(48,150,167,0.88),0_8px_24px_-18px_rgba(62,231,194,0.38)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#278898] hover:shadow-[0_22px_40px_-16px_rgba(48,150,167,0.8),0_10px_28px_-18px_rgba(62,231,194,0.44)] focus-visible:ring-4 focus-visible:ring-[#3ee7c2]/25 disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0",
};

const CANVAS_ICONS = [
    { className: "left-[8%] top-[14%] -rotate-6", icon: Monitor },
    { className: "left-[20%] top-[34%] rotate-12", icon: MousePointerClick },
    { className: "bottom-[18%] left-[7%] -rotate-6", icon: CalendarDays },
    { className: "bottom-[7%] left-[22%] rotate-6", icon: Clock3 },
    { className: "right-[12%] top-[14%] rotate-6", icon: CalendarCheck2 },
    { className: "right-[4%] top-[43%] -rotate-6", icon: Monitor },
    { className: "bottom-[18%] right-[10%] rotate-6", icon: ShieldCheck },
    { className: "bottom-[6%] right-[27%] -rotate-6", icon: Clock3 },
];

function CanvasBackdrop() {
    return (
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(48,150,167,0.30),transparent_28rem),radial-gradient(circle_at_12%_16%,rgba(48,150,167,0.16),transparent_25rem),radial-gradient(circle_at_86%_82%,rgba(62,231,194,0.09),transparent_28rem),linear-gradient(145deg,#06181e_0%,#07313a_52%,#041419_100%)]" />
            <div className="login-grid absolute inset-0" />
            <div className="absolute inset-0 shadow-[inset_0_0_180px_55px_rgba(1,13,17,0.34)]" />
            <div className="absolute left-1/2 top-1/2 h-[47rem] w-[47rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3096A7]/[0.13]" />
            <div className="absolute left-1/2 top-1/2 h-[35rem] w-[35rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3ee7c2]/[0.07]" />
            <div className="absolute left-1/2 top-1/2 h-[29rem] w-[29rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3096A7]/[0.09] blur-[76px]" />

            <div className="absolute left-[5.5%] top-1/2 hidden w-44 -translate-y-1/2 grid-cols-2 gap-3 xl:grid">
                {Array.from({ length: 6 }, (_, index) => (
                    <span className="login-workstation-slot" key={`left-slot-${index}`}>
                        <span className="login-workstation-screen" />
                        <span className="login-workstation-status" />
                    </span>
                ))}
            </div>
            <div className="absolute right-[5.5%] top-1/2 hidden w-44 -translate-y-1/2 grid-cols-2 gap-3 xl:grid">
                {Array.from({ length: 6 }, (_, index) => (
                    <span className="login-workstation-slot" key={`right-slot-${index}`}>
                        <span className="login-workstation-screen" />
                        <span className="login-workstation-status" />
                    </span>
                ))}
            </div>
            {CANVAS_ICONS.map(({ className, icon: Icon }, index) => (
                <Icon className={`absolute size-8 text-[#3096A7]/[0.19] sm:size-9 ${className}`} key={`${className}-${index}`} strokeWidth={1.55} />
            ))}
        </div>
    );
}

function FormHeader() {
    return (
        <div className="mb-7 text-center">
            <div className="mx-auto flex h-14 w-full max-w-[18rem] items-center justify-center border-b border-slate-100 pb-4">
                <img alt="ITX Learning Hub" className="h-11 w-auto object-contain" src={itxLogo} />
            </div>
            <h1 className="mt-6 font-['Fraunces',serif]! text-[31px] font-medium leading-tight tracking-[-0.025em] text-[#10242b]">Welcome back</h1>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">Sign in to book your workstation and manage your slots.</p>
        </div>
    );
}

export function LoginView({ error, formData, isSubmitting, onChange, onForgotPassword, onSubmit, onTogglePassword, passwordHelpVisible, showPassword }) {
    const { copy, ids } = LOGIN_FORM_CONFIG;

    return (
        <main className={LOGIN_STYLES.canvas}>
            <CanvasBackdrop />

            <div className={LOGIN_STYLES.page}>
                <div className="w-full">
                    <section className={LOGIN_STYLES.card}>
                        <FormHeader />

                        <form className="space-y-4" onSubmit={onSubmit}>
                            <div>
                                <label className={LOGIN_STYLES.label} htmlFor={ids.username}>{copy.usernameLabel}</label>
                                <input
                                    autoCapitalize="none"
                                    autoComplete="username"
                                    autoFocus
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
                                    <label className="text-[12px] font-bold tracking-[0.01em] text-slate-700" htmlFor={ids.password}>{copy.passwordLabel}</label>
                                    <button aria-controls={ids.passwordHelp} aria-expanded={passwordHelpVisible} className={LOGIN_STYLES.forgotButton} onClick={onForgotPassword} type="button">
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
                                    <button aria-label={showPassword ? copy.hidePassword : copy.showPassword} aria-pressed={showPassword} className={LOGIN_STYLES.passwordToggle} onClick={onTogglePassword} type="button">
                                        {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
                                    </button>
                                </div>
                                {passwordHelpVisible && <p className="mt-2 rounded-xl border border-[#3096a7]/10 bg-[#edf8f7] px-3 py-2.5 text-xs font-medium leading-5 text-[#315b63]" id={ids.passwordHelp} role="status">{copy.passwordHelp}</p>}
                            </div>

                            {error && <p className="rounded-xl border border-itx-danger/20 bg-itx-danger/10 px-4 py-3 text-sm font-semibold text-itx-danger" role="alert">{error}</p>}

                            <button className={`ui-press ${LOGIN_STYLES.submitButton}`} disabled={isSubmitting} type="submit">
                                <span>{isSubmitting ? "Logging in..." : copy.submit}</span>
                            </button>
                        </form>
                    </section>

                    <p className="mt-6 text-center text-[11px] font-semibold text-white/35">© 2026 ITX Learning Hub · Computer Lab Portal</p>
                </div>
            </div>
        </main>
    );
}
