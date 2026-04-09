import os
import json

songs_dir = r'c:\Users\UserPC\Desktop\안티그래비티\코드생성기\public\songs'
output_file = r'c:\Users\UserPC\Desktop\안티그래비티\코드생성기\src\songs.json'

songs = []
for filename in os.listdir(songs_dir):
    if filename.endswith('.jpg'):
        # Format: Title-Artist.jpg
        name_part = filename.rsplit('.', 1)[0]
        if '-' in name_part:
            title, artist = name_part.split('-', 1)
        else:
            title, artist = name_part, 'Unknown'
            
        songs.append({
            "id": filename,
            "title": title.strip(),
            "artist": artist.strip(),
            "file": filename
        })

# Sort by title
songs.sort(key=lambda x: x['title'])

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=2)

print(f"Total songs scanned: {len(songs)}")
