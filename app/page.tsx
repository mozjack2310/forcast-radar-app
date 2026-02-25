import Image from "next/image";
import { getHourly } from "./api/hourly";
import ForecastCard from "./components/ForecastCard";

export default async function Page() {
  // Fetch the data server-side (Safe & Fast)
  const hourlyData = await getHourly();

  return (
    <div className="relative flex flex-col justify-between max-w h-[90vh] m-auto p-5 text-white">
      <title>ForRad Weather - Birmingham</title>
      
      {/* Background with Unsplash image */}
      <Image
        fill={true}
        src="https://images.unsplash.com/photo-1601134467661-3d775b999c8b?auto=format&fit=crop&w=2575&q=80"
        className="object-cover -z-10"
        alt="background clouds"
      />

      {/* Main Stats Area */}
      <div className="bg-black/50 relative p-8 rounded-md text-white">
      <h1 className="text-3xl font-black text-center mb-6 drop-shadow-lg tracking-tight">
          BIRMINGHAM, AL
      </h1>        
        <div className="grid grid-cols-3 gap-8 text-center items-center">
          {/* We grab the first hour for the "Current" display */}
          {hourlyData && hourlyData.length > 0 && (
            <>
              <div className="flex flex-col items-center">
                <p className="font-bold text-2xl">{hourlyData[0].temperature}°F</p>
                <p className="text-xl">Temperature</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="font-bold text-2xl">{hourlyData[0].relativeHumidity.value}%</p>
                <p className="text-xl">Humidity</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="font-bold text-2xl">{hourlyData[0].windSpeed}</p>
                <p className="text-xl">Winds</p>
              </div>
            </>
          )}
        </div>
      </div>


 {/* Horizontal Hourly Scroll (The 'CCNA Data Stream' View) */}
  {/* Hourly Forecast Scroll */}
  <div className="relative w-full mt-auto"> {/* mt-auto pushes it to the bottom */}
    <p className="text-white font-bold text-xs uppercase mb-3 ml-2 tracking-widest drop-shadow-md">
      Next 24 Hours
    </p>


  
  {/* The 'Glass' Container */}
  <div className="flex gap-4 overflow-x-auto p-5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 no-scrollbar">
    {hourlyData.slice(0, 24).map((hour: any, index: number) => (
      <ForecastCard key={index} hour={hour} />
    ))}
  </div>
  </div>
  </div>
  );
}
{/* Heartbeat / Last Updated */}
<div className="absolute bottom-2 right-4 flex items-center gap-2 opacity-50">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
  <p className="text-[9px] font-mono uppercase tracking-widest">
    System Active • {new Date().toLocaleTimeString()}
  </p>
</div>