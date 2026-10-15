// Yayına çıkmadan önce doldurulacak sabitler. Boş olanlar uygulamada gizlenir.

export const UYGULAMA_ADI = 'Kelimece';
export const SURUM = '1.0.0';

// capacitor.config.json içindeki appId ile aynı olmalı. İlk yüklemeden sonra değiştirilemez.
export const UYGULAMA_KIMLIGI = 'com.kelimece.oyun';

export const PLAY_ADRESI = `https://play.google.com/store/apps/details?id=${UYGULAMA_KIMLIGI}`;
// App Store'a yüklendikten sonra verilen sayısal kimlik, ör. 'https://apps.apple.com/app/id1234567890'
export const APPSTORE_ADRESI = '';

// Oyunun web adresi (paylaşım metninin sonuna eklenir), ör. 'https://kelimece.com'
export const WEB_ADRESI = '';

// Geri bildirim e-postası, ör. 'destek@kelimece.com'
export const ILETISIM_EPOSTA = '';

// Gizlilik politikası: Google Play'e girilen herkese açık adres. Boşsa uygulama içi sayfa açılır.
export const GIZLILIK_ADRESI = '';
