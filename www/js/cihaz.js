// Paylaşım, titreşim ve bağlantı açma: uygulamada Capacitor eklentileri, tarayıcıda web API'leri.

const cap = window.Capacitor;
const yerel = cap?.isNativePlatform?.() ?? false;
const eklenti = (ad) => (yerel ? cap.Plugins?.[ad] : null);

// Paylaşım menüsü açıldıysa 'paylasildi', panoya kopyalandıysa 'kopyalandi', olmadıysa null.
export async function paylas(metin) {
  const Share = eklenti('Share');
  try {
    if (Share) {
      await Share.share({ text: metin, dialogTitle: 'Sonucunu paylaş' });
      return 'paylasildi';
    }
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text: metin });
      return 'paylasildi';
    }
  } catch (e) {
    if (e?.name === 'AbortError' || /cancel/i.test(e?.message ?? '')) return 'iptal';
  }
  try {
    await navigator.clipboard.writeText(metin);
    return 'kopyalandi';
  } catch {
    return null;
  }
}

let titresimAcik = true;
export const titresimAyarla = (acik) => { titresimAcik = acik; };

export function titret(tur = 'hafif') {
  if (!titresimAcik) return;
  const Haptics = eklenti('Haptics');
  try {
    if (Haptics) {
      if (tur === 'basari') Haptics.notification({ type: 'SUCCESS' });
      else if (tur === 'hata') Haptics.notification({ type: 'ERROR' });
      else Haptics.impact({ style: tur === 'orta' ? 'MEDIUM' : 'LIGHT' });
    } else if (navigator.vibrate) {
      navigator.vibrate(tur === 'hata' ? [30, 40, 30] : tur === 'basari' ? [20, 30, 60] : 8);
    }
  } catch {
    // Titreşim desteklenmiyorsa sessizce geç.
  }
}

export function baglantiAc(url) {
  const Browser = eklenti('Browser');
  if (Browser) Browser.open({ url });
  else window.open(url, '_blank', 'noopener');
}

// --- Mağaza puanı ---

// Uygulama içi puanlama penceresini açar; açılamazsa mağaza sayfasına gider.
export async function puanIste(magazaAdresi) {
  const InAppReview = eklenti('InAppReview');
  if (InAppReview) {
    try {
      await InAppReview.requestReview();
      return;
    } catch {
      // Mağaza sayfasına düş.
    }
  }
  if (magazaAdresi) baglantiAc(magazaAdresi);
}

export const platform = () => cap?.getPlatform?.() ?? 'web';
export const yerelMi = () => yerel;

// --- Bildirimler ---

const HATIRLATMA_ILK_ID = 100;
const PLANLANAN_GUN = 7;

export async function bildirimIzniVarMi() {
  const LN = eklenti('LocalNotifications');
  if (!LN) return false;
  try {
    return (await LN.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

export async function bildirimIzniIste() {
  const LN = eklenti('LocalNotifications');
  if (!LN) return false;
  try {
    return (await LN.requestPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

// Önümüzdeki günler için tek tek hatırlatma kurar (bugün oynandıysa bugünü atlar).
// Her açılışta ve her oyun sonunda yeniden kurulur, böylece metin güncel kalır.
export async function hatirlatmalariKur({ acik, saat, bugunOynandi, seri }) {
  const LN = eklenti('LocalNotifications');
  if (!LN) return;
  try {
    const bekleyen = await LN.getPending();
    const eskiler = bekleyen.notifications.filter((b) => b.id >= HATIRLATMA_ILK_ID && b.id < HATIRLATMA_ILK_ID + 50);
    if (eskiler.length) await LN.cancel({ notifications: eskiler.map((b) => ({ id: b.id })) });
    if (!acik || !(await bildirimIzniVarMi())) return;

    const simdi = new Date();
    const bildirimler = [];
    for (let g = 0; g < PLANLANAN_GUN; g++) {
      const zaman = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + g, saat, 0, 0);
      if (zaman <= simdi || (g === 0 && bugunOynandi)) continue;
      const seriSuruyor = seri > 0 && g <= 1;
      bildirimler.push({
        id: HATIRLATMA_ILK_ID + g,
        title: seriSuruyor ? `🔥 ${seri} günlük serin tehlikede!` : '🟩 Günün kelimesi hazır',
        body: seriSuruyor
          ? 'Bugünün kelimesini bul, serin bozulmasın.'
          : HATIRLATMA_METINLERI[(zaman.getDate() + g) % HATIRLATMA_METINLERI.length],
        schedule: { at: zaman, allowWhileIdle: true },
        smallIcon: 'ic_stat_kelimece',
        iconColor: '#1f9d63',
      });
    }
    if (bildirimler.length) await LN.schedule({ notifications: bildirimler });
  } catch (e) {
    console.warn('Hatırlatma kurulamadı', e);
  }
}

const HATIRLATMA_METINLERI = [
  'Altı tahminde bulabilecek misin?',
  'Yeni kelime seni bekliyor. Bugün kaç tahminde bulacaksın?',
  'Beynine günlük egzersiz: 1 kelime, 6 tahmin.',
  'Arkadaşların çoktan başladı bile 👀',
  'Bugünkü kelime biraz zorlayıcı olabilir 😉',
];

// --- Geri tuşu ve uygulama durumu ---

export function geriTusu(fn) {
  eklenti('App')?.addListener('backButton', fn);
}

export function uygulamadanCik() {
  eklenti('App')?.exitApp();
}

export function durumCubugu(koyu, renk) {
  const StatusBar = eklenti('StatusBar');
  if (!StatusBar) return;
  StatusBar.setStyle({ style: koyu ? 'DARK' : 'LIGHT' }).catch(() => {});
  if (platform() === 'android') StatusBar.setBackgroundColor({ color: renk }).catch(() => {});
}

export function acilisEkraniniKapat() {
  eklenti('SplashScreen')?.hide({ fadeOutDuration: 250 }).catch?.(() => {});
}
