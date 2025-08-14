// app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Disclaimer",
  description:
    "How we collect, use, store, and delete your selfie, inputs, and generated comic.",
};

const EFFECTIVE_DATE = "August 14, 2025";
const CONTACT_EMAIL = "m.saifkazi@gmail.com"; // ← change this

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-neutral">
      <h1>Privacy Policy & Disclaimer</h1>
      <p><strong>Effective Date:</strong> {EFFECTIVE_DATE}</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Selfie</strong>: A photo you provide or capture.</li>
        <li><strong>User Inputs</strong>: Quiz answers and character details.</li>
        <li><strong>Generated Comic</strong>: The image we create for you.</li>
        <li><strong>Usage Data</strong>: Basic technical data (e.g., device, timestamps) for service reliability.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To generate your personalized comic using AI tools.</li>
        <li>To store images on our cloud to process, deliver, and let you download your result.</li>
        <li>To improve reliability and prevent abuse (rate limiting, fraud checks).</li>
      </ul>
      <p>
        We do <strong>not</strong> sell or rent your images. We share data only with
        providers strictly necessary to run the service (e.g., AI generation, cloud storage),
        under appropriate terms.
      </p>

      <h2>3. Storage & Security</h2>
      <ul>
        <li>Files are stored on secure cloud infrastructure with access controls.</li>
        <li>Transport is protected with HTTPS; we use industry-standard security measures.</li>
      </ul>

      <h2>4. Retention & Deletion</h2>
      <p>
        Images and comics are retained for <strong>90 days</strong> by default, then may be
        deleted. You can request permanent deletion at any time via{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>5. Your Consent</h2>
      <p>
        By submitting your selfie and inputs, you consent to storage and processing for the
        purposes above. You confirm you have the right to upload the selfie and that it does
        not infringe third-party rights.
      </p>

      <h2>6. AI Output Disclaimer</h2>
      <p>
        The artwork is AI-generated based on your inputs and may produce unintended
        similarities to real persons. Any resemblance to actual persons, living or dead, is
        purely coincidental. We are not responsible for such similarities.
      </p>

      <h2>7. Children</h2>
      <p>
        This service is not intended for children under 13. If you believe a child has
        provided personal data, please contact us for deletion.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be highlighted on
        this page with a new effective date.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions or deletion requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}
    