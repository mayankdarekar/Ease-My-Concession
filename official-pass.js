// ═══════════════════════════════════════════════════════════
//  Official Railway Concession Pass — Exact Match
//  Based on real Saraswati College form B series
// ═══════════════════════════════════════════════════════════

const PDFDoc = require('pdfkit');

async function generateOfficialPass(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDoc({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: { Title: 'Railway Concession Pass', Author: 'Saraswati College of Engineering' }
    });

    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Page dimensions ───────────────────────────────────
    const PW = 595; // A4 width in points
    const PH = 842; // A4 height in points
    const M  = 18;  // margin
    const MID = PW / 2; // center divider x

    // Usable widths
    const LX  = M;          // left col start
    const LW  = MID - M - 4; // left col width
    const RX  = MID + 4;    // right col start
    const RW  = PW - MID - M - 4; // right col width

    // ── Outer border ──────────────────────────────────────
    doc.rect(M, M, PW - M * 2, PH - M * 2).lineWidth(0.8).stroke('#000');

    // ── Center divider ────────────────────────────────────
    doc.moveTo(MID, M).lineTo(MID, PH - M).lineWidth(0.5).stroke('#000');

    // ─────────────────────────────────────────────────────
    // LEFT HALF — Certificate Copy
    // ─────────────────────────────────────────────────────
    let ly = M + 6;

    // Header
    doc.fontSize(6.5).font('Helvetica').fillColor('#000')
      .text('प्रमाण पत्र', LX, ly, { width: LW, align: 'center' });
    ly += 10;

    doc.fontSize(13).font('Helvetica-Bold')
      .text('INDIAN RAILWAYS', LX, ly, { width: LW, align: 'center' });
    ly += 16;

    doc.fontSize(6).font('Helvetica')
      .text('यात्रा रियायत प्रमाण पत्र / Travel Concession Certificate', LX, ly, { width: LW, align: 'center' });
    ly += 8;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 5;

    // Sr No and PL No on same line
    doc.fontSize(7).font('Helvetica')
      .text('वर्ग सं. / Sr. No.', LX, ly)
      .text(`पी.एल.नं. / PL.No. ${data.plNo || '63055836'}`, LX + 110, ly);
    ly += 9;

    // Large B number
    const passNum = formatNum(data.passNo);
    doc.fontSize(22).font('Helvetica-Bold')
      .text(`B  ${passNum}`, LX, ly);
    ly += 26;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 6;

    // Issued in favour of
    doc.fontSize(6.5).font('Helvetica')
      .text('जिसके लिए जारी किया गया है / Issued in favour of :-', LX, ly, { width: LW });
    ly += 10;

    // Student name — large underlined
    doc.fontSize(12).font('Helvetica-Bold')
      .text(data.studentName || '', LX, ly, { width: LW });
    ly += 14;
    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 2;

    // "for the following Season Tickets" text
    doc.fontSize(6.5).font('Helvetica')
      .text('for the following Season Tickets', LX, ly, { width: LW });
    ly += 10;

    // ── TABLE ─────────────────────────────────────────────
    // Columns: Class | Period (From | To) | From Station | To Station
    const tblX = LX;
    const tblW = LW;
    const tblY = ly;
    const tblH1 = 16; // header row
    const tblH2 = 18; // data row

    // Column widths
    const c1 = 35;  // Class
    const c2 = 35;  // Period From
    const c3 = 35;  // Period To
    const c4 = (tblW - c1 - c2 - c3) / 2; // From Station
    const c5 = (tblW - c1 - c2 - c3) / 2; // To Station

    const cx = [tblX, tblX+c1, tblX+c1+c2, tblX+c1+c2+c3, tblX+c1+c2+c3+c4];

    // Table outer border
    doc.rect(tblX, tblY, tblW, tblH1 + tblH2).lineWidth(0.4).stroke();

    // Vertical lines
    cx.slice(1).forEach(x => {
      doc.moveTo(x, tblY).lineTo(x, tblY + tblH1 + tblH2).stroke();
    });

    // Period header spans c2+c3
    doc.moveTo(tblX + c1, tblY + tblH1 / 2).lineTo(tblX + c1 + c2 + c3, tblY + tblH1 / 2).stroke();

    // Horizontal middle line
    doc.moveTo(tblX, tblY + tblH1).lineTo(tblX + tblW, tblY + tblH1).stroke();

    // Headers
    doc.fontSize(5.5).font('Helvetica');
    cell(doc, 'वर्ग /\nClass',    cx[0], tblY, c1,      tblH1 / 2);
    cell(doc, 'अवधि / Period',    cx[1], tblY, c2 + c3, tblH1 / 2);
    cell(doc, 'स्टेशन से /\nFrom Station', cx[3], tblY, c4, tblH1);
    cell(doc, 'स्टेशन तक /\nTo Station',   cx[4], tblY, c5, tblH1);

    // Period sub-headers
    cell(doc, 'से / From', cx[1], tblY + tblH1 / 2, c2, tblH1 / 2);
    cell(doc, 'तक / To',  cx[2], tblY + tblH1 / 2, c3, tblH1 / 2);

    // Data row
    doc.fontSize(7).font('Helvetica-Bold');
    cell(doc, data.classOfTravel || 'II', cx[0], tblY + tblH1, c1, tblH2);
    cell(doc, data.issueDate || '',       cx[1], tblY + tblH1, c2, tblH2);
    cell(doc, data.expiryDate || '',      cx[2], tblY + tblH1, c3, tblH2);
    cell(doc, data.from || '',            cx[3], tblY + tblH1, c4, tblH2);
    cell(doc, data.to || '',              cx[4], tblY + tblH1, c5, tblH2);

    ly = tblY + tblH1 + tblH2 + 8;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 5;

    // Hindi certification text
    doc.fontSize(6).font('Helvetica').fillColor('#000')
      .text(
        'रेलवे के नियमों के अंतर्गत निम्नलिखित विद्यार्थी के लिए सीजन टिकट ' +
        'जारी करने हेतु प्रमाणित किया जाता है कि उपरोक्त विद्यार्थी नियमित रूप से ' +
        'इस विद्यालय/महाविद्यालय में उपस्थित रहता/रहती है।',
        LX, ly, { width: LW }
      );
    ly += 22;

    // English certification
    doc.fontSize(6.5).font('Helvetica')
      .text('I hereby certify that*', LX, ly);
    ly += 9;
    doc.fontSize(8).font('Helvetica-Bold')
      .text(data.studentName || '', LX, ly, { width: LW });
    ly += 11;
    doc.fontSize(6.5).font('Helvetica')
      .text(
        `the student at present holds _____ months birth date as entered in the ` +
        `School/College Register being ${data.dob || '______'}. ` +
        `He/She is therefore entitled to receive Season Ticket as detailed below ` +
        `at half the full rates charged for Adults.`,
        LX, ly, { width: LW }
      );
    ly += 24;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 5;

    // Fields
    doc.fontSize(6.5).font('Helvetica');
    fieldLine(doc, 'Name of College/School and Stamp:', 'Saraswati College of Engineering', LX, ly, LW); ly += 13;
    fieldLine(doc, 'No. of last Season Ticket/Period of availability:', `${data.ticketCount || '20'}`, LX, ly, LW); ly += 13;
    fieldLine(doc, 'Month ending:', data.expiryDate || '', LX, ly, LW); ly += 13;
    fieldLine(doc, 'From:', data.from || '', LX, ly, LW / 2);
    fieldLine(doc, 'To:', data.to || '', LX + LW / 2, ly, LW / 2);
    ly += 13;
    fieldLine(doc, 'Class and No. of Season Tickets issued:', `${data.classOfTravel || 'II'} / 1`, LX, ly, LW); ly += 13;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 6;

    // Notes
    doc.fontSize(5.5).font('Helvetica')
      .text(
        'Note: (1) The concession certificate is not transferable and the person misusing ' +
        'it will be liable for prosecution.\n' +
        '(2) Principal/Headmaster should ensure that no fresh concession certificate is ' +
        'issued to any student if the previous certificate has not been returned.\n' +
        '* Fill in the name and station nearest to the College/School.',
        LX, ly, { width: LW }
      );
    ly += 34;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 6;

    // Stamp + Signature
    const stampSize = 70;
    doc.rect(LX, ly, stampSize, stampSize).lineWidth(0.5).stroke();
    doc.fontSize(6).font('Helvetica')
      .text('College', LX + stampSize / 2 - 14, ly + stampSize / 2 - 8)
      .text('Stamp',   LX + stampSize / 2 - 11, ly + stampSize / 2 + 1);

    const sigX = LX + stampSize + 6;
    const sigW = LW - stampSize - 6;

    doc.fontSize(6).font('Helvetica')
      .text('अधक्षाचार्य/प्रमुखाध्यापक के हस्ताक्षर', sigX, ly + 30, { width: sigW });
    doc.fontSize(6)
      .text('Sig. of Principal / Head Master', sigX, ly + 38, { width: sigW });
    doc.moveTo(sigX, ly + 48).lineTo(LX + LW, ly + 48).lineWidth(0.4).stroke();

    ly += stampSize + 4;

    doc.fontSize(7.5).font('Helvetica-Bold').text('PRINCIPAL', LX + stampSize + 20, ly);
    ly += 10;
    doc.fontSize(6.5).font('Helvetica')
      .text('Saraswati College of Engineering', LX + stampSize + 6, ly)
      .text('Kharghar, Navi Mumbai - 410210',  LX + stampSize + 6, ly + 9);
    ly += 20;

    doc.moveTo(LX, ly).lineTo(LX + LW, ly).lineWidth(0.4).stroke();
    ly += 5;
    doc.fontSize(6.5).font('Helvetica')
      .text(`जारी करने की तारीख / Date of Issue: ${data.issueDate || ''}`, LX, ly);

    // ─────────────────────────────────────────────────────
    // RIGHT HALF — For Record (Railways copy)
    // ─────────────────────────────────────────────────────
    let ry = M + 6;

    // Header
    doc.fontSize(6.5).font('Helvetica').fillColor('#000')
      .text('प्रमाण पत्र', RX, ry, { width: RW, align: 'center' });
    ry += 10;

    doc.fontSize(13).font('Helvetica-Bold')
      .text('INDIAN RAILWAYS', RX, ry, { width: RW, align: 'center' });
    ry += 16;

    doc.fontSize(6).font('Helvetica')
      .text('रिकॉर्ड के लिए / For Record', RX, ry, { width: RW, align: 'center' });
    ry += 8;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 5;

    // Sr No and PL No
    doc.fontSize(7).font('Helvetica')
      .text('वर्ग सं. / Sr. No.', RX, ry)
      .text(`पी.एल.नं. / PL.No. ${data.plNo || '63055836'}`, RX + 110, ry);
    ry += 9;

    doc.fontSize(22).font('Helvetica-Bold')
      .text(`B  ${passNum}`, RX, ry);
    ry += 26;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 6;

    // Hindi long certification paragraph
    doc.fontSize(6).font('Helvetica')
      .text(
        'विद्यालय/महाविद्यालय के छात्रों को जारी किए जाने वाले रेलवे रियायत ' +
        'प्रमाण पत्र के संबंध में प्रमाणित किया जाता है कि उपरोक्त छात्र/छात्रा ' +
        'नियमित रूप से इस संस्थान में अध्ययनरत है तथा 25 वर्ष से कम आयु का/की है।',
        RX, ry, { width: RW }
      );
    ry += 28;

    // English certification (right side — longer version)
    doc.fontSize(6.5).font('Helvetica')
      .text(
        'Certificate to be issued only to Students of not more than 25 years of age ' +
        'except otherwise permitted under the Rules.',
        RX, ry, { width: RW }
      );
    ry += 14;

    doc.fontSize(6.5).font('Helvetica')
      .text('I hereby certify that*', RX, ry);
    ry += 9;

    doc.fontSize(8).font('Helvetica-Bold')
      .text(data.studentName || '', RX, ry, { width: RW });
    ry += 11;

    doc.fontSize(6.5).font('Helvetica')
      .text(
        `regularly attends this School/College for the purpose of receiving education, ` +
        `the institution of which I am the Principal/Head Master and his/her age on this ` +
        `day, according to my belief and from enquiries I have made is ${data.age || '__'} ` +
        `years. He/She is therefore entitled to receive Season Ticket as detailed below ` +
        `at half the full rates charged for Adults.`,
        RX, ry, { width: RW }
      );
    ry += 30;

    // ── RIGHT TABLE ───────────────────────────────────────
    const rtblY = ry;
    const rtblW = RW;

    doc.rect(RX, rtblY, rtblW, tblH1 + tblH2).lineWidth(0.4).stroke();

    const rcx = [RX, RX+c1, RX+c1+c2, RX+c1+c2+c3, RX+c1+c2+c3+c4];
    rcx.slice(1).forEach(x => {
      doc.moveTo(x, rtblY).lineTo(x, rtblY + tblH1 + tblH2).stroke();
    });
    doc.moveTo(RX + c1, rtblY + tblH1 / 2).lineTo(RX + c1 + c2 + c3, rtblY + tblH1 / 2).stroke();
    doc.moveTo(RX, rtblY + tblH1).lineTo(RX + rtblW, rtblY + tblH1).stroke();

    doc.fontSize(5.5).font('Helvetica');
    cell(doc, 'वर्ग /\nClass',    rcx[0], rtblY, c1,      tblH1 / 2);
    cell(doc, 'अवधि / Period',    rcx[1], rtblY, c2 + c3, tblH1 / 2);
    cell(doc, 'स्टेशन से /\nFrom Station', rcx[3], rtblY, c4, tblH1);
    cell(doc, 'स्टेशन तक /\nTo Station',   rcx[4], rtblY, c5, tblH1);
    cell(doc, 'से / From', rcx[1], rtblY + tblH1 / 2, c2, tblH1 / 2);
    cell(doc, 'तक / To',  rcx[2], rtblY + tblH1 / 2, c3, tblH1 / 2);

    doc.fontSize(7).font('Helvetica-Bold');
    cell(doc, data.classOfTravel || 'II', rcx[0], rtblY + tblH1, c1, tblH2);
    cell(doc, data.issueDate || '',       rcx[1], rtblY + tblH1, c2, tblH2);
    cell(doc, data.expiryDate || '',      rcx[2], rtblY + tblH1, c3, tblH2);
    cell(doc, data.from || '',            rcx[3], rtblY + tblH1, c4, tblH2);
    cell(doc, data.to || '',              rcx[4], rtblY + tblH1, c5, tblH2);

    ry = rtblY + tblH1 + tblH2 + 8;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 5;

    // Right side fields
    doc.fontSize(6.5).font('Helvetica');
    fieldLine(doc, 'Name of College/School and Stamp:', 'Saraswati College of Engineering', RX, ry, RW); ry += 13;
    fieldLine(doc, 'Month ending:', data.expiryDate || '', RX, ry, RW); ry += 13;
    fieldLine(doc, 'From:', data.from || '', RX, ry, RW / 2);
    fieldLine(doc, 'To:', data.to || '', RX + RW / 2, ry, RW / 2);
    ry += 13;
    fieldLine(doc, 'वर्ग / Class:', data.classOfTravel || 'II', RX, ry, RW); ry += 13;
    fieldLine(doc, 'Class and No. of Season Tickets issued:', '1', RX, ry, RW); ry += 13;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 5;

    // Notes (right side — longer)
    doc.fontSize(5.2).font('Helvetica')
      .text(
        'Note: (1) The concession certificate is not transferable and the person misusing it ' +
        'will be liable for prosecution.\n' +
        '(2) Principal/Headmaster should ensure that no fresh concession certificate is issued ' +
        'to any student if the previous certificate has not been returned. No fresh concession ' +
        'certificate should be issued for the current season if the Season Ticket is held, the ' +
        'word "NIL" should be inserted.\n' +
        '† This column should be filled in by the Station nearest to the College/School.\n' +
        '* Fill in the name, class/section and Station nearest to the student\'s residence and ' +
        'Station nearest to the College/School.',
        RX, ry, { width: RW }
      );
    ry += 50;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 6;

    // Right stamp + signature
    doc.rect(RX, ry, stampSize, stampSize).lineWidth(0.5).stroke();
    doc.fontSize(6).font('Helvetica')
      .text('College', RX + stampSize / 2 - 14, ry + stampSize / 2 - 8)
      .text('Stamp',   RX + stampSize / 2 - 11, ry + stampSize / 2 + 1);

    const rsigX = RX + stampSize + 6;
    const rsigW = RW - stampSize - 6;

    doc.fontSize(6).font('Helvetica')
      .text('अधक्षाचार्य/प्रमुखाध्यापक के हस्ताक्षर', rsigX, ry + 30, { width: rsigW })
      .text('Sig. of Principal / Head Master', rsigX, ry + 38, { width: rsigW });
    doc.moveTo(rsigX, ry + 48).lineTo(RX + RW, ry + 48).lineWidth(0.4).stroke();

    ry += stampSize + 4;
    doc.fontSize(7.5).font('Helvetica-Bold').text('PRINCIPAL', RX + stampSize + 20, ry);
    ry += 10;
    doc.fontSize(6.5).font('Helvetica')
      .text('Saraswati College of Engineering', RX + stampSize + 6, ry)
      .text('Kharghar, Navi Mumbai - 410210',  RX + stampSize + 6, ry + 9);
    ry += 20;

    doc.moveTo(RX, ry).lineTo(RX + RW, ry).lineWidth(0.4).stroke();
    ry += 5;
    doc.fontSize(6.5).font('Helvetica')
      .text(`जारी करने की तारीख / Date of Issue: ${data.issueDate || ''}`, RX, ry);

    // ── FOOTER ────────────────────────────────────────────
    doc.fontSize(6).font('Helvetica').fillColor('#555')
      .text(
        'C.R.P./By/63-2023/01-22-0044/25000 x 50 Lvs.',
        M, PH - M - 8, { width: PW - M * 2, align: 'center' }
      );

    doc.end();
  });
}

// ── Helper: draw centered text in a table cell ────────────
function cell(doc, text, x, y, w, h) {
  doc.text(text, x + 2, y + 2, { width: w - 4, height: h - 2, align: 'center' });
}

// ── Helper: label + underlined value on one line ──────────
function fieldLine(doc, label, value, x, y, w) {
  doc.fontSize(6.5).font('Helvetica').fillColor('#000')
    .text(label, x, y);
  const labelW = doc.widthOfString(label) + 3;
  doc.font('Helvetica-Bold')
    .text(value || '', x + labelW, y, { width: w - labelW });
  doc.moveTo(x + labelW, y + 10).lineTo(x + w, y + 10).lineWidth(0.3).stroke();
  doc.font('Helvetica');
}

// ── Helper: format pass number ────────────────────────────
function formatNum(passNo) {
  if (!passNo) return '0000000';
  const clean = passNo.replace(/RCP-/g, '').replace(/-/g, '');
  return clean.substring(0, 7).padEnd(7, '0');
}

module.exports = { generateOfficialPass };
