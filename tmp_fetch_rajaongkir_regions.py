import os, urllib.request, urllib.parse, json, time

def read_env_file(path):
    env = {}
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line=line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                key,value=line.split('=',1)
                env[key.strip()]=value.strip()
    return env

env = read_env_file('.env.local')
key = env.get('RAJAONGKIR_API_KEY')
if not key:
    raise SystemExit('Missing RAJAONGKIR_API_KEY in .env.local')

base = 'https://api.rajaongkir.com/starter'
headers = {'key': key}

print('Fetching provinces...')
req = urllib.request.Request(base + '/province', headers=headers)
with urllib.request.urlopen(req, timeout=20) as r:
    provinces = json.load(r)
print('province count', len(provinces['rajaongkir']['results']))

all_cities = []
for province in provinces['rajaongkir']['results']:
    pid = province['province_id']
    print('fetch city for province', pid, province['province'])
    url = base + '/city?' + urllib.parse.urlencode({'province': pid})
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    results = data['rajaongkir']['results']
    all_cities.append({'province_id': pid, 'province': province['province'], 'results': results})
    time.sleep(0.2)

with open('tmp_rajaongkir_regions.json', 'w', encoding='utf-8') as f:
    json.dump({'provinces': provinces['rajaongkir']['results'], 'cities': all_cities}, f, ensure_ascii=False, indent=2)
print('Wrote tmp_rajaongkir_regions.json')
