const PDFDoc = require('pdfkit');

const OFFSET_X = 0;
const OFFSET_Y = 0;

async function generateOverlayPass(data) {
  return new Promise((resolve, reject) => {
    const W = 787.9;
    const H = 598.2;

    const doc = new PDFDoc({
      size: [W, H],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#000000');

    const px = (x) => x * (W / 1222) + OFFSET_X;
    const py = (y) => y * (H / 984)  + OFFSET_Y;

    const put = (text, x, y, opts = {}) => {
      doc.fontSize(opts.size || 8)
         .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(String(text || ''), px(x), py(y), {
           width: opts.width ? opts.width * (W / 1222) : undefined,
           lineBreak: false,
         });
    };

    // LEFT HALF
    put(data.studentName || '', 114, 308, { size: 8, width: 220 });
    put(data.classOfTravel || 'II', 62,  390, { size: 8, bold: true });
    put(data.issueDate || '',       138, 390, { size: 7, width: 70 });
    put(data.from || '',            220, 390, { size: 8, bold: true, width: 120 });
    put(data.to || '',              365, 390, { size: 8, bold: true, width: 120 });
    put(data.issueDate || '',       186, 528, { size: 7 });
    put(data.expiryDate || '',      370, 555, { size: 7 });
    put(data.issueDate || '',       100, 912, { size: 8 });

    // RIGHT HALF
    put(data.studentName || '',    650, 163, { size: 7.5, width: 200 });
    put(data.age || '',            700, 198, { size: 7.5 });
    put(data.dob || '',            755, 198, { size: 7 });
    put(data.studentName || '',    852, 212, { size: 7.5, width: 170 });
    put(data.age || '',            700, 226, { size: 7.5 });
    put(data.dob || '',           1005, 226, { size: 7, width: 120 });
    put(data.classOfTravel || 'II', 640, 398, { size: 8, bold: true });
    put(data.issueDate || '',       700, 398, { size: 7, width: 80 });
    put(data.from || '',            810, 398, { size: 8, bold: true, width: 115 });
    put(data.to || '',              955, 398, { size: 8, bold: true, width: 115 });
    put(`${data.classOfTravel||'II'}/1`, 1093, 398, { size: 7 });
    put('NIL',                     870, 470, { size: 8 });
    put('NIL',                    1100, 470, { size: 8 });
    put(data.from || '',           648, 498, { size: 8 });
    put(data.to || '',             785, 498, { size: 8 });
    put(data.expiryDate || '',     680, 520, { size: 8 });
    put(data.issueDate || '',      660, 560, { size: 8 });
    put('Saraswati College of Engineering, Kharghar', 650, 585, { size: 7, width: 360 });

    doc.end();
  });
}

module.exports = { generateOverlayPass };
