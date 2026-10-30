import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  ALL_SECTIONS,
  BOOKING_STATUS_CHOICES,
  GROUP_BY_CHOICES,
  PAYMENT_STATUS_CHOICES,
  ReportOptions,
  ReportSection,
  SECTION_CHOICES,
  SORT_CHOICES,
} from './report.models';
import { ReportService, getReportErrorMessage } from './report.service';

/** "to" must not be before "from". (Dates are "yyyy-MM-dd" texts, which sort in date order.) */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from: string = group.get('from')?.value ?? '';
  const to: string = group.get('to')?.value ?? '';
  return from && to && to < from ? { dateRange: true } : null;
}

/** The form needs at least one report part ticked, otherwise the report would be empty. */
function atLeastOneSection(group: AbstractControl): ValidationErrors | null {
  const anyTicked = Object.values((group as FormGroup).controls).some((control) => control.value === true);
  return anyTicked ? null : { noSection: true };
}

/**
 * The reports page, used by landlords (/landlord/reports) and admins (/admin/reports).
 * ReportService picks the right backend address for the role, and the backend only counts what that role may see.
 *
 * The person chooses the options, presses "Generate report", and the backend sends back a finished HTML page.
 * That page is shown inside a locked box (a sandboxed iframe) so nothing in it can ever run code.
 */
@Component({
  selector: 'app-reports',
  imports: [ReactiveFormsModule, EmptyStateComponent, ErrorMessageComponent, SkeletonComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  private readonly reportService = inject(ReportService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);

  // The dropdown choices live in report.models.ts
  readonly groupByChoices = GROUP_BY_CHOICES;
  readonly sortChoices = SORT_CHOICES;
  readonly sectionChoices = SECTION_CHOICES;
  readonly bookingStatusChoices = BOOKING_STATUS_CHOICES;
  readonly paymentStatusChoices = PAYMENT_STATUS_CHOICES;

  // The form starts with the options the person chose the last time in this session
  private readonly start = this.reportService.getLastOptions();

  readonly form = new FormGroup(
    {
      from: new FormControl(this.start.from, { nonNullable: true }),
      to: new FormControl(this.start.to, { nonNullable: true }),
      bookingStatus: new FormControl(this.start.bookingStatus, { nonNullable: true }),
      paymentStatus: new FormControl(this.start.paymentStatus, { nonNullable: true }),
      groupBy: new FormControl(this.start.groupBy, { nonNullable: true }),
      sort: new FormControl(this.start.sort, { nonNullable: true }),
      // One tick box for each part of the report
      sections: new FormGroup(
        {
          LISTINGS: new FormControl(this.start.sections.includes('LISTINGS'), { nonNullable: true }),
          BOOKINGS: new FormControl(this.start.sections.includes('BOOKINGS'), { nonNullable: true }),
          PAYMENTS: new FormControl(this.start.sections.includes('PAYMENTS'), { nonNullable: true }),
          INCOME: new FormControl(this.start.sections.includes('INCOME'), { nonNullable: true }),
        },
        { validators: atLeastOneSection },
      ),
    },
    { validators: dateRangeValidator },
  );

  readonly loading = signal(false);
  /** The reason the last "Generate" failed. */
  readonly errorText = signal('');

  /**
   * The report page as the backend sent it. It stays a plain string; it is only turned into "trusted" HTML
   * in `trustedReport` below, for the one iframe that shows it.
   */
  readonly reportHtml = signal('');

  /**
   * Angular normally strips <style> and the page frame out of any HTML put in an iframe's `srcdoc`, which would
   * break the report. bypassSecurityTrustHtml tells it "leave it as it is". That is safe here ONLY because:
   *  - the HTML comes from our own backend (Pebble escapes every value in the template), and
   *  - the iframe has an empty `sandbox`, so even a script inside could not run.
   * Never use it for anything else.
   */
  readonly trustedReport = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.reportHtml()));

  // The hidden copy of the report that is created for printing (see print())
  private printFrame: HTMLIFrameElement | null = null;

  constructor() {
    // Remember the options as soon as they change, so they are still there when the person comes back
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reportService.rememberOptions(this.readOptions()));

    inject(DestroyRef).onDestroy(() => this.printFrame?.remove());
  }

  /** Reads the form into the shape ReportService needs. */
  private readOptions(): ReportOptions {
    const value = this.form.getRawValue();
    return {
      from: value.from,
      to: value.to,
      bookingStatus: value.bookingStatus,
      paymentStatus: value.paymentStatus,
      groupBy: value.groupBy,
      sort: value.sort,
      sections: ALL_SECTIONS.filter((section: ReportSection) => value.sections[section]),
    };
  }

  /** "Generate report" (also used by the Retry button after an error). */
  generate(): void {
    if (this.form.invalid) {
      // Shows the red messages under the wrong fields
      this.form.markAllAsTouched();
      return;
    }
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorText.set('');

    this.reportService.getReportHtml(this.readOptions()).subscribe({
      next: (html) => {
        this.reportHtml.set(html);
        this.loading.set(false);
      },
      error: (error) => {
        // Do not leave an old report on screen next to an error about the new options
        this.reportHtml.set('');
        this.errorText.set(getReportErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /**
   * Prints only the report (not the menu around it); in the print window the person can choose "Save as PDF".
   *
   * A browser does not let this page call print() on the visible iframe: the iframe is locked (empty sandbox),
   * so it counts as a stranger and print() throws a SecurityError. So we print a short-lived hidden copy.
   * It is still safe, because `allow-scripts` is NOT given: no script in the report can run. Without that, the
   * other two flags are harmless: `allow-same-origin` lets this page call print(), `allow-modals` lets the print window open.
   */
  print(): void {
    const html = this.reportHtml();
    if (!html) {
      return;
    }
    this.printFrame?.remove();

    const frame = this.document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    // Wait until the report is drawn inside the hidden frame, then open the print window
    frame.onload = () => {
      const printWindow = frame.contentWindow;
      printWindow?.addEventListener('afterprint', () => frame.remove());
      printWindow?.focus();
      printWindow?.print();
    };
    frame.srcdoc = html;
    this.document.body.appendChild(frame);
    this.printFrame = frame;
  }
}
