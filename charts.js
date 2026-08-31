/* =========================================================
   Viz — petite boîte à outils de graphiques SVG (sans dépendance)
   Une série par graphique : pas de légende, le titre nomme la mesure.
   Palette validée pour la surface sombre #171c24 (bande de clarté,
   plancher de chroma, séparation daltonisme, contraste).
   ========================================================= */
const Viz = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  const COL = {
    surface: '#141417',
    grid:    '#26262c',
    ink:     '#ffffff',
    muted:   '#8b8b95',
    e1rm:    '#3987e5',  // slot 1 — bleu
    volume:  '#d95926',  // slot 2 — orange
    rpe:     '#199e70',  // slot 3 — aqua
  };

  const el = (n, a = {}) => {
    const e = document.createElementNS(NS, n);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  };
  const fmtJour = t => new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const fmtLong = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  // Graduations « rondes » (0, 50, 100…) plutôt que les valeurs brutes
  function ticks(min, max, n = 4) {
    if (!(max > min)) { min = Math.max(0, min - 1); max = max + 1; }
    const brut = (max - min) / n;
    const mag = 10 ** Math.floor(Math.log10(brut));
    const norm = brut / mag;
    const pas = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const lo = Math.floor(min / pas) * pas, hi = Math.ceil(max / pas) * pas;
    const t = [];
    for (let v = lo; v <= hi + pas / 1000; v += pas) t.push(Math.round(v * 1e6) / 1e6);
    return { t, lo, hi };
  }

  /**
   * host   : élément conteneur (position:relative)
   * o.type : 'line' | 'bar'
   * o.data : [{ t: horodatage, v: valeur, info: [[label, valeur affichée], …] }]
   * o.color, o.fmt (valeur → texte), o.domaine ([min,max] forcé), o.titre
   */
  function chart(host, o) {
    const data = (o.data || []).filter(d => d.v != null && isFinite(d.v));
    host.innerHTML = '';
    host.classList.add('viz');
    if (!data.length) {
      const p = document.createElement('p');
      p.className = 'viz-vide';
      p.textContent = o.vide || 'Pas encore de données pour cet exercice.';
      host.appendChild(p);
      return;
    }

    const fmt = v => String((o.fmt || Math.round)(v));   // toujours une chaîne : sert aussi à mesurer les graduations
    const W = Math.max(260, host.clientWidth || 320);
    const H = 188, pad = { l: 42, r: 14, t: 12, b: 26 };
    const vals = data.map(d => d.v);
    let vmin, vmax;
    if (o.domaine) { [vmin, vmax] = o.domaine; }
    else if (o.type === 'bar') { vmin = 0; vmax = Math.max(...vals); }
    else {
      const lo = Math.min(...vals), hi = Math.max(...vals), marge = (hi - lo || hi || 1) * 0.15;
      vmin = Math.max(0, lo - marge); vmax = hi + marge;
    }
    const g = ticks(vmin, vmax, 4);
    if (!o.domaine) { vmin = o.type === 'bar' ? 0 : g.lo; vmax = g.hi; }
    const large = Math.max(...g.t.map(v => fmt(v).length));
    pad.l = Math.max(30, Math.min(64, large * 6.6 + 12));
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const y = v => pad.t + ih - (v - vmin) / (vmax - vmin || 1) * ih;

    const t0 = data[0].t, t1 = data[data.length - 1].t;
    const bande = iw / data.length;                       // graphiques en barres : positions par bande
    const x = (d, i) => o.type === 'bar'
      ? pad.l + bande * (i + 0.5)
      : (t1 === t0 ? pad.l + iw / 2 : pad.l + (d.t - t0) / (t1 - t0) * iw);

    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'viz-svg' });

    // --- grille + axe des ordonnées (filets pleins, discrets)
    for (const v of g.t) {
      if (v < vmin - 1e-9 || v > vmax + 1e-9) continue;
      svg.appendChild(el('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: COL.grid, 'stroke-width': 1 }));
      const tx = el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'viz-tick' });
      tx.textContent = fmt(v);
      svg.appendChild(tx);
    }

    // --- marques
    const cs = [];   // positions, pour le survol
    if (o.type === 'bar') {
      const bw = Math.min(24, Math.max(6, bande - 8));    // ≤ 24 px, et au moins 2 px d'écart entre voisines
      data.forEach((d, i) => {
        const cx = x(d, i), h = Math.max(1, pad.t + ih - y(d.v)), r = Math.min(4, bw / 2, h);
        const yy = y(d.v);
        const barre = el('path', {
          d: `M${cx - bw / 2} ${pad.t + ih} L${cx - bw / 2} ${yy + r} Q${cx - bw / 2} ${yy} ${cx - bw / 2 + r} ${yy}
              L${cx + bw / 2 - r} ${yy} Q${cx + bw / 2} ${yy} ${cx + bw / 2} ${yy + r} L${cx + bw / 2} ${pad.t + ih} Z`,
          fill: o.color, class: 'viz-bar',
        });
        svg.appendChild(barre);
        cs.push({ cx, cy: yy, d, mark: barre });
      });
    } else {
      const pts = data.map((d, i) => `${x(d, i)},${y(d.v)}`).join(' ');
      if (data.length > 1) {
        svg.appendChild(el('polyline', {
          points: pts, fill: 'none', stroke: o.color, 'stroke-width': 2,
          'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        }));
      }
      data.forEach((d, i) => {
        const cx = x(d, i), cy = y(d.v);
        svg.appendChild(el('circle', {
          cx, cy, r: 4, fill: o.color, stroke: COL.surface, 'stroke-width': 2,
        }));
        cs.push({ cx, cy, d });
      });
    }

    // --- étiquettes directes : dernier point, et le meilleur s'il est ailleurs
    const iDernier = data.length - 1;
    const iMax = vals.indexOf(Math.max(...vals));
    const marque = new Set([iDernier, iMax]);
    for (const i of marque) {
      if (o.type === 'bar' && bande < 34) continue;
      const c = cs[i];
      const t = el('text', {
        x: c.cx, y: Math.max(pad.t + 9, c.cy - 10), 'text-anchor': i === iDernier && data.length > 1 ? 'end' : 'middle',
        class: 'viz-label',
      });
      if (i === iDernier && data.length > 1) t.setAttribute('x', Math.min(W - pad.r, c.cx + 4));
      t.textContent = fmt(c.d.v);
      svg.appendChild(t);
    }

    // --- axe des abscisses : première, dernière et une ou deux dates intermédiaires
    const idx = new Set([0, data.length - 1]);
    if (data.length > 3) { idx.add(Math.round((data.length - 1) / 3)); idx.add(Math.round(2 * (data.length - 1) / 3)); }
    for (const i of idx) {
      const c = cs[i];
      const t = el('text', {
        x: clampX(c.cx, W, pad), y: H - 8, class: 'viz-tick',
        'text-anchor': i === 0 ? 'start' : (i === data.length - 1 ? 'end' : 'middle'),
      });
      t.textContent = fmtJour(c.d.t);
      svg.appendChild(t);
    }

    // --- couche de survol : viseur + infobulle
    const viseur = el('line', { y1: pad.t, y2: pad.t + ih, stroke: COL.muted, 'stroke-width': 1, class: 'viz-cross', opacity: 0 });
    svg.appendChild(viseur);
    const halo = el('circle', { r: 7, fill: 'none', stroke: o.color, 'stroke-width': 2, opacity: 0 });
    svg.appendChild(halo);
    host.appendChild(svg);

    const tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.hidden = true;
    host.appendChild(tip);

    host.tabIndex = 0;
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label',
      `${o.titre || 'Graphique'} : ${data.length} points, de ${fmt(data[0].v)} le ${fmtLong(data[0].t)} à ${fmt(data[iDernier].v)} le ${fmtLong(data[iDernier].t)}.`);

    let actif = -1;
    function montrer(i) {
      if (i < 0 || i >= cs.length) return;
      actif = i;
      const c = cs[i];
      if (o.type === 'bar') {
        cs.forEach(k => k.mark.classList.toggle('on', k === c));
      } else {
        viseur.setAttribute('x1', c.cx); viseur.setAttribute('x2', c.cx); viseur.setAttribute('opacity', 1);
        halo.setAttribute('cx', c.cx); halo.setAttribute('cy', c.cy); halo.setAttribute('opacity', 1);
      }
      tip.innerHTML = '';
      const dt = document.createElement('div');
      dt.className = 'viz-tip-date';
      dt.textContent = fmtLong(c.d.t);
      tip.appendChild(dt);
      for (const [lab, val] of (c.d.info || [['Valeur', fmt(c.d.v)]])) {
        const l = document.createElement('div');
        l.className = 'viz-tip-l';
        const k = document.createElement('span'); k.className = 'viz-key'; k.style.background = o.color;
        const v = document.createElement('b'); v.textContent = String(val);      // données utilisateur : jamais d'innerHTML
        const n = document.createElement('span'); n.className = 'viz-tip-n'; n.textContent = String(lab);
        l.append(k, v, n);
        tip.appendChild(l);
      }
      tip.hidden = false;
      const tw = tip.offsetWidth || 150, th = tip.offsetHeight || 70;
      tip.style.left = Math.max(0, Math.min(W - tw, c.cx - tw / 2)) + 'px';
      tip.style.top = (c.cy - th - 14 < 0 ? Math.min(H - th, c.cy + 14) : c.cy - th - 14) + 'px';
    }
    function cacher() {
      actif = -1; tip.hidden = true;
      viseur.setAttribute('opacity', 0); halo.setAttribute('opacity', 0);
      cs.forEach(k => k.mark && k.mark.classList.remove('on'));
    }
    const plusProche = px => {
      let best = 0, dm = Infinity;
      cs.forEach((c, i) => { const d = Math.abs(c.cx - px); if (d < dm) { dm = d; best = i; } });
      return best;
    };
    const surPointeur = ev => {
      const r = svg.getBoundingClientRect();
      montrer(plusProche(ev.clientX - r.left));
    };
    svg.addEventListener('pointermove', surPointeur);
    svg.addEventListener('pointerdown', surPointeur);
    svg.addEventListener('pointerleave', cacher);
    host.addEventListener('blur', cacher);
    host.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowRight') { montrer(actif < 0 ? 0 : Math.min(cs.length - 1, actif + 1)); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { montrer(actif < 0 ? cs.length - 1 : Math.max(0, actif - 1)); ev.preventDefault(); }
      else if (ev.key === 'Escape') cacher();
    });
    host.addEventListener('focus', () => { if (actif < 0) montrer(cs.length - 1); });

    // Re-rendu à la rotation / au redimensionnement
    if (!host._ro && window.ResizeObserver) {
      let w = W;
      host._ro = new ResizeObserver(() => {
        if (Math.abs(host.clientWidth - w) > 4) { w = host.clientWidth; chart(host, o); }
      });
      host._ro.observe(host);
    }
  }

  const clampX = (cx, W, pad) => Math.max(pad.l - 20, Math.min(W - 4, cx));

  return { chart, COL, fmtJour, fmtLong };
})();
