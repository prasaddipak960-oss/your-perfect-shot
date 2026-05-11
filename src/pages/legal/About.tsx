import { LegalLayout } from "./LegalLayout";

const About = () => (
  <LegalLayout title="About Your Perfect Shot">
    <p>
      <strong>Your Perfect Shot</strong> is an HD camera app for Android offering Pro, Beauty, Night, Time-Lapse and
      Video modes together with a stylish photo editor and gorgeous filters.
    </p>
    <p>
      The app is built for speed and privacy. Every photo and video stays on your device — there is no cloud upload,
      no account and no tracking. The app works fully offline; an internet connection is only needed if you choose to
      share a photo with another app.
    </p>
    <p>
      <strong>Highlights</strong>
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li>HD photo & 1080p video capture</li>
      <li>Beauty, Night and Time-Lapse modes</li>
      <li>Real-time filters and a built-in editor</li>
      <li>Offline-first — works without internet</li>
      <li>Local gallery, no account required</li>
    </ul>
    <p>Version 1.0.1 · Made for Mobile</p>
  </LegalLayout>
);

export default About;
