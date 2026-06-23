const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const pdfPath = path.join(__dirname, 'pharmacie-emeraude-complet.pdf');
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(__dirname, htmlFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Fichier non trouvé: ${htmlFile}`);
      continue;
    }
    
    console.log(`Conversion de: ${htmlFile}`);
    
    const fileUrl = `file://${filePath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Attendre un peu pour que tout soit chargé
    await page.waitForTimeout(2000);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });
    
    // Ajouter le PDF au fichier principal
    if (fs.existsSync(pdfPath)) {
      const existingPdf = fs.readFileSync(pdfPath);
      fs.writeFileSync(pdfPath, Buffer.concat([existingPdf, pdfBuffer]));
    } else {
      fs.writeFileSync(pdfPath, pdfBuffer);
    }
    
    console.log(`✓ ${htmlFile} converti`);
  }
  
  await browser.close();
  console.log(`\nConversion terminée! PDF créé: ${pdfPath}`);
}

convertHtmlToPdf().catch(console.error);
