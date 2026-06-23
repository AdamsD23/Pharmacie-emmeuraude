const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');

const htmlFiles = [
  'caissesetvente.html',
  'clients.html',
  'dashboard.html',
  'gestiondestocks.html',
  'gestionfournisseur.html',
  'historiquedeslivraison.html',
  'profile.html',
  'reports.html',
  'sales-history.html',
  'tableaudebordpharmacy.html'
];

async function convertHtmlToPdf() {
  console.log('Démarrage de la conversion HTML vers PDF...');
  
  const pdfPath = path.join(__dirname, 'pharmacie-emeraude-complet.pdf');
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(__dirname, htmlFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Fichier non trouvé: ${htmlFile}`);
      continue;
    }
    
    console.log(`Conversion de: ${htmlFile}`);
    
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      
      const options = {
        format: 'A4',
        border: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      };
      
      await new Promise((resolve, reject) => {
        pdf.create(html, options).toFile(pdfPath, (err, res) => {
          if (err) {
            // Si le fichier existe déjà, on l'ajoute
            if (fs.existsSync(pdfPath)) {
              const existingPdf = fs.readFileSync(pdfPath);
              pdf.create(html, options).toBuffer((err, buffer) => {
                if (err) reject(err);
                else {
                  fs.writeFileSync(pdfPath, Buffer.concat([existingPdf, buffer]));
                  resolve();
                }
              });
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      });
      
      console.log(`✓ ${htmlFile} converti`);
    } catch (error) {
      console.error(`Erreur avec ${htmlFile}:`, error.message);
    }
  }
  
  console.log(`\nConversion terminée! PDF créé: ${pdfPath}`);
}

convertHtmlToPdf().catch(console.error);
