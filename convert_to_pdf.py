import os
import subprocess
import sys

html_files = [
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
]

def convert_html_to_pdf():
    print("Démarrage de la conversion HTML vers PDF...")
    
    # Vérifier si wkhtmltopdf est installé
    try:
        subprocess.run(['wkhtmltopdf', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Erreur: wkhtmltopdf n'est pas installé.")
        print("Téléchargez-le depuis: https://wkhtmltopdf.org/downloads.html")
        print("Ou utilisez la méthode manuelle (captures d'écran)")
        return
    
    pdf_files = []
    
    for html_file in html_files:
        if not os.path.exists(html_file):
            print(f"Fichier non trouvé: {html_file}")
            continue
        
        print(f"Conversion de: {html_file}")
        pdf_file = html_file.replace('.html', '.pdf')
        
        try:
            subprocess.run([
                'wkhtmltopdf',
                '--page-size', 'A4',
                '--margin-top', '1cm',
                '--margin-right', '1cm',
                '--margin-bottom', '1cm',
                '--margin-left', '1cm',
                html_file,
                pdf_file
            ], check=True)
            pdf_files.append(pdf_file)
            print(f"✓ {html_file} converti")
        except subprocess.CalledProcessError as e:
            print(f"Erreur avec {html_file}: {e}")
    
    # Fusionner tous les PDF
    if pdf_files:
        print("\nFusion des PDF...")
        try:
            from PyPDF2 import PdfMerger
            merger = PdfMerger()
            for pdf_file in pdf_files:
                merger.append(pdf_file)
            merger.write('pharmacie-emeraude-complet.pdf')
            merger.close()
            print("✓ PDF complet créé: pharmacie-emeraude-complet.pdf")
            
            # Nettoyer les fichiers temporaires
            for pdf_file in pdf_files:
                os.remove(pdf_file)
        except ImportError:
            print("PyPDF2 n'est pas installé. Les PDF individuels ont été créés.")
            print("Installez-le avec: pip install PyPDF2")
    
    print("\nConversion terminée!")

if __name__ == "__main__":
    convert_html_to_pdf()
