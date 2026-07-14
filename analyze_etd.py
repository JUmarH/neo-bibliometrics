import json
from collections import Counter
import re

with open('data/unified_publications.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

dosen_words = Counter()
dosen_names = set()

for d in data:
    if d.get('source') == 'etd' and 'authors' in d:
        # index > 0 means Dosen/Pembimbing
        for i, author in enumerate(d['authors']):
            if i > 0:
                dosen_names.add(author)
                # Split by space and clean
                words = re.sub(r'[^a-z0-9\s]', '', author.lower()).split()
                for w in words:
                    dosen_words[w] += 1

print("Total Unique Dosen Names:", len(dosen_names))
print("\nTop 50 Most Common Words in Dosen Names:")
for word, count in dosen_words.most_common(50):
    print(f"{word}: {count}")

print("\nSuspect 1-2 letter words (often degrees):")
for word, count in dosen_words.most_common():
    if len(word) <= 3 and count > 5:
        print(f"{word}: {count}")
