import { LegalLayout } from "./LegalLayout";

const Contact = () => (
  <LegalLayout title="Contact Us">
    <p>We'd love to hear from you. For support, feedback or bug reports please reach out:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>
        Email: <a className="underline" href="mailto:support@yourperfectshot.app">support@yourperfectshot.app</a>
      </li>
      <li>Response time: usually within 24 hours on working days</li>
    </ul>
    <p>
      Please include your device model and Android version when reporting a problem — it helps us reproduce the issue
      quickly.
    </p>
  </LegalLayout>
);

export default Contact;
