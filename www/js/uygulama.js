// Kelimece: ekran, girdi ve oyun akışı. Saf mantık oyun.js'te, kayıt depo.js'te.

import {
  HAK, buyuk, kucuk, gecerliMi, degerlendir, gunNumarasi, gununKelimesi, rastgeleKelime,
  klavyeDurumu, ipucuSec, paylasimMetni, istatistikGuncelle, guncelSeri, zorModHatasi,
} from './oyun.js';
import { ROZETLER, rozetKontrol } from './rozetler.js';
import { yukle, kaydet } from './depo.js';
import { ses, kilidiAc, ayarla as sesAyarla } from './ses.js';
import * as reklam from './reklam.js';
import * as cihaz from './cihaz.js';
import { konfeti } from './konfeti.js';
import * as Y from './yapilandirma.js';

const $ = (s) => document.querySelector(s);
const kayit = yukle();

const ZAMAN_SURESI = 120;
const ZAMAN_ODULU = 10;
const EN_FAZLA_IPUCU = 2;
const ACILMA_ARASI = 280;
const ACILMA_SURESI = 560;
const PUAN_SORMA_KAZANCI = 5;

const TEBRIK = [
  ['Dâhi! 🤯', 'İnanılmaz! 🔮', 'Bu nasıl oldu?! 🤯'],
  ['Muhteşem! 🔥', 'Kartal göz! 🦅', 'Süper! 🚀'],
  ['Harika! 🌟', 'Çok güzel! ✨', 'Bravo! 👏'],
  ['Çok iyi! 👏', 'Tebrikler! 🎉', 'Aferin! 💪'],
  ['Güzel! 😊', 'Başardın! 🎯', 'İyi iş! 👍'],
  ['Kıl payı! 😅', 'Son anda! 😮‍💨', 'Ucu ucuna! 😅'],
  ['Geri dönüş! 🛟', 'Pes etmedin! 💪'],
];
const TESELLI = ['Bu sefer olmadı 😔', 'Az kaldı! 🙈', 'Zor bir kelimeydi 🤔'];
const sec = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];

