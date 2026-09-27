import sqlite3
import os

db_paths = [p for p in os.listdir('.') if p.endswith('.db')]
print('Found SQLite DBs:', db_paths)

for db_path in db_paths:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # 1. Projects table
    for col, col_type in [
        ('latitude', 'REAL'),
        ('longitude', 'REAL'),
        ('location_name', 'TEXT')
    ]:
        try:
            cur.execute(f'ALTER TABLE projects ADD COLUMN {col} {col_type}')
            print(f'Added {col} to projects in {db_path}')
        except Exception as e:
            print(f'projects.{col}: {e}')
            
    # 2. MediaAssets table
    for col, col_type in [
        ('image_latitude', 'REAL'),
        ('image_longitude', 'REAL'),
        ('location_source', 'TEXT DEFAULT "NONE"'),
        ('location_match_distance', 'REAL')
    ]:
        try:
            cur.execute(f'ALTER TABLE media_assets ADD COLUMN {col} {col_type}')
            print(f'Added {col} to media_assets in {db_path}')
        except Exception as e:
            print(f'media_assets.{col}: {e}')

    # 3. VisualEvidence table
    for col, col_type in [
        ('latitude', 'REAL'),
        ('longitude', 'REAL'),
        ('location_source', 'TEXT DEFAULT "NONE"'),
        ('location_match_distance', 'REAL')
    ]:
        try:
            cur.execute(f'ALTER TABLE visual_evidence ADD COLUMN {col} {col_type}')
            print(f'Added {col} to visual_evidence in {db_path}')
        except Exception as e:
            print(f'visual_evidence.{col}: {e}')
            
    conn.commit()
    conn.close()

print('Migration completed successfully.')
