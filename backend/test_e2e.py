import requests, time, json

# 1. Upload a real solar image
with open('../images/solar_01.jpg', 'rb') as f:
    res = requests.post('http://127.0.0.1:8000/media/process', files={'file': f})

data = res.json()
print('Upload response:', data)
asset_id = data['asset_id']

# 2. Poll until terminal state
for i in range(30):
    time.sleep(3)
    r = requests.get(f'http://127.0.0.1:8000/media/{asset_id}').json()
    status = r.get('processing_status', '')
    project = r.get('project_id', 'none')
    print(f'  [{i*3:>3}s] status={status:<20} project_id={project}')
    if status in ('READY', 'FAILED', 'NEEDS_REVIEW', 'UNASSIGNED'):
        break

print()
print('=== FINAL RESULT ===')
print(json.dumps(r, indent=2, default=str))
