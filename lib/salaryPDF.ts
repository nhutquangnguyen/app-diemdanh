import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { StaffSalaryCalculation } from '@/types';
import { formatAmount } from './salaryCalculations';

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

  const dailyRows = calculation.daily_breakdown.map(day => {
    const date = new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const shift = day.shift_name || '-';
    const checkIn = day.check_in_time ? new Date(day.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';
    const checkOut = day.check_out_time ? new Date(day.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';

    let statusText = '';
    if (day.status === 'absent') statusText = 'Vắng';
    else if (day.status === 'late') statusText = 'Muộn';
    else if (day.status === 'early_checkout') statusText = 'Về sớm';
    else if (day.status === 'overtime') statusText = 'Tăng ca';
    else statusText = 'Đúng giờ';

    const total = day.status === 'absent' ? '0' : formatAmount(day.subtotal);

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${date}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${shift}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${checkIn}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${checkOut}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${statusText}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px; text-align: right;">${total} ₫</td>
      </tr>
    `;
  }).join('');

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
          padding: 60px 100px;
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
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000 !important;
        }
        .header h2 {
          font-size: 20px;
          color: #666;
        }
        .info {
          margin-bottom: 25px;
          line-height: 1.8;
          color: #000 !important;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid #428bca;
          color: #000 !important;
        }
        .summary-table {
          width: 100%;
          margin-bottom: 15px;
        }
        .summary-table tr td {
          padding: 8px 0;
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
          margin-bottom: 15px;
        }
        table thead {
          background-color: #428bca;
          color: white !important;
        }
        table thead th {
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          color: white !important;
        }
        table tbody td {
          color: #000 !important;
        }
        .total-box {
          background: linear-gradient(135deg, #428bca 0%, #357ebd 100%);
          color: white !important;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin: 25px 0;
        }
        .total-box .label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 5px;
          color: white !important;
        }
        .total-box .amount {
          font-size: 32px;
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
              <th>Trạng thái</th>
              <th style="text-align: right;">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
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
  container.innerHTML = createSalaryHTML(calculation, storeName);
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;

  // Convert to canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Remove temporary container
  document.body.removeChild(container);

  // Create PDF
  const imgData = canvas.toDataURL('image/png');
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
  pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
  heightLeft -= 297; // A4 height

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + marginTop;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
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
