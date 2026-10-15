import sys
import pathlib
import os
import json
import hmac

# Ensure backend package root is on sys.path
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

# Simulate environment for Resend
os.environ['RESEND_API_KEY'] = 'fake-key'

# Dummy requests implementation
class DummyResp:
    def __init__(self, status_code=200):
        self.status_code = status_code
    def raise_for_status(self):
        return None

class DummyRequests:
    def post(self, url, json=None, headers=None, timeout=15, data=None):
        print(f"DummyRequests.post called: {url} | json={json} | headers={headers}")
        return DummyResp(200)

# Create dummy requests and dummy HTML renderer
requests = DummyRequests()

# Import tasks and monkeypatch
from app import tasks
# inject dummy requests and HTML
tasks.requests = requests

class DummyHTML:
    def __init__(self, string=None, url=None):
        self.string = string
        self.url = url
    def write_pdf(self):
        return b"%PDF-1.4\n%Dummy PDF\n"

tasks.HTML = DummyHTML

print('Running dry-run tasks...')

# Run webhook task
res1 = tasks.send_webhook_task.apply(kwargs={
    'url': 'https://example.local/webhook',
    'payload': {'dry': True, 'note': 'test'},
    'secret': 'shh'
})
print('Webhook task result:', res1.get())

# Run email task (uses RESEND_API_KEY path, which will hit dummy requests)
res2 = tasks.send_email_task.apply(kwargs={
    'to_address': 'test@example.local',
    'subject': 'Dry run email',
    'body_text': 'This is a dry-run test',
})
print('Email task result:', res2.get())

# Run PDF task
res3 = tasks.render_pdf_task.apply(kwargs={
    'html': '<p>Dummy PDF</p>',
    'outfile': None
})
print('PDF task result:', res3.get())

print('Dry-run complete')
