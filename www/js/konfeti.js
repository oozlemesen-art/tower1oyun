// Kazanınca ekrana yağan konfeti. Hareket azaltma tercihi açıksa çalışmaz.

const RENKLER = ['#1f9d63', '#e0a512', '#2563eb', '#e5484d', '#8b5cf6', '#f97316'];

export function konfeti({ adet = 140, sure = 2600 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tuval = document.getElementById('konfeti');
  const c = tuval.getContext('2d');
  const oran = window.devicePixelRatio || 1;
  const w = (tuval.width = innerWidth * oran);
  const h = (tuval.height = innerHeight * oran);

  const parcalar = Array.from({ length: adet }, (_, i) => {
    const soldan = i % 2 === 0;
    return {
      x: soldan ? -10 * oran : w + 10 * oran,
      y: h * (0.55 + Math.random() * 0.25),
      vx: (soldan ? 1 : -1) * (6 + Math.random() * 10) * oran,
      vy: -(14 + Math.random() * 12) * oran,
      boy: (6 + Math.random() * 6) * oran,
      aci: Math.random() * Math.PI,
      donus: (Math.random() - 0.5) * 0.4,
      renk: RENKLER[i % RENKLER.length],
      sekil: Math.random() < 0.3 ? 'daire' : 'serit',
    };
  });

  const baslangic = performance.now();
  function kare(simdi) {
    const gecen = simdi - baslangic;
    c.clearRect(0, 0, w, h);
    c.globalAlpha = Math.max(0, 1 - Math.max(0, gecen - sure * 0.7) / (sure * 0.3));
    for (const p of parcalar) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.45 * oran;
      p.x += p.vx;
      p.y += p.vy;
      p.aci += p.donus;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.aci);
      c.fillStyle = p.renk;
      if (p.sekil === 'daire') {
        c.beginPath();
        c.arc(0, 0, p.boy / 2.4, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillRect(-p.boy / 2, -p.boy / 5, p.boy, p.boy / 2.5 * Math.abs(Math.cos(p.aci * 3)) + 1);
      }
      c.restore();
    }
    if (gecen < sure) requestAnimationFrame(kare);
    else c.clearRect(0, 0, w, h);
  }
  requestAnimationFrame(kare);
}
