// Oyunun saf mantığı: ekran, depolama ya da reklamla ilgisi yok, testleri tests/ altında.

import { CEVAPLAR, GECERLI } from './sozluk.js';

export const UZUNLUKLAR = [4, 5, 6];
export const HAK = 6;

// Günün kelimesi 1 numarası bu tarihte yayınlandı (yerel saatle).
const BASLANGIC = Date.UTC(2026, 9, 15);
const GUN = 24 * 60 * 60 * 1000;

export const buyuk = (s) => s.toLocaleUpperCase('tr-TR');
export const kucuk = (s) => s.toLocaleLowerCase('tr-TR');

const gecerliKumeler = {};
export function gecerliMi(kelime) {
  const n = [...kelime].length;
  if (!GECERLI[n]) return false;
  gecerliKumeler[n] ??= new Set(GECERLI[n].split(' '));
  return gecerliKumeler[n].has(kelime);
}

// Her harf için: 'dogru' (yeri doğru), 'var' (kelimede var, yeri yanlış), 'yok'.
// Tekrarlayan harflerde cevaptaki adet kadar renk verilir: önce doğru yerdekiler, sonra soldan sağa.
export function degerlendir(tahmin, cevap) {
  const t = [...tahmin];
  const c = [...cevap];
  const sonuc = t.map(() => 'yok');
  const kalan = {};
  c.forEach((h, i) => {
    if (t[i] === h) sonuc[i] = 'dogru';
    else kalan[h] = (kalan[h] || 0) + 1;
  });
  t.forEach((h, i) => {
    if (sonuc[i] !== 'dogru' && kalan[h] > 0) {
      sonuc[i] = 'var';
      kalan[h]--;
    }
  });
  return sonuc;
}

// Yerel takvimde 15 Ekim 2026 = 1.
export function gunNumarasi(tarih = new Date()) {
  const bugun = Date.UTC(tarih.getFullYear(), tarih.getMonth(), tarih.getDate());
  return Math.floor((bugun - BASLANGIC) / GUN) + 1;
}

export function gununKelimesi(no) {
  const liste = CEVAPLAR[5];
  const i = (((no - 1) % liste.length) + liste.length) % liste.length;
  return liste[i];
}

export function rastgeleKelime(n, haric = [], rastgele = Math.random) {
  const liste = CEVAPLAR[n].filter((k) => !haric.includes(k));
  const havuz = liste.length ? liste : CEVAPLAR[n];
  return havuz[Math.floor(rastgele() * havuz.length)];
}

// Klavyede her harfin en iyi bilinen durumu.
const ONCELIK = { yok: 1, var: 2, dogru: 3 };
export function klavyeDurumu(tahminler, cevap) {
  const durum = {};
  for (const tahmin of tahminler) {
    const sonuc = degerlendir(tahmin, cevap);
    [...tahmin].forEach((h, i) => {
      if (!durum[h] || ONCELIK[sonuc[i]] > ONCELIK[durum[h]]) durum[h] = sonuc[i];
    });
  }
  return durum;
}

// Henüz doğru yerde bulunmamış bir harfi açar. Hepsi bulunduysa null.
export function ipucuSec(cevap, tahminler, acilanlar = [], rastgele = Math.random) {
  const c = [...cevap];
  const bilinen = new Set(acilanlar);
  for (const tahmin of tahminler) {
    degerlendir(tahmin, cevap).forEach((s, i) => s === 'dogru' && bilinen.add(i));
  }
  const adaylar = c.map((_, i) => i).filter((i) => !bilinen.has(i));
  if (!adaylar.length) return null;
  return adaylar[Math.floor(rastgele() * adaylar.length)];
}

const KARE = { dogru: '🟩', var: '🟨', yok: '⬜' };
export function paylasimMetni({ baslik, tahminler, cevap, kazandi, ipucu = 0 }) {
  const skor = kazandi ? tahminler.length : 'X';
  const satirlar = tahminler.map((t) => degerlendir(t, cevap).map((s) => KARE[s]).join(''));
  const ek = ipucu ? ` 💡${ipucu}` : '';
  return `${baslik} ${skor}/${HAK}${ek}\n\n${satirlar.join('\n')}`;
}

export function yeniIstatistik() {
  return { oynanan: 0, kazanilan: 0, seri: 0, enIyiSeri: 0, dagilim: Array(HAK + 1).fill(0), sonGun: null };
}

// Oyun bitince istatistiği günceller. Günlük modda seri yalnızca ardışık günlerde sürer.
// dagilim[0..5] = 1..6 tahminde kazanılan, dagilim[6] = ek hakla kazanılan.
export function istatistikGuncelle(ist, { kazandi, tahminSayisi, gunNo = null }) {
  const yeni = { ...ist, dagilim: [...ist.dagilim] };
  yeni.oynanan++;
  const ardisik = gunNo === null || yeni.sonGun === null || gunNo === yeni.sonGun + 1;
  if (kazandi) {
    yeni.kazanilan++;
    yeni.seri = ardisik ? yeni.seri + 1 : 1;
    yeni.enIyiSeri = Math.max(yeni.enIyiSeri, yeni.seri);
    yeni.dagilim[Math.min(tahminSayisi, HAK + 1) - 1]++;
  } else {
    yeni.seri = 0;
  }
  if (gunNo !== null) yeni.sonGun = gunNo;
  return yeni;
}

// Günlük seri, dün oynanmadıysa kopmuş sayılır.
export function guncelSeri(ist, bugunNo) {
  if (ist.sonGun === null || ist.sonGun >= bugunNo - 1) return ist.seri;
  return 0;
}
