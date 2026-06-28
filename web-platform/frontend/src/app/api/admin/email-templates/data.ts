export interface EmailTemplatePreview {
  id: string;
  name: string;
  subject: string;
  template_html: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  beta_mode: true;
}

export const emailTemplatePreviews: EmailTemplatePreview[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to Logixa Flow!",
    template_html: "<h1>Welcome!</h1><p>Thanks for joining Logixa Flow. Get started today.</p>",
    variables: ["userName", "activationLink"],
    is_active: true,
    created_at: new Date().toISOString(),
    beta_mode: true,
  },
  {
    id: "2",
    name: "Contact Confirmation",
    subject: "We received your message",
    template_html: "<h1>Thanks for contacting us</h1><p>We received your message and will get back to you soon.</p>",
    variables: ["contactName", "submissionId"],
    is_active: true,
    created_at: new Date().toISOString(),
    beta_mode: true,
  },
  {
    id: "3",
    name: "Admin Notification",
    subject: "New contact submission",
    template_html: "<h1>New Contact</h1><p>A new contact submission has been received from {{contactEmail}}.</p>",
    variables: ["contactName", "contactEmail", "message"],
    is_active: true,
    created_at: new Date().toISOString(),
    beta_mode: true,
  },
];
