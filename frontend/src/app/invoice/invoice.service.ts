import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InvoiceData {
  invoiceNumber: string;
  season: string;
  date: string;
  parentLastName: string;
  parentFirstName: string;
  parentAddress: string;
  parentPostalCode: string;
  parentCity: string;
  childLastName: string;
  childFirstName: string;
  formulaStartDate: string;
  formulaEndDate: string;
  section: string;
  product: string;
  productPrice: number;
  paymentMethod: string;
  amountPaid: number;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;
  private readonly API = `${this.BASE}/api/save-invoice`;
  private tamponBase64 = '';

  constructor() {
    fetch('/tampon.png')
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => { this.tamponBase64 = dataUrl; })
      .catch(() => {});
  }

  generateInvoiceNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const key = `invoice_counter_${year}`;
    const counter = parseInt(localStorage.getItem(key) ?? '0') + 1;
    localStorage.setItem(key, counter.toString());
    return `${year}${String(counter).padStart(6, '0')}`;
  }

  private fmt(amount: number): string {
    return `${amount.toFixed(2).replace('.', ',')}€`;
  }

  buildPDF(data: InvoiceData): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = 210;
    const mL = 15;
    const mR = 195;

    // ── LOGO (top-left) ──────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Club de basket créé en 2023', mL, 12);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Bois-Colombes', mL, 19);
    doc.text('Basket Club', mL, 26);

    // decorative underline under logo text
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(mL, 28, mL + 38, 28);

    // ── SEASON HEADER (top-right) ─────────────────────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`SAISON ${data.season}`, mR, 15, { align: 'right' });

    // Divider under header
    doc.setLineWidth(0.6);
    doc.setDrawColor(0);
    doc.line(mL, 32, mR, 32);

    // ── DATE ─────────────────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Le ${data.date}`, mR, 41, { align: 'right' });

    // ── ADDRESS BOX ──────────────────────────────────────────────────────────
    const bx = 118, by = 44, bw = 77, bh = 24;
    doc.setLineWidth(0.4);
    doc.rect(bx, by, bw, bh);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${data.parentFirstName} ${data.parentLastName}`, bx + 4, by + 7);
    doc.text(data.parentAddress, bx + 4, by + 13);
    doc.text(`${data.parentPostalCode} ${data.parentCity}`, bx + 4, by + 19);

    // ── TITLE ────────────────────────────────────────────────────────────────
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`REÇU ACQUITTÉ N° ${data.invoiceNumber}`, pageW / 2, 83, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(mL, 88, mR, 88);

    // ── FIELDS ───────────────────────────────────────────────────────────────
    const labelX = mL;
    const valueX = 72;
    let y = 100;
    const rh = 9;

    const rows: [string, string][] = [
      ['Inscription de :', `${data.childLastName} ${data.childFirstName}`],
      ['Nom des parents :', `${data.parentLastName} ${data.parentFirstName}`],
      ['Date formule:', `du ${data.formulaStartDate} au ${data.formulaEndDate}`],
      ['De la section :', data.section],
    ];

    doc.setFontSize(10);
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.text(label, labelX, y);
      doc.setFont('helvetica', 'normal');
      // wrap long values
      const lines = doc.splitTextToSize(value, mR - valueX);
      doc.text(lines, valueX, y);
      y += lines.length > 1 ? rh + (lines.length - 1) * 5 : rh;
    }

    // ── PAYMENT ──────────────────────────────────────────────────────────────
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Moyen(s) de paiement :', labelX, y);

    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.text(`• ${data.paymentMethod} : ${this.fmt(data.amountPaid)}`, labelX + 5, y);

    // ── AMOUNT BOX ───────────────────────────────────────────────────────────
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.text('Montant réglé :', labelX, y + 5);

    const abX = 88, abW = 62, abH = 13;
    doc.setLineWidth(0.5);
    doc.rect(abX, y, abW, abH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(this.fmt(data.amountPaid), abX + abW / 2, y + 8, { align: 'center' });

    // ── SIGNATURE ────────────────────────────────────────────────────────────
    y += 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Amadou BA, Président de BCS`, labelX, y);

    // ── BCS STAMP ────────────────────────────────────────────────────────────
    if (this.tamponBase64) {
      doc.addImage(this.tamponBase64, 'PNG', mL, y + 4, 28, 28);
    }

    // ── BCS CENTERED ─────────────────────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BOIS COLOMBES BASKET CLUB', pageW / 2, 254, { align: 'center' });

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const fy = 263;
    doc.setLineWidth(0.4);
    doc.line(mL, fy, mR, fy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const fc = pageW / 2;
    doc.text('Gymnase Charles Coste -  31 Av. du Révérend Père Corentin Cloarec, 92270 Bois-Colombes - TEL : 06 61 54 13 70', fc, fy + 5, { align: 'center' });
    doc.text('Email : bcbc92270@gmail.com', fc, fy + 10, { align: 'center' });
    doc.text("Numéro SIRET : 919 540 211 00019 | Numéro d'affiliation FFBB : IDF0092061", fc, fy + 15, { align: 'center' });

    return doc;
  }

  saveToServer(doc: jsPDF, data: InvoiceData): Observable<{ success: boolean; filename: string; path: string }> {
    const lastName = data.parentLastName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '');
    const filename = `RECU_${data.invoiceNumber}_${lastName}.pdf`;
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return this.http.post<{ success: boolean; filename: string; path: string }>(this.API, { pdfBase64, filename });
  }

  listInvoices(): Observable<{ files: string[] }> {
    return this.http.get<{ files: string[] }>(`${this.BASE}/api/invoices`);
  }

  getInvoiceUrl(filename: string): string {
    return `${this.BASE}/invoices/${encodeURIComponent(filename)}`;
  }

  sendInvoiceEmail(filename: string, to: string, subject: string, body: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.BASE}/api/send-invoice-email`, { filename, to, subject, body });
  }
}
