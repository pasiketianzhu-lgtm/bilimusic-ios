import sqlite3
from pathlib import Path
root=Path('apps/mobile/drizzle')
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for file in sorted(root.glob('*.sql')):
 if file.name.startswith('0023_'): continue
 for statement in file.read_text(encoding='utf-8-sig').split('--> statement-breakpoint'):
  if statement.strip(): db.executescript(statement)
db.execute("INSERT INTO playlists (title,type,description) VALUES ('旧我喜欢','local','bilimusic:system:liked:v1')")
db.execute("INSERT INTO playlists (title,type) VALUES ('已有歌单','local')")
for statement in (root/'0023_personal_library.sql').read_text().split('--> statement-breakpoint'):
 if statement.strip(): db.executescript(statement)
assert db.execute('SELECT COUNT(DISTINCT sync_id) FROM playlists').fetchone()[0]==2
assert db.execute("SELECT description FROM playlists WHERE system_key='liked'").fetchone()[0] is None
try:
 db.execute("INSERT INTO playlists (title,type,system_key) VALUES ('重复','local','liked')")
 raise AssertionError('unique system key not enforced')
except sqlite3.IntegrityError: pass
db.execute("UPDATE playlists SET title='改名' WHERE system_key='liked'")
assert db.execute("SELECT title FROM playlists WHERE system_key='liked'").fetchone()[0]=='改名'
print('All SQLite migrations, existing-row backfill and system playlist uniqueness passed')
