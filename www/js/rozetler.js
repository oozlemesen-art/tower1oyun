// Başarım rozetleri. Her biri, biten oyunun özetine bakan bir koşul.
// o = { mod, kazandi, tahminSayisi, n, ipucu, zor, ekHak, seri, toplamKazanilan, zamanSkoru, saat }

export const ROZETLER = [
  { id: 'ilk', emoji: '🎉', ad: 'İlk Zafer', aciklama: 'İlk kelimeni bil', kosul: (o) => o.kazandi },
  { id: 'kahin', emoji: '🔮', ad: 'Kâhin', aciklama: 'Kelimeyi ilk tahminde bil', kosul: (o) => o.kazandi && o.tahminSayisi === 1 },
  { id: 'kartal', emoji: '🦅', ad: 'Kartal Göz', aciklama: 'Kelimeyi 2 tahminde bil', kosul: (o) => o.kazandi && o.tahminSayisi === 2 },
  { id: 'kilpayi', emoji: '😅', ad: 'Kıl Payı', aciklama: 'Son hakkında bil', kosul: (o) => o.kazandi && o.tahminSayisi === 6 },
  { id: 'donus', emoji: '🔄', ad: 'Geri Dönüş', aciklama: 'Ek hakla kazan', kosul: (o) => o.kazandi && o.ekHak },
  { id: 'kendi', emoji: '🧠', ad: 'Kendi Başına', aciklama: 'Zor modda ipucusuz kazan', kosul: (o) => o.kazandi && o.zor && !o.ipucu },
  { id: 'kisa', emoji: '🐜', ad: 'Kısa ve Öz', aciklama: '4 harfli bir kelime bil', kosul: (o) => o.kazandi && o.n === 4 },
  { id: 'uzun', emoji: '🐘', ad: 'Uzun Soluk', aciklama: '6 harfli bir kelime bil', kosul: (o) => o.kazandi && o.n === 6 },
  { id: 'seri3', emoji: '🔥', ad: 'Isınıyor', aciklama: 'Günün kelimesinde 3 günlük seri', kosul: (o) => o.mod === 'gunluk' && o.seri >= 3 },
  { id: 'seri7', emoji: '⭐', ad: 'Haftanın Yıldızı', aciklama: '7 günlük seri', kosul: (o) => o.mod === 'gunluk' && o.seri >= 7 },
  { id: 'seri30', emoji: '👑', ad: 'Efsane', aciklama: '30 günlük seri', kosul: (o) => o.mod === 'gunluk' && o.seri >= 30 },
  { id: 'elli', emoji: '📚', ad: 'Kitap Kurdu', aciklama: 'Toplam 50 kelime bil', kosul: (o) => o.toplamKazanilan >= 50 },
  { id: 'yuz', emoji: '💯', ad: 'Yüzde Yüz', aciklama: 'Toplam 100 kelime bil', kosul: (o) => o.toplamKazanilan >= 100 },
  { id: 'bin', emoji: '🏆', ad: 'Söz Ustası', aciklama: 'Toplam 1000 kelime bil', kosul: (o) => o.toplamKazanilan >= 1000 },
  { id: 'hiz5', emoji: '⚡', ad: 'Hızlı Parmaklar', aciklama: 'Zamana Karşı modda 5 kelime', kosul: (o) => o.mod === 'zaman' && o.zamanSkoru >= 5 },
  { id: 'hiz10', emoji: '🌩️', ad: 'Şimşek', aciklama: 'Zamana Karşı modda 10 kelime', kosul: (o) => o.mod === 'zaman' && o.zamanSkoru >= 10 },
  { id: 'gece', emoji: '🦉', ad: 'Gece Kuşu', aciklama: 'Gece 00.00 ile 05.00 arası kazan', kosul: (o) => o.kazandi && o.saat < 5 },
  { id: 'erkenci', emoji: '🌅', ad: 'Erkenci', aciklama: 'Günün kelimesini 08.00 olmadan bil', kosul: (o) => o.mod === 'gunluk' && o.kazandi && o.saat >= 5 && o.saat < 8 },
];

// Yeni kazanılan rozetleri döner ve kazanılanlar nesnesine ekler.
export function rozetKontrol(kazanilanlar, ozet, tarih = new Date().toISOString().slice(0, 10)) {
  const yeni = ROZETLER.filter((r) => !kazanilanlar[r.id] && r.kosul(ozet));
  yeni.forEach((r) => { kazanilanlar[r.id] = tarih; });
  return yeni;
}
