import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, '../../uploads/certificats');

function ensureCertDir() {
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
}

function certFilename() {
  return path.join(CERT_DIR, `certificat_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.pdf`);
}

function nettoyerTexte(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function ajusterTaille(doc, texte, police, tailleDepart, largeurMax, tailleMin) {
  let taille = tailleDepart;
  doc.font(police);
  while (taille > tailleMin) {
    doc.fontSize(taille);
    if (doc.widthOfString(texte) <= largeurMax) break;
    taille -= 1;
  }
  return taille;
}

function couperTexte(doc, texte, largeurMax, police, taille) {
  const propre = nettoyerTexte(texte);
  doc.font(police).fontSize(taille);
  if (doc.widthOfString(propre) <= largeurMax) return propre;
  let resultat = propre;
  while (resultat.length > 0 && doc.widthOfString(`${resultat}...`) > largeurMax)
    resultat = resultat.slice(0, -1).trim();
  return resultat ? `${resultat}...` : '';
}

export function generateCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    const { prenom, nom, nomComplet, domaine, dateDebut, dateFin, formationTitre, numeroCertificat } = data;
    ensureCertDir();
    const filepath = certFilename();
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const W = 841.89, H = 595.28;
    const VIOLET = '#2D1B69', GRIS = '#4A4A6A', GRIS2 = '#8888AA';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const dateEmission = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.rect(0, 0, W, H).fill('#ffffff');
    doc.rect(12, 12, W - 24, H - 24).lineWidth(18).stroke(VIOLET);
    doc.rect(28, 28, W - 56, H - 56).lineWidth(2).stroke(VIOLET);

    const cs = 38;
    [[0, 0], [W - cs, 0], [0, H - cs], [W - cs, H - cs]].forEach(([x, y]) =>
      doc.rect(x, y, cs, cs).fill(VIOLET)
    );
    doc.circle(0, H / 2, 28).fill(VIOLET);
    doc.circle(W, H / 2, 28).fill(VIOLET);

    const lx = 62, ly = H - 82;
    doc.moveTo(lx, ly - 10).lineTo(lx + 10, ly + 10).lineTo(lx + 20, ly - 2)
      .lineTo(lx + 30, ly + 10).lineTo(lx + 40, ly - 10).lineWidth(2).stroke(VIOLET);
    doc.font('Helvetica-Bold').fontSize(13).fill(VIOLET).text('SheTech', lx + 48, ly - 8, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(28).fill(VIOLET).text('CERTIFICAT DE FORMATION', 0, H - 108, { align: 'center', lineBreak: false });
    doc.moveTo(W / 2 - 180, H - 116).lineTo(W / 2 + 180, H - 116).lineWidth(1).stroke(VIOLET);
    doc.font('Helvetica').fontSize(13).fill(GRIS).text('Attribué avec fierté à', 62, H - 152, { lineBreak: false });

    const fullName = nettoyerTexte(nomComplet || `${prenom} ${nom}`);
    const largeurTexte = W - 124;
    const tailleNom = ajusterTaille(doc, fullName, 'Helvetica-Bold', 34, largeurTexte, 20);
    doc.font('Helvetica-Bold').fontSize(tailleNom).fill(VIOLET).text(fullName, 62, H - 196, { width: largeurTexte, lineBreak: false });
    const nameW = Math.min(doc.widthOfString(fullName), largeurTexte);
    doc.moveTo(62, H - 204).lineTo(62 + nameW, H - 204).lineWidth(1.5).stroke(VIOLET);

    const parcours = couperTexte(doc, `Pour la validation du parcours "${formationTitre || domaine}"`, largeurTexte, 'Helvetica', 12);
    doc.font('Helvetica').fontSize(12).fill(GRIS).text(parcours, 62, H - 242, { width: largeurTexte, lineBreak: false });
    doc.text(`dans le domaine "${domaine}". Formation complétée avec succès sur la plateforme SheTech.`, 62, H - 258, { lineBreak: false });

    const basY = 72;
    doc.moveTo(62, basY + 30).lineTo(185, basY + 30).lineWidth(1).stroke(VIOLET);
    doc.font('Helvetica-Bold').fontSize(11).fill(VIOLET).text('Directrice SheTech', 62, basY + 14, { lineBreak: false });
    doc.font('Helvetica').fontSize(10).fill(GRIS2).text('Responsable Académique', 62, basY + 2, { lineBreak: false });

    const cx = W / 2;
    doc.font('Helvetica-Bold').fontSize(12).fill(GRIS).text(dateEmission, cx - 80, basY + 34, { width: 160, align: 'center', lineBreak: false });
    doc.moveTo(cx - 70, basY + 30).lineTo(cx + 70, basY + 30).lineWidth(1).stroke(VIOLET);
    doc.font('Helvetica').fontSize(10).fill(GRIS2).text(`Du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`, cx - 90, basY + 14, { width: 180, align: 'center', lineBreak: false });

    const code = numeroCertificat || 'SHT-' + crypto.createHash('md5').update(`${prenom}${nom}${domaine}`).digest('hex').substr(0, 8).toUpperCase() + '-2025';
    doc.font('Helvetica-Bold').fontSize(10).fill(VIOLET).text(code, cx - 80, basY + 2, { width: 160, align: 'center', lineBreak: false });

    const rx = W - 62;
    doc.moveTo(rx - 130, basY + 30).lineTo(rx, basY + 30).lineWidth(1).stroke(VIOLET);
    doc.font('Helvetica-Bold').fontSize(11).fill(VIOLET).text('Expert SheTech', rx - 130, basY + 14, { width: 130, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fill(GRIS2).text(`Expert ${domaine}`, rx - 130, basY + 2, { width: 130, align: 'right', lineBreak: false });

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

export function generateClassicCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    const { prenom, nom, nomComplet, domaine, dateDebut, dateFin, formationTitre, numeroCertificat,
      titrePrincipal = 'CERTIFICAT', sousTitre = "D ACCOMPLISSEMENT",
      mention = 'pour avoir complete avec succes la formation' } = data;
    ensureCertDir();
    const filepath = certFilename();
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const W = 841.89, H = 595.28;
    const BORDEAUX = '#5B2138', BORDEAUX2 = '#78304B', ROSE = '#FFF9FB';
    const ROSE_TRAIT = '#C45C7A', ROSE_CLAIR = '#E9C7D2', OR = '#D9A441';
    const TEXTE = '#26151D', GRIS = '#7A6671';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const dateEmission = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const code = numeroCertificat || 'SHT-' + crypto.createHash('md5').update(`${prenom}${nom}${domaine}`).digest('hex').substr(0, 8).toUpperCase();
    const largeurTexte = W - 160;
    const fullName = nettoyerTexte(nomComplet || `${prenom} ${nom}`);
    const formation = nettoyerTexte(formationTitre || domaine);
    const domaineCourt = nettoyerTexte(domaine);

    const texteCentre = (texte, y, taille, couleur, police = 'Helvetica', largeur = W - 160) => {
      doc.font(police).fontSize(taille).fill(couleur).text(texte, (W - largeur) / 2, y, { width: largeur, align: 'center', lineBreak: false });
    };

    doc.rect(0, 0, W, H).fill(ROSE);
    doc.rect(0, 0, W, 86).fill(BORDEAUX);
    doc.rect(0, H - 28, W, 28).fill(BORDEAUX);
    doc.moveTo(0, 86).lineTo(175, 86).lineTo(116, 0).lineTo(0, 0).closePath().fill(BORDEAUX2);
    doc.moveTo(W, H - 28).lineTo(W - 190, H - 28).lineTo(W - 120, H).lineTo(W, H).closePath().fill(BORDEAUX2);

    doc.roundedRect(34, 34, W - 68, H - 68, 18).lineWidth(2).stroke(ROSE_TRAIT);
    doc.roundedRect(48, 48, W - 96, H - 96, 12).lineWidth(1).stroke(ROSE_CLAIR);

    doc.font('Helvetica-Bold').fontSize(24).fill('#FFFFFF').text('SheTech', 64, 38, { lineBreak: false });
    doc.font('Helvetica').fontSize(10).fill('#F2D9E2').text("Plateforme d entrepreneuriat numerique feminin", 64, 56, { lineBreak: false });

    const tailleTitre = ajusterTaille(doc, titrePrincipal, 'Helvetica-Bold', 34, 460, 22);
    texteCentre(titrePrincipal, 137, tailleTitre, BORDEAUX, 'Helvetica-Bold', 460);
    texteCentre(sousTitre, 166, 13, GRIS, 'Helvetica', 330);
    doc.moveTo(W / 2 - 92, 186).lineTo(W / 2 + 92, 186).lineWidth(2).stroke(OR);

    texteCentre("Ce certificat est decerne a", 218, 14, GRIS, 'Helvetica', 360);
    const tailleNom = ajusterTaille(doc, fullName, 'Helvetica-Bold', 42, largeurTexte, 24);
    texteCentre(fullName, 268, tailleNom, TEXTE, 'Helvetica-Bold', largeurTexte);
    doc.moveTo(210, 303).lineTo(W - 210, 303).lineWidth(1.5).stroke(ROSE_CLAIR);

    texteCentre(mention, 335, 14, GRIS, 'Helvetica', 520);
    const formationAffichee = couperTexte(doc, formation, 520, 'Helvetica-Bold', 20);
    texteCentre(formationAffichee, 364, 20, ROSE_TRAIT, 'Helvetica-Bold', 520);
    const domaineAffiche = couperTexte(doc, `Domaine : ${domaineCourt}`, 520, 'Helvetica', 12);
    texteCentre(domaineAffiche, 392, 12, GRIS, 'Helvetica', 520);

    doc.roundedRect(126, 418, 590, 58, 8).fillAndStroke('#FFFFFF', ROSE_CLAIR);
    const periode = couperTexte(doc, `Du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`, 190, 'Helvetica', 11);
    const numero = couperTexte(doc, code, 170, 'Helvetica', 10);
    doc.font('Helvetica-Bold').fontSize(11).fill(BORDEAUX).text('PERIODE DE FORMATION', 140, 435, { width: 190, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(11).fill(GRIS).text(periode, 140, 454, { width: 190, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11).fill(BORDEAUX).text("DATE D EMISSION", 336, 435, { width: 170, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(11).fill(GRIS).text(dateEmission, 336, 454, { width: 170, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11).fill(BORDEAUX).text('NUMERO', 532, 435, { width: 160, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fill(GRIS).text(numero, 532, 454, { width: 160, align: 'center', lineBreak: false });

    doc.moveTo(112, 526).lineTo(276, 526).lineWidth(1).stroke(OR);
    doc.font('Helvetica-Bold').fontSize(11).fill(BORDEAUX).text('Direction SheTech', 112, 536, { width: 164, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fill(GRIS).text('Validation academique', 112, 550, { width: 164, align: 'center', lineBreak: false });

    doc.moveTo(W - 276, 526).lineTo(W - 112, 526).lineWidth(1).stroke(OR);
    doc.font('Helvetica-Bold').fontSize(11).fill(BORDEAUX).text('Equipe pedagogique', W - 276, 536, { width: 164, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fill(GRIS).text('Expertise SheTech', W - 276, 550, { width: 164, align: 'center', lineBreak: false });

    texteCentre('Le numerique au feminin', H - 18, 8, '#F2D9E2', 'Helvetica', 220);

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

// Grand Certificat de fin de parcours — même mise en page classique, intitulés dédiés
export function generateParcoursCertificatePDF(data) {
  return generateClassicCertificatePDF({
    ...data,
    titrePrincipal: 'GRAND CERTIFICAT',
    sousTitre: 'DE FIN DE PARCOURS',
    mention: 'pour avoir complete avec succes le parcours',
  });
}

export function generateModernCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    const { prenom, nom, domaine, dateDebut, dateFin, formationTitre, numeroCertificat } = data;
    ensureCertDir();
    const filepath = certFilename();
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const W = 841.89, H = 595.28;
    const blue = '#123E66', darkBlue = '#0B2845', gold = '#B89250';
    const ink = '#17314F', muted = '#756E68';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const dateEmission = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const code = numeroCertificat || `SHT-${Date.now()}`;
    const fullName = `${prenom} ${nom}`.trim();

    doc.rect(0, 0, W, H).fill('#D8D8D8');
    doc.rect(106, 74, W - 212, H - 148).fill('#0E3559');
    doc.rect(118, 86, W - 236, H - 172).fill(darkBlue);
    doc.rect(132, 100, W - 264, H - 200).fill('#FFFFFF');
    doc.rect(142, 110, W - 284, H - 220).lineWidth(1.2).stroke('#D9D1C7');

    for (let x = 150; x < W - 150; x += 54) {
      for (let y = 118; y < H - 118; y += 46) {
        doc.ellipse(x, y, 18, 7).lineWidth(0.4).stroke('#EEEAE4');
        doc.ellipse(x + 18, y + 16, 18, 7).lineWidth(0.4).stroke('#EEEAE4');
      }
    }

    const corner = (x, y, sx, sy) => {
      doc.save();
      doc.translate(x, y);
      doc.scale(sx, sy);
      doc.moveTo(0, 0).bezierCurveTo(18, 0, 18, 24, 2, 24).lineWidth(2).stroke(gold);
      doc.moveTo(8, 8).bezierCurveTo(34, 2, 36, 30, 12, 36).lineWidth(1.4).stroke(gold);
      doc.moveTo(20, 2).bezierCurveTo(44, 0, 50, 20, 28, 24).lineWidth(1.2).stroke(gold);
      doc.restore();
    };
    corner(150, 126, 1, 1);
    corner(W - 150, 126, -1, 1);
    corner(150, H - 126, 1, -1);
    corner(W - 150, H - 126, -1, -1);

    doc.font('Helvetica-Bold').fontSize(46).fill(ink).text('CERTIFICAT', 0, 134, { align: 'center' });
    doc.moveTo(W / 2 - 120, 196).lineTo(W / 2 + 120, 196).lineWidth(1).stroke(gold);
    doc.font('Helvetica-Bold').fontSize(18).fill(muted).text('DE RÉUSSITE', 0, 220, { align: 'center', characterSpacing: 2 });

    doc.font('Helvetica').fontSize(12).fill(muted).text('DÉCERNÉ À', 0, 266, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(39).fill(ink).text(fullName, 140, 292, { width: W - 280, align: 'center' });
    doc.moveTo(238, 344).lineTo(W - 238, 344).lineWidth(1).stroke('#D5CDC3');

    doc.font('Helvetica').fontSize(12).fill(muted).text('Pour avoir terminé avec succès la formation', 170, 366, { width: W - 340, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(16).fill(blue).text(formationTitre || domaine, 170, 386, { width: W - 340, align: 'center' });
    doc.font('Helvetica').fontSize(11).fill(muted).text(`Domaine : ${domaine}`, 170, 410, { width: W - 340, align: 'center' });

    doc.moveTo(174, 482).lineTo(310, 482).lineWidth(1).stroke('#C7BDB1');
    doc.font('Helvetica-Bold').fontSize(10).fill(muted).text('DATE', 174, 490, { width: 136, align: 'center' });
    doc.font('Helvetica').fontSize(9).fill(muted).text(dateEmission, 174, 505, { width: 136, align: 'center' });

    doc.moveTo(W - 310, 482).lineTo(W - 174, 482).lineWidth(1).stroke('#C7BDB1');
    doc.font('Helvetica-Bold').fontSize(10).fill(muted).text('SIGNATURE', W - 310, 490, { width: 136, align: 'center' });
    doc.font('Helvetica').fontSize(9).fill(muted).text('Direction SheTech', W - 310, 505, { width: 136, align: 'center' });

    doc.font('Helvetica').fontSize(8).fill('#8C837A')
      .text(`Période : du ${formatDate(dateDebut)} au ${formatDate(dateFin)}   |   N° ${code}`, 0, 535, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}
