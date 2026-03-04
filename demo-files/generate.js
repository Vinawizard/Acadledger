const PDFDocument = require('pdfkit');
const fs = require('fs');

function createCertificate(filename, name, degree, date, offset = 0) {
    const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
    });

    doc.pipe(fs.createWriteStream(filename));

    // Draw border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

    // Title
    doc.fontSize(40).text('Certificate of Graduation', offset, 100 + offset, { align: 'center' });

    // Subtitle
    doc.fontSize(20).text('This is to certify that', 0, 180 + offset, { align: 'center' });

    // Name
    doc.fontSize(35).text(name, 0, 240 + offset, { align: 'center' });

    // Achievement
    doc.fontSize(20).text(`has successfully completed the ${degree}`, 0, 320 + offset, { align: 'center' });

    // Date
    doc.fontSize(15).text(`Date of Issue: ${date}`, 0, 400 + offset, { align: 'center' });

    doc.end();
    console.log(`Generated: ${filename}`);
}

// 1. Strict Match: The original credential
createCertificate('Valid_Credential_Strict.pdf', 'Alice Johnson', 'Bachelor of Science in Computer Science', '2024-05-15');

// 2. Easy Match: Same visible text, but drawn at a 1px offset, so the PDF binary is completely different.
// This mimics a photocopy or scan that has the exact same data to an AI model, but a different file hash.
createCertificate('Valid_Credential_Easy.pdf', 'Alice Johnson', 'Bachelor of Science in Computer Science', '2024-05-15', 1);

// 3. Fraudulent: Data tampered
createCertificate('Fraudulent_Credential.pdf', 'Alice Johnson', 'Doctor of Philosophy in Computer Science', '2024-05-15');
