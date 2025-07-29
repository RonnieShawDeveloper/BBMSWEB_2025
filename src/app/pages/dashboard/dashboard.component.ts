import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { ChartData, ChartType, Chart } from "chart.js";
import * as moment from 'moment';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AnnouncementService } from '../../services/announcement.service';
import Swal from 'sweetalert2';

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

  // Chart theme colors
  private chartColors = {
    background: [
      'rgba(0, 240, 255, 0.7)',   // Cyan
      'rgba(0, 123, 255, 0.7)',   // Blue
      'rgba(0, 255, 157, 0.7)',   // Green
      'rgba(255, 56, 96, 0.7)',   // Red
      'rgba(255, 221, 87, 0.7)',  // Yellow
      'rgba(138, 43, 226, 0.7)',  // Purple
      'rgba(255, 165, 0, 0.7)',   // Orange
      'rgba(233, 30, 99, 0.7)',   // Pink
      'rgba(156, 39, 176, 0.7)',  // Deep Purple
      'rgba(63, 81, 181, 0.7)'    // Indigo
    ],
    border: [
      'rgba(0, 240, 255, 1)',     // Cyan
      'rgba(0, 123, 255, 1)',     // Blue
      'rgba(0, 255, 157, 1)',     // Green
      'rgba(255, 56, 96, 1)',     // Red
      'rgba(255, 221, 87, 1)',    // Yellow
      'rgba(138, 43, 226, 1)',    // Purple
      'rgba(255, 165, 0, 1)',     // Orange
      'rgba(233, 30, 99, 1)',     // Pink
      'rgba(156, 39, 176, 1)',    // Deep Purple
      'rgba(63, 81, 181, 1)'      // Indigo
    ],
    line: [
      'rgba(0, 240, 255, 1)',     // Cyan
      'rgba(0, 123, 255, 1)',     // Blue
      'rgba(0, 255, 157, 1)',     // Green
      'rgba(255, 56, 96, 1)'      // Red
    ]
  };

  // Global chart options
  private globalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#1a2a4a', // Dark color for better visibility in light mode
          font: {
            family: "'Roboto Mono', monospace",
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 17, 40, 0.8)',
        titleColor: 'rgba(0, 240, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(0, 240, 255, 0.5)',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          family: "'Roboto Mono', monospace",
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: "'Roboto Mono', monospace",
          size: 12
        },
        displayColors: true,
        boxPadding: 3
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)'
        },
        ticks: {
          color: '#1a2a4a', // Dark color for better visibility in light mode
          font: {
            family: "'Roboto Mono', monospace"
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)'
        },
        ticks: {
          color: '#1a2a4a', // Dark color for better visibility in light mode
          font: {
            family: "'Roboto Mono', monospace"
          }
        }
      }
    }
  };

  // Line chart properties for case progression
  public magistrateCaseProgressionData: ChartData<'line'>;
  public magistrateCaseProgressionChartType: ChartType = 'line';
  public magistrateCaseProgressionOptions: any = {
    ...this.globalChartOptions,
    elements: {
      line: {
        tension: 0.3,
        borderWidth: 2
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
        backgroundColor: 'rgba(10, 17, 40, 1)'
      }
    }
  };

  // Pie chart properties for bail status
  public magistrateBailStatusChartData: ChartData<'pie', number[], string>;
  public magistrateBailStatusChartType: ChartType = 'pie';
  public magistrateBailStatusOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: "'Roboto Mono', monospace",
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 17, 40, 0.8)',
        titleColor: 'rgba(0, 240, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(0, 240, 255, 0.5)',
        borderWidth: 1
      }
    }
  };

  // Horizontal bar chart properties for top 20 charges
  public topChargesData: ChartData<'bar'>;
  public topChargesChartType: ChartType = 'bar';
  public topChargesChartOptions: any = {
    ...this.globalChartOptions,
    indexAxis: 'y',
    plugins: {
      ...this.globalChartOptions.plugins,
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: '#1a2a4a', // Dark color for better visibility in light mode
        font: {
          family: "'Roboto Mono', monospace",
          weight: 'bold'
        },
        formatter: (value) => value
      }
    }
  };

  // Horizontal bar chart properties for Honorable Mentions (Top 10 offenders by bail amount)
  public honorableMentionsData: ChartData<'bar'>;
  public honorableMentionsChartType: ChartType = 'bar';
  public honorableMentionsChartOptions: any = {
    ...this.globalChartOptions,
    indexAxis: 'y',
    plugins: {
      ...this.globalChartOptions.plugins,
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: '#1a2a4a', // Dark color for better visibility in light mode
        font: {
          family: "'Roboto Mono', monospace",
          weight: 'bold'
        },
        formatter: (value) => value
      }
    }
  };

  // Lists for oldest and youngest offenders
  public oldestOffenders: { name: string; age: number }[] = [];
  public youngestOffenders: { name: string; age: number }[] = [];

  // Magistrate case counts chart
  public magistrateCaseCountsData: ChartData<'bar'>;
  public magistrateCaseCountsChartType: ChartType = 'bar';
  public magistrateCaseCountsChartOptions: any = {
    ...this.globalChartOptions,
    indexAxis: 'y',
    plugins: {
      ...this.globalChartOptions.plugins,
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: '#1a2a4a', // Dark color for better visibility in light mode
        font: {
          family: "'Roboto Mono', monospace",
          weight: 'bold'
        },
        formatter: (value) => value
      }
    }
  };

  // Top Islands Chart
  public topIslandsData: ChartData<'bar'>;
  public topIslandsChartType: ChartType = 'bar';
  public topIslandsChartOptions: any = {
    ...this.globalChartOptions,
    indexAxis: 'y',
    plugins: {
      ...this.globalChartOptions.plugins,
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: '#1a2a4a', // Dark color for better visibility in light mode
        font: {
          family: "'Roboto Mono', monospace",
          weight: 'bold'
        },
        formatter: (value) => value
      }
    }
  };

  public startDate: string;
  public endDate: string;
  public isDarkTheme: boolean = false; // Set to false for light mode by default

  constructor(private af: AngularFirestore, private announcementService: AnnouncementService) {
    Chart.register(ChartDataLabels); // Register the datalabels plugin globally
  }


  ngOnInit(): void {
    // Always initialize with light theme
    document.body.classList.add('light-theme');

    this.showAnnouncement();
    // Initialize chart options for Top 10 Charges chart
    this.topChargesChartOptions = {
      ...this.globalChartOptions,
      indexAxis: 'y',
      barPercentage: 0.8,
      categoryPercentage: 0.9,
      scales: {
        ...this.globalChartOptions.scales,
        y: {
          ...this.globalChartOptions.scales.y,
          ticks: {
            ...this.globalChartOptions.scales.y.ticks,
            padding: 10,
            autoSkip: false,
            font: {
              ...this.globalChartOptions.scales.y.ticks.font,
              size: 11
            }
          }
        },
        x: {
          ...this.globalChartOptions.scales.x,
          grid: {
            ...this.globalChartOptions.scales.x.grid,
            display: true
          }
        }
      },
      plugins: {
        ...this.globalChartOptions.plugins,
        datalabels: {
          anchor: 'end',
          align: 'end',
          color: '#1a2a4a', // Dark color for better visibility in light mode
          font: {
            family: "'Roboto Mono', monospace",
            weight: 'bold',
            size: 11
          },
          formatter: (value) => value,
          padding: 6
        }
      }
    };

    this.honorableMentionsChartOptions = {
      indexAxis: 'y',
      plugins: {
        datalabels: {
          anchor: 'center',
          align: 'center',
          formatter: (value) => value // Display the value directly
        }
      }
    };

    this.magistrateCaseCountsChartOptions = {
      indexAxis: 'y',
      plugins: {
        datalabels: {
          anchor: 'center',
          align: 'center',
          formatter: (value) => value // Display the value directly
        }
      }
    };

    this.topIslandsChartOptions = {
      indexAxis: 'y',
      plugins: {
        datalabels: {
          anchor: 'center',
          align: 'center',
          formatter: (value) => value // Display the value directly
        }
      }
    };

    const sixMonthsAgo = moment().subtract(6, 'months').startOf('day');
    const sixMonthsAgoUnixString = sixMonthsAgo.valueOf().toString(); // Convert to milliseconds string

    this.startDate = sixMonthsAgo.format('MMMM D, YYYY');
    this.endDate = moment().format('MMMM D, YYYY');

    // Fetch bookings for Magistrate Court cases from the last 6 months
    this.af.collection('magistrateBookings', ref => ref.where('unixDate', '>=', sixMonthsAgoUnixString)).get().subscribe(snapshot => {
      this.magistrateBookings = snapshot.docs.map(doc => doc.data());
      this.updateMagistrateCaseProgressionChart();
      this.updateMagistrateBailStatusChart();
      this.updateTopChargesChart();
      this.updateHonorableMentionsChart();
      this.updateOldestAndYoungestOffenders();
      this.updateMagistrateCaseCountsChart();
      this.updateTopIslandsChart(); // Call the new method
    });
  }

  private showAnnouncement(): void {
    if (this.announcementService.shouldShowAnnouncement()) {
      const announcement = this.announcementService.getAnnouncement();
      Swal.fire({
        title: announcement.title,
        html: announcement.html,
        icon: 'info',
        confirmButtonText: 'Got it!',
        width: '600px'
      }).then(() => {
        this.announcementService.markAsSeen();
      });
    }
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

    // Create background colors array based on number of statuses
    const backgroundColors = this.chartColors.background.slice(0, labels.length);
    const borderColors = this.chartColors.border.slice(0, labels.length);

    this.magistrateBailStatusChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
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
        {
          data: openCasesData,
          label: 'Total Open Cases',
          borderColor: this.chartColors.line[0], // Cyan
          backgroundColor: 'rgba(0, 240, 255, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          data: newCasesData,
          label: 'New Cases',
          borderColor: this.chartColors.line[1], // Blue
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          data: approvedData,
          label: 'Bail Approved',
          borderColor: this.chartColors.line[2], // Green
          backgroundColor: 'rgba(0, 255, 157, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          data: deniedData,
          label: 'Bail Denied',
          borderColor: this.chartColors.line[3], // Red
          backgroundColor: 'rgba(255, 56, 96, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          data: totalCasesData,
          label: 'Total Cases',
          borderColor: 'rgba(255, 221, 87, 1)', // Yellow
          backgroundColor: 'rgba(255, 221, 87, 0.1)',
          fill: true,
          tension: 0.3
        }
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
      .slice(0, 10); // Changed from 20 to 10 charges

    const labels = sortedCharges.map(([chargeName]) => chargeName);
    const data = sortedCharges.map(([, count]) => count);

    this.topChargesData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Top 10 Charges',
          backgroundColor: this.chartColors.background.slice(0, data.length),
          borderColor: this.chartColors.border.slice(0, data.length),
          borderWidth: 1
        }
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

    const topOffenders = offenderBails.slice(0, 10); // Strictly get top 10

    const labels = topOffenders.map(offender => offender.name);
    const data = topOffenders.map(offender => offender.bailAmount);

    this.honorableMentionsData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Top 10 Highest Bail Amounts',
          backgroundColor: this.chartColors.background.slice(0, data.length),
          borderColor: this.chartColors.border.slice(0, data.length),
          borderWidth: 1
        }
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
    const sortedMagistrates = Object.entries(magistrateCounts)
      .sort((a, b) => a[1] - b[1]); // Sort by count, lowest to highest

    const labels = sortedMagistrates.map(([magistrateName]) => magistrateName);
    const data = sortedMagistrates.map(([, count]) => count);

    this.magistrateCaseCountsData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Total Cases',
          backgroundColor: this.chartColors.background.slice(0, data.length),
          borderColor: this.chartColors.border.slice(0, data.length),
          borderWidth: 1
        }
      ]
    };
  }

  // New method to update the Top Islands chart
  private updateTopIslandsChart(): void {
    const islandCounts: { [key: string]: number } = {};

    this.magistrateBookings.forEach(booking => {
      let islandName = booking.island;
      if (islandName) {
        // Remove text after comma, remove "Bahamas" (case-insensitive), then trim and uppercase
        islandName = islandName.split(',')[0] // Remove text after comma
                               .replace(/bahamas/gi, '') // Remove "Bahamas" case-insensitive
                               .trim()
                               .toUpperCase();
        if (islandName) { // Ensure islandName is not empty after cleaning
          islandCounts[islandName] = (islandCounts[islandName] || 0) + 1;
        }
      }
    });

    const sortedIslands = Object.entries(islandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Get top 5 islands

    const labels = sortedIslands.map(([islandName]) => islandName);
    const data = sortedIslands.map(([, count]) => count);

    this.topIslandsData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Top 5 Islands',
          backgroundColor: this.chartColors.background.slice(0, data.length),
          borderColor: this.chartColors.border.slice(0, data.length),
          borderWidth: 1
        }
      ]
    };
  }

}
