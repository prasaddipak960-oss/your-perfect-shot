import { LegalLayout } from "./LegalLayout";

const Terms = () => (
  <LegalLayout title="Terms & Conditions">
    <p>Last updated: May 2026</p>
    <p>
      By installing or using Your Perfect Shot ("the app") you agree to the following terms. If you do not agree,
      please uninstall the app.
    </p>
    <p>
      <strong>1. License.</strong> You are granted a personal, non-exclusive, non-transferable license to use the app
      on your own Android device for non-commercial purposes.
    </p>
    <p>
      <strong>2. Acceptable use.</strong> You agree not to use the app to capture or share content that is illegal,
      infringes someone else's rights, or violates someone's privacy. You are solely responsible for the photos and
      videos you capture.
    </p>
    <p>
      <strong>3. Content ownership.</strong> All photos and videos you capture belong to you. The app does not claim
      any rights to your content.
    </p>
    <p>
      <strong>4. No warranty.</strong> The app is provided "as is" without warranty of any kind. We do not guarantee
      that the app will be error-free or compatible with every device.
    </p>
    <p>
      <strong>5. Limitation of liability.</strong> To the maximum extent permitted by law we are not liable for any
      indirect, incidental or consequential damages arising from your use of the app, including loss of photos.
      Always keep your own backups.
    </p>
    <p>
      <strong>6. Updates.</strong> We may release updates to add features or fix bugs. Some updates may be required
      to keep using the app.
    </p>
    <p>
      <strong>7. Termination.</strong> You may stop using the app at any time by uninstalling it.
    </p>
    <p>
      <strong>8. Contact.</strong>{" "}
      <a className="underline" href="mailto:support@yourperfectshot.app">
        support@yourperfectshot.app
      </a>
    </p>
  </LegalLayout>
);

export default Terms;
