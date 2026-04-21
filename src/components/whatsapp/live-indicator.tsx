"use client";

export function LiveIndicator() {
 return (
  <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs text-success">
   <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
    <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
   </span>
   Live · aggiornamento ogni 5s
  </div>
 );
}
