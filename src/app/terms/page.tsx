export default function LegalPage({ title, content }: { title: string, content: any }) {
  return (
    <main className="pt-32 pb-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black mb-8">{title}</h1>
        <div className="prose prose-emerald text-gray-600 leading-relaxed space-y-6">
          {/* You would paste the specific clauses here */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-2">1. Service Delivery</h3>
            <p>uniSupport provides academic research and formatting assistance. We do not support academic dishonesty or plagiarism...</p>
          </section>
          <section>
            <h4 className="text-xl font-bold text-gray-900 mb-2">2. Payment Policy</h4>
            <p>A 50% non-refundable deposit is required to commence any project. The balance must be paid upon delivery of the blurred preview.</p>
          </section>
        </div>
      </div>
    </main>
  );
}