const DUZEN = [
  ['e', 'r', 't', 'y', 'u', 'ı', 'o', 'p', 'ğ', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş', 'i'],
  ['gir', 'z', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç', 'sil'],
];
const HARFLER = new Set(DUZEN.flat().filter((h) => h.length === 1));

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const el = {
  tahta: $('#tahta'),
  tahtaAlani: $('#tahtaAlani'),
  klavye: $('#klavye'),
  bilgi: $('#bilgi'),
  uzunluklar: $('#uzunluklar'),
  zamanCubugu: $('#zamanCubugu'),
  zamanGiris: $('#zamanGiris'),
  ipucu: $('#btnIpucu'),
  yeni: $('#btnYeni'),
  perde: $('#perde'),
  icerik: $('#pencereIcerik'),
  tostlar: $('#tostlar'),
};

let mod = 'gunluk';
let oyun = null;
let yazilan = '';
let kilit = false;
let zaman = null;
let pencereKapaninca = null;

// ---------------------------------------------------------------- Tema ve ayarlar

function temaUygula() {
  const { tema, yuksekKontrast } = kayit.ayarlar;
  const koyu = tema === 'koyu' || (tema === 'sistem' && matchMedia('(prefers-color-scheme: dark)').matches);
  const kok = document.documentElement;
  kok.dataset.tema = koyu ? 'koyu' : 'acik';
  kok.dataset.kontrast = yuksekKontrast ? 'yuksek' : 'normal';
  const renk = getComputedStyle(kok).getPropertyValue('--zemin').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', renk));
  cihaz.durumCubugu(koyu, renk);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', temaUygula);

function ayarlariUygula() {
  temaUygula();
  sesAyarla({ efekt: kayit.ayarlar.ses, muzik: kayit.ayarlar.muzik });
  cihaz.titresimAyarla(kayit.ayarlar.titresim);
}

// ---------------------------------------------------------------- Oyun kurulumu

function yeniKayit(m, n, cevap, ek = {}) {
  return { mod: m, n, cevap, tahminler: [], bitti: false, kazandi: false, ipuclari: [], ekHak: false, zor: kayit.ayarlar.zor, ...ek };
}

function gunlukOyun() {
  const no = gunNumarasi();
  if (kayit.gunluk?.gunNo !== no) kayit.gunluk = yeniKayit('gunluk', 5, gununKelimesi(no), { gunNo: no });
  return kayit.gunluk;
}

function sinirsizOyun(yeni = false) {
  const n = kayit.ayarlar.uzunluk;
  const s = kayit.sinirsiz;
  if (!yeni && s && s.n === n && !s.bitti) return s;
  const son = kayit.sonCevaplar[n] ?? (kayit.sonCevaplar[n] = []);
  const cevap = rastgeleKelime(n, son);
  son.push(cevap);
  if (son.length > 150) son.shift();
  kayit.sinirsiz = yeniKayit('sinirsiz', n, cevap);
  return kayit.sinirsiz;
}

function zamanKelimesi() {
  const n = kayit.ayarlar.uzunluk;
  const cevap = rastgeleKelime(n, zaman?.gecmis ?? []);
  zaman.gecmis.push(cevap);
  return yeniKayit('zaman', n, cevap, { zor: false });
}

function modAc(yeniMod, { sessiz = false } = {}) {
  if (zaman?.aktif && yeniMod !== 'zaman') zamanDurdur();
  mod = yeniMod;
  yazilan = '';
  document.querySelectorAll('.modlar [data-mod]').forEach((b, i) => {
    const secili = b.dataset.mod === mod;
    b.setAttribute('aria-selected', secili);
    if (secili) $('.mod-isaret').style.transform = `translateX(${i * 100}%)`;
  });
  if (!sessiz) ses.ac();

  el.zamanGiris.hidden = mod !== 'zaman' || zaman?.aktif;
  el.zamanCubugu.hidden = mod !== 'zaman' || !zaman?.aktif;

  if (mod === 'gunluk') oyun = gunlukOyun();
  else if (mod === 'sinirsiz') oyun = sinirsizOyun();
  else oyun = zaman?.aktif ? zaman.oyun : yeniKayit('zaman', kayit.ayarlar.uzunluk, '', { bos: true });

  kaydet();
  ekraniKur();
  if (mod === 'zaman' && !zaman?.aktif) zamanGirisiGoster();
  // Kapanmadan önce son şansta kalmış bir oyun varsa soruyu yeniden sor.
  if (!oyun.bitti && !oyun.bos && oyun.tahminler.length >= hakSayisi() && !oyun.tahminler.includes(oyun.cevap)) {
    setTimeout(kayipAkisi, 400);
  }
}

const hakSayisi = () => HAK + (oyun.ekHak ? 1 : 0);

// ---------------------------------------------------------------- Çizim

function ekraniKur() {
  tahtaCiz();
  klavyeGuncelle();
  bilgiGuncelle();
  eylemleriGuncelle();
}

function tahtaCiz() {
  el.tahta.innerHTML = '';
  for (let r = 0; r < hakSayisi(); r++) {
    const satir = document.createElement('div');
    satir.className = 'satir' + (r === HAK ? ' ek' : '');
    for (let c = 0; c < oyun.n; c++) {
      const kare = document.createElement('div');
      kare.className = 'kare';
      kare.innerHTML = '<span class="harf"></span>';
      satir.append(kare);
    }
    el.tahta.append(satir);
  }
  oyun.tahminler.forEach((t, r) => {
    const sonuc = degerlendir(t, oyun.cevap);
    const kareler = el.tahta.children[r].children;
    [...t].forEach((h, i) => {
      kareler[i].classList.add('aninda');
      kareler[i].firstChild.textContent = buyuk(h);
      kareler[i].dataset.durum = sonuc[i];
    });
  });
  boyutla();
  satirGuncelle();
}

function boyutla() {
  const satirlar = hakSayisi();
  const sutunlar = oyun.n;
  const bosluk = 6;
  const w = el.tahtaAlani.clientWidth - 24 - (oyun.ekHak ? 40 : 0);
  const h = el.tahtaAlani.clientHeight - 12;
  const kare = Math.floor(Math.min((w - (sutunlar - 1) * bosluk) / sutunlar, (h - (satirlar - 1) * bosluk) / satirlar, 66));
  document.documentElement.style.setProperty('--kare', `${Math.max(kare, 26)}px`);
}
addEventListener('resize', () => oyun && boyutla());

function satirGuncelle() {
  const r = oyun.tahminler.length;
  const satir = el.tahta.children[r];
  if (!satir || oyun.bitti) return;
  const harfler = [...yazilan];
  [...satir.children].forEach((kare, i) => {
    const h = harfler[i];
    kare.firstChild.textContent = h ? buyuk(h) : '';
    kare.classList.toggle('dolu', Boolean(h));
    const ipucu = !h && oyun.ipuclari.includes(i);
    kare.classList.toggle('hayalet', ipucu);
    if (ipucu) kare.dataset.ipucu = buyuk([...oyun.cevap][i]);
  });
}

function klavyeCiz() {
  el.klavye.innerHTML = '';
  for (const satir of DUZEN) {
    const s = document.createElement('div');
    s.className = 'klavye-satir';
    for (const h of satir) {
      const b = document.createElement('button');
      b.className = 'tus';
      b.dataset.h = h;
      if (h === 'gir') {
        b.classList.add('genis');
        b.textContent = 'GİR';
        b.setAttribute('aria-label', 'Tahmini gönder');
      } else if (h === 'sil') {
        b.classList.add('genis');
        b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 5H8.5L3 12l5.5 7H21z"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5"/></svg>';
        b.setAttribute('aria-label', 'Sil');
      } else {
        b.textContent = buyuk(h);
      }
      s.append(b);
    }
    el.klavye.append(s);
  }
  el.klavye.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.tus');
    if (!b) return;
    e.preventDefault();
    kilidiAc();
    tusaBasildi(b.dataset.h);
  });
}

function klavyeGuncelle() {
  const durum = oyun.cevap ? klavyeDurumu(oyun.tahminler, oyun.cevap) : {};
  el.klavye.querySelectorAll('.tus').forEach((b) => {
    if (durum[b.dataset.h]) b.dataset.durum = durum[b.dataset.h];
    else delete b.dataset.durum;
  });
}

function bilgiGuncelle() {
  const n = kayit.ayarlar.uzunluk;
  el.uzunluklar.hidden = mod === 'gunluk' || (mod === 'zaman' && zaman?.aktif);
  el.uzunluklar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', Number(b.dataset.n) === n));
  const zor = oyun.zor ? '<span class="etiket">ZOR</span>' : '';
  if (mod === 'gunluk') {
    const d = new Date();
    el.bilgi.innerHTML = `<span class="etiket">#${oyun.gunNo}</span><span>${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}</span>${zor}`;
  } else if (mod === 'sinirsiz') {
    const seri = kayit.istatistik.sinirsiz.seri;
    el.bilgi.innerHTML = `<span><b>${oyun.n}</b> harf</span>${seri > 1 ? `<span>🔥 <b>${seri}</b></span>` : ''}${zor}`;
  } else if (zaman?.aktif) {
    zamanBilgisi();
  } else {
    el.bilgi.innerHTML = `<span>Rekor: <b>${kayit.istatistik.zaman.enIyi}</b></span>`;
  }
}

function eylemleriGuncelle() {
  const zamanda = mod === 'zaman';
  el.ipucu.hidden = zamanda || oyun.bitti;
  el.yeni.hidden = !(mod === 'sinirsiz' && oyun.bitti);
  const kalan = EN_FAZLA_IPUCU - oyun.ipuclari.length;
  el.ipucu.disabled = kalan <= 0;
  el.ipucu.firstElementChild.nextSibling.textContent = kalan < EN_FAZLA_IPUCU ? ` İpucu (${kalan}) ` : ' İpucu ';
  $('#ipucuReklam').hidden = !reklam.yerelMi;
  if (mod === 'gunluk' && oyun.bitti) {
    el.ipucu.hidden = true;
  }
}

// ---------------------------------------------------------------- Girdi

function tusaBasildi(h) {
  if (!el.perde.hidden || kilit || !oyun || oyun.bitti || oyun.bos) return;
  if (h === 'gir') return gonder();
  if (h === 'sil') return sil();
  if (HARFLER.has(h)) harfEkle(h);
}

addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && !el.perde.hidden) return pencereKapat();
  if (!el.perde.hidden) return;
  let h = null;
  if (e.key === 'Enter') h = 'gir';
  else if (e.key === 'Backspace') h = 'sil';
  else if (e.key.length === 1) h = kucuk(e.key);
  if (!h || (h.length === 1 && !HARFLER.has(h))) return;
  e.preventDefault();
  kilidiAc();
  const tus = el.klavye.querySelector(`[data-h="${h}"]`);
  tus?.classList.add('basili');
  setTimeout(() => tus?.classList.remove('basili'), 100);
  tusaBasildi(h);
});

function harfEkle(h) {
  if ([...yazilan].length >= oyun.n) return;
  yazilan += h;
  ses.tus();
  cihaz.titret();
  satirGuncelle();
}

function sil() {
  if (!yazilan) return;
  yazilan = [...yazilan].slice(0, -1).join('');
  ses.sil();
  cihaz.titret();
  satirGuncelle();
}

function salla(mesaj) {
  const satir = el.tahta.children[oyun.tahminler.length];
  satir?.classList.remove('salla');
  void satir?.offsetWidth;
  satir?.classList.add('salla');
  ses.hata();
  cihaz.titret('hata');
  tost(mesaj);
}

async function gonder() {
  if ([...yazilan].length < oyun.n) return salla('Harf sayısı yetmiyor');
  if (!gecerliMi(yazilan)) return salla('Sözlükte böyle bir kelime yok');
  if (oyun.zor) {
    const hata = zorModHatasi(yazilan, oyun.tahminler, oyun.cevap);
    if (hata) return salla(hata);
  }
  kilit = true;
  const tahmin = yazilan;
  const r = oyun.tahminler.length;
  oyun.tahminler.push(tahmin);
  yazilan = '';
  if (mod !== 'zaman') kaydet();

  await satiriAc(r, tahmin);
  klavyeGuncelle();
  kilit = false;

  if (tahmin === oyun.cevap) kazan(r);
  else if (oyun.tahminler.length >= hakSayisi()) kayipAkisi();
}

function satiriAc(r, tahmin) {
  const sonuc = degerlendir(tahmin, oyun.cevap);
  const kareler = el.tahta.children[r].children;
  sonuc.forEach((durum, i) => {
    const kare = kareler[i];
    kare.classList.remove('dolu', 'hayalet');
    kare.style.setProperty('--gecikme', `${(i * ACILMA_ARASI) / 1000}s`);
    kare.dataset.durum = durum;
    setTimeout(() => {
      ses.harf(durum, i);
      if (durum === 'dogru') cihaz.titret();
    }, i * ACILMA_ARASI + ACILMA_SURESI / 2);
  });
  return bekle((sonuc.length - 1) * ACILMA_ARASI + ACILMA_SURESI + 60);
}

const bekle = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ---------------------------------------------------------------- Kazanma ve kaybetme

function zipla(r) {
  [...el.tahta.children[r].children].forEach((kare, i) => {
    kare.classList.remove('aninda');
    kare.style.setProperty('--gecikme', `${i * 0.09}s`);
    kare.style.animation = 'none';
    void kare.offsetWidth;
    kare.style.animation = '';
    kare.classList.add('zipla', 'parla');
  });
}

function kazan(r) {
  zipla(r);
  ses.zafer();
  cihaz.titret('basari');
  if (mod === 'zaman') return zamanKelimeBulundu();

  oyun.bitti = true;
  oyun.kazandi = true;
  const tebrik = sec(TEBRIK[Math.min(oyun.tahminler.length, HAK + 1) - 1]);
  setTimeout(() => {
    konfeti();
    tost(tebrik, { buyuk: true, sure: 1800 });
  }, 450);
  sonucuIsle();
  eylemleriGuncelle();
  setTimeout(() => sonucPenceresi(tebrik), 2100);
}

function kayipAkisi() {
  if (mod === 'zaman') {
    tost(buyuk(oyun.cevap), { buyuk: true, sure: 1500 });
    ses.kayip();
    setTimeout(() => zaman?.aktif && zamanSonrakiKelime(), 1300);
    return;
  }
  if (!oyun.ekHak) return sonSansPenceresi();
  bitirKayip();
}

function bitirKayip() {
  oyun.bitti = true;
  oyun.kazandi = false;
  ses.kayip();
  cihaz.titret('hata');
  tost(buyuk(oyun.cevap), { buyuk: true, sure: 2200 });
  sonucuIsle();
  eylemleriGuncelle();
  setTimeout(() => sonucPenceresi(sec(TESELLI)), 2000);
}

function sonucuIsle() {
  const m = oyun.mod;
  const yeni = istatistikGuncelle(kayit.istatistik[m], {
    kazandi: oyun.kazandi,
    tahminSayisi: oyun.tahminler.length,
    gunNo: m === 'gunluk' ? oyun.gunNo : null,
  });
  kayit.istatistik[m] = yeni;
  if (oyun.kazandi) kayit.toplamKazanilan++;
  kayit.biten++;
  rozetleriDenetle({
    mod: m,
    kazandi: oyun.kazandi,
    tahminSayisi: oyun.tahminler.length,
    n: oyun.n,
    ipucu: oyun.ipuclari.length,
    zor: oyun.zor,
    ekHak: oyun.ekHak,
    seri: yeni.seri,
  });
  kaydet();
  if (m === 'gunluk') hatirlatmalariYenile();
}

function rozetleriDenetle(ozet) {
  const yeniler = rozetKontrol(kayit.rozetler, {
    toplamKazanilan: kayit.toplamKazanilan,
    saat: new Date().getHours(),
    ...ozet,
  });
  oyun.yeniRozetler = yeniler.map((r) => r.id);
  if (yeniler.length) {
    kayit.rozetGoruldu = false;
    rozetNoktasi();
  }
}

// ---------------------------------------------------------------- İpucu ve ek hak

async function ipucuAl() {
  if (kilit || oyun.bitti || mod === 'zaman') return;
  if (oyun.ipuclari.length >= EN_FAZLA_IPUCU) return tost('Bu kelime için ipuçların bitti');
  const poz = ipucuSec(oyun.cevap, oyun.tahminler, oyun.ipuclari);
  if (poz === null) return tost('Bütün harfleri zaten buldun! 😉');
  kilit = true;
  el.ipucu.disabled = true;
  const odul = await reklam.odulluIzle();
  kilit = false;
  if (!odul) {
    eylemleriGuncelle();
    return tost('Reklam yüklenemedi, biraz sonra tekrar dene');
  }
  oyun.ipuclari.push(poz);
  if (mod !== 'zaman') kaydet();
  ses.ipucu();
  tost(`💡 ${poz + 1}. harf: ${buyuk([...oyun.cevap][poz])}`, { sure: 2200 });
  satirGuncelle();
  eylemleriGuncelle();
}

function sonSansPenceresi() {
  pencereAc(`
    <div class="sonuc-ust">
      <div class="sonuc-emoji">🛟</div>
      <h2 class="sonuc-baslik" id="pencereBaslik">Son şans!</h2>
      <p class="kucuk">Kısa bir reklam izle, <b>1 tahmin hakkı</b> daha kazan.</p>
    </div>
    <div class="btn-satir">
      <button class="ikincil" data-eylem="pes">Cevabı göster</button>
      <button class="birincil" data-eylem="ekhak">${reklam.yerelMi ? '▶ ' : ''}+1 Hak</button>
    </div>`, { kapaninca: () => !oyun.bitti && !oyun.ekHak && bitirKayip() });
}

async function ekHakAl() {
  const odul = await reklam.odulluIzle();
  if (!odul) {
    tost('Reklam yüklenemedi');
    return;
  }
  oyun.ekHak = true;
  kaydet();
  pencereKapat();
  tahtaCiz();
  ses.ipucu();
  tost('+1 hak! Bu sefer olacak 💪', { sure: 1800 });
}

// ---------------------------------------------------------------- Zamana Karşı

function zamanGirisiGoster() {
  el.zamanGiris.hidden = false;
  const ist = kayit.istatistik.zaman;
  $('#zamanRekor').textContent = ist.enIyi ? `Rekorun: ${ist.enIyi} kelime` : '';
}

function zamanBaslat() {
  kilidiAc();
  zaman = { aktif: true, bitis: performance.now() + ZAMAN_SURESI * 1000, skor: 0, gecmis: [], oyun: null };
  el.zamanGiris.hidden = true;
  el.zamanCubugu.hidden = false;
  ses.ac();
  zamanSonrakiKelime();
  zaman.zamanlayici = setInterval(zamanTik, 200);
  zamanTik();
}

function zamanSonrakiKelime() {
  zaman.oyun = zamanKelimesi();
  oyun = zaman.oyun;
  yazilan = '';
  ekraniKur();
}

function zamanKelimeBulundu() {
  zaman.skor++;
  zaman.bitis += ZAMAN_ODULU * 1000;
  kilit = true;
  tost(`+1 · +${ZAMAN_ODULU} sn`, { sure: 900 });
  setTimeout(() => {
    kilit = false;
    if (zaman?.aktif) zamanSonrakiKelime();
  }, 900);
}

let sonSaniye = null;
function zamanTik() {
  if (!zaman?.aktif) return;
  const kalan = Math.max(0, zaman.bitis - performance.now());
  const oran = Math.min(1, kalan / (ZAMAN_SURESI * 1000));
  el.zamanCubugu.firstElementChild.style.transform = `scaleX(${oran})`;
  el.zamanCubugu.classList.toggle('az', kalan < 15000);
  const saniye = Math.ceil(kalan / 1000);
  if (saniye <= 10 && saniye !== sonSaniye && saniye > 0) ses.tus();
  sonSaniye = saniye;
  if (mod === 'zaman') zamanBilgisi();
  if (kalan <= 0) zamanBitti();
}

function zamanBilgisi() {
  const kalan = Math.max(0, Math.ceil((zaman.bitis - performance.now()) / 1000));
  const dk = Math.floor(kalan / 60);
  const sn = String(kalan % 60).padStart(2, '0');
  el.bilgi.innerHTML = `<span>⏱️ <b>${dk}:${sn}</b></span><span>Puan: <b>${zaman.skor}</b></span>`;
}

function zamanDurdur() {
  clearInterval(zaman?.zamanlayici);
  zaman = null;
  el.zamanCubugu.hidden = true;
}

function zamanBitti() {
  const skor = zaman.skor;
  const ist = kayit.istatistik.zaman;
  const rekor = skor > ist.enIyi;
  ist.oynanan++;
  ist.toplam += skor;
  ist.enIyi = Math.max(ist.enIyi, skor);
  kayit.toplamKazanilan += skor;
  kayit.biten++;
  zamanDurdur();
  oyun = yeniKayit('zaman', kayit.ayarlar.uzunluk, '', { bos: true });
  rozetleriDenetle({ mod: 'zaman', kazandi: false, zamanSkoru: skor });
  kaydet();
  ekraniKur();
  zamanGirisiGoster();
  if (skor > 0) {
    ses.zafer();
    if (rekor) konfeti();
  } else {
    ses.kayip();
  }
  const metin = `${Y.UYGULAMA_ADI} ⏱️ Zamana Karşı\n${ZAMAN_SURESI / 60} dakikada ${skor} kelime buldum! Sen kaç bulursun?${Y.WEB_ADRESI ? `\n${Y.WEB_ADRESI}` : ''}`;
  pencereAc(`
    <div class="sonuc-ust">
      <div class="sonuc-emoji">${rekor ? '🏆' : skor >= 5 ? '⚡' : '⏱️'}</div>
      <h2 class="sonuc-baslik" id="pencereBaslik">${rekor ? 'Yeni rekor!' : 'Süre doldu!'}</h2>
      <p><b style="font-size:40px">${skor}</b><br><span class="kucuk">kelime buldun</span></p>
    </div>
    <div class="sayilar uc">
      <div class="sayi"><b>${ist.enIyi}</b><span>Rekor</span></div>
      <div class="sayi"><b>${ist.oynanan}</b><span>Oyun</span></div>
      <div class="sayi"><b>${ist.toplam}</b><span>Toplam kelime</span></div>
    </div>
    ${rozetBildirimi()}
    <div class="btn-satir">
      <button class="ikincil" data-eylem="paylas" data-metin="${encodeURIComponent(metin)}">Paylaş</button>
      <button class="birincil" data-eylem="zamanTekrar">Tekrar oyna</button>
    </div>`, { kapaninca: () => reklam.oyunBitti(kayit.biten) });
}

