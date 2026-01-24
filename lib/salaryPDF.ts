import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { StaffSalaryCalculation } from '@/types';
import { formatAmount, calculateShiftDurationInHours } from './salaryCalculations';

function createSalaryHTML(calculation: StaffSalaryCalculation, storeName: string): string {
  const [year, month] = calculation.month.split('-');
  const generatedDate = new Date().toLocaleString('vi-VN');

  const adjustmentsRows = calculation.adjustments.items.map(adj => {
    const date = new Date(adj.adjustment_date).toLocaleDateString('vi-VN');
    const type = adj.amount >= 0 ? 'Tăng' : 'Giảm';
    const amount = `${adj.amount >= 0 ? '+' : ''}${formatAmount(adj.amount)}`;
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${type}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${amount} ₫</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${adj.note || '-'}</td>
      </tr>
    `;
  }).join('');

  // Calculate total hours and total money
  let totalHours = 0;
  let totalMoney = 0;

  const dailyRows = calculation.daily_breakdown.map(day => {
    const date = new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const shift = day.shift_name || '-';
    const checkIn = day.check_in_time ? new Date(day.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';
    const checkOut = day.check_out_time ? new Date(day.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';

    // Calculate shift hours from shift_time (e.g., "08:00 - 17:00")
    let shiftHours = 0;
    if (day.shift_time && day.status !== 'absent') {
      const [startTime, endTime] = day.shift_time.split(' - ');
      if (startTime && endTime) {
        shiftHours = calculateShiftDurationInHours(startTime, endTime);
        totalHours += shiftHours;
      }
    }
    const hoursDisplay = shiftHours > 0 ? shiftHours.toFixed(1) : '-';

    const total = day.status === 'absent' ? '0' : formatAmount(day.subtotal);
    if (day.status !== 'absent') {
      totalMoney += day.subtotal;
    }

    return `
      <tr>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px;">${date}</td>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px;">${shift}</td>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px;">${checkIn}</td>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px;">${checkOut}</td>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${hoursDisplay}</td>
        <td style="padding: 3px; border: 1px solid #ddd; font-size: 10px; text-align: right;">${total} ₫</td>
      </tr>
    `;
  }).join('');

  // Add total row
  const totalRow = `
    <tr style="background-color: #f5f5f5; font-weight: bold;">
      <td colspan="4" style="padding: 5px; border: 1px solid #ddd; text-align: right; font-size: 11px;">Tổng cộng:</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${totalHours.toFixed(1)}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${formatAmount(totalMoney)} ₫</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Roboto', sans-serif;
          padding: 30px 50px 60px 50px;
          max-width: 100%;
          margin: 0;
          background: white;
          color: #000 !important;
        }
        h1, h2, h3 {
          margin: 0;
          padding: 0;
          color: #000 !important;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000 !important;
        }
        .header h2 {
          font-size: 18px;
          color: #666;
        }
        .info {
          margin-bottom: 12px;
          line-height: 1.5;
          font-size: 14px;
          color: #000 !important;
        }
        .section {
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 6px;
          padding-bottom: 3px;
          border-bottom: 2px solid #428bca;
          color: #000 !important;
        }
        .summary-table {
          width: 100%;
          margin-bottom: 10px;
        }
        .summary-table tr td {
          padding: 6px 0;
          font-size: 14px;
        }
        .summary-table tr td:first-child {
          color: #666;
        }
        .summary-table tr td:last-child {
          text-align: right;
          font-weight: bold;
        }
        .summary-table tr.total {
          border-top: 2px solid #ddd;
          padding-top: 10px;
        }
        .summary-table tr.total td {
          padding-top: 12px;
          font-size: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        table thead {
          background-color: #428bca;
          color: white !important;
        }
        table thead th {
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
          color: white !important;
        }
        table tbody td {
          color: #000 !important;
        }
        .total-box {
          background: linear-gradient(135deg, #428bca 0%, #357ebd 100%);
          color: white !important;
          padding: 12px;
          text-align: center;
          border-radius: 6px;
          margin: 12px 0;
        }
        .total-box .label {
          font-size: 13px;
          opacity: 0.9;
          margin-bottom: 4px;
          color: white !important;
        }
        .total-box .amount {
          font-size: 28px;
          font-weight: bold;
          color: white !important;
        }
        .signatures {
          display: flex;
          justify-content: space-around;
          margin-top: 40px;
          margin-bottom: 20px;
        }
        .signature-box {
          text-align: center;
          color: #000 !important;
        }
        .signature-box .title {
          font-weight: bold;
          margin-bottom: 5px;
          color: #000 !important;
        }
        .signature-box .subtitle {
          font-size: 11px;
          color: #999 !important;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #999 !important;
          margin-top: 30px;
          margin-bottom: 40px;
          padding-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PHIẾU LƯƠNG THÁNG</h1>
        <h2>Tháng ${month}/${year}</h2>
      </div>

      <div class="info">
        <div><strong>Cửa hàng:</strong> ${storeName}</div>
        <div><strong>Nhân viên:</strong> ${calculation.staff.name || calculation.staff.full_name}</div>
        <div><strong>Email:</strong> ${calculation.staff.email}</div>
        <div><strong>Lương giờ:</strong> ${formatAmount(calculation.staff.hour_rate)} ₫/giờ</div>
      </div>

      <div class="section">
        <div class="section-title">📋 TẠM TÍNH TỰ ĐỘNG</div>
        <table class="summary-table">
          <tbody>
            <tr>
              <td>Số ca làm việc</td>
              <td>${calculation.daily_breakdown.filter(d => d.status !== 'absent').length} ca</td>
            </tr>
            <tr>
              <td>Lương cơ bản</td>
              <td>${formatAmount(calculation.provisional.base)} ₫</td>
            </tr>
            ${calculation.provisional.late_deductions > 0 ? `
            <tr>
              <td>Phạt trễ</td>
              <td style="color: #d9534f;">-${formatAmount(calculation.provisional.late_deductions)} ₫</td>
            </tr>
            ` : ''}
            ${calculation.provisional.early_deductions > 0 ? `
            <tr>
              <td>Phạt về sớm</td>
              <td style="color: #d9534f;">-${formatAmount(calculation.provisional.early_deductions)} ₫</td>
            </tr>
            ` : ''}
            ${calculation.provisional.overtime > 0 ? `
            <tr>
              <td>Tăng ca</td>
              <td style="color: #5cb85c;">+${formatAmount(calculation.provisional.overtime)} ₫</td>
            </tr>
            ` : ''}
            <tr class="total">
              <td><strong>Tạm tính</strong></td>
              <td><strong>${formatAmount(calculation.provisional.total)} ₫</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      ${calculation.adjustments.items.length > 0 ? `
      <div class="section">
        <div class="section-title">📝 ĐIỀU CHỈNH</div>
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th style="text-align: right;">Số tiền</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${adjustmentsRows}
            <tr style="background-color: #f5f5f5; font-weight: bold;">
              <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">Tổng điều chỉnh</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${calculation.adjustments.total >= 0 ? '+' : ''}${formatAmount(calculation.adjustments.total)} ₫</td>
              <td style="padding: 8px; border: 1px solid #ddd;"></td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="total-box">
        <div class="label">TỔNG LƯƠNG</div>
        <div class="amount">${formatAmount(calculation.final_amount)} ₫</div>
      </div>

      <div class="section">
        <div class="section-title">📅 CHI TIẾT TỪNG NGÀY</div>
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Ca</th>
              <th>Vào</th>
              <th>Ra</th>
              <th style="text-align: center;">Tổng giờ</th>
              <th style="text-align: right;">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
            ${totalRow}
          </tbody>
        </table>
      </div>

      <div class="footer">
        Tạo ngày: ${generatedDate}
      </div>
    </body>
    </html>
  `;
}

export async function generateSalaryPDF(calculation: StaffSalaryCalculation, storeName: string): Promise<jsPDF> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '1000px';
  // Force light mode for PDF generation
  container.style.colorScheme = 'light';
  container.style.backgroundColor = 'white';
  container.style.color = 'black';
  container.innerHTML = createSalaryHTML(calculation, storeName);
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;

  // Convert to canvas with lower scale for smaller file size
  const canvas = await html2canvas(container, {
    scale: 1.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Remove temporary container
  document.body.removeChild(container);

  // Create PDF with JPEG compression for smaller file size
  const imgData = canvas.toDataURL('image/jpeg', 0.85);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add margins to the PDF (10mm on each side)
  const marginLeft = 10;
  const marginTop = 10;
  const marginRight = 10;
  const usableWidth = 210 - marginLeft - marginRight; // A4 width minus margins

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginTop;

  // Add first page
  pdf.addImage(imgData, 'JPEG', marginLeft, position, imgWidth, imgHeight);
  heightLeft -= 297; // A4 height

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + marginTop;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', marginLeft, position, imgWidth, imgHeight);
    heightLeft -= 297;
  }

  return pdf;
}

export async function downloadSalaryPDF(calculation: StaffSalaryCalculation, storeName: string) {
  const doc = await generateSalaryPDF(calculation, storeName);
  const fileName = `phieu-luong-${calculation.staff.name || calculation.staff.full_name}-${calculation.month}.pdf`;
  doc.save(fileName);
}

export async function shareSalaryPDF(calculation: StaffSalaryCalculation, storeName: string) {
  const doc = await generateSalaryPDF(calculation, storeName);
  const pdfBlob = doc.output('blob');
  const fileName = `phieu-luong-${calculation.staff.name || calculation.staff.full_name}-${calculation.month}.pdf`;

  if (navigator.share && navigator.canShare) {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const filesArray = [file];

    if (navigator.canShare({ files: filesArray })) {
      navigator.share({
        files: filesArray,
        title: 'Phiếu lương',
        text: `Phiếu lương tháng ${calculation.month} - ${calculation.staff.name || calculation.staff.full_name}`,
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to download
        downloadSalaryPDF(calculation, storeName);
      });
    } else {
      // Fallback to download
      downloadSalaryPDF(calculation, storeName);
    }
  } else {
    // Fallback to download
    downloadSalaryPDF(calculation, storeName);
  }
}
