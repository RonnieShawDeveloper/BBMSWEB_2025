import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as moment from 'moment';
import firebase from 'firebase/compat/app';

interface MagistrateBooking {
  unixDate?: number; // milliseconds since epoch
  bailStatus?: string;
  bookingStatus?: string; // 'Open' | 'Closed' | ...
  primaryCharge?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-statistics-reports',
  templateUrl: './statistics-reports.component.html',
  styleUrls: ['./statistics-reports.component.scss']
})
export class StatisticsReportsComponent {
  // Date inputs as yyyy-MM-dd (native date input format)
  startDate: string = moment().subtract(6, 'months').format('YYYY-MM-DD');
  endDate: string = moment().format('YYYY-MM-DD');

  loadingBail = false;
  loadingProgression = false;
  loadingTopCrimes = false;
  loadingBonds = false;
  loadingMagCounts = false;
  loadingIslands = false;

  constructor(private afs: AngularFirestore) {}

  private parseDateToMillis(dateStr: string, endOfDay = false): number {
    const m = moment(dateStr, 'YYYY-MM-DD');
    return endOfDay ? m.endOf('day').valueOf() : m.startOf('day').valueOf();
  }

  private ensureValidRange(): { start: number; end: number } | null {
    if (!this.startDate || !this.endDate) {
      alert('Please select both start and end dates.');
      return null;
    }
    const start = this.parseDateToMillis(this.startDate);
    const end = this.parseDateToMillis(this.endDate, true);
    if (start > end) {
      alert('Start date must be on or before End date.');
      return null;
    }
    return { start, end };
  }


  // Export 2: Bail Status counts by month within date range
  exportBailStatusCounts() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingBail = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      // Collect unique statuses (uppercased)
      const allStatusesSet = new Set<string>();
      bookings.forEach(b => {
        const s = (b.bailStatus || '').trim();
        if (s) allStatusesSet.add(s.toUpperCase());
      });
      const statuses = Array.from(allStatusesSet).sort();

      // Build month list
      const months: string[] = [];
      const startM = moment(this.startDate, 'YYYY-MM-DD').startOf('month');
      const endM = moment(this.endDate, 'YYYY-MM-DD').startOf('month');
      const cur = startM.clone();
      while (cur.isSameOrBefore(endM)) {
        months.push(cur.format('YYYY-MM'));
        cur.add(1, 'month');
      }

      // Initialize matrix counts
      const countsByMonthStatus: Record<string, Record<string, number>> = {};
      months.forEach(m => {
        countsByMonthStatus[m] = {};
        statuses.forEach(s => countsByMonthStatus[m][s] = 0);
      });

      bookings.forEach(b => {
        if (!b.unixDate) return;
        const m = moment(Number(b.unixDate));
        if (!m.isValid()) return;
        const month = m.startOf('month').format('YYYY-MM');
        const s = (b.bailStatus || '').trim().toUpperCase();
        if (!s || !countsByMonthStatus[month]) return;
        countsByMonthStatus[month][s] = (countsByMonthStatus[month][s] || 0) + 1;
      });

      // Build headers: Month + one column per status + Total in Month
      const headers: { key: string; header: string }[] = [
        { key: 'month', header: 'Month (YYYY-MM)' }
      ];
      statuses.forEach(s => headers.push({ key: s, header: `Count with Bail Status = ${s} (in month)` }));
      headers.push({ key: 'Total', header: 'Total Bookings in Month' });

      // Build rows
      const rows = months.map(month => {
        const entry: any = { month };
        let total = 0;
        statuses.forEach(s => {
          const v = countsByMonthStatus[month]?.[s] ?? 0;
          entry[s] = v;
          total += v;
        });
        entry['Total'] = total;
        return entry;
      });

