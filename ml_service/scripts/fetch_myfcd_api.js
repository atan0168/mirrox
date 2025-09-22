// scripts/fetch_myfcd_api.js
const axios = require('axios').default;
const qs = require('querystring');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ======= CONFIG =======
const BASE = 'https://myfcd.moh.gov.my';

// DataTables backend (你截到的是 myfcdindustri 的接口；它也能搜到别的 module 的条目)
const API =
  'https://myfcd.moh.gov.my/myfcdindustri/static/DataTables-1.10.12/examples/server_side/scripts/server_processing.php';

const SEARCH = 'rice'; // 先用一个关键词验证
const PAGE_SIZE = 100; // DataTables 分页大小
const THROTTLE_MS = 250; // 抓详情页时礼貌性限速

// 构造详情页 URL（你已确认的规律）
const detailUrlFor = (module, id, group = 'rice') =>
  `${BASE}/${module}/index.php/site/detail_product/${id}/0/10/${group}/0/0/`;
// ======================

// ---------- Helpers ----------
function mapKey(k) {
  const s = k.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/(^|[^a-z])energy([^a-z]|$)|kcal/.test(s)) return 'energy_kcal';
  if (/available carbohydrate|carbohydrate|carb/.test(s)) return 'carb_g';
  if (/total\s*sugar|sugars?/.test(s)) return 'sugar_g';
  if (s === 'fat' || /(^|[^a-z])fat([^a-z]|$)/.test(s)) return 'fat_g';
  if (/saturated fat|fatty acid,?\s*total\s*saturated/.test(s))
    return 'sat_fat_g';
  if (/protein/.test(s)) return 'protein_g';
  if (/dietary fibre|fiber|fibre/.test(s)) return 'fiber_g';
  if (/sodium(,?\s*na)?/.test(s)) return 'sodium_mg';
  return undefined;
}
const toNum = v => {
  if (v == null) return undefined;
  const m = String(v)
    .replace(/,/g, '')
    .match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
};
const guessCategory = name => {
  const s = name.toLowerCase();
  if (/teh|kopi|milk tea|milo|drink|beverage/.test(s)) return 'beverage';
  if (/roti|chapati|prata|flatbread/.test(s)) return 'flatbread';
  if (/noodle|mee|kuey|kway|char/.test(s)) return 'noodle';
  if (/burger/.test(s)) return 'burger';
  if (/curry|dhal|dal/.test(s)) return 'curry';
  if (/satay/.test(s)) return 'grill';
  if (/sauce/.test(s)) return 'sauce';
  if (/cendol/.test(s)) return 'dessert';
  if (/rice|nasi/.test(s)) return 'rice';
  return 'rice';
};