// ---------------------------------------------------------------- Pencereler

function pencereAc(html, { kapaninca = null } = {}) {
  el.icerik.innerHTML = html;
  el.perde.hidden = false;
  el.perde.classList.remove('kapaniyor');
  pencereKapaninca = kapaninca;
  el.perde.querySelector('.pencere').scrollTop = 0;
}

function pencereKapat({ cagir = true } = {}) {
  if (el.perde.hidden) return;
  const fn = pencereKapaninca;
  pencereKapaninca = null;
  clearInterval(geriSayimZamanlayici);
  el.perde.classList.add('kapaniyor');
  setTimeout(() => {
    el.perde.hidden = true;
    el.perde.classList.remove('kapaniyor');
  }, 190);
  if (cagir) fn?.();
}

$('#btnKapat').addEventListener('click', () => pencereKapat());
el.perde.addEventListener('click', (e) => {
  if (e.target === el.perde) return pencereKapat();
  const b = e.target.closest('[data-eylem]');
  if (b) eylem(b.dataset.eylem, b);
});

async function eylem(ad, b) {
  ses.ac();
  switch (ad) {
    case 'pes': return pencereKapat();
    case 'ekhak': return ekHakAl();
    case 'paylas': return paylasimYap(decodeURIComponent(b.dataset.metin));
    case 'yeniKelime': pencereKapat({ cagir: false }); return yeniSinirsiz();
    case 'zamanTekrar': pencereKapat({ cagir: false }); await reklam.oyunBitti(kayit.biten); return zamanBaslat();
    case 'sinirsizaGec': pencereKapat({ cagir: false }); return modAc('sinirsiz');
    case 'anlam': return cihaz.baglantiAc(`https://www.google.com/search?q=${encodeURIComponent(`${oyun.cevap} anlamı TDK`)}`);
    case 'istatistikSekme': return istatistikPenceresi(b.dataset.sekme);
    case 'yardim': return yardimPenceresi();
    case 'gizlilik': return gizlilikAc();
    case 'davet': return paylasimYap(davetMetni());
    case 'puan': return cihaz.puanIste(magazaAdresi());
    case 'iletisim': return cihaz.baglantiAc(`mailto:${Y.ILETISIM_EPOSTA}?subject=${encodeURIComponent(`${Y.UYGULAMA_ADI} geri bildirim (${Y.SURUM})`)}`);
    case 'sifirla': return sifirlaSor();
    case 'sifirlaOnay': return sifirla();
    case 'puanEvet': kayit.puanSoruldu = true; kaydet(); pencereKapat({ cagir: false }); return cihaz.puanIste(magazaAdresi());
    case 'puanHayir': kayit.puanSoruldu = true; kaydet(); return pencereKapat({ cagir: false });
    default:
      if (ad.startsWith('ayar:')) return ayarDegistir(ad.slice(5), b);
  }
}

async function paylasimYap(metin) {
  const sonuc = await cihaz.paylas(metin);
  if (sonuc === 'kopyalandi') tost('Panoya kopyalandı 📋');
  else if (sonuc === null) tost('Paylaşılamadı');
}

const magazaAdresi = () => (cihaz.platform() === 'ios' ? Y.APPSTORE_ADRESI : Y.PLAY_ADRESI);

function davetMetni() {
  const adres = cihaz.platform() === 'ios' ? Y.APPSTORE_ADRESI : (Y.WEB_ADRESI || Y.PLAY_ADRESI);
  return `${Y.UYGULAMA_ADI}'yi dene! Her gün yeni bir Türkçe kelime, 6 tahmin hakkı. Bakalım kim daha hızlı bulacak 🟩🟨⬜\n${adres}`;
}

function rozetBildirimi() {
  const yeniler = (oyun?.yeniRozetler ?? []).map((id) => ROZETLER.find((r) => r.id === id));
  return yeniler.map((r) => `
    <div class="rozet-bildirim">
      <span class="r-emoji">${r.emoji}</span>
      <div><b>Yeni rozet: ${r.ad}</b><span class="kucuk">${r.aciklama}</span></div>
    </div>`).join('');
}

function sonucPenceresi(baslik) {
  if (!el.perde.hidden) return;
  const m = oyun.mod;
  const ist = kayit.istatistik[m];
  const cevap = [...oyun.cevap];
  const metin = paylasimMetni({
    baslik: m === 'gunluk' ? `${Y.UYGULAMA_ADI} #${oyun.gunNo}${oyun.zor ? '*' : ''}` : `${Y.UYGULAMA_ADI} Sınırsız (${oyun.n} harf)`,
    tahminler: oyun.tahminler,
    cevap: oyun.cevap,
    kazandi: oyun.kazandi,
    ipucu: oyun.ipuclari.length,
  }) + (Y.WEB_ADRESI ? `\n${Y.WEB_ADRESI}` : '');

  const altKisim = m === 'gunluk'
    ? `<h3>Sıradaki kelime</h3><div class="geri-sayim"><b id="geriSayim">--:--:--</b></div>
       <div class="btn-satir">
         <button class="ikincil" data-eylem="sinirsizaGec">Sınırsız oyna</button>
         <button class="birincil" data-eylem="paylas" data-metin="${encodeURIComponent(metin)}">Paylaş</button>
       </div>`
    : `<div class="btn-satir">
         <button class="ikincil" data-eylem="paylas" data-metin="${encodeURIComponent(metin)}">Paylaş</button>
         <button class="birincil" data-eylem="yeniKelime">Yeni kelime ➜</button>
       </div>`;

  pencereAc(`
    <div class="sonuc-ust">
      <div class="sonuc-emoji">${oyun.kazandi ? baslik.split(' ').pop() : '😔'}</div>
      <h2 class="sonuc-baslik" id="pencereBaslik">${oyun.kazandi ? baslik.split(' ').slice(0, -1).join(' ') : 'Olmadı bu sefer'}</h2>
      <div class="cevap-kutu">${cevap.map((h, i) => `<div class="kare" style="--gecikme:${i * 0.08}s"><span class="harf">${buyuk(h)}</span></div>`).join('')}</div>
      <div><button class="tdk" data-eylem="anlam">📖 Anlamına bak</button></div>
    </div>
    ${rozetBildirimi()}
    <h3>${m === 'gunluk' ? 'Günün Kelimesi' : 'Sınırsız'} istatistiği</h3>
    ${sayilarHtml(ist, m)}
    ${altKisim}`, {
    kapaninca: () => puanSorUygunsa(),
  });
  if (m === 'gunluk') geriSayimBaslat();
}

