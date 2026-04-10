const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const OFFSET_X = 0;
const OFFSET_Y = 0;

async function generateOverlayPass(data) {
  const formPath  = path.join(__dirname, 'public', 'concession-form.pdf');
  const formBytes = fs.readFileSync(formPath);
  const pdfDoc    = await PDFDocument.load(formBytes);
  const page      = pdfDoc.getPages()[0];
  const font      = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const put = (text, x, y, opts = {}) => {
    page.drawText(String(text || ''), {
      x:        x + OFFSET_X,
      y:        y + OFFSET_Y,
      size:     opts.size || 8,
      font:     opts.bold ? fontBold : font,
      color:    rgb(0, 0, 0),
      maxWidth: opts.maxWidth || 200,
    });
  };

  // LEFT HALF
  put(data.studentName,        105, 332, { size: 8, bold: true, maxWidth: 165 });
  put(data.classOfTravel||'II', 45, 270, { size: 8, bold: true });
  put(data.issueDate||'',       90, 270, { size: 7, maxWidth: 50 });
  put(data.expiryDate||'',     148, 270, { size: 7, maxWidth: 50 });
  put(data.from||'',           205, 270, { size: 8, bold: true, maxWidth: 80 });
  put(data.to||'',             300, 270, { size: 8, bold: true, maxWidth: 80 });
  put(data.issueDate||'',      160, 133, { size: 7 });
  put(data.expiryDate||'',     270, 116, { size: 7 });
  put(data.issueDate||'',       98,  44, { size: 7.5 });

  // RIGHT HALF
  put(data.studentName,        490, 450, { size: 7.5, bold: true, maxWidth: 130 });
  put(data.age||'',            480, 422, { size: 7.5 });
  put(data.dob||'',            555, 422, { size: 7 });
  put(data.studentName,        530, 404, { size: 7.5, bold: true, maxWidth: 155 });
  put(data.age||'',            470, 388, { size: 7.5 });
  put(data.dob||'',            640, 388, { size: 7, maxWidth: 100 });
  put(data.classOfTravel||'II', 415, 270, { size: 8, bold: true });
  put(data.issueDate||'',       460, 270, { size: 7, maxWidth: 50 });
  put(data.expiryDate||'',      518, 270, { size: 7, maxWidth: 50 });
  put(data.from||'',            575, 270, { size: 8, bold: true, maxWidth: 90 });
  put(data.to||'',              672, 270, { size: 8, bold: true, maxWidth: 90 });
  put('NIL',                    595, 192, { size: 8 });
  put('NIL',                    720, 192, { size: 8 });
  put(data.from||'',            435, 174, { size: 8 });
  put(data.to||'',              540, 174, { size: 8 });
  put(data.expiryDate||'',      475, 156, { size: 8 });
  put(data.issueDate||'',       460, 138, { size: 8 });
  put('Saraswati College of Engineering, Kharghar', 460, 120, { size: 7, maxWidth: 240 });
  put(data.issueDate||'',       475,  44, { size: 7.5 });

  return Buffer.from(await pdfDoc.save());
}

module.exports = { generateOverlayPass };
