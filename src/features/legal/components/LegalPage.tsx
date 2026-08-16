import { Brand } from "../../../shared/ui/Brand";

export type LegalDocument = "terms" | "privacy" | "cookies";

type LegalPageProps = {
  document: LegalDocument;
};

const titles: Record<LegalDocument, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
};

/** Public, static legal pages. Review the copy with counsel before production use. */
export function LegalPage({ document }: LegalPageProps) {
  const title = titles[document];

  return (
    <main className="legal-shell">
      <header className="legal-header">
        <a href="/" aria-label="AI Platform home"><Brand /></a>
        <a className="legal-back" href="/">Back to AI Platform</a>
      </header>
      <article className="legal-document">
        <p className="eyebrow">Legal</p>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: August 14, 2026</p>
        {document === "terms" && <Terms />}
        {document === "privacy" && <Privacy />}
        {document === "cookies" && <Cookies />}
      </article>
      <LegalFooter />
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© 2026 AI Platform</span>
      <nav aria-label="Legal">
        <a href="/terms">Terms</a><span aria-hidden="true">·</span>
        <a href="/privacy">Privacy</a><span aria-hidden="true">·</span>
        <a href="/cookies">Cookies</a>
      </nav>
    </footer>
  );
}

function Terms() {
  return <>
    <p>These Terms of Service govern your use of AI Platform. By accessing or using the service, you agree to these terms.</p>
    <h2>Using the service</h2>
    <p>You may use the service only in compliance with applicable law and these terms. You are responsible for activity under your account and for the content you submit, create, or share through the service. Do not use the service to harm others, interfere with its operation, or infringe another person’s rights.</p>
    <h2>Intellectual property</h2>
    <p>AI Platform and its software, branding, and other service materials are protected by intellectual-property laws. We retain all rights in them. You retain ownership of content you provide and grant us the limited rights needed to operate, maintain, and improve the service for you.</p>
    <h2>Availability and liability</h2>
    <p>The service is provided “as is” and “as available.” To the extent permitted by law, we do not make warranties about uninterrupted, error-free, or secure operation. We are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</p>
    <h2>Termination</h2>
    <p>You may stop using the service at any time. We may suspend or end access where reasonably necessary, including for a breach of these terms, security concerns, or legal requirements.</p>
    <h2>Changes</h2>
    <p>We may update these terms from time to time. Continuing to use the service after an update takes effect means you accept the updated terms.</p>
  </>;
}

function Privacy() {
  return <>
    <p>This policy explains how AI Platform handles personal data when you use the service.</p>
    <h2>Information we collect</h2>
    <p>We collect account information such as your name and email address, information you choose to submit to the service, and technical information required to provide and secure the service, such as log and device data.</p>
    <h2>How we use information</h2>
    <p>We use information to provide, secure, maintain, and improve the service; communicate with you; and meet our legal obligations. We do not sell your personal information.</p>
    <h2>Storage and sharing</h2>
    <p>We store information for as long as needed to operate the service and meet legal obligations. We may use carefully selected service providers to host, authenticate, or support the service. They may access data only as needed to provide services to us.</p>
    <h2>Your rights</h2>
    <p>Depending on where you live, you may have rights to access, correct, delete, or receive a copy of your personal data, and to object to or restrict certain processing. To make a request, contact the service operator through your account or usual support channel.</p>
    <h2>Updates</h2>
    <p>We may update this policy to reflect changes to the service or legal requirements. We will post the current version here.</p>
  </>;
}

function Cookies() {
  return <>
    <p>AI Platform uses cookies and similar technologies only where needed to operate and secure the service.</p>
    <h2>Essential cookies</h2>
    <p>Essential cookies may be used to maintain sign-in sessions, remember security-related settings, and help prevent abuse. These cookies are necessary for the service to work and cannot be switched off through the service.</p>
    <h2>Analytics and advertising</h2>
    <p>AI Platform does not use advertising or cross-site tracking cookies. If optional analytics cookies are introduced, this policy will be updated and any required consent will be requested before they are set.</p>
    <h2>Managing cookies</h2>
    <p>You can control or delete cookies through your browser settings. Blocking essential cookies may prevent parts of the service from working correctly.</p>
  </>;
}
