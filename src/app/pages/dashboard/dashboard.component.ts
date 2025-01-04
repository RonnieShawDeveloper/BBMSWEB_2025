import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { ChartData, ChartType } from "chart.js";
import * as moment from 'moment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  // GPT properties
  userQuery: string = '';
  gptResponse: string = '';

  // Arrays to store bookings data
  private magistrateBookings: any[] = [];

  // Line chart properties for case progression
  public magistrateCaseProgressionData: ChartData<'line'>;
  public magistrateCaseProgressionChartType: ChartType = 'line';

  // Pie chart properties for bail status
  public magistrateBailStatusChartData: ChartData<'pie', number[], string>;
  public magistrateBailStatusChartType: ChartType = 'pie';

  // Horizontal bar chart properties for top 20 charges
  public topChargesData: ChartData<'bar'>;
  public topChargesChartType: ChartType = 'bar';

  // Horizontal bar chart properties for Honorable Mentions (Top 10 offenders by bail amount)
  public honorableMentionsData: ChartData<'bar'>;
  public honorableMentionsChartType: ChartType = 'bar';

  // Lists for oldest and youngest offenders
  public oldestOffenders: { name: string; age: number }[] = [];
  public youngestOffenders: { name: string; age: number }[] = [];

  public magistrateCaseCountsData: ChartData<'bar'>;
  public magistrateCaseCountsChartType: ChartType = 'bar';

  constructor(private af: AngularFirestore) {}

  ngOnInit(): void {
    // Fetch all bookings for Magistrate Court cases
    this.af.collection('magistrateBookings').get().subscribe(snapshot => {
      this.magistrateBookings = snapshot.docs.map(doc => doc.data());
      this.updateMagistrateCaseProgressionChart();
      this.updateMagistrateBailStatusChart();
      this.updateTopChargesChart();
      this.updateHonorableMentionsChart();
      this.updateOldestAndYoungestOffenders();
      this.updateMagistrateCaseCountsChart();
    });
  }


  // Method to update the Magistrate Court bail status pie chart
  private updateMagistrateBailStatusChart(): void {
    const bailStatusCounts: { [key: string]: number } = {};

    this.magistrateBookings.forEach(booking => {
      const status = booking.bailStatus;
      if (status) {
        const uppercaseStatus = status.trim().toUpperCase();
        bailStatusCounts[uppercaseStatus] = (bailStatusCounts[uppercaseStatus] || 0) + 1;
      }
    });

    const labels = Object.keys(bailStatusCounts);
    const data = Object.values(bailStatusCounts);

    this.magistrateBailStatusChartData = {
      labels: labels,
      datasets: [{ data: data, backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
    };
  }

  // Method to update the Magistrate Court case progression line chart
  private updateMagistrateCaseProgressionChart(): void {
    const openCasesByMonth: { [key: string]: number } = {};
    const newCasesByMonth: { [key: string]: number } = {};
    const approvedByMonth: { [key: string]: number } = {};
    const deniedByMonth: { [key: string]: number } = {};
    const totalCasesByMonth: { [key: string]: number } = {}; // Track total cases over time

    const sortedBookings = this.magistrateBookings.sort((a, b) => a.unixDate - b.unixDate);

    let cumulativeOpenCases = 0;
    let cumulativeTotalCases = 0;

    sortedBookings.forEach(booking => {
      if (!booking.unixDate) return;
      const date = moment.unix(booking.unixDate / 1000);
      if (!date.isValid()) return;

      const month = date.startOf('month').format('YYYY-MM');

      if (!newCasesByMonth[month]) {
        newCasesByMonth[month] = 0;
        openCasesByMonth[month] = cumulativeOpenCases;
        approvedByMonth[month] = 0;
        deniedByMonth[month] = 0;
        totalCasesByMonth[month] = cumulativeTotalCases;
      }

      cumulativeTotalCases += 1;
      totalCasesByMonth[month] = cumulativeTotalCases;

      if (booking.bookingStatus === 'Open') {
        newCasesByMonth[month] += 1;
        cumulativeOpenCases += 1;
      } else if (booking.bookingStatus === 'Closed') {
        cumulativeOpenCases = Math.max(0, cumulativeOpenCases - 1);
      }

      if (booking.bailStatus) {
        const status = booking.bailStatus.trim().toLowerCase();
        if (status === 'approved') {
          approvedByMonth[month] += 1;
        } else if (status === 'denied') {
          deniedByMonth[month] += 1;
        }
      }

      openCasesByMonth[month] = cumulativeOpenCases;
    });

    const labels = Object.keys(openCasesByMonth).sort();
    const openCasesData = labels.map(label => openCasesByMonth[label]);
    const newCasesData = labels.map(label => newCasesByMonth[label]);
    const approvedData = labels.map(label => approvedByMonth[label]);
    const deniedData = labels.map(label => deniedByMonth[label]);
    const totalCasesData = labels.map(label => totalCasesByMonth[label]);

    this.magistrateCaseProgressionData = {
      labels: labels,
      datasets: [
        { data: openCasesData, label: 'Total Open Cases', borderColor: 'blue', backgroundColor: 'rgba(0, 0, 255, 0.2)', fill: true },
        { data: newCasesData, label: 'New Cases', borderColor: 'red', backgroundColor: 'rgba(255, 0, 0, 0.2)', fill: true },
        { data: approvedData, label: 'Bail Approved', borderColor: 'green', backgroundColor: 'rgba(0, 255, 0, 0.2)', fill: true },
        { data: deniedData, label: 'Bail Denied', borderColor: 'purple', backgroundColor: 'rgba(128, 0, 128, 0.2)', fill: true },
        { data: totalCasesData, label: 'Total Cases', borderColor: 'orange', backgroundColor: 'rgba(255, 165, 0, 0.2)', fill: true }
      ]
    };
  }

  // Method to update the top charges horizontal bar chart
  private updateTopChargesChart(): void {
    const chargeCounts: { [key: string]: number } = {};

    this.magistrateBookings.forEach(booking => {
      const charges = booking.charges || [];
      charges.forEach(charge => {
        const chargeName = charge.countCharge;
        if (chargeName) {
          chargeCounts[chargeName] = (chargeCounts[chargeName] || 0) + 1;
        }
      });
    });

    const sortedCharges = Object.entries(chargeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const labels = sortedCharges.map(([chargeName]) => chargeName);
    const data = sortedCharges.map(([, count]) => count);

    this.topChargesData = {
      labels: labels,
      datasets: [
        { data: data, label: 'Top 20 Charges', backgroundColor: 'rgba(54, 162, 235, 0.6)' }
      ]
    };
  }

  // Method to update the Honorable Mentions chart (Top 10 offenders by bail amount)
  private updateHonorableMentionsChart(): void {
    const offenderBails: { name: string; bailAmount: number }[] = [];

    this.magistrateBookings.forEach(booking => {
      let bailAmount = booking.bailAmount;

      if (typeof bailAmount === 'string') {
        bailAmount = parseFloat(bailAmount.replace('$', ''));
      }

      if (bailAmount && !isNaN(bailAmount)) {
        const fullName = `${booking.firstName || ''} ${booking.middleName || ''} ${booking.lastName || ''}`.trim();
        offenderBails.push({ name: fullName, bailAmount: bailAmount });
      }
    });

    offenderBails.sort((a, b) => b.bailAmount - a.bailAmount);

    const topOffenders = [];
    for (const offender of offenderBails) {
      if (topOffenders.length < 10 || offender.bailAmount === topOffenders[topOffenders.length - 1].bailAmount) {
        topOffenders.push(offender);
      } else {
        break;
      }
    }

    const labels = topOffenders.map(offender => offender.name);
    const data = topOffenders.map(offender => offender.bailAmount);

    this.honorableMentionsData = {
      labels: labels,
      datasets: [
        { data: data, label: 'Top 10 Highest Bail Amounts', backgroundColor: 'rgba(255, 99, 132, 0.6)' }
      ]
    };
  }

// Method to update the lists of oldest and youngest offenders without duplicates
  private updateOldestAndYoungestOffenders(): void {
    const offendersWithAge: { name: string; age: number }[] = [];

    // Populate offendersWithAge with name and calculated age
    this.magistrateBookings.forEach(booking => {
      const dob = booking.dob;
      if (dob) {
        const age = moment().diff(moment(dob, 'YYYY-MM-DD'), 'years');
        const fullName = `${booking.firstName || ''} ${booking.middleName || ''} ${booking.lastName || ''}`.trim();
        offendersWithAge.push({ name: fullName, age: age });
      }
    });

    // Create a Set to track unique offender names
    const uniqueNames = new Set<string>();
    const uniqueOffenders = offendersWithAge.filter(offender => {
      if (uniqueNames.has(offender.name)) {
        return false; // Exclude duplicates
      } else {
        uniqueNames.add(offender.name); // Track unique name
        return true; // Include in unique list
      }
    });

    // Sort by descending age for oldest offenders and get top 5
    this.oldestOffenders = [...uniqueOffenders]
      .sort((a, b) => b.age - a.age)
      .slice(0, 5);

    // Sort by ascending age for youngest offenders and get top 5
    this.youngestOffenders = [...uniqueOffenders]
      .sort((a, b) => a.age - b.age)
      .slice(0, 5);

    // Debugging output to verify results
    console.log('Top 5 Oldest Offenders:', this.oldestOffenders);
    console.log('Top 5 Youngest Offenders:', this.youngestOffenders);
  }

  // Method to update the Magistrate case counts chart
  private updateMagistrateCaseCountsChart(): void {
    const magistrateCounts: { [key: string]: number } = {};

    // Aggregate case counts for each magistrate
    this.magistrateBookings.forEach(booking => {
      const magistrateName = booking.judge;
      if (magistrateName) {
        magistrateCounts[magistrateName] = (magistrateCounts[magistrateName] || 0) + 1;
      }
    });

    // Prepare labels and data for the chart
    const labels = Object.keys(magistrateCounts);
    const data = Object.values(magistrateCounts);

    this.magistrateCaseCountsData = {
      labels: labels,
      datasets: [
        { data: data, label: 'Total Cases', backgroundColor: 'rgba(75, 192, 192, 0.6)' }
      ]
    };
  }

}
