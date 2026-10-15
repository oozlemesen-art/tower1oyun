// Oyuncunun kaydı (oyun durumu, istatistik, ayarlar) cihazda localStorage içinde tutulur.
// Erişim engelliyse (gizli sekme vb.) oyun bellekte çalışmaya devam eder.

import { yeniIstatistik } from './oyun.js';

const ANAHTAR = 'kelimece:v1';

function varsayilan() {
  return {
    gunluk: null,
    sinirsiz: null,
    istatistik: {
      gunluk: yeniIstatistik(),
      sinirsiz: yeniIstatistik(),
      zaman: { oynanan: 0, enIyi: 0, toplam: 0 },
    },
    toplamKazanilan: 0,
    rozetler: {},
    ayarlar: {
      uzunluk: 5,
      tema: 'sistem',
      zor: false,
      yuksekKontrast: false,
      ses: true,
      muzik: false,
      titresim: true,
      bildirim: false,
      bildirimSaati: 20,
    },
    sonCevaplar: { 4: [], 5: [], 6: [] },
    rozetGoruldu: true,
    puanSoruldu: false,
    acilis: 0,
    biten: 0,
    yardimGoruldu: false,
  };
}

let bellek = null;

export function yukle() {
  if (bellek) return bellek;
  const temel = varsayilan();
  try {
    const kayit = JSON.parse(localStorage.getItem(ANAHTAR) || 'null');
    if (kayit) {
      bellek = {
        ...temel,
        ...kayit,
        ayarlar: { ...temel.ayarlar, ...kayit.ayarlar },
        istatistik: { ...temel.istatistik, ...kayit.istatistik },
      };
      return bellek;
    }
  } catch {
    // Bozuk ya da erişilemeyen kayıt: temiz başla.
  }
  bellek = temel;
  return bellek;
}

export function kaydet() {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(bellek));
  } catch {
    // Kayıt yapılamıyorsa oyun yine de oynanır.
  }
}