// ---------- 1) Fetch listing via DataTables ----------
async function fetchList(search) {
  let start = 0;
  const out = [];
  while (true) {
    const body = {
      draw: 1,
      start,
      length: PAGE_SIZE,
      'search[value]': search,
      'search[regex]': false,
    };
    const res = await axios.post(API, qs.stringify(body), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const payload = res.data;
    if (!payload || !Array.isArray(payload.data)) break;

    // Row shape example:
    // ["101014","RICE, COOKED (NASI)","1.01","myfcd97"]
    // ["1200649","F&N TEH TARIK ...","1.01","myfcdindustri"]
    for (const row of payload.data) {
      const id = row[0];
      const name = row[1];
      const module = row[3] || 'myfcdindustri';
      out.push({ id, name, module });
    }
    start += PAGE_SIZE;
    const total = payload.recordsFiltered ?? payload.recordsTotal ?? out.length;
    if (start >= total) break;
  }
  return out;
}

// ---------- 2) Resolve detail URL with fallback probing ----------
async function resolveDetailUrl(item) {
  // 优先用条目自带的 module，同时兜底试另外两个模块
  const modules = [
    item.module,
    'myfcd97',
    'myfcdindustri',
    'myfcdcurrent',
  ].filter(Boolean);

  // group 在 URL 中出现；先用常见的几个兜底
  const groups = ['rice', 'beverages', 'noodle', 'bread', 'misc'];

  const tried = new Set();
  for (const m of modules) {
    for (const g of groups) {
      const u = detailUrlFor(m, item.id, g);
      if (tried.has(u)) continue;
      tried.add(u);
      try {
        const r = await axios.get(u, { validateStatus: () => true });
        if (r.status >= 200 && r.status < 300 && /<html/i.test(r.data)) {
          return u;
        }
      } catch (_) {}
    }
  }
  return null;
}

// ---------- 3) Parse detail table ("Value per 100g / 100 ml") ----------
async function fetchDetail(url, nameFromList) {
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  let result = null;
  $('table').each((_, table) => {
    const ths = $(table).find('thead tr th, tr:first-child th');
    if (!ths.length) return;
    const headers = ths
      .map((i, el) => $(el).text().trim().toLowerCase().replace(/\s+/g, ' '))
      .get();

    const col100ml = headers.findIndex(h => /value per 100\s*ml/.test(h));
    const col100g = headers.findIndex(h => /value per 100\s*g|100g/.test(h));
    const valueCol = col100ml !== -1 ? col100ml : col100g;
    const basis = col100ml !== -1 ? 'per_100ml' : 'per_100g';
    const nameCol =
      headers.findIndex(h => /^nutrient$/.test(h)) >= 0
        ? headers.findIndex(h => /^nutrient$/.test(h))
        : 0;
    if (valueCol === -1) return;

    const kv = {};
    $(table)
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).find('td,th');
        if (!cells.length) return;
        const k = $(cells[nameCol] || cells[0])
          .text()
          .trim();
        const v = $(cells[valueCol] || cells[cells.length - 1])
          .text()
          .trim();
        if (k) kv[k] = v;
      });

    if (Object.keys(kv).length >= 5) result = { kv, basis };
  });

  if (!result) return null;

  const nutrients = {};
  for (const [k, v] of Object.entries(result.kv)) {
    const mk = mapKey(k);
    if (mk) nutrients[mk] = toNum(v);
  }

  const isDrink = /teh|kopi|milk tea|milo|drink|beverage/i.test(nameFromList);
  const id = nameFromList
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const rec = {
    id,
    name: nameFromList,
    aliases: [],
    category: guessCategory(nameFromList),
    default_portion: isDrink
      ? { unit: 'cup', ml: 300 }
      : { unit: 'plate', grams: 400 },
  };
  if (result.basis === 'per_100ml' || isDrink) {
    rec.nutrients_per_100ml = nutrients;
    rec.modifiers = {
      'kurang manis': { sugar_factor: 0.7 },
      'less sugar': { sugar_factor: 0.7 },
      'no sugar': { sugar_factor: 0.1 },
    };
  } else {
    rec.nutrients_per_100g = nutrients;
  }
  return rec;
}

// ---------- Main ----------
(async () => {
  const rows = await fetchList(SEARCH); // [{ id, name, module }]
  console.log(`list count = ${rows.length}`);

  const out = [];
  let idx = 0;

  for (const item of rows) {
    idx += 1;
    if (idx % 20 === 0) console.log(`.. progress ${idx}/${rows.length}`);

    let url = await resolveDetailUrl(item);
    if (!url) {
      console.warn(
        `[skip] cannot resolve detail URL | id=${item.id} module=${item.module} name="${item.name}"`
      );
      continue;
    }

    try {
      const rec = await fetchDetail(url, item.name);
      if (rec) out.push(rec);
    } catch (e) {
      console.warn(`[warn] parse failed | id=${item.id} url=${url}`);
    }

    await new Promise(r => setTimeout(r, THROTTLE_MS));
  }

  const outPath = path.join(
    __dirname,
    '..',
    'ml_service',
    'data',
    'curated',
    '_myfcd_batch.json'
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`✅ saved ${out.length} items -> ${outPath}`);
})();
