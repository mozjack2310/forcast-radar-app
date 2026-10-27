export default function TelemetryRail() {
  // In a full production state, these would be fed by your global Zustand store
  // based on actual ping responses from your FastAPI health-check endpoint.
  const services = [
    { name: "NWS API", status: "ok", ping: "42ms" },
    { name: "FastAPI", status: "ok", ping: "12ms" },
    { name: "Redis", status: "ok", ping: "2ms" },
    { name: "Socket", status: "warn", ping: "---" }, // Example of a warning state
  ];

  return (
    <div className="hidden lg:flex w-16 xl:w-48 h-screen bg-slate-950 border-r border-slate-800 flex-col py-6 z-[5000] fixed left-0 top-0 transition-all duration-300">
      {/* Brand / Logo Area */}
      <div className="px-4 mb-8 flex items-center justify-center xl:justify-start">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-black text-white shrink-0">
          FR
        </div>
        <span className="ml-3 font-black text-slate-200 tracking-widest hidden xl:block">
          SYS_OPS
        </span>
      </div>

      {/* Telemetry Nodes */}
      <div className="flex-1 flex flex-col gap-6 px-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 hidden xl:block">
          Core Infrastructure
        </h4>

        {services.map((service) => (
          <div
            key={service.name}
            className="flex flex-col xl:flex-row xl:items-center justify-between group cursor-default"
          >
            {/* Status Indicator & Name */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0 mx-auto xl:mx-0">
                {service.status === "ok" && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                )}
                {service.status === "warn" && (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                )}
                {service.status === "error" && (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                )}
              </span>
              <span className="text-xs font-bold text-slate-300 hidden xl:block">
                {service.name}
              </span>
            </div>

            {/* Ping Timing (Only visible on large expanded rail) */}
            <span className="text-[10px] font-mono text-slate-500 hidden xl:block">
              {service.ping}
            </span>

            {/* Mobile Tooltip (Visible on hover when collapsed) */}
            <div className="absolute left-14 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 xl:hidden pointer-events-none whitespace-nowrap z-50">
              {service.name}: {service.ping}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Anchor / Master Status */}
      <div className="mt-auto px-4 pt-4 border-t border-slate-800">
        <div className="flex justify-center xl:justify-start items-center gap-3">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 12h14M12 5l7 7-7 7"
            ></path>
          </svg>
          <span className="text-xs font-bold text-slate-400 hidden xl:block">
            v2.0.1 Stable
          </span>
        </div>
      </div>
    </div>
  );
}
