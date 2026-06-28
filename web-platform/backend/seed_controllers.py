from app.database import SessionLocal
from app.models import Controller
from datetime import datetime, timezone

def seed_controllers():
    db = SessionLocal()

    # Add sample controllers
    sample_controllers = [
        Controller(
            id='content_pipeline',
            name='Content Publishing Pipeline',
            trigger_type='schedule',
            enabled=True,
            config='{"schedule": "daily", "time": "09:00"}',
            last_execution=datetime.now(timezone.utc),
            success_count=15,
            failure_count=2,
        ),
        Controller(
            id='newsletter_sender',
            name='Newsletter Dispatcher',
            trigger_type='schedule',
            enabled=True,
            config='{"schedule": "weekly", "day": "monday"}',
            last_execution=datetime.now(timezone.utc),
            success_count=8,
            failure_count=0,
        ),
        Controller(
            id='rss_sync',
            name='RSS Feed Synchronizer',
            trigger_type='schedule',
            enabled=True,
            config='{"schedule": "hourly"}',
            last_execution=datetime.now(timezone.utc),
            success_count=45,
            failure_count=3,
        ),
        Controller(
            id='analytics_report',
            name='Analytics Report Generator',
            trigger_type='schedule',
            enabled=False,
            config='{"schedule": "monthly", "day": 1}',
            last_execution=None,
            success_count=0,
            failure_count=0,
        ),
        Controller(
            id='content_moderator',
            name='Content Moderation Bot',
            trigger_type='webhook',
            enabled=True,
            config='{"webhook_url": "/api/content/moderate"}',
            last_execution=datetime.now(timezone.utc),
            success_count=23,
            failure_count=1,
        ),
    ]

    # Check if controllers already exist
    existing = db.query(Controller).all()
    if not existing:
        for controller in sample_controllers:
            db.add(controller)
        db.commit()
        print('Sample controllers added successfully')
    else:
        print(f'Controllers already exist ({len(existing)} found)')

    db.close()

if __name__ == "__main__":
    seed_controllers()