      const filename = this.buildFilename('Magistrates_Bail_Status_By_Month');
      this.downloadCsv(headers, rows, filename);
    }).finally(() => this.loadingBail = false);
  }

  // Export 3: Case progression by month (Monthly totals per month row)
  exportCaseProgression() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingProgression = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      // Compute monthly totals only (no cumulative values)
      const monthlyTotals: Record<string, number> = {};
      const newCasesByMonth: Record<string, number> = {};
      const closedByMonth: Record<string, number> = {};
      const approvedByMonth: Record<string, number> = {};
      const deniedByMonth: Record<string, number> = {};

      const relevant = bookings.filter(b => !!b.unixDate);
      relevant.forEach(b => {
        const m = moment(Number(b.unixDate));
        if (!m.isValid()) return;
        const month = m.startOf('month').format('YYYY-MM');

        monthlyTotals[month] = (monthlyTotals[month] || 0) + 1;

        const status = (b.bookingStatus || '').trim();
        if (status === 'Open') {
          newCasesByMonth[month] = (newCasesByMonth[month] || 0) + 1;
        } else if (status === 'Closed') {
          closedByMonth[month] = (closedByMonth[month] || 0) + 1;
        }

        const bail = (b.bailStatus || '').trim().toLowerCase();
        if (bail === 'approved') {
          approvedByMonth[month] = (approvedByMonth[month] || 0) + 1;
        } else if (bail === 'denied') {
          deniedByMonth[month] = (deniedByMonth[month] || 0) + 1;
        }
      });

      // Build a complete list of months between start and end inclusive
      const startM = moment(this.startDate, 'YYYY-MM-DD').startOf('month');
      const endM = moment(this.endDate, 'YYYY-MM-DD').startOf('month');
      const months: string[] = [];
      const cursor = startM.clone();
      while (cursor.isSameOrBefore(endM)) {
        months.push(cursor.format('YYYY-MM'));
        cursor.add(1, 'month');
      }

      const headers = [
        { key: 'month', header: 'Month (YYYY-MM)' },
        { key: 'totalInMonth', header: 'Total Bookings in Month' },
        { key: 'newCases', header: 'New Cases Opened in Month' },
        { key: 'closedCases', header: 'Cases Closed in Month' },
        { key: 'approved', header: 'Bail Applications Approved in Month' },
        { key: 'denied', header: 'Bail Applications Denied in Month' }
      ];

      const rows = months.map(month => ({
        month,
        totalInMonth: monthlyTotals[month] || 0,
        newCases: newCasesByMonth[month] || 0,
        closedCases: closedByMonth[month] || 0,
        approved: approvedByMonth[month] || 0,
        denied: deniedByMonth[month] || 0
      }));

      const filename = this.buildFilename('Magistrates_Case_Progression_By_Month');
      this.downloadCsv(headers, rows, filename);
    }).finally(() => this.loadingProgression = false);
  }

  private async fetchBookings(startMillis: number, endMillis: number): Promise<MagistrateBooking[]> {
    // Dashboard queries treat unixDate as a string of milliseconds; match that for consistency
    const startStr = startMillis.toString();
    const endStr = endMillis.toString();
    const snapshot = await this.afs.collection<MagistrateBooking>('magistrateBookings', ref =>
      ref.where('unixDate', '>=', startStr).where('unixDate', '<=', endStr)
    ).get().toPromise();

    return snapshot?.docs.map(d => d.data() as MagistrateBooking) || [];
  }

  // Fetch by an arbitrary field that may be stored as seconds (10 digits) or milliseconds (13 digits),
  // and as string or number in Firestore. We attempt multiple compatible queries and merge results.
  private async fetchBookingsByFieldBetween(field: string, startMillis: number, endMillis: number): Promise<MagistrateBooking[]> {
    const startMsNum = Number(startMillis);
    const endMsNum = Number(endMillis);
    const startSecNum = Math.floor(startMsNum / 1000);
    const endSecNum = Math.floor(endMsNum / 1000);

    const attempts: Promise<firebase.firestore.QuerySnapshot<MagistrateBooking>>[] = [
      // seconds stored as string
      this.afs.collection<MagistrateBooking>('magistrateBookings', ref =>
        ref.where(field as any, '>=', startSecNum.toString()).where(field as any, '<=', endSecNum.toString())
      ).get().toPromise(),
      // seconds stored as number
      this.afs.collection<MagistrateBooking>('magistrateBookings', ref =>
        ref.where(field as any, '>=', startSecNum as any).where(field as any, '<=', endSecNum as any)
      ).get().toPromise(),
      // milliseconds stored as string
      this.afs.collection<MagistrateBooking>('magistrateBookings', ref =>
        ref.where(field as any, '>=', startMsNum.toString()).where(field as any, '<=', endMsNum.toString())
      ).get().toPromise(),
      // milliseconds stored as number
      this.afs.collection<MagistrateBooking>('magistrateBookings', ref =>
        ref.where(field as any, '>=', startMsNum as any).where(field as any, '<=', endMsNum as any)
      ).get().toPromise()
    ];

    const snapshots = await Promise.allSettled(attempts);
    const merged: MagistrateBooking[] = [];
    const seen = new Set<string>();

    for (const res of snapshots) {
      if (res.status === 'fulfilled' && res.value) {
        res.value.docs.forEach(d => {
          const data = d.data() as MagistrateBooking;
          // Deduplicate by a composite signature of bond date + offender if present, else JSON
          const sig = `${(data as any).bailBondIssueDateUnix || ''}|${(data as any).offenderName || (data as any).firstName || ''}|${(data as any).lastName || ''}|${(data as any).bailAmount || ''}`;
          const key = sig || JSON.stringify(data);
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(data);
          }
        });
      }
    }

    // Optionally client-side filter to ensure the field is within range after normalizing units
    const withinRange = merged.filter(b => {
      const raw = (b as any)[field];
      if (raw === null || raw === undefined || raw === '') return false;
      const n = Number(raw);
      if (!isFinite(n)) return false;
      const ms = n < 1e12 ? n * 1000 : n; // normalize to ms
      return ms >= startMsNum && ms <= endMsNum;
    });

    if (withinRange.length === 0) {
      console.warn('No documents found for field range; verified units (s/ms) and types (string/number).');
    }

    return withinRange;
  }

  private buildFilename(prefix: string): string {
    const sd = moment(this.startDate).format('YYYY-MM-DD');
    const ed = moment(this.endDate).format('YYYY-MM-DD');
    return `${prefix}_${sd}_to_${ed}.csv`;
  }

  private downloadCsv(headers: { key: string; header: string }[], rows: any[], filename: string) {
    const csv = this.toCsv(headers, rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Export 4: Top Crimes by Month (Top 10 charges)
  exportTopCrimesByMonth() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingTopCrimes = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      const months = this.buildMonthsList();

      // Aggregate counts per charge and month
      const chargeMonthCounts: Record<string, Record<string, number>> = {};
      const chargeTotals: Record<string, number> = {};
      bookings.forEach(b => {
        const charges = (b as any).charges || [];
        const m = b.unixDate ? moment(Number(b.unixDate)).startOf('month').format('YYYY-MM') : undefined;
        if (!m) return;
        charges.forEach((c: any) => {
          const name = (c?.countCharge || '').trim();
          if (!name) return;
          chargeMonthCounts[name] = chargeMonthCounts[name] || {};
          chargeMonthCounts[name][m] = (chargeMonthCounts[name][m] || 0) + 1;
          chargeTotals[name] = (chargeTotals[name] || 0) + 1;
        });
      });

      // Pick Top 10 by total
      const topCharges = Object.keys(chargeTotals)
        .sort((a, b) => (chargeTotals[b] - chargeTotals[a]))
        .slice(0, 10);

      // Headers: Crime + months + Total
      const headers: { key: string; header: string }[] = [
        { key: 'crime', header: 'Charge (countCharge) name' }
      ];
      months.forEach(m => headers.push({ key: m, header: `Count in ${m}` }));
      headers.push({ key: 'Total', header: 'Total in range (sum across months)' });

      const rows = topCharges.map(crime => {
        const row: any = { crime };
        let total = 0;
        months.forEach(m => {
          const v = chargeMonthCounts[crime]?.[m] || 0;
          row[m] = v;
          total += v;
        });
        row['Total'] = total;
        return row;
      });

      const filename = this.buildFilename('Magistrates_Top_Crimes_By_Month');
      this.downloadCsv(headers, rows, filename);
    }).finally(() => this.loadingTopCrimes = false);
  }

  // Export 5: Top 10 Highest Bonds within range (based on bookings loaded by unixDate)
  exportTop10HighestBonds() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingBonds = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      // Build list like Dashboard: parse bailAmount, build full name, keep bond date
      const items: { name: string; bailAmount: number; bondDate: string }[] = [];

      bookings.forEach((b: any) => {
        let amt = b?.bailAmount;
        if (typeof amt === 'string') {
          amt = this.parseCurrency(amt);
        }
        if (typeof amt !== 'number') {
          amt = this.parseCurrency(amt);
        }
        if (amt && !isNaN(amt)) {
          const fullName = `${b.firstName || ''} ${b.middleName || ''} ${b.lastName || ''}`.trim() || b.offenderName || 'Unknown';
          const bondDate = this.formatDate(b.bailBondIssueDateUnix || b.unixDate);
          items.push({ name: fullName, bailAmount: amt, bondDate });
        }
      });

      const top10 = items.sort((a, b) => b.bailAmount - a.bailAmount).slice(0, 10);

      const headers = [
        { key: 'name', header: 'Offender Name' },
        { key: 'bailAmount', header: 'Bail Amount (numeric)' },
        { key: 'bondDate', header: 'Bond Issue Date (YYYY-MM-DD)' }
      ];

      const filename = this.buildFilename('Magistrates_Top_10_Highest_Bonds');
      this.downloadCsv(headers, top10, filename);
    }).finally(() => this.loadingBonds = false);
  }

  // Export 6: Case Counts by Magistrate by Month
  exportCaseCountsByMagistrate() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingMagCounts = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      const months = this.buildMonthsList();
      // Determine magistrates in range
      const magTotals: Record<string, number> = {};
      const magMonthCounts: Record<string, Record<string, number>> = {};

      bookings.forEach(b => {
        const mag = (b as any).judge;
        if (!mag) return;
        const m = b.unixDate ? moment(Number(b.unixDate)).startOf('month').format('YYYY-MM') : undefined;
        if (!m) return;
        magMonthCounts[mag] = magMonthCounts[mag] || {};
        magMonthCounts[mag][m] = (magMonthCounts[mag][m] || 0) + 1;
        magTotals[mag] = (magTotals[mag] || 0) + 1;
      });

      const magistrates = Object.keys(magTotals).sort((a, b) => magTotals[b] - magTotals[a]);

      const headers: { key: string; header: string }[] = [ { key: 'magistrate', header: 'Magistrate Name' } ];
      months.forEach(m => headers.push({ key: m, header: `Cases heard in ${m}` }));
      headers.push({ key: 'Total', header: 'Total Cases in range' });

      const rows = magistrates.map(mag => {
        const row: any = { magistrate: mag };
        let total = 0;
        months.forEach(m => {
          const v = magMonthCounts[mag]?.[m] || 0;
          row[m] = v;
          total += v;
        });
        row['Total'] = total;
        return row;
      });

      const filename = this.buildFilename('Magistrates_Case_Counts_By_Magistrate_By_Month');
      this.downloadCsv(headers, rows, filename);
    }).finally(() => this.loadingMagCounts = false);
  }

  // Export 7: Cases by Island by Month (Top 10 islands)
  exportCasesByIslandByMonth() {
    const range = this.ensureValidRange();
    if (!range) return;
    this.loadingIslands = true;
    this.fetchBookings(range.start, range.end).then(bookings => {
      const months = this.buildMonthsList();
      const cleanIsland = (s: string) => (s || '')
        .split(',')[0]
        .replace(/bahamas/gi, '')
        .trim()
        .toUpperCase();

      const islandMonthCounts: Record<string, Record<string, number>> = {};
      const islandTotals: Record<string, number> = {};
      bookings.forEach(b => {
        const raw = (b as any).island;
        if (!raw) return;
        const island = cleanIsland(raw);
        if (!island) return;
        const m = b.unixDate ? moment(Number(b.unixDate)).startOf('month').format('YYYY-MM') : undefined;
        if (!m) return;
        islandMonthCounts[island] = islandMonthCounts[island] || {};
        islandMonthCounts[island][m] = (islandMonthCounts[island][m] || 0) + 1;
        islandTotals[island] = (islandTotals[island] || 0) + 1;
      });

      const topIslands = Object.keys(islandTotals).sort((a, b) => islandTotals[b] - islandTotals[a]).slice(0, 10);

      const headers: { key: string; header: string }[] = [ { key: 'island', header: 'Island (cleaned)' } ];
      months.forEach(m => headers.push({ key: m, header: `Cases in ${m}` }));
      headers.push({ key: 'Total', header: 'Total Cases in range' });

      const rows = topIslands.map(island => {
        const row: any = { island };
        let total = 0;
        months.forEach(m => {
          const v = islandMonthCounts[island]?.[m] || 0;
          row[m] = v;
          total += v;
        });
        row['Total'] = total;
        return row;
      });

      const filename = this.buildFilename('Magistrates_Cases_By_Island_By_Month');
      this.downloadCsv(headers, rows, filename);
    }).finally(() => this.loadingIslands = false);
  }

  private buildMonthsList(): string[] {
    const startM = moment(this.startDate, 'YYYY-MM-DD').startOf('month');
    const endM = moment(this.endDate, 'YYYY-MM-DD').startOf('month');
    const months: string[] = [];
    const cursor = startM.clone();
    while (cursor.isSameOrBefore(endM)) {
      months.push(cursor.format('YYYY-MM'));
      cursor.add(1, 'month');
    }
    return months;
  }

  private parseCurrency(v: any): number {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[$,\s]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  }

  // Accepts seconds or milliseconds (string or number) and formats as YYYY-MM-DD
  private formatDate(raw: any): string {
    if (raw === null || raw === undefined || raw === '') return '';
    const n = Number(raw);
    if (!isFinite(n)) return '';
    const ms = n < 1e12 ? n * 1000 : n; // if looks like seconds, convert to ms
    return moment(ms).format('YYYY-MM-DD');
  }

  private toCsv(headers: { key: string; header: string }[], rows: any[]): string {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const headerRow = headers.map(h => escape(h.header)).join(',');
    const dataRows = rows.map(r => headers.map(h => escape(r[h.key])).join(','));
    return [headerRow, ...dataRows].join('\n');
  }
}
