import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-black text-emerald-50">404</h1>
      <div className="-mt-12">
        <h2 className="text-3xl font-bold mb-4">Lost in Research?</h2>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/" className="btn-primary">Return Home</Link>
      </div>
    </div>
  );
}