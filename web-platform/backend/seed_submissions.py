from app.database import SessionLocal
from app.models import ContentSubmission

def seed_submissions():
    db = SessionLocal()

    # Add sample submissions
    sample_submissions = [
        ContentSubmission(
            id='sub_001',
            name='John Smith',
            email='john.smith@example.com',
            phone='+1-555-0101',
            subject='Partnership Inquiry',
            message='I am interested in exploring potential partnership opportunities with your logistics platform.',
            status='pending',
        ),
        ContentSubmission(
            id='sub_002',
            name='Sarah Johnson',
            email='sarah.j@company.com',
            phone='+1-555-0102',
            subject='Feature Request',
            message='We would like to request a custom API integration feature for our supply chain management.',
            status='reviewed',
            read_at=None,
        ),
        ContentSubmission(
            id='sub_003',
            name='Michael Chen',
            email='m.chen@startup.io',
            phone='+1-555-0103',
            subject='Pricing Question',
            message='Could you provide more information about enterprise pricing for the premium logistics estimator?',
            status='approved',
            read_at=None,
        ),
        ContentSubmission(
            id='sub_004',
            name='Emily Davis',
            email='emily.d@logistics.net',
            phone=None,
            subject='Technical Support',
            message='We are experiencing issues with the integration setup and need assistance.',
            status='pending',
        ),
        ContentSubmission(
            id='sub_005',
            name='Robert Wilson',
            email='r.wilson@transport.com',
            phone='+1-555-0104',
            subject='Spam Report',
            message='This is a spam submission that should be rejected.',
            status='rejected',
        ),
    ]

    # Check if submissions already exist
    existing = db.query(ContentSubmission).all()
    if not existing:
        for submission in sample_submissions:
            db.add(submission)
        db.commit()
        print('Sample content submissions added successfully')
    else:
        print(f'Content submissions already exist ({len(existing)} found)')

    db.close()

if __name__ == "__main__":
    seed_submissions()