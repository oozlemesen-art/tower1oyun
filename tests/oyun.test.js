import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  degerlendir, gecerliMi, gunNumarasi, gununKelimesi, klavyeDurumu, ipucuSec, paylasimMetni,
  istatistikGuncelle, yeniIstatistik, guncelSeri, zorModHatasi, buyuk, kucuk, rastgeleKelime,
} from '../www/js/oyun.js';
import { CEVAPLAR, GECERLI } from '../www/js/sozluk.js';
import { rozetKontrol, ROZETLER } from '../www/js/rozetler.js';

test('doğru, var ve yok renkleri', () => {
  assert.deepEqual(degerlendir('kalem', 'kalem'), ['dogru', 'dogru', 'dogru', 'dogru', 'dogru']);
  assert.deepEqual(degerlendir('sabah', 'bahar'), ['yok', 'var', 'var', 'var', 'var']);
  assert.deepEqual(degerlendir('duvar', 'kalem'), ['yok', 'yok', 'yok', 'var', 'yok']);
});

test('tekrarlayan harf cevaptaki adetten fazla renklenmez', () => {
  // cevapta tek A var: doğru yerdeki yeşil, diğerleri gri
  assert.deepEqual(degerlendir('aaaaa', 'kalem'), ['yok', 'dogru', 'yok', 'yok', 'yok']);
  // cevapta iki E var, tahminde üç E
  assert.deepEqual(degerlendir('eeeee', 'deney'), ['yok', 'dogru', 'yok', 'dogru', 'yok']);
  // önce yeşiller sayılır: soldaki E sarı olmaz
  assert.deepEqual(degerlendir('ekmek', 'kemer'), ['var', 'var', 'var', 'dogru', 'yok']);
});

test('Türkçe harfler: ı/i ve İ/I ayrı', () => {
  assert.equal(buyuk('ışık'), 'IŞIK');
  assert.equal(buyuk('iyi'), 'İYİ');
  assert.equal(kucuk('IŞIK'), 'ışık');
  assert.deepEqual(degerlendir('kırık', 'kirli').slice(0, 2), ['dogru', 'yok']);
});

test('sözlük: her cevap geçerli, doğru uzunlukta ve tek', () => {
  for (const n of [4, 5, 6]) {
    const liste = CEVAPLAR[n];
    assert.ok(liste.length >= 250, `${n} harf için yeterli cevap var`);
    assert.equal(new Set(liste).size, liste.length);
    for (const k of liste) {
      assert.equal([...k].length, n, k);
      assert.ok(gecerliMi(k), `${k} geçerli olmalı`);
    }
    for (const k of GECERLI[n].split(' ')) assert.match(k, /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/);
  }
  assert.ok(gecerliMi('kalem'));
  assert.ok(!gecerliMi('qwert'));
  assert.ok(!gecerliMi('kale'.repeat(2)));
});

test('gün numarası yerel takvime göre', () => {
  assert.equal(gunNumarasi(new Date(2026, 9, 15, 0, 1)), 1);
  assert.equal(gunNumarasi(new Date(2026, 9, 15, 23, 59)), 1);
  assert.equal(gunNumarasi(new Date(2026, 9, 16, 0, 0)), 2);
  assert.equal(gunNumarasi(new Date(2027, 9, 15)), 366);
  // yaz saati değişimi günü atlatmaz
  assert.equal(gunNumarasi(new Date(2027, 2, 28, 12)) + 1, gunNumarasi(new Date(2027, 2, 29, 12)));
});

test('günün kelimesi her gün değişir ve liste bitince başa döner', () => {
  const ilk = Array.from({ length: 30 }, (_, i) => gununKelimesi(i + 1));
  assert.equal(new Set(ilk).size, 30);
  assert.equal(gununKelimesi(1), gununKelimesi(1 + CEVAPLAR[5].length));
  assert.equal(typeof gununKelimesi(0), 'string');
});

