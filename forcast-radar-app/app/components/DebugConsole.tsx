"use client";

export default function DebugConsole({ data }: { data: any }) {
  return (
    <div className="w-full h-full p-4 overflow-auto custom-scrollbar bg-transparent">
      <pre className="font-mono text-xs sm:text-sm text-cyan-400 whitespace-pre-wrap leading-relaxed transition-colors duration-300">
        {JSON.stringify(data || { status: "Awaiting payload..." }, null, 2)}
      </pre>
    </div>
  );
}
