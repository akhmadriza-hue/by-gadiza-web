import urllib.request
import re

url = 'https://github.com/search?q=rajaongkir+province+json&type=code'
req = urllib.request.Request(url, headers={'User-Agent': 'python'})
html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
for m in re.findall(r'href="([^"]+)"', html):
    if ('raw.githubusercontent.com' in m or 'github.com' in m) and ('rajaongkir' in m.lower() or 'province' in m.lower() or '.json' in m.lower()):
        print(m)
