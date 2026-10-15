from app.database import SessionLocal
from app.models import EmailTemplate

def seed_email_templates():
    db = SessionLocal()

    # Add sample email templates
    sample_templates = [
        EmailTemplate(
            id='newsletter_welcome',
            name='Newsletter Welcome',
            subject='Welcome to Logixa Flow Newsletter',
            template_html='<html><body><h1>Welcome!</h1><p>Thank you for subscribing to our newsletter.</p></body></html>',
            is_active=True,
            description='Welcome email for new newsletter subscribers',
        ),
        EmailTemplate(
            id='article_published',
            name='Article Published Notification',
            subject='New Article Published: {article_title}',
            template_html='<html><body><h1>New Article!</h1><p>We just published a new article: {article_title}</p></body></html>',
            is_active=True,
            description='Notification sent when a new article is published',
        ),
        EmailTemplate(
            id='password_reset',
            name='Password Reset',
            subject='Reset Your Password',
            template_html='<html><body><h1>Reset Password</h1><p>Click here to reset your password: {reset_link}</p></body></html>',
            is_active=True,
            description='Password reset email for users',
        ),
        EmailTemplate(
            id='agent_report',
            name='AI Agent Report',
            subject='AI Agent Execution Report',
            template_html='<html><body><h1>Agent Report</h1><p>Your AI agent has completed its task. Results: {results}</p></body></html>',
            is_active=False,
            description='Report email for AI agent executions',
        ),
    ]

    # Check if templates already exist
    existing = db.query(EmailTemplate).all()
    if not existing:
        for template in sample_templates:
            db.add(template)
        db.commit()
        print('Sample email templates added successfully')
    else:
        print(f'Email templates already exist ({len(existing)} found)')

    db.close()

if __name__ == "__main__":
    seed_email_templates()