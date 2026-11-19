// Tells IndexNow (Bing, Yandex, Naver, Seznam, Yep) which URLs are new, changed or gone since the last deploy.
// Google does not take part in IndexNow; it learns from the sitemap and from Search Console.
//
//   node scripts/indexnow.mjs <previous-sitemap.xml> <current-sitemap.xml>
//
// Env: INDEXNOW_KEY (required, the file public/<key>.txt must be live), SITE_HOST (default mindsecurity.org),
//      INDEXNOW_ALL=true to resubmit every URL, DRY_RUN=1 to print the list and send nothing.
import { readFileSync } from 'node:fs';

const [prevFile, curFile] = process.argv.slice(2);
const key = process.env.INDEXNOW_KEY;
const host = process.env.SITE_HOST || 'mindsecurity.org';
if (!prevFile || !curFile || !key) {
  console.error('usage: INDEXNOW_KEY=<key> node scripts/indexnow.mjs <previous-sitemap.xml> <current-sitemap.xml>');
  process.exit(2);
}
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error('INDEXNOW_KEY must be 8-128 characters: letters, digits and dashes.');
  process.exit(2);
}

/** loc -> lastmod ('' when the entry has none). */
const entries = (xml) =>
  new Map(
    [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(([, block]) => {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
      return loc ? [[loc, block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '']] : [];
    }),
  );

const prev = entries(readFileSync(prevFile, 'utf8'));
const cur = entries(readFileSync(curFile, 'utf8'));
const all = process.env.INDEXNOW_ALL === 'true';

const added = [...cur.keys()].filter((u) => !prev.has(u));
const changed = [...cur.keys()].filter((u) => prev.has(u) && prev.get(u) !== cur.get(u));
const removed = [...prev.keys()].filter((u) => !cur.has(u));
const urlList = all ? [...cur.keys(), ...removed] : [...added, ...changed, ...removed];

console.log(`sitemap: ${cur.size} urls | new ${added.length} | changed ${changed.length} | removed ${removed.length}${all ? ' | resubmitting all' : ''}`);
for (const u of urlList) console.log(`  ${u}`);
if (urlList.length === 0) {
  console.log('nothing to submit.');
  process.exit(0);
}
if (process.env.DRY_RUN === '1') process.exit(0);

// The key file has to be reachable before IndexNow will accept the batch.
const keyLocation = `https://${host}/${key}.txt`;
const live = await fetch(`${keyLocation}?cb=${Date.now()}`).catch(() => null);
if (!live?.ok || (await live.text()).trim() !== key) {
  console.error(`key file not served at ${keyLocation}; not submitting.`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
// 200: accepted. 202: accepted, key validation pending. 422/403/429: rejected.
console.log(`IndexNow answered ${res.status} ${res.statusText}`);
if (res.status !== 200 && res.status !== 202) {
  console.error((await res.text()).slice(0, 500));
  process.exit(1);
}