test('rastgele kelime yakın geçmişi tekrar etmez', () => {
  const haric = CEVAPLAR[4].slice(1);
  assert.equal(rastgeleKelime(4, haric), CEVAPLAR[4][0]);
});

test('klavye en iyi durumu tutar', () => {
  const d = klavyeDurumu(['sabah', 'kalem'], 'kalem');
  assert.equal(d.k, 'dogru');
  assert.equal(d.a, 'dogru');
  assert.equal(d.s, 'yok');
});

test('ipucu yalnızca bulunmamış harfi açar', () => {
  const sira = [0, 0.99];
  let i = 0;
  const r = () => sira[i++ % 2];
  const poz = ipucuSec('kalem', ['kalın'], [], r);
  assert.ok(poz >= 3, 'k, a, l zaten bulundu');
  assert.equal(ipucuSec('kalem', ['kalem']), null);
  assert.equal(ipucuSec('kalem', [], [0, 1, 2, 3]), 4);
});

test('paylaşım metni', () => {
  const m = paylasimMetni({ baslik: 'Kelimece #3', tahminler: ['sabah', 'kalem'], cevap: 'kalem', kazandi: true, ipucu: 1 });
  assert.equal(m, 'Kelimece #3 2/6 💡1\n\n⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩');
  const k = paylasimMetni({ baslik: 'X', tahminler: Array(6).fill('sabah'), cevap: 'kalem', kazandi: false });
  assert.match(k, /^X X\/6/);
  const e = paylasimMetni({ baslik: 'X', tahminler: Array(7).fill('kalem'), cevap: 'kalem', kazandi: true });
  assert.match(e, /^X 6\+1\/6/);
});

test('istatistik ve günlük seri', () => {
  let ist = yeniIstatistik();
  ist = istatistikGuncelle(ist, { kazandi: true, tahminSayisi: 3, gunNo: 1 });
  ist = istatistikGuncelle(ist, { kazandi: true, tahminSayisi: 4, gunNo: 2 });
  assert.equal(ist.seri, 2);
  assert.deepEqual(ist.dagilim, [0, 0, 1, 1, 0, 0, 0]);
  assert.equal(guncelSeri(ist, 3), 2);
  assert.equal(guncelSeri(ist, 4), 0, 'bir gün atlanınca seri kopar');
  ist = istatistikGuncelle(ist, { kazandi: true, tahminSayisi: 7, gunNo: 5 });
  assert.equal(ist.seri, 1, 'arada gün varsa seri yeniden başlar');
  assert.equal(ist.dagilim[6], 1);
  ist = istatistikGuncelle(ist, { kazandi: false, tahminSayisi: 6, gunNo: 6 });
  assert.equal(ist.seri, 0);
  assert.equal(ist.enIyiSeri, 2);
  assert.equal(ist.oynanan, 4);
  assert.equal(ist.kazanilan, 3);
});

test('zor mod kuralları', () => {
  assert.equal(zorModHatasi('kalın', ['kasap'], 'kalem'), null);
  assert.equal(zorModHatasi('sabah', ['kasap'], 'kalem'), '1. harf K olmalı');
  assert.equal(zorModHatasi('lamba', ['kalın'], 'kemal'), '1. harf K olmalı');
  assert.equal(zorModHatasi('kurum', ['sabır'], 'bakır'), 'Tahminde A harfi olmalı');
});

test('rozetler bir kez verilir', () => {
  const kazanilan = {};
  const ozet = { mod: 'gunluk', kazandi: true, tahminSayisi: 1, n: 5, seri: 3, toplamKazanilan: 1, saat: 12 };
  const yeni = rozetKontrol(kazanilan, ozet, '2026-10-15').map((r) => r.id);
  assert.deepEqual(yeni.sort(), ['ilk', 'kahin', 'seri3'].sort());
  assert.equal(rozetKontrol(kazanilan, ozet).length, 0);
  assert.equal(new Set(ROZETLER.map((r) => r.id)).size, ROZETLER.length);
});
