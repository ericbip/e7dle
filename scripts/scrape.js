/**
 * E7dle Scrape Script
 * Fuente: https://github.com/CeciliaBot/CeciliaBot.github.io
 *
 * Descarga HeroDatabase.json directamente del repo de CeciliaBot y genera data/characters.js
 * NO necesita Puppeteer ni navegador headless.
 *
 * Uso: node scripts/scrape.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const HERO_DB_URL = 'https://raw.githubusercontent.com/CeciliaBot/CeciliaBot.github.io/master/data/HeroDatabase.json';
const IMG_BASE    = 'https://raw.githubusercontent.com/CeciliaBot/E7Assets-Temp/main/assets/face/';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'characters.js');

const ATTRIBUTE_MAP = { fire:'Fire', ice:'Ice', wind:'Wind', light:'Light', dark:'Dark' };
const ROLE_MAP      = { warrior:'Warrior', knight:'Knight', assassin:'Thief', mage:'Mage', ranger:'Ranger', manauser:'Soul Weaver' };
const ZODIAC_MAP    = { ram:'Aries', bull:'Taurus', twins:'Gemini', crab:'Cancer', lion:'Leo', maiden:'Virgo', scales:'Libra', scorpion:'Scorpio', archer:'Sagittarius', goat:'Capricorn', waterbearer:'Aquarius', fish:'Pisces' };
const SEX_MAP       = { 1:'Male', 2:'Female', 0:'Unknown' };
const RARITY_MAP    = { 3:'3★', 4:'4★', 5:'5★' };

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function main() {
  console.log('📥 Descargando HeroDatabase.json de CeciliaBot...');
  const { status, body } = await fetch(HERO_DB_URL);

  if (status !== 200) {
    console.error(`❌ Error HTTP ${status}`);
    process.exit(1);
  }

  const raw = JSON.parse(body);
  console.log(`   ${Object.keys(raw).length} héroes encontrados`);

  const characters = [];
  const skipped    = [];

  for (const [slug, hero] of Object.entries(raw)) {
    const name    = (hero.name || '').trim();
    const attr    = ATTRIBUTE_MAP[hero.attribute];
    const role    = ROLE_MAP[hero.role];
    const zodiac  = ZODIAC_MAP[hero.zodiac];
    const gender  = SEX_MAP[hero.sex];
    const rarity  = RARITY_MAP[hero.rarity];
    const heroId  = hero.id;

    if (!name || !attr || !role || !zodiac || !gender || !rarity || !heroId) {
      const missing = ['name','attr','role','zodiac','gender','rarity','id']
        .filter((_,i) => ![name,attr,role,zodiac,gender,rarity,heroId][i]);
      skipped.push({ slug, missing });
      continue;
    }

    characters.push({
      name,
      element:  attr,
      role,
      zodiac,
      gender,
      rarity,
      portrait: `${IMG_BASE}${heroId}_l.png`,
    });
  }

  console.log(`✅ Válidos: ${characters.length} | ⚠️  Omitidos: ${skipped.length}`);
  if (skipped.length) {
    skipped.forEach(s => console.warn(`   Omitido ${s.slug}: faltan ${s.missing.join(',')}`));
  }

  if (characters.length < 50) {
    console.error('❌ Demasiado pocos héroes, abortando.');
    process.exit(1);
  }

  const output = `// E7dle Character Data
// Fuente: https://github.com/CeciliaBot/CeciliaBot.github.io
// Generado: ${new Date().toISOString()}
// Total héroes: ${characters.length}

const CHARACTERS_UNIQUE = ${JSON.stringify(characters, null, 2)};

if (typeof module !== 'undefined') module.exports = CHARACTERS_UNIQUE;
`;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log(`💾 Guardado en ${OUTPUT_PATH}`);
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