function puanSorUygunsa() {
  if (kayit.puanSoruldu || !cihaz.yerelMi() || !oyun.kazandi || kayit.toplamKazanilan < PUAN_SORMA_KAZANCI) return;
  setTimeout(() => pencereAc(`
    <div class="sonuc-ust">
      <div class="sonuc-emoji">😍</div>
      <h2 class="sonuc-baslik" id="pencereBaslik">${Y.UYGULAMA_ADI}'yi sevdin mi?</h2>
      <p class="kucuk">${kayit.toplamKazanilan} kelime buldun! Birkaç saniyeni ayırıp puan verirsen çok mutlu oluruz. ⭐</p>
    </div>
    <div class="btn-satir">
      <button class="ikincil" data-eylem="puanHayir">Sonra</button>
      <button class="birincil" data-eylem="puanEvet">⭐ Puan ver</button>
    </div>`, { kapaninca: () => { kayit.puanSoruldu = true; kaydet(); } }), 500);
}

function sayilarHtml(ist, m) {
  if (m === 'zaman') {
    return `<div class="sayilar uc">
      <div class="sayi"><b>${ist.enIyi}</b><span>Rekor</span></div>
      <div class="sayi"><b>${ist.oynanan}</b><span>Oyun</span></div>
      <div class="sayi"><b>${ist.toplam}</b><span>Toplam kelime</span></div>
    </div>`;
  }
  const yuzde = ist.oynanan ? Math.round((ist.kazanilan / ist.oynanan) * 100) : 0;
  const seri = m === 'gunluk' ? guncelSeri(ist, gunNumarasi()) : ist.seri;
  return `<div class="sayilar">
    <div class="sayi"><b>${ist.oynanan}</b><span>Oyun</span></div>
    <div class="sayi"><b>${yuzde}</b><span>Kazanma %</span></div>
    <div class="sayi"><b>${seri}</b><span>Seri</span></div>
    <div class="sayi"><b>${ist.enIyiSeri}</b><span>En iyi seri</span></div>
  </div>`;
}

function dagilimHtml(ist, m) {
  if (m === 'zaman') return '';
  const enFazla = Math.max(1, ...ist.dagilim);
  const sonMu = (i) => oyun?.mod === m && oyun.bitti && oyun.kazandi && oyun.tahminler.length - 1 === i;
  const satirlar = ist.dagilim.map((adet, i) => {
    if (i === HAK && !adet) return '';
    return `<div class="dagilim-satir"><span>${i === HAK ? '+1' : i + 1}</span>
      <div class="cubuk${sonMu(i) ? ' son' : ''}" style="--oran:${(adet / enFazla) * 100}%;animation-delay:${i * 0.05}s">${adet}</div></div>`;
  }).join('');
  return `<h3>Tahmin dağılımı</h3><div class="dagilim">${satirlar}</div>`;
}

function istatistikPenceresi(sekme = mod) {
  const ist = kayit.istatistik[sekme];
  const sekmeler = [['gunluk', 'Günlük'], ['sinirsiz', 'Sınırsız'], ['zaman', 'Zamana Karşı']]
    .map(([k, ad]) => `<button role="tab" aria-selected="${k === sekme}" data-eylem="istatistikSekme" data-sekme="${k}">${ad}</button>`).join('');
  const gunlukBitti = kayit.gunluk?.gunNo === gunNumarasi() && kayit.gunluk.bitti;
  pencereAc(`
    <h2 id="pencereBaslik">İstatistikler</h2>
    <div class="sekmeler" role="tablist">${sekmeler}</div>
    ${sayilarHtml(ist, sekme)}
    ${dagilimHtml(ist, sekme)}
    ${sekme === 'gunluk' && gunlukBitti ? '<h3>Sıradaki kelime</h3><div class="geri-sayim"><b id="geriSayim">--:--:--</b></div>' : ''}
    <p class="kucuk" style="margin-top:18px;text-align:center">Toplam bulunan kelime: <b>${kayit.toplamKazanilan}</b></p>`);
  if (sekme === 'gunluk' && gunlukBitti) geriSayimBaslat();
}

let geriSayimZamanlayici = null;
function geriSayimBaslat() {
  clearInterval(geriSayimZamanlayici);
  const yaz = () => {
    const hedef = $('#geriSayim');
    if (!hedef) return clearInterval(geriSayimZamanlayici);
    const simdi = new Date();
    const yarin = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 1);
    const fark = Math.max(0, Math.floor((yarin - simdi) / 1000));
    const p = (x) => String(x).padStart(2, '0');
    hedef.textContent = `${p(Math.floor(fark / 3600))}:${p(Math.floor((fark % 3600) / 60))}:${p(fark % 60)}`;
    if (fark === 0) gunDegistiMi();
  };
  yaz();
  geriSayimZamanlayici = setInterval(yaz, 1000);
}

