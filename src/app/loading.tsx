export default function Loading() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-100">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-800 font-bold animate-pulse">uniSupport is preparing your success...</p>
      </div>
    </div>
  );
}