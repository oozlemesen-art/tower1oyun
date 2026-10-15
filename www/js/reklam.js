// AdMob reklamları (yalnızca Android/iOS uygulamasında). Tarayıcıda reklam yoktur;
// ödüllü reklam beklenen yerlerde ödül doğrudan verilir ki oyun akışı bozulmasın.
//
// Gerçek reklam kimlikleri AdMob panelinden alınıp aşağıya yazılır. Boşken Google'ın
// resmi test reklamları gösterilir (yayına çıkmadan önce mutlaka doldurun).

const KIMLIKLER = {
  android: { banner: '', gecis: '', odullu: '' },
  ios: { banner: '', gecis: '', odullu: '' },
};

// https://developers.google.com/admob/android/test-ads , https://developers.google.com/admob/ios/test-ads
const TEST = {
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    gecis: 'ca-app-pub-3940256099942544/1033173712',
    odullu: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    gecis: 'ca-app-pub-3940256099942544/4411468910',
    odullu: 'ca-app-pub-3940256099942544/1712485313',
  },
};

// Geçiş reklamı en fazla bu kadar oyunda bir ve en az bu kadar saniye arayla gösterilir.
const GECIS_ARALIGI = 3;
const GECIS_EN_AZ_SANIYE = 90;

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() ?? 'web';
const AdMob = cap?.isNativePlatform?.() ? cap.Plugins?.AdMob : null;

const kimlik = (tur) => KIMLIKLER[platform]?.[tur] || TEST[platform]?.[tur];
const testMi = (tur) => !KIMLIKLER[platform]?.[tur];

let hazir = false;
let sonGecis = 0;
let bannerYuksekligi = 0;

export const yerelMi = Boolean(AdMob);

function bannerBoslugu(px) {
  bannerYuksekligi = px;
  document.documentElement.style.setProperty('--banner', `${px}px`);
}

export async function baslat() {
  if (!AdMob) return;
  try {
    await AdMob.initialize({ initializeForTesting: testMi('banner') });
    // Avrupa kullanıcıları için Google'ın onay formu (UMP).
    try {
      const onay = await AdMob.requestConsentInfo();
      if (onay?.isConsentFormAvailable && onay.status === 'REQUIRED') await AdMob.showConsentForm();
    } catch {
      // Onay formu yoksa reklamlar kişiselleştirilmemiş gösterilir.
    }
    if (platform === 'ios') {
      try {
        await AdMob.requestTrackingAuthorization();
      } catch {
        // İzin verilmezse reklamlar yine çalışır.
      }
    }
    AdMob.addListener('bannerAdSizeChanged', (b) => bannerBoslugu(b?.height ?? 0));
    hazir = true;
    await bannerGoster();
    gecisHazirla();
  } catch (e) {
    console.warn('Reklam başlatılamadı', e);
  }
}

export async function bannerGoster() {
  if (!hazir) return;
  try {
    await AdMob.showBanner({
      adId: kimlik('banner'),
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: testMi('banner'),
    });
  } catch (e) {
    console.warn('Banner gösterilemedi', e);
  }
}

let gecisYuklendi = false;
async function gecisHazirla() {
  if (!hazir) return;
  try {
    await AdMob.prepareInterstitial({ adId: kimlik('gecis'), isTesting: testMi('gecis') });
    gecisYuklendi = true;
  } catch {
    gecisYuklendi = false;
  }
}

// Biten oyun sayısına bakarak, uygunsa geçiş reklamı gösterir.
export async function oyunBitti(bitenSayisi) {
  if (!hazir || !gecisYuklendi) return;
  if (bitenSayisi < 2 || bitenSayisi % GECIS_ARALIGI !== 0) return;
  if (Date.now() - sonGecis < GECIS_EN_AZ_SANIYE * 1000) return;
  try {
    gecisYuklendi = false;
    await AdMob.showInterstitial();
    sonGecis = Date.now();
  } catch {
    // Reklam gelmediyse oyun devam eder.
  }
  gecisHazirla();
}

// Ödüllü reklam: izlenip ödül kazanıldıysa true döner.
export async function odulluIzle() {
  if (!AdMob) return true;
  if (!hazir) return false;
  let odul = false;
  const dinleyici = await AdMob.addListener('onRewardedVideoAdReward', () => { odul = true; });
  try {
    await AdMob.prepareRewardVideoAd({ adId: kimlik('odullu'), isTesting: testMi('odullu') });
    const sonuc = await AdMob.showRewardVideoAd();
    if (sonuc?.amount > 0) odul = true;
  } catch {
    odul = false;
  } finally {
    dinleyici?.remove?.();
  }
  return odul;
}

export const banner = () => bannerYuksekligi;
