const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

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
  const pdfBuffers = [];
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(__dirname, htmlFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Fichier non trouvé: ${htmlFile}`);
      continue;
    }
    
    console.log(`Conversion de: ${htmlFile}`);
    
    try {
      const fileUrl = `file://${filePath}`;
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
      
      pdfBuffers.push(pdfBuffer);
      console.log(`✓ ${htmlFile} converti`);
    } catch (error) {
      console.error(`Erreur avec ${htmlFile}:`, error.message);
    }
  }
  
  await browser.close();
  
  if (pdfBuffers.length > 0) {
    const mergedPdf = await PDFDocument.create();
    
    for (const buffer of pdfBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    
    const mergedPdfBuffer = await mergedPdf.save();
    fs.writeFileSync(pdfPath, mergedPdfBuffer);
    
    console.log(`\nConversion terminée! PDF créé: ${pdfPath}`);
  } else {
    console.log('\nAucun fichier HTML n\'a été converti.');
  }
}

convertHtmlToPdf().catch(console.error);