function ornekSatir(kelime, durumlar) {
  return `<div class="ornek">${[...kelime].map((h, i) => `<div class="kare aninda" ${durumlar[i] ? `data-durum="${durumlar[i]}"` : ''}><span class="harf">${buyuk(h)}</span></div>`).join('')}</div>`;
}

function yardimPenceresi() {
  pencereAc(`
    <h2 id="pencereBaslik">Nasıl oynanır?</h2>
    <p>Gizli kelimeyi <b>6 tahminde</b> bul. Her tahmin sözlükte olan bir kelime olmalı. Tahminden sonra kartların rengi ne kadar yaklaştığını gösterir.</p>
    ${ornekSatir('kalem', ['dogru'])}
    <p class="kucuk"><b>K</b> kelimede var ve yeri doğru.</p>
    ${ornekSatir('sabah', [null, null, 'var'])}
    <p class="kucuk"><b>B</b> kelimede var ama başka yerde.</p>
    ${ornekSatir('duvar', [null, null, null, null, 'yok'])}
    <p class="kucuk"><b>R</b> kelimede hiç yok.</p>
    <h3>Oyun modları</h3>
    <p><b>📅 Günün Kelimesi:</b> Herkes için aynı kelime, her gece yarısı yenilenir. Serini koru, sonucunu paylaş.</p>
    <p><b>♾️ Sınırsız:</b> 4, 5 veya 6 harfli kelimelerle istediğin kadar oyna.</p>
    <p><b>⏱️ Zamana Karşı:</b> 2 dakikada bulabildiğin kadar kelime bul. Her doğru kelime +10 saniye kazandırır.</p>
    <h3>İpuçları</h3>
    <p class="kucuk">Takıldığında 💡 <b>İpucu</b> ile bir harfi açabilirsin (kelime başına 2 kez). Son tahminini de kaçırırsan bir hak daha alabilirsin.</p>
    <p class="kucuk"><b>Zor mod</b> (Ayarlar): Bulduğun harfleri sonraki tahminlerde kullanmak zorunda kalırsın.</p>
    <div class="btn-satir tek"><button class="birincil" data-eylem="pes">Hadi başlayalım!</button></div>`, {
    kapaninca: () => {
      if (!kayit.yardimGoruldu) {
        kayit.yardimGoruldu = true;
        kaydet();
      }
    },
  });
}

function rozetNoktasi() {
  $('#rozetNokta').hidden = kayit.rozetGoruldu;
}

function rozetlerPenceresi() {
  const sayi = ROZETLER.filter((r) => kayit.rozetler[r.id]).length;
  const izgara = ROZETLER.map((r) => {
    const tarih = kayit.rozetler[r.id];
    return `<div class="rozet${tarih ? '' : ' kilitli'}">
      <span class="r-emoji">${r.emoji}</span><b>${r.ad}</b><span>${r.aciklama}</span></div>`;
  }).join('');
  pencereAc(`
    <h2 id="pencereBaslik">Rozetler</h2>
    <p class="kucuk">${sayi} / ${ROZETLER.length} rozet kazandın</p>
    <div class="ilerleme"><div style="width:${(sayi / ROZETLER.length) * 100}%"></div></div>
    <div class="rozet-izgara">${izgara}</div>`);
  kayit.rozetGoruldu = true;
  kaydet();
  rozetNoktasi();
}

// ---------------------------------------------------------------- Ayarlar

function anahtar(ad, deger) {
  return `<button class="anahtar" role="switch" aria-checked="${deger}" data-eylem="ayar:${ad}" aria-label="${ad}"></button>`;
}

