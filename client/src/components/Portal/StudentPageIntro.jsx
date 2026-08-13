export function StudentPageIntro({ description, eyebrow, icon: Icon, stats = [], title }) {
    return (
        <section className="ui-fade-in portal-surface overflow-hidden rounded-[22px] border px-5 py-5 sm:px-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="flex min-w-0 items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#3096A7]/10 text-[#277f8e]">
                    <Icon className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#3096A7]">{eyebrow}</p>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-itx-ink sm:text-[1.7rem]">{title}</h2>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
                </div>
            </div>

            {stats.length > 0 && (
                <dl className="mt-5 grid shrink-0 grid-cols-3 gap-2 border-t border-slate-200 pt-4 lg:mt-0 lg:min-w-[27rem] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    {stats.map((stat) => (
                        <div className="min-w-0 rounded-xl border border-slate-200/80 bg-[#f7fafb] px-3 py-2.5" key={stat.label}>
                            <dt className="text-[9px] font-bold uppercase leading-4 tracking-[0.05em] text-slate-400 sm:text-[10px]">{stat.label}</dt>
                            <dd className="mt-1 break-words text-sm font-extrabold leading-5 text-itx-ink sm:text-base">{stat.value}</dd>
                            {stat.detail && <dd className="mt-0.5 break-words text-[10px] font-semibold leading-4 text-slate-400 sm:text-[11px]">{stat.detail}</dd>}
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}
