import itxLogo from "../../assets/itx-logo.png";

export function PortalLoader() {
    return (
        <main
            aria-label="Loading your ITX Learning Hub workspace"
            className="booking-canvas relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#071c28] px-5"
            role="status"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(35,166,176,0.15),transparent_30%),radial-gradient(circle_at_82%_75%,rgba(240,182,94,0.1),transparent_28%),linear-gradient(145deg,#071c28,#0a2632_55%,#071a23)]"
            />
            <div aria-hidden="true" className="booking-orbit booking-orbit-one motion-reduce:hidden" />
            <div aria-hidden="true" className="booking-orbit booking-orbit-two motion-reduce:hidden" />
            <div aria-hidden="true" className="booking-glow" />

            <div className="ui-fade-in relative w-full max-w-sm overflow-hidden rounded-4xl border border-white/12 bg-white/[0.07] p-5 shadow-[0_34px_90px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-7">
                <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-[#52cbd1]/10 blur-3xl" />
                <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(145deg,#fffefb,#f4f7f2)] px-6 py-6 shadow-[0_24px_55px_-28px_rgba(0,0,0,0.8)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(22,171,183,0.14),transparent_65%)]" />
                    <img alt="ITX Learning Hub" className="relative mx-auto h-auto w-full max-w-70 object-contain" src={itxLogo} />
                </div>

                <div className="mt-6 overflow-hidden rounded-full border border-white/5 bg-black/15 p-1 shadow-inner">
                    <div className="ui-loader-bar h-1.5 w-1/3 rounded-full bg-gradient-to-r from-[#54d1d5] via-[#8bd9c9] to-[#f0b65e] shadow-[0_0_16px_rgba(84,209,213,0.45)]" />
                </div>

                <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-white/60">Preparing your workspace</p>
            </div>
        </main>
    );
}
