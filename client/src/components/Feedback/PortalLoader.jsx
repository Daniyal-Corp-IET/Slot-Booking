import itxLogo from "../../assets/itx-logo.png";

export function PortalLoader() {
    return (
        <main
            aria-label="Loading your ITX Learning Hub workspace"
            className="booking-canvas relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-itx-canvas px-5"
            role="status"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(18,138,147,0.16),transparent_30%),radial-gradient(circle_at_82%_75%,rgba(227,172,92,0.12),transparent_28%),linear-gradient(145deg,#effaf7,#eef6f4_55%,#e3f0ec)]"
            />
            <div className="ui-fade-in relative w-full max-w-sm overflow-hidden rounded-4xl border border-itx-border bg-white/80 p-5 shadow-[0_34px_90px_-28px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-7">
                <div className="relative overflow-hidden rounded-3xl border border-white bg-[linear-gradient(145deg,#fffefb,#f4f7f2)] px-6 py-6 shadow-[0_24px_55px_-28px_rgba(15,23,42,0.2)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(22,171,183,0.14),transparent_65%)]" />
                    <img alt="ITX Learning Hub" className="relative mx-auto h-auto w-full max-w-70 object-contain" src={itxLogo} />
                </div>

                <div className="mt-6 overflow-hidden rounded-full border border-itx-border bg-slate-100 p-1 shadow-inner">
                    <div className="ui-loader-bar h-1.5 w-1/3 rounded-full bg-gradient-to-r from-[#128a93] via-[#56d7bf] to-[#e3ac5c] shadow-[0_0_16px_rgba(18,138,147,0.35)]" />
                </div>

                <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Preparing your workspace</p>
            </div>
        </main>
    );
}
