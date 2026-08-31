/* =========================================================
   Fabrique une version en un seul fichier de GymRec.
     node build.mjs              → gymrec.html (page complète, à ouvrir n'importe où)
     node build.mjs --artifact   → écrit sur la sortie standard le corps seul,
                                   pour un hôte qui fournit déjà <html>/<head>/<body>
   ========================================================= */
import { readFileSync, writeFileSync } from 'node:fs';

const lire = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const artifact = process.argv.includes('--artifact');

let html = lire('./index.html');
const styles = lire('./styles.css');
const charts = lire('./charts.js');
const app = lire('./app.js')
  // le service worker n'a pas de fichier à charger dans une page autonome
  .replace(/\n\/\/ Mise en cache hors-ligne[\s\S]*$/, '\n');

const icone = 'data:image/svg+xml;base64,' + Buffer.from(lire('./icon.svg')).toString('base64');

// remplacement par fonction : dans une chaîne de remplacement, « $` » et « $& »
// sont des séquences spéciales, et le code inséré en contient
const injecter = (dans, motif, contenu) => dans.replace(motif, () => contenu);

html = injecter(html, '<link rel="stylesheet" href="styles.css">', `<style>\n${styles}\n</style>`);
html = injecter(html, '<link rel="manifest" href="manifest.webmanifest">', '');
html = injecter(html, '<link rel="icon" href="icon.svg" type="image/svg+xml">', `<link rel="icon" href="${icone}" type="image/svg+xml">`);
html = injecter(html, '<link rel="apple-touch-icon" href="apple-touch-icon.png">', `<link rel="apple-touch-icon" href="${icone}">`);
html = injecter(html, '<script src="charts.js"></script>', `<script>\n${charts}\n</script>`);
html = injecter(html, '<script src="app.js"></script>', `<script>\n${app}\n</script>`);

for (const reste of ['styles.css', 'charts.js', 'app.js']) {
  if (html.includes(`href="${reste}"`) || html.includes(`src="${reste}"`)) {
    throw new Error(`${reste} n'a pas été inliné : le gabarit index.html a changé`);
  }
}

if (artifact) {
  // l'hôte fournit la coquille : on ne garde que le titre, le style et le corps
  const titre = '<title>GymRec</title>';   // l'hôte nomme la page par son titre : le nom seul
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const corps = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  process.stdout.write(`${titre}\n${style}\n${corps}\n`);
} else {
  writeFileSync(new URL('./gymrec.html', import.meta.url), html);
  console.log(`gymrec.html écrit — ${(html.length / 1024).toFixed(0)} Ko, aucune dépendance`);
}