function ayarlarPenceresi() {
  const a = kayit.ayarlar;
  const temalar = [['sistem', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']]
    .map(([k, ad]) => `<button aria-pressed="${a.tema === k}" data-eylem="ayar:tema" data-deger="${k}">${ad}</button>`).join('');
  const saatler = [9, 12, 18, 20, 22]
    .map((s) => `<button aria-pressed="${a.bildirimSaati === s}" data-eylem="ayar:bildirimSaati" data-deger="${s}">${s}.00</button>`).join('');
  const bildirimVar = cihaz.yerelMi();
  pencereAc(`
    <h2 id="pencereBaslik">Ayarlar</h2>
    <div class="ayar"><div><b>Tema</b></div><div class="secenekler">${temalar}</div></div>
    <div class="ayar"><div><b>Zor mod</b><span>Bulunan harfler sonraki tahminlerde kullanılmalı${oyun?.tahminler.length && !oyun.bitti ? '. Sonraki kelimeden itibaren geçerli.' : ''}</span></div>${anahtar('zor', a.zor)}</div>
    <div class="ayar"><div><b>Yüksek kontrast</b><span>Renk körlüğüne uygun renkler</span></div>${anahtar('yuksekKontrast', a.yuksekKontrast)}</div>
    <div class="ayar"><div><b>Ses efektleri</b></div>${anahtar('ses', a.ses)}</div>
    <div class="ayar"><div><b>Müzik</b><span>Sakin arka plan müziği</span></div>${anahtar('muzik', a.muzik)}</div>
    <div class="ayar"><div><b>Titreşim</b></div>${anahtar('titresim', a.titresim)}</div>
    ${bildirimVar ? `
    <div class="ayar"><div><b>Günlük hatırlatma</b><span>Günün kelimesi ve serin için bildirim</span></div>${anahtar('bildirim', a.bildirim)}</div>
    ${a.bildirim ? `<div class="ayar"><div><b>Hatırlatma saati</b></div><div class="secenekler">${saatler}</div></div>` : ''}` : ''}
    <h3>Diğer</h3>
    <div class="btn-satir">
      <button class="ikincil" data-eylem="davet">📤 Arkadaşını davet et</button>
      <button class="ikincil" data-eylem="puan">⭐ Puan ver</button>
    </div>
    <div class="baglantilar">
      <button data-eylem="yardim">Nasıl oynanır</button>
      <button data-eylem="gizlilik">Gizlilik politikası</button>
      ${Y.ILETISIM_EPOSTA ? '<button data-eylem="iletisim">Geri bildirim gönder</button>' : ''}
      <button data-eylem="sifirla">İlerlemeyi sıfırla</button>
    </div>
    <p class="kucuk" style="margin-top:18px">${Y.UYGULAMA_ADI} ${Y.SURUM}</p>`);
}

async function ayarDegistir(ad, b) {
  const a = kayit.ayarlar;
  if (ad === 'tema') a.tema = b.dataset.deger;
  else if (ad === 'bildirimSaati') a.bildirimSaati = Number(b.dataset.deger);
  else if (ad === 'bildirim' && !a.bildirim) {
    const izin = await cihaz.bildirimIzniIste();
    if (!izin) return tost('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');
    a.bildirim = true;
  } else a[ad] = !a[ad];

  if (ad === 'zor' && oyun && !oyun.tahminler.length && !oyun.bitti && mod !== 'zaman') {
    oyun.zor = a.zor;
    bilgiGuncelle();
  }
  if (ad === 'muzik' || ad === 'ses') kilidiAc();
  kaydet();
  ayarlariUygula();
  if (ad.startsWith('bildirim')) hatirlatmalariYenile();
  const kaydirma = el.perde.querySelector('.pencere').scrollTop;
  ayarlarPenceresi();
  el.perde.querySelector('.pencere').scrollTop = kaydirma;
}

function gizlilikAc() {
  if (Y.GIZLILIK_ADRESI) cihaz.baglantiAc(Y.GIZLILIK_ADRESI);
  else if (cihaz.yerelMi()) cihaz.baglantiAc(new URL('gizlilik.html', location.href).href);
  else window.open('gizlilik.html', '_blank', 'noopener');
}

function sifirlaSor() {
  pencereAc(`
    <h2 id="pencereBaslik">Emin misin?</h2>
    <p>Tüm istatistiklerin, serin ve rozetlerin silinecek. Bu işlem geri alınamaz.</p>
    <div class="btn-satir">
      <button class="ikincil" data-eylem="pes">Vazgeç</button>
      <button class="birincil" style="background:#e5484d;box-shadow:none" data-eylem="sifirlaOnay">Sıfırla</button>
    </div>`);
}

function sifirla() {
  try { localStorage.removeItem('kelimece:v1'); } catch { /* yok say */ }
  location.reload();
}

// ---------------------------------------------------------------- Bildirimler ve gün değişimi

function hatirlatmalariYenile() {
  const no = gunNumarasi();
  cihaz.hatirlatmalariKur({
    acik: kayit.ayarlar.bildirim,
    saat: kayit.ayarlar.bildirimSaati,
    bugunOynandi: kayit.gunluk?.gunNo === no && kayit.gunluk.bitti,
    seri: guncelSeri(kayit.istatistik.gunluk, no),
  });
}

function gunDegistiMi() {
  if (mod === 'gunluk' && oyun?.gunNo !== gunNumarasi() && !kilit) {
    pencereKapat({ cagir: false });
    modAc('gunluk', { sessiz: true });
    tost('Yeni günün kelimesi hazır! 🎉', { sure: 2000 });
  }
}
document.addEventListener('visibilitychange', () => !document.hidden && gunDegistiMi());

// ---------------------------------------------------------------- Bildirim balonları

function tost(mesaj, { buyuk: iri = false, sure = 1400 } = {}) {
  const t = document.createElement('div');
  t.className = 'tost' + (iri ? ' buyuk' : '');
  t.textContent = mesaj;
  el.tostlar.prepend(t);
  while (el.tostlar.children.length > 3) el.tostlar.lastChild.remove();
  setTimeout(() => {
    t.classList.add('git');
    setTimeout(() => t.remove(), 300);
  }, sure);
}

// ---------------------------------------------------------------- Başlangıç

function yeniSinirsiz() {
  reklam.oyunBitti(kayit.biten);
  oyun = sinirsizOyun(true);
  yazilan = '';
  kaydet();
  ekraniKur();
  ses.ac();
}

function baglantilariKur() {
  document.querySelectorAll('.modlar [data-mod]').forEach((b) => b.addEventListener('click', () => b.dataset.mod !== mod && modAc(b.dataset.mod)));
  el.uzunluklar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    const n = Number(b.dataset.n);
    if (n === kayit.ayarlar.uzunluk) return;
    kayit.ayarlar.uzunluk = n;
    kaydet();
    if (mod === 'sinirsiz') modAc('sinirsiz');
    else {
      oyun = yeniKayit('zaman', n, '', { bos: true });
      ekraniKur();
      ses.ac();
    }
  });
  el.ipucu.addEventListener('click', ipucuAl);
  el.yeni.addEventListener('click', yeniSinirsiz);
  $('#btnZamanBasla').addEventListener('click', zamanBaslat);
  $('#btnYardim').addEventListener('click', () => { ses.ac(); yardimPenceresi(); });
  $('#btnIstatistik').addEventListener('click', () => { ses.ac(); istatistikPenceresi(); });
  $('#btnAyarlar').addEventListener('click', () => { ses.ac(); ayarlarPenceresi(); });
  $('#btnRozetler').addEventListener('click', () => { ses.ac(); rozetlerPenceresi(); });
  document.addEventListener('pointerdown', kilidiAc, { once: true });

  cihaz.geriTusu(() => {
    if (!el.perde.hidden) pencereKapat();
    else if (zaman?.aktif) modAc('gunluk');
    else cihaz.uygulamadanCik();
  });
}

function logoAnimasyonu() {
  const logo = $('#logo');
  [...logo.children].forEach((s, i) => s.style.setProperty('--i', i));
  logo.classList.add('acilis');
}

function basla() {
  kayit.acilis++;
  ayarlariUygula();
  klavyeCiz();
  baglantilariKur();
  logoAnimasyonu();
  rozetNoktasi();
  modAc('gunluk', { sessiz: true });
  cihaz.acilisEkraniniKapat();
  if (!kayit.yardimGoruldu) setTimeout(yardimPenceresi, 700);
  else if (oyun.bitti) setTimeout(() => sonucPenceresi(oyun.kazandi ? sec(TEBRIK[Math.min(oyun.tahminler.length, HAK + 1) - 1]) : ''), 600);
  reklam.baslat();
  hatirlatmalariYenile();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !cihaz.yerelMi()) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

basla();
