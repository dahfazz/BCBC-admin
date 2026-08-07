import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { InvoiceService } from './invoice.service';
import { MemberService } from '../members/member.service';
import { Member, CATEGORIES } from '../members/member.model';

@Component({
  selector: 'app-invoice-form',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);
  private memberService = inject(MemberService);
  private route = inject(ActivatedRoute);

  readonly categories = CATEGORIES;

  saving = signal(false);
  saved = signal(false);
  savedFilename = signal('');
  error = signal('');

  selectedMember = signal<Member | null>(null);

  invoices = signal<string[]>([]);
  invoiceSearch = signal('');
  filteredInvoices = computed(() => {
    const term = this.invoiceSearch().trim().toLowerCase();
    const files = this.invoices();
    return term ? files.filter(f => f.toLowerCase().includes(term)) : files;
  });

  // Nom/prénom du parent connus pour les factures générées pendant cette session
  private invoiceParentNames = new Map<string, { firstName: string; lastName: string }>();

  emailModalOpen = signal(false);
  emailModalFile = signal('');
  emailTo = signal('');
  emailSubject = signal('');
  emailBody = signal('');
  emailSending = signal(false);
  emailError = signal('');
  emailSent = signal(false);

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  form = this.fb.group({
    invoiceNumber:    [{ value: '', disabled: true }],
    season:           ['2026-27', Validators.required],
    date:             [this.todayStr(), Validators.required],
    parentLastName:   ['', Validators.required],
    parentFirstName:  ['', Validators.required],
    parentAddress:    ['', Validators.required],
    parentPostalCode: ['92270', Validators.required],
    parentCity:       ['Bois-Colombes', Validators.required],
    childLastName:    ['', Validators.required],
    childFirstName:   ['', Validators.required],
    formulaStartDate: ['2026-09-01', Validators.required],
    formulaEndDate:   ['2027-07-31', Validators.required],
    section:          ['', Validators.required],
    paymentMethod:    ['CB en ligne', Validators.required],
    amountPaid:       [260, [Validators.required, Validators.min(0)]],
    presidentName:    ['Amadou BA', Validators.required],
  });

  ngOnInit(): void {
    this.form.patchValue({
      invoiceNumber: this.invoiceService.generateInvoiceNumber(),
    });
    this.loadInvoices();

    const memberId = this.route.snapshot.paramMap.get('memberId');
    if (memberId) {
      this.memberService.list().subscribe({
        next: (res) => {
          const member = res.members.find(m => m.id === memberId) ?? null;
          this.selectedMember.set(member);
          if (member) {
            this.form.patchValue({
              childLastName: member.nom,
              childFirstName: member.prenom,
              section: member.categorie,
              amountPaid: member.cotisationPayee,
            });
          }
        },
        error: () => {}
      });
    }
  }

  loadInvoices(): void {
    this.invoiceService.listInvoices().subscribe({
      next: (res) => this.invoices.set(res.files.sort().reverse()),
      error: () => {}
    });
  }

  invoiceUrl(filename: string): string {
    return this.invoiceService.getInvoiceUrl(filename);
  }

  private formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);

    const v = this.form.getRawValue() as Record<string, unknown>;

    const data = {
      invoiceNumber:     String(v['invoiceNumber']),
      season:            String(v['season']),
      date:              this.formatDate(String(v['date'])),
      parentLastName:    String(v['parentLastName']),
      parentFirstName:   String(v['parentFirstName']),
      parentAddress:     String(v['parentAddress']),
      parentPostalCode:  String(v['parentPostalCode']),
      parentCity:        String(v['parentCity']),
      childLastName:     String(v['childLastName']),
      childFirstName:    String(v['childFirstName']),
      formulaStartDate:  this.formatDate(String(v['formulaStartDate'])),
      formulaEndDate:    this.formatDate(String(v['formulaEndDate'])),
      section:           String(v['section']),
      product:           String(v['product']),
      productPrice:      Number(v['productPrice']),
      timeSlot:          String(v['timeSlot']),
      paymentMethod:     String(v['paymentMethod']),
      amountPaid:        Number(v['amountPaid']),
      presidentName:     String(v['presidentName']),
    };

    const doc = this.invoiceService.buildPDF(data);

    this.invoiceService.saveToServer(doc, data).subscribe({
      next: (res) => {
        window.open(doc.output('bloburl'), '_blank');
        this.invoiceParentNames.set(res.filename, {
          firstName: data.parentFirstName,
          lastName: data.parentLastName,
        });
        this.savedFilename.set(res.filename);
        this.saved.set(true);
        this.saving.set(false);
        this.form.patchValue({ invoiceNumber: this.invoiceService.generateInvoiceNumber() });
        this.loadInvoices();
      },
      error: () => {
        // backend unavailable — still open locally
        window.open(doc.output('bloburl'), '_blank');
        this.error.set('Serveur non disponible. PDF ouvert localement uniquement.');
        this.saving.set(false);
      }
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c.touched);
  }

  openEmailModal(filename: string): void {
    const known = this.invoiceParentNames.get(filename);
    let lastName = known?.lastName ?? '';
    const firstName = known?.firstName ?? '';

    if (!lastName) {
      const match = filename.match(/^RECU_\d+_(.+)\.pdf$/i);
      lastName = match ? match[1].replace(/_/g, ' ') : '';
    }

    const greeting = [firstName, lastName].filter(Boolean).join(' ') || 'Bonjour';

    this.emailModalFile.set(filename);
    this.emailTo.set('');
    this.emailSubject.set('Votre facture Bois-Colombes Basket 2026-27');
    this.emailBody.set(
      `${greeting},\n\nVeuillez trouver ci-joint la facture.\n\nL'équipe de BC Basket`
    );
    this.emailError.set('');
    this.emailSent.set(false);
    this.emailModalOpen.set(true);
  }

  closeEmailModal(): void {
    this.emailModalOpen.set(false);
  }

  sendInvoiceEmail(): void {
    const to = this.emailTo().trim();
    if (!to) {
      this.emailError.set('Veuillez saisir une adresse email de destinataire.');
      return;
    }

    this.emailSending.set(true);
    this.emailError.set('');

    this.invoiceService
      .sendInvoiceEmail(this.emailModalFile(), to, this.emailSubject(), this.emailBody())
      .subscribe({
        next: () => {
          this.emailSending.set(false);
          this.emailSent.set(true);
        },
        error: (err) => {
          this.emailSending.set(false);
          this.emailError.set(err?.error?.error ?? "Échec de l'envoi de l'email.");
        }
      });
  }
}
