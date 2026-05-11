import { LegalLayout } from "./LegalLayout";

const Privacy = () => (
  <LegalLayout title="Privacy Policy">
    <p>Last updated: May 2026</p>
    <p>
      Your Perfect Shot ("the app") is designed with privacy first. We do <strong>not</strong> collect, upload, sell or
      share your photos, videos, contacts, location or any personal data.
    </p>
    <p>
      <strong>Camera & Microphone.</strong> Used only on your device to capture photos and videos. Nothing is sent to
      any server.
    </p>
    <p>
      <strong>Storage.</strong> Captures are written to your device's local gallery / app folder only. You can delete
      them at any time from the app or your file manager.
    </p>
    <p>
      <strong>Notifications.</strong> Optional. Used only to inform you about important app updates and tips. You can
      disable them from Android settings.
    </p>
    <p>
      <strong>Network.</strong> The app works fully offline. Internet is only used if you choose to share a photo with
      another installed app (e.g. WhatsApp, Gmail).
    </p>
    <p>
      <strong>Analytics & Ads.</strong> The app does not include third-party analytics SDKs or advertising trackers.
    </p>
    <p>
      <strong>Children.</strong> The app is suitable for general audiences and does not knowingly collect data from
      anyone, including children under 13.
    </p>
    <p>
      <strong>Changes.</strong> We may update this policy from time to time. Significant changes will be announced on
      this page.
    </p>
    <p>
      For any privacy question email{" "}
      <a className="underline" href="mailto:support@yourperfectshot.app">
        support@yourperfectshot.app
      </a>
      .
    </p>
  </LegalLayout>
);

export default Privacy;
