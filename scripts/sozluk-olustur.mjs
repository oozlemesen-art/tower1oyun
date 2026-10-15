// Sözlük dosyasını (www/js/sozluk.js) yeniden üretir.
//
// Kullanım: node scripts/sozluk-olustur.mjs <kaynak-klasörü>
//
// Kaynak klasöründe iki dosya bulunmalı:
//   master-dictionary.dict  Zemberek NLP sözlüğü (Apache-2.0)
//     https://github.com/ahmetaa/zemberek-nlp/blob/master/morphology/src/main/resources/tr/master-dictionary.dict
//   words.json              an-array-of-turkish-words paketi (MIT), sıklığa göre sıralı
//     npm pack an-array-of-turkish-words
//
// Cevap listeleri elle seçilir: veri/cevaplar-4.txt, -5.txt, -6.txt (satır başına bir kelime).
// Geçerli tahmin listesi = Zemberek kökleri + en sık 30.000 kelime + cevaplar.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const kaynak = process.argv[2];
if (!kaynak) {
  console.error('Kullanım: node scripts/sozluk-olustur.mjs <kaynak-klasörü>');
  process.exit(1);
}

const HARFLER = new Set('abcçdefgğhıijklmnoöprsştuüvyz');
const UZUNLUKLAR = [4, 5, 6];
const SIK_KELIME_SINIRI = 30000;

const sadele = (k) => k.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
const turkceMi = (k) => [...k].every((h) => HARFLER.has(h));

const gecerli = new Map(UZUNLUKLAR.map((n) => [n, new Set()]));
const ekle = (k) => {
  if (turkceMi(k) && gecerli.has(k.length)) gecerli.get(k.length).add(k);
};

for (const satir of readFileSync(join(kaynak, 'master-dictionary.dict'), 'utf8').split('\n')) {
  const m = satir.trim().match(/^(\S+)(?:\s+\[(.*)\])?$/);
  if (!m || satir.startsWith('#')) continue;
  if (/P:\s*(Punc|Abbrv)/.test(m[2] || '')) continue;
  ekle(sadele(m[1]));
}

const sik = JSON.parse(readFileSync(join(kaynak, 'words.json'), 'utf8'));
sik.slice(0, SIK_KELIME_SINIRI).forEach((k) => ekle(sadele(k)));

// Cevapları sabit bir tohumla karıştır: günün kelimesi sırası tahmin edilemesin ama
// her derlemede aynı kalsın.
function karistir(dizi, tohum) {
  const a = [...dizi];
  let s = tohum;
  const rastgele = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cevaplar = {};
for (const n of UZUNLUKLAR) {
  const liste = readFileSync(`veri/cevaplar-${n}.txt`, 'utf8').split(/\s+/).filter(Boolean);
  const hatali = liste.filter((k) => [...k].length !== n || !turkceMi(k));
  if (hatali.length) throw new Error(`cevaplar-${n}.txt hatalı kelimeler: ${hatali.join(', ')}`);
  if (new Set(liste).size !== liste.length) throw new Error(`cevaplar-${n}.txt tekrar eden kelime var`);
  liste.forEach(ekle);
  cevaplar[n] = karistir(liste, 20261015 + n);
}

let cikti = '// Bu dosya scripts/sozluk-olustur.mjs ile üretilir, elle düzenlemeyin.\n';
cikti += '// Kaynaklar: Zemberek NLP (Apache-2.0), an-array-of-turkish-words (MIT).\n\n';
cikti += `export const CEVAPLAR = ${JSON.stringify(cevaplar)};\n\n`;
cikti += 'export const GECERLI = {\n';
for (const n of UZUNLUKLAR) {
  cikti += `  ${n}: '${[...gecerli.get(n)].sort((a, b) => a.localeCompare(b, 'tr')).join(' ')}',\n`;
}
cikti += '};\n';
writeFileSync('www/js/sozluk.js', cikti);

for (const n of UZUNLUKLAR) {
  console.log(`${n} harf: ${cevaplar[n].length} cevap, ${gecerli.get(n).size} geçerli kelime`);
}
