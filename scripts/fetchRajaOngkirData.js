// scripts/fetchRajaOngkirData.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'pYcQ2lG84ee147155a3273aaHBczyCnV'; // Ganti dengan API key Anda

function fetchProvinces() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.rajaongkir.com',
      path: '/starter/province',
      method: 'GET',
      headers: { key: API_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.rajaongkir?.status?.code === 200) {
            resolve(json.rajaongkir.results);
          } else {
            reject(new Error(json.rajaongkir?.status?.description));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchCities(provinceId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.rajaongkir.com',
      path: `/starter/city?province=${provinceId}`,
      method: 'GET',
      headers: { key: API_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.rajaongkir?.status?.code === 200) {
            resolve(json.rajaongkir.results);
          } else {
            resolve([]);
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Mengambil daftar provinsi...');
  const provinces = await fetchProvinces();
  console.log(`Ditemukan ${provinces.length} provinsi`);

  const citiesByProvince = {};
  for (const prov of provinces) {
    console.log(`Mengambil kota untuk ${prov.province} (ID ${prov.province_id})...`);
    const cities = await fetchCities(prov.province_id);
    citiesByProvince[prov.province_id] = cities;
    console.log(`  -> ${cities.length} kota`);
    // Jeda 500ms agar tidak kena rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Tulis ke file public/data/cities.json
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'cities.json'),
    JSON.stringify(citiesByProvince, null, 2)
  );
  console.log('✅ File public/data/cities.json berhasil dibuat!');
}

main().catch(console.error);