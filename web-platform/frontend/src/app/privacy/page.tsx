import { Metadata } from "next";
import Footer7 from "@/components/ui/footer-7";

export const metadata: Metadata = {
  title: "Privacy Policy | Logixa Flow",
  description: "Read our privacy policy to understand how we collect and use your data.",
  openGraph: {
    title: "Privacy Policy",
    description: "Logixa Flow Privacy Policy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Privacy Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              Logixa Flow (&quot;we&quot; or &quot;us&quot; or &quot;our&quot;) operates the website. This page informs you of our policies regarding the collection,
              use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>

            <h3 className="text-xl font-semibold text-slate-200 mt-4 mb-2">Types of Data Collected:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Personal Data: Name, email address, phone number, cookies and usage data</li>
              <li>Usage Data: Browser type and version, IP address, pages visited, time and date of visit</li>
              <li>Device Data: Device type, operating system, unique device identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Use of Data</h2>
            <p>Logixa Flow uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer care and support</li>
              <li>To gather analysis or valuable information so we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Security of Data</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission over the Internet or method of
              electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we
              cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can
              instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies,
              you may not be able to use some portions of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Third-Party Links</h2>
            <p>
              Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be
              directed to that third party&apos;s site. We strongly advise you to review the Privacy Policy of every site you visit. We have no
              control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Children&apos;s Privacy</h2>
            <p>
              Our Service does not address anyone under the age of 18 (&quot;Children&quot;). We do not knowingly collect personally identifiable
              information from children under 18. If we become aware that we have collected personal data from a child under 18 without
              verifiable parental consent, we take steps to remove such data and terminate the child&apos;s account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;effective date&quot; at the bottom of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>The right to access your personal data</li>
              <li>The right to correct inaccurate data</li>
              <li>The right to request deletion of your data</li>
              <li>The right to restrict processing of your data</li>
              <li>The right to data portability</li>
              <li>The right to opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:privacy@logixaflow.com" className="text-cyan-500 hover:text-cyan-400">
                privacy@logixaflow.com
              </a>
            </p>
          </section>

          <p className="text-slate-400 text-sm mt-12">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <Footer7 />
    </div>
  );
}
