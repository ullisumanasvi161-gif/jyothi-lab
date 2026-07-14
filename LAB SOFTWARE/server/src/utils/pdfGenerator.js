const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

function generateReportPDF(data) {
  return new Promise(async (resolve, reject) => {
    // Enable bufferPages to support dynamic total page counts
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    try {
      const { patient, doctor, test, report, bill, settings, approver, letterhead = true, signature, baseUrl } = data;
      const yOffset = letterhead ? 0 : 70;
      
      // Generate real QR code buffer encoding the report PDF URL
      let qrBuffer = null;
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'jyothi_lab_secret_key_2026';
        // Generate a secure, non-expiring JWT token specifically for this report
        const token = jwt.sign({ reportId: report.id, role: 'Patient' }, JWT_SECRET);
        
        let resolvedBaseUrl = baseUrl;
        if (!resolvedBaseUrl) {
          resolvedBaseUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
        }
        
        const reportUrl = `${resolvedBaseUrl}/api/reports/${report.id}/pdf?token=${token}`;
        qrBuffer = await QRCode.toBuffer(reportUrl, { margin: 1, width: 150 });
      } catch (qrErr) {
        console.error('Failed to generate real QR code, falling back to mock:', qrErr);
      }
      
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {
        labName: 'JYOTHI LAB',
        tagline: 'Diagnostic Centre',
        address: 'Bellary Road, Near Gururagavendra Nagar, Varma Complex, Kurnool - 518 003',
        phone: '9856628943',
        email: 'info@jyothilab.com',
        gstin: '36AAAAA1111A1Z1'
      };

      if (letterhead) {
        // 1. Draw Vector Logo (detailed microscope brand icon)
        const cx = 75, cy = 60;
        doc.lineWidth(3).strokeColor('#f26522').circle(cx, cy, 24).stroke(); // Outer ring
        doc.fillColor('#0ea5e9').circle(cx, cy, 19).fill(); // Inner teal solid circle
        
        // Detailed vector microscope in white
        doc.lineWidth(1.5).strokeColor('#ffffff');
        // Microscope base
        doc.moveTo(cx - 8, cy + 9).lineTo(cx + 8, cy + 9).stroke();
        // Arm (curved on left)
        doc.moveTo(cx - 4, cy + 9).quadraticCurveTo(cx - 9, cy + 1, cx - 4, cy - 7).stroke();
        // Stage (horizontal line)
        doc.moveTo(cx - 5, cy + 3).lineTo(cx + 4, cy + 3).stroke();
        // Body Tube
        doc.moveTo(cx - 3, cy - 7).lineTo(cx + 3, cy - 2).stroke();
        // Eyepiece (top)
        doc.moveTo(cx - 5, cy - 9).lineTo(cx - 1, cy - 6).stroke();
        // Objective lens (pointing down to stage)
        doc.moveTo(cx, cy - 2).lineTo(cx - 2, cy + 2).stroke();

        // 2. Logo Text
        doc.fillColor('#f26522').font('Helvetica-Bold').fontSize(20).text((receiptHeader.labName || 'JYOTHI LAB').toUpperCase(), 110, 42);
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(12).text(receiptHeader.tagline || 'Diagnostic Centre', 110, 64);

        // 3. Contact Details
        doc.font('Helvetica').fontSize(9.5).fillColor('#334155');
        doc.text(`Cell : ${receiptHeader.phone || '9856628943'}`, doc.page.width - 240, 43, { align: 'right', width: 200 });
        doc.text(`E-mail : ${receiptHeader.email || 'info@jyothilab.com'}`, doc.page.width - 240, 58, { align: 'right', width: 200 });

        // 4. "LAB REPORT" Header Badge
        const badgeY = 80;
        doc.fillColor('#ff781f').roundedRect(doc.page.width - 180, badgeY, 140, 20, 4).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('LAB REPORT', doc.page.width - 180, badgeY + 5, { align: 'center', width: 140 });
      }

      // Helper function to format Date (DD/MM/YYYY hh:mm AM/PM)
      function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const pad = (n) => String(n).padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        return `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;
      }

      // 5. Patient Details Grid (2-column layout)
      doc.fillColor('#000000').fontSize(9.5);
      
      // Row 1
      doc.font('Helvetica-Bold').text('Patient Name :', 45, 115 - yOffset);
      doc.font('Helvetica').text(patient.name, 125, 115 - yOffset);
      
      doc.font('Helvetica-Bold').text('Patient ID :', 280, 115 - yOffset);
      doc.font('Helvetica').text(patient.uhid, 365, 115 - yOffset);
      
      // Row 2
      doc.font('Helvetica-Bold').text('Age / Gender :', 45, 131 - yOffset);
      doc.font('Helvetica').text(`${patient.age} ${patient.age_unit || 'Years'} / ${patient.gender}`, 125, 131 - yOffset);
      
      doc.font('Helvetica-Bold').text('Collection Date :', 280, 131 - yOffset);
      doc.font('Helvetica').text(formatDate(bill.created_at), 365, 131 - yOffset);
      
      // Row 3
      doc.font('Helvetica-Bold').text('Referral Name :', 45, 147 - yOffset);
      doc.font('Helvetica').text(doctor ? doctor.name : 'Self', 125, 147 - yOffset);
      
      doc.font('Helvetica-Bold').text('Reporting Date :', 280, 147 - yOffset);
      doc.font('Helvetica').text(formatDate(report.approved_at || bill.created_at), 365, 147 - yOffset);

      // 6. Draw QR Code
      if (qrBuffer) {
        doc.image(qrBuffer, doc.page.width - 95, 115 - yOffset, { width: 50 });
      } else {
        drawMockQRCode(doc, doc.page.width - 95, 115 - yOffset, 50);
      }

      // 7. Horizontal Line under metadata
      let posY = 172 - yOffset;
      doc.strokeColor('#000000').lineWidth(1.2).moveTo(45, posY).lineTo(doc.page.width - 45, posY).stroke();

      // 8. Test Name Title (All Caps)
      posY += 7;
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#000000').text(test.name.toUpperCase(), 45, posY, { align: 'center' });
      posY += 18;

      // 9. Horizontal Line under test name
      doc.strokeColor('#000000').lineWidth(1.2).moveTo(45, posY).lineTo(doc.page.width - 45, posY).stroke();

      // 10. Table Columns Headers
      posY += 7;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000');
      doc.text('Test Description', 45, posY);
      doc.text('Result', 240, posY);
      doc.text('Unit', 360, posY);
      doc.text('Reference Range', 450, posY);

      // Line under table headers
      posY += 13;
      doc.strokeColor('#000000').lineWidth(0.8).moveTo(45, posY).lineTo(doc.page.width - 45, posY).stroke();

      // 11. Parameters Table Rows
      let currentY = posY + 8;
      const normalRanges = JSON.parse(test.normal_range || '[]');
      const results = report.result_values ? (typeof report.result_values === 'string' ? JSON.parse(report.result_values) : report.result_values) : {};

      normalRanges.forEach((range) => {
        // Prevent overflow by adding a new page if list exceeds boundary
        if (currentY > doc.page.height - 85) {
          doc.addPage();
          currentY = 60;
        }

        const val = results[range.parameter] !== undefined ? results[range.parameter] : '';
        
        let isAbnormal = false;
        if (val !== '' && !isNaN(val)) {
          const num = parseFloat(val);
          if ((range.min !== undefined && num < range.min) || (range.max !== undefined && num > range.max)) {
            isAbnormal = true;
          }
        }

        // Draw description
        doc.font('Helvetica').fillColor('#000000');
        doc.text(range.parameter, 45, currentY);
        
        // Draw result (highlight red/bold if abnormal)
        if (isAbnormal) {
          doc.font('Helvetica-Bold').fillColor('#ef4444').text(`${val} *`, 240, currentY);
        } else {
          doc.font('Helvetica').fillColor('#000000').text(val, 240, currentY);
        }

        // Draw unit
        doc.font('Helvetica').fillColor('#000000').text(range.unit || '', 360, currentY);

        // Format reference range
        let rangeStr = '';
        if (range.min !== undefined && range.min !== null && range.min !== '' &&
            range.max !== undefined && range.max !== null && range.max !== '') {
          rangeStr = `${range.min} - ${range.max}`;
        } else if (range.min !== undefined && range.min !== null && range.min !== '') {
          rangeStr = `> ${range.min}`;
        } else if (range.max !== undefined && range.max !== null && range.max !== '') {
          rangeStr = `< ${range.max}`;
        }
        
        doc.text(rangeStr, 450, currentY);

        currentY += 18;
      });

      // 12. End of report line
      doc.strokeColor('#000000').lineWidth(0.8).moveTo(45, currentY).lineTo(doc.page.width - 45, currentY).stroke();
      
      currentY += 8;
      const testNotesText = test.description && test.description.trim() !== ''
        ? test.description
        : getRandomNoteForTest(test.code, test.name);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text('Clinical Interpretation & Notes:', 45, currentY);
      currentY += 12;
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#475569');
      doc.text(testNotesText, 45, currentY, { align: 'left', width: doc.page.width - 90 });
      const noteHeight = doc.heightOfString(testNotesText, { width: doc.page.width - 90 });
      currentY += noteHeight + 8;

      // Draw another line under note
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(45, currentY).lineTo(doc.page.width - 45, currentY).stroke();
      currentY += 4;

      // Centered "**END OF REPORT**"
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('**END OF REPORT**', 45, currentY + 6, { align: 'center' });

      // Add a page if signature overlaps footer area
      if (currentY + 100 > doc.page.height - 70) {
        doc.addPage();
        currentY = 60;
      }

      // 13. Signature section (aligned to the right)
      const signY = Math.max(currentY + 50, doc.page.height - 180);
      
      if (report.status === 'Approved') {
        let signaturePlaced = false;
        
        if (signature && signature.signature_path) {
          const absolutePath = path.join(__dirname, '../..', signature.signature_path);
          if (fs.existsSync(absolutePath)) {
            try {
              // Draw signature image
              doc.image(absolutePath, doc.page.width - 165, signY - 40, { width: 100, height: 40 });
              signaturePlaced = true;
            } catch (imageErr) {
              console.error('Failed to draw signature image in PDFKit:', imageErr);
            }
          }
        }
        
        if (!signaturePlaced) {
          // Fallback to cursive mock signature text if no image file was drawn
          doc.font('Times-Italic').fontSize(15).fillColor('#1e3a8a');
          const dispName = signature ? signature.name : (approver ? approver.name : 'Dr. K .Lakshmi');
          doc.text(dispName, doc.page.width - 185, signY - 20, { align: 'center', width: 140 });
        }

        // Print Doctor Name & Designation (no line separator to match template)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000');
        const finalName = signature ? signature.name : (approver ? approver.name : 'DR. K .LAKSHMI');
        const finalDesignation = signature ? signature.designation : (approver ? approver.role : 'MD. PATHOLOGIST');
        
        doc.text(finalName.toUpperCase(), doc.page.width - 185, signY + 3, { align: 'center', width: 140 });
        doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
        doc.text(finalDesignation.toUpperCase(), doc.page.width - 185, signY + 16, { align: 'center', width: 140 });
      } else {
        doc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(11).text('--- DRAFT REPORT (NOT APPROVED) ---', 45, signY, { align: 'center' });
      }

      // 14. Global Layout Overlay & Page Numbering
      const footerAddress = receiptHeader.address || 'Bellary Road, Near Gururagavendra Nagar, Varma Complex, Kurnool - 518 003';
      
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Solid left vertical border stripe
        if (letterhead) {
          doc.fillColor('#f26522').rect(0, 0, 15, doc.page.height).fill();
        }

        // Footer lines & dynamic page counts
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(45, doc.page.height - 45).lineTo(doc.page.width - 45, doc.page.height - 45).stroke();
        
        // Temporarily disable bottom margin to prevent automatic page wrapping when writing footer
        const oldMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
        doc.text(`Page ${i + 1} of ${range.count}`, 45, doc.page.height - 36);
        doc.text(footerAddress, 45, doc.page.height - 36, { align: 'center', width: doc.page.width - 90 });

        doc.page.margins.bottom = oldMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// QR Code helper generator
function drawMockQRCode(doc, x, y, size) {
  doc.strokeColor('#000000').lineWidth(1).rect(x, y, size, size).stroke();
  
  const pSize = Math.round(size * 0.28); 
  const pInner = Math.round(size * 0.12); 
  
  // Corners
  doc.strokeColor('#000000').lineWidth(2).rect(x + 2, y + 2, pSize, pSize).stroke();
  doc.fillColor('#000000').rect(x + 4, y + 4, pInner, pInner).fill();
  
  doc.strokeColor('#000000').lineWidth(2).rect(x + size - pSize - 2, y + 2, pSize, pSize).stroke();
  doc.fillColor('#000000').rect(x + size - pSize + 0, y + 4, pInner, pInner).fill();
  
  doc.strokeColor('#000000').lineWidth(2).rect(x + 2, y + size - pSize - 2, pSize, pSize).stroke();
  doc.fillColor('#000000').rect(x + 4, y + size - pSize + 0, pInner, pInner).fill();
  
  // Matrix points
  doc.fillColor('#000000');
  doc.rect(x + pSize + 3, y + 3, 5, 2).fill();
  doc.rect(x + pSize + 9, y + 4, 2, 5).fill();
  doc.rect(x + pSize + 3, y + 9, 6, 2).fill();
  doc.rect(x + pSize + 10, y + 11, 3, 3).fill();
  doc.rect(x + 3, y + pSize + 3, 2, 5).fill();
  doc.rect(x + 8, y + pSize + 5, 5, 2).fill();
  doc.rect(x + 14, y + pSize + 3, 2, 7).fill();
  doc.rect(x + pSize + 3, y + pSize + 3, 9, 2).fill();
  doc.rect(x + pSize + 5, y + pSize + 8, 2, 7).fill();
  doc.rect(x + pSize + 10, y + pSize + 7, 7, 2).fill();
  doc.rect(x + size - pSize + 0, y + pSize + 3, 3, 7).fill();
  doc.rect(x + size - pSize - 3, y + size - 10, 2, 7).fill();
  doc.rect(x + pSize + 1, y + size - 7, 9, 2).fill();
  doc.rect(x + pSize + 13, y + size - 5, 5, 2).fill();
}

function getRandomNoteForTest(testCode, testName) {
  const notes = {
    'CBC': [
      "Clinical interpretation should be correlated with clinical findings. Mild fluctuations in WBC/Platelets can be transient.",
      "Peripheral blood smear examination is recommended if abnormal cells are detected or if cell counts are significantly out of range.",
      "Hemoglobin levels should be evaluated in context of patient's hydration state, age, gender, and clinical history."
    ],
    'LFT': [
      "Elevated transaminases (SGOT/SGPT) may indicate hepatocellular injury and should be correlated with clinical symptoms.",
      "Bilirubin fluctuations should be evaluated in conjunction with alkaline phosphatase levels and hepatic imaging if clinically indicated.",
      "Liver function test results can be affected by recent medications, alcohol consumption, or intensive physical exercise."
    ],
    'FBS': [
      "Fasting Blood Sugar level of 100-125 mg/dL indicates Impaired Fasting Glucose (Pre-diabetes). Correlation with HbA1c is advised.",
      "Diagnosis of Diabetes Mellitus should not be based on a single screening result. Confirm with a repeat test on a subsequent day.",
      "Patient should maintain a minimum of 8-12 hours of overnight fast prior to sample collection for accurate results."
    ],
    'VITAMIN_D': [
      "Vitamin D levels below 20 ng/mL are considered deficient. Vitamin D supplementation should be done under medical supervision.",
      "Vitamin D levels between 20-30 ng/mL represent insufficiency. Adequate sunlight exposure and dietary adjustments are recommended.",
      "Toxicity is rare but can occur with levels exceeding 100 ng/mL, usually associated with high-dose supplementation."
    ]
  };

  const defaultNotes = [
    "Please correlate clinically with patient history. If results are critical, repeat testing or alternative diagnostic procedures are recommended.",
    "Results can be affected by physiological variations, dietary habits, or ongoing medication. Kindly consult your referring physician.",
    "This test was performed using automated methodologies. Transient variations in values should be monitored with sequential reports."
  ];

  const code = (testCode || '').toUpperCase();
  const name = (testName || '').toUpperCase();
  let selectedNotes = defaultNotes;
  
  if (code.includes('CBC') || name.includes('BLOOD COUNT')) {
    selectedNotes = notes['CBC'];
  } else if (code.includes('LFT') || name.includes('LIVER')) {
    selectedNotes = notes['LFT'];
  } else if (code.includes('FBS') || name.includes('FASTING SUGAR') || name.includes('GLUCOSE')) {
    selectedNotes = notes['FBS'];
  } else if (code.includes('VITD') || name.includes('VITAMIN-D') || name.includes('VITAMIN D')) {
    selectedNotes = notes['VITAMIN_D'];
  }

  const randomIndex = Math.floor(Math.random() * selectedNotes.length);
  return selectedNotes[randomIndex];
}

module.exports = generateReportPDF;
