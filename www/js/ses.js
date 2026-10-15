// Tüm sesler ve müzik Web Audio ile anında üretilir: ses dosyası yok, telif yok.

let ctx = null;
let ana = null;
let efektAcik = true;
let muzikAcik = false;
let muzikZamanlayici = null;
let muzikKazanc = null;

function baglam() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    ana = ctx.createGain();
    ana.gain.value = 0.9;
    const sikistirici = ctx.createDynamicsCompressor();
    ana.connect(sikistirici).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Tarayıcılar sesi ancak bir dokunuştan sonra açar.
export function kilidiAc() {
  baglam();
  if (muzikAcik && !muzikZamanlayici) muzikBaslat();
}

const frekans = (nota) => 440 * Math.pow(2, (nota - 69) / 12);

// Yumuşak bir ton: saldırı, sönüm ve isteğe bağlı filtre.
function ton({ nota, sure = 0.15, tip = 'sine', ses = 0.2, gecikme = 0, hedef = ana, filtre = null, kayma = 0 }) {
  const c = baglam();
  if (!c) return;
  const t = c.currentTime + gecikme;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tip;
  osc.frequency.setValueAtTime(frekans(nota), t);
  if (kayma) osc.frequency.exponentialRampToValueAtTime(frekans(nota + kayma), t + sure);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(ses, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  let son = osc.connect(g);
  if (filtre) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filtre;
    son = g.connect(f);
  }
  son.connect(hedef);
  osc.start(t);
  osc.stop(t + sure + 0.05);
}

// Zil benzeri ses: temel ton + parlak üst ton.
function zil(nota, gecikme = 0, ses = 0.16, sure = 0.6) {
  ton({ nota, sure, tip: 'sine', ses, gecikme });
  ton({ nota: nota + 12, sure: sure * 0.5, tip: 'triangle', ses: ses * 0.35, gecikme });
  ton({ nota: nota + 19, sure: sure * 0.3, tip: 'sine', ses: ses * 0.15, gecikme });
}

const efekt = (fn) => (...a) => { if (efektAcik) fn(...a); };

export const ses = {
  tus: efekt(() => ton({ nota: 84, sure: 0.05, tip: 'triangle', ses: 0.06, filtre: 3000 })),
  sil: efekt(() => ton({ nota: 72, sure: 0.06, tip: 'triangle', ses: 0.06, filtre: 2000, kayma: -3 })),
  // Kartlar açılırken her harfin sesi durumuna göre: doğru harfler yükselen bir dizi çalar.
  harf: efekt((durum, i) => {
    const dizi = [72, 74, 76, 79, 81, 84];
    if (durum === 'dogru') zil(dizi[i] ?? 84, 0, 0.12, 0.35);
    else if (durum === 'var') ton({ nota: 67 + i, sure: 0.2, tip: 'triangle', ses: 0.1 });
    else ton({ nota: 55, sure: 0.12, tip: 'sine', ses: 0.07, filtre: 900 });
  }),
  hata: efekt(() => {
    ton({ nota: 50, sure: 0.12, tip: 'square', ses: 0.05, filtre: 700 });
    ton({ nota: 49, sure: 0.16, tip: 'square', ses: 0.05, filtre: 700, gecikme: 0.1 });
  }),
  zafer: efekt(() => {
    [72, 76, 79, 84, 88].forEach((n, i) => zil(n, i * 0.09, 0.14, 0.8));
    [96, 100, 103].forEach((n, i) => ton({ nota: n, sure: 0.25, ses: 0.04, gecikme: 0.5 + i * 0.07 }));
  }),
  kayip: efekt(() => {
    [69, 65, 62, 57].forEach((n, i) => ton({ nota: n, sure: 0.45, tip: 'triangle', ses: 0.1, gecikme: i * 0.18, filtre: 1800 }));
  }),
  ipucu: efekt(() => [79, 86, 91, 98].forEach((n, i) => zil(n, i * 0.06, 0.07, 0.5))),
  ac: efekt(() => ton({ nota: 79, sure: 0.12, tip: 'sine', ses: 0.06, kayma: 5 })),
};

// --- Arka plan müziği: yavaş akorlar üzerinde rastgele pentatonik melodi ---

const AKORLAR = [
  [48, 55, 64, 71], // Cmaj7
  [45, 52, 60, 67], // Am7
  [41, 48, 57, 64], // Fmaj7
  [43, 50, 59, 64], // G6sus
];
const PENTATONIK = [72, 74, 76, 79, 81, 84, 86, 88];
const VURUS = 0.75; // saniye
let siradakiZaman = 0;
let vurusNo = 0;
let sonMelodi = 3;

function muzikGrubu() {
  if (!muzikKazanc) {
    muzikKazanc = ctx.createGain();
    muzikKazanc.gain.value = 0;
    const yanki = ctx.createDelay();
    yanki.delayTime.value = VURUS * 0.75;
    const geriBesleme = ctx.createGain();
    geriBesleme.gain.value = 0.3;
    muzikKazanc.connect(ana);
    muzikKazanc.connect(yanki);
    yanki.connect(geriBesleme).connect(yanki);
    yanki.connect(ana);
  }
  return muzikKazanc;
}

function vurusPlanla(t) {
  const hedef = muzikGrubu();
  const akor = AKORLAR[Math.floor(vurusNo / 8) % AKORLAR.length];
  if (vurusNo % 8 === 0) {
    akor.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = frekans(n);
      f.type = 'lowpass';
      f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + VURUS * 8.2);
      osc.connect(f).connect(g).connect(hedef);
      osc.start(t);
      osc.stop(t + VURUS * 8.5);
    });
  }
  if (Math.random() < 0.45) {
    sonMelodi = Math.max(0, Math.min(PENTATONIK.length - 1, sonMelodi + Math.floor(Math.random() * 5) - 2));
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frekans(PENTATONIK[sonMelodi]);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(g).connect(hedef);
    osc.start(t);
    osc.stop(t + 1.5);
  }
  vurusNo++;
}

function muzikBaslat() {
  const c = baglam();
  if (!c) return;
  const g = muzikGrubu();
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setTargetAtTime(1, c.currentTime, 0.8);
  if (muzikZamanlayici) return;
  siradakiZaman = Math.max(siradakiZaman, c.currentTime + 0.1);
  muzikZamanlayici = setInterval(() => {
    while (siradakiZaman < ctx.currentTime + 1.5) {
      vurusPlanla(siradakiZaman);
      siradakiZaman += VURUS;
    }
  }, 300);
}

function muzikDurdur() {
  clearInterval(muzikZamanlayici);
  muzikZamanlayici = null;
  if (ctx && muzikKazanc) muzikKazanc.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
}

export function ayarla({ efekt: e, muzik: m }) {
  efektAcik = e;
  if (m !== muzikAcik) {
    muzikAcik = m;
    if (m && ctx) muzikBaslat();
    else if (!m) muzikDurdur();
  }
}

// Uygulama arka plana geçince müzik susar.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});
