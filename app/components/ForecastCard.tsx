// components/ForecastCard.tsx
import { ForecastPeriod } from "../types";

export default function ForecastCard({ hour }: { hour: ForecastPeriod }) {
  const time = new Date(hour.startTime).toLocaleTimeString([], { 
    hour: 'numeric', 
    hour12: true 
  });

  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-between bg-white/50 backdrop-blur-md p-4 rounded-xl w-[120px] border border-white/5 hover:bg-white/20 transition-all">
      <p className="text-xs font-medium uppercase tracking-tighter opacity-60">
        {time}
      </p>
      
      {/* NWS Weather Icon */}
      <img 
        src={hour.icon} 
        alt={hour.shortForecast} 
        className="w-12 h-12 my-1 filter drop-shadow-md"
      />
      
    <div className="mt-2 text-center">
        <p className="text-xl font-bold leading-none">{hour.temperature}°</p>
        <p className="text-[10px] font-medium leading-tight mt-1 text-white/90 balance">
          {hour.shortForecast}
        </p>
      </div>
    </div>
  );
}