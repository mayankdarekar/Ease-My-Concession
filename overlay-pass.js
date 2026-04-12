const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const OFFSET_X = 0;
const OFFSET_Y = 0;

async function generateOverlayPass(data) {
  const formBytes = fs.readFileSync(path.join(__dirname, 'public', 'concession-form.pdf'));
  const pdfDoc    = await PDFDocument.load(formBytes);
  const page      = pdfDoc.getPages()[0];
  const font      = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const put = (text, x, y, opts = {}) => {
    page.drawText(String(text || ''), {
      x:        x + OFFSET_X,
      y:        y + OFFSET_Y,
      size:     opts.size || 9,
      font:     opts.bold ? fontBold : font,
      color:    rgb(0, 0, 0),
      maxWidth: opts.maxWidth || 300,
    });
  };

  // LEFT HALF
  put(data.studentName,           130, 659, { size: 9, bold: true, maxWidth: 250 });
  put(data.classOfTravel || 'II',  38, 473, { size: 9, bold: true });
  put(data.issueDate     || '',   112, 473, { size: 8, maxWidth: 70 });
  put(data.expiryDate    || '',   200, 473, { size: 8, maxWidth: 70 });
  put(data.from          || '',   290, 473, { size: 9, bold: true, maxWidth: 130 });
  put(data.to            || '',   435, 473, { size: 9, bold: true, maxWidth: 130 });
  put(data.issueDate     || '',   200, 276, { size: 8 });
  put(data.expiryDate    || '',   335, 227, { size: 8 });
  put(data.issueDate     || '',   120,  63, { size: 8.5 });

  // RIGHT HALF
  put(data.studentName,           850, 522, { size: 8.5, bold: true, maxWidth: 200 });
  put(data.age           || '',   820, 492, { size: 8.5 });
  put(data.dob           || '',   920, 492, { size: 8 });
  put(data.studentName,           870, 462, { size: 8.5, bold: true, maxWidth: 230 });
  put(data.age           || '',   770, 443, { size: 8.5 });
  put(data.dob           || '',  1010, 443, { size: 8, maxWidth: 160 });
  put(data.classOfTravel || 'II', 625, 473, { size: 9, bold: true });
  put(data.issueDate     || '',   720, 473, { size: 8, maxWidth: 80 });
  put(data.expiryDate    || '',   815, 473, { size: 8, maxWidth: 80 });
  put(data.from          || '',   900, 473, { size: 9, bold: true, maxWidth: 110 });
  put(data.to            || '',  1030, 473, { size: 9, bold: true, maxWidth: 110 });
  put('NIL',                      950, 276, { size: 8.5 });
  put('NIL',                     1130, 276, { size: 8.5 });
  put(data.from          || '',   660, 256, { size: 8.5 });
  put(data.to            || '',   860, 256, { size: 8.5 });
  put(data.expiryDate    || '',   760, 237, { size: 8.5 });
  put(data.issueDate     || '',   730, 197, { size: 8.5 });
  put('Saraswati College of Engineering, Kharghar', 730, 167, { size: 7.5, maxWidth: 350 });
  put(data.issueDate     || '',   760,  63, { size: 8.5 });

  return Buffer.from(await pdfDoc.save());
}

module.exports = { generateOverlayPass };
