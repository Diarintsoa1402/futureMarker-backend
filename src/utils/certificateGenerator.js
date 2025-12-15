// backend/src/utils/certificateGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Génère un certificat PDF pour une formation complétée
 */
exports.generateCertificate = async (enrollment, formation, woman) => {
  return new Promise((resolve, reject) => {
    try {
      // Créer le dossier certificates s'il n'existe pas
      const certificatesDir = path.join(__dirname, '../../public/certificates');
      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true });
      }

      const filename = `certificate_${enrollment.id}_${Date.now()}.pdf`;
      const filepath = path.join(certificatesDir, filename);
      
      // Créer le document PDF
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      // Stream vers le fichier
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // === DESIGN DU CERTIFICAT ===
      
      // Bordure décorative
      doc.lineWidth(3);
      doc.strokeColor('#4F46E5');
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();
      
      doc.lineWidth(1);
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();

      // Titre principal
      doc.fontSize(40)
         .fillColor('#4F46E5')
         .font('Helvetica-Bold')
         .text('CERTIFICAT DE RÉUSSITE', 0, 100, {
           align: 'center'
         });

      // Ligne décorative
      doc.moveTo(200, 160)
         .lineTo(doc.page.width - 200, 160)
         .strokeColor('#D1D5DB')
         .stroke();

      // Texte de certification
      doc.fontSize(16)
         .fillColor('#374151')
         .font('Helvetica')
         .text('Ce certificat atteste que', 0, 200, {
           align: 'center'
         });

      // Nom de la bénéficiaire
      doc.fontSize(28)
         .fillColor('#1F2937')
         .font('Helvetica-Bold')
         .text(woman.name || 'Bénéficiaire', 0, 240, {
           align: 'center'
         });

      // Texte intermédiaire
      doc.fontSize(16)
         .fillColor('#374151')
         .font('Helvetica')
         .text('a complété avec succès la formation', 0, 290, {
           align: 'center'
         });

      // Nom de la formation
      doc.fontSize(24)
         .fillColor('#4F46E5')
         .font('Helvetica-Bold')
         .text(formation.title, 0, 330, {
           align: 'center',
           width: doc.page.width
         });

      // Détails de la formation
      const completedDate = new Date(enrollment.completedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      doc.fontSize(12)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text(`Catégorie: ${formation.category} | Niveau: ${formation.level}`, 0, 400, {
           align: 'center'
         });

      doc.text(`Durée totale: ${formation.duration} heures`, 0, 420, {
        align: 'center'
      });

      doc.text(`Date d'achèvement: ${completedDate}`, 0, 440, {
        align: 'center'
      });

      // Signature (bas du certificat)
      const signatureY = doc.page.height - 150;
      
      doc.fontSize(12)
         .fillColor('#374151')
         .font('Helvetica-Bold')
         .text('Plateforme de Formation Professionnelle', 0, signatureY, {
           align: 'center'
         });

      doc.fontSize(10)
         .fillColor('#6B7280')
         .font('Helvetica-Oblique')
         .text(`Certificat N°: ${enrollment.id}`, 0, signatureY + 30, {
           align: 'center'
         });

      // Ligne de signature
      doc.moveTo(doc.page.width / 2 - 100, signatureY + 60)
         .lineTo(doc.page.width / 2 + 100, signatureY + 60)
         .strokeColor('#9CA3AF')
         .stroke();

      doc.fontSize(10)
         .fillColor('#9CA3AF')
         .text('Signature autorisée', 0, signatureY + 70, {
           align: 'center'
         });

      // Finaliser le PDF
      doc.end();

      // Attendre la fin de l'écriture
      stream.on('finish', () => {
        resolve(`/certificates/${filename}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
};