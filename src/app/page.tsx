import ServiceBento from "@/components/ServiceBento";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar"; // Ensure Navbar is here
import FadeIn from "@/components/ui/FadeIn";
import Link from "next/link"; // Added Link import

export default function Home() {
  return (
    <main>
      {/* <Navbar /> */}
      
      <FadeIn>
        <section className="flex flex-col items-center justify-center pt-32 pb-12 text-center px-4 bg-white">
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wide text-emerald-700 uppercase bg-emerald-50 rounded-full">
            Nigeria's #1 Academic Support Platform
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black text-gray-900 mb-6 tracking-tighter leading-[0.9]">
            Your Success, <br />
            <span className="text-emerald-600">Our Priority.</span>
          </h1>
          
          <p className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed font-medium">
            From final year projects to professional pitch decks, we provide 
            expertly structured writing support tailored for your academic goals.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Start Project Link */}
            <Link 
              href="/order" 
              className="btn-primary px-10 py-4 text-lg text-center"
            >
              Start Your Project
            </Link>

            {/* Browse Services Link - Anchors to the Bento section */}
            <Link 
              href="/#services" 
              className="bg-white border-2 border-gray-100 text-gray-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 text-center shadow-sm"
            >
              Browse Services
            </Link>
          </div>

          {/* Optional: Simple Trust Signal */}
          <div className="mt-12 flex items-center gap-4 text-gray-400">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                ))}
             </div>
             <p className="text-sm font-bold">Trusted by 500+ Unilag & UI Students</p>
          </div>
        </section>
      </FadeIn>

      {/* Sections with IDs for smooth scrolling */}
      <FadeIn delay={0.2}>
        <div id="services">
          <ServiceBento />
        </div>
      </FadeIn>

      <FadeIn delay={0.3}>
        <Pricing />
      </FadeIn>

      <FadeIn delay={0.4}>
        <Testimonials />
      </FadeIn>

      <Footer />
    </main>
  );
}