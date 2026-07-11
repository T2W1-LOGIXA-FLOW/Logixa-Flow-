import { Metadata } from "next";
import Footer from "@/components/Footer";
import PageBackground from "@/components/PageBackground";

export const metadata: Metadata = {
  title: "Terms of Service | Logixa Flow",
  description: "Read our terms of service and conditions of use for Logixa Flow.",
  openGraph: {
    title: "Terms of Service",
    description: "Logixa Flow Terms of Service",
  },
};

export default function TermsPage() {
  return (
    <PageBackground overlayOpacity={0.15}>
      <div className="min-h-screen text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Terms of Service
        </h1>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on Logixa Flow&apos;s website
              for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under
              this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on the website</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or &quot;mirroring&quot; the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer</h2>
            <p>
              The materials on Logixa Flow&apos;s website are provided on an &apos;as is&apos; basis. Logixa Flow makes no warranties, expressed or
              implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or
              conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other
              violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Limitations</h2>
            <p>
              In no event shall Logixa Flow or its suppliers be liable for any damages (including, without limitation, damages for loss
              of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Logixa
              Flow&apos;s website, even if Logixa Flow or an authorized representative has been notified orally or in writing of the possibility
              of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on Logixa Flow&apos;s website could include technical, typographical, or photographic errors. Logixa Flow
              does not warrant that any of the materials on its website are accurate, complete, or current. Logixa Flow may make changes to
              the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Links</h2>
            <p>
              Logixa Flow has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked
              site. The inclusion of any link does not imply endorsement by Logixa Flow of the site. Use of any such linked website is at the
              user&apos;s own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Modifications</h2>
            <p>
              Logixa Flow may revise these terms of service for its website at any time without notice. By using this website, you are
              agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of [Your Country/State] and you
              irrevocably submit to the exclusive jurisdiction of the courts located therein.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:{" "}
              <a href="mailto:legal@logixaflow.com" className="text-cyan-500 hover:text-cyan-400">
                legal@logixaflow.com
              </a>
            </p>
          </section>

          <p className="text-slate-400 text-sm mt-12">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <Footer />
    </div>
    </PageBackground>
  );
}
