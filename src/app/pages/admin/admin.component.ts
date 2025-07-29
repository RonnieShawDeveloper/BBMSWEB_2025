import {Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import Swal from "sweetalert2";
import {Members} from "../../models/members";
import {Router} from "@angular/router";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat/app";
import {Table} from "primeng/table";
import { Timeline, DataSet } from 'vis';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('timeline') timelineContainer!: ElementRef;
  items = new DataSet();
  timeline: Timeline | undefined;

  currentMember: Members = JSON.parse(localStorage.getItem('member') || '{}');
  allMembers: Members[] = [];
  originalAllMembers: Members[] = [];
  showLoggedInTodayOnly = false;
  subscriptions: any[] = [];
  dt1: Table | undefined;

  // Chart data properties
  roleDistributionData: ChartData<'doughnut'> = {
    labels: ['Admin', 'Judge', 'Judicial Clerk', 'Magistrate', 'Magistrate Clerk', 'Private Attorney', 'DPP Office', 'Registrar', 'Registrar Staff'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#3498db', // Admin
          '#2c3e50', // Judge
          '#9b59b6', // Judicial Clerk
          '#e74c3c', // Magistrate
          '#f39c12', // Magistrate Clerk
          '#1abc9c', // Private Attorney
          '#d35400', // DPP Office
          '#27ae60', // Registrar
          '#16a085'  // Registrar Staff
        ]
      }
    ]
  };

  chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw as number;
            const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Today's logins by role chart data
  todayLoginsByRoleData: ChartData<'bar'> = {
    labels: ['Admin', 'Judge', 'Judicial Clerk', 'Magistrate', 'Magistrate Clerk',
             'Private Attorney', 'DPP Office', 'Registrar', 'Registrar Staff'],
    datasets: [
      {
        label: 'Logged in Today',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#3498db', '#2c3e50', '#9b59b6', '#e74c3c', '#f39c12',
          '#1abc9c', '#d35400', '#27ae60', '#16a085'
        ]
      }
    ]
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',  // Makes it a horizontal bar chart
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return `${value} user${value !== 1 ? 's' : ''}`;
          }
        }
      }
    }
  };

  constructor(private db: AngularFirestore, private router: Router, private auth: AngularFireAuth) {
    console.log('currentMember',this.currentMember)
    if(this.currentMember.authAdmin !== true ){
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You must have Admin access to view this page!',
      })
      router.navigate(['/']);
    }

    // Get the snapshotchanges of the members collection
    this.subscriptions.push(db.collection('members').snapshotChanges().subscribe((data: any) => {
      this.allMembers = [];
      data.forEach((item: any) => {
        let member: Members = item.payload.doc.data();
        member.id = item.payload.doc.id;
        this.allMembers.push(member);
      });
      // Loop through the members records and check if lastLogin and memberSince are undefined and if so, set them to 'No Data'
      this.allMembers.forEach((member) => {
        // Check the fName, mName and lName and capitalize the first letter and lowercase the rest
        if(member.fName) {
          member.fName = member.fName.charAt(0).toUpperCase() + member.fName.slice(1).toLowerCase();
        }
        if(member.mName) {
          member.mName = member.mName.charAt(0).toUpperCase() + member.mName.slice(1).toLowerCase();
        }
        if(member.lName) {
          member.lName = member.lName.charAt(0).toUpperCase() + member.lName.slice(1).toLowerCase();
        }
        if(!member.lastLogin) {
          member.lastLogin = 'No Data';
        }
        if(!member.memberSince) {
          member.memberSince = 'No Data';
        }
      });
      // Sort the members array by lName alphabetically
      this.allMembers.sort((a, b) => {
        if(a.lName < b.lName) { return -1; }
        if(a.lName > b.lName) { return 1; }
        return 0;
      })
      // Check for duplicate email addresses
      // this.checkDuplicates();
      this.originalAllMembers = [...this.allMembers]; // Create a backup of the original list
      if (this.showLoggedInTodayOnly) {
        this.applyTodayFilter(); // Re-apply the filter if it was active
      }

      // Update dashboard charts and statistics with the latest data
      this.updateChartData();
      this.updateTodayLoginsByRole();
    }));
  }



  ngAfterViewInit(): void {

  }

  localTime(timestamp: any): string {
    if(timestamp == 'No Data' || timestamp == null) {
      return timestamp;
    }
    // Convert GMT time in the format of 'Thu, 19 Aug 2021 13:07:45 GMT' to local time
    let date = new Date(timestamp);
    return date.toLocaleString();
  }
  filterGlobal(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const inputValue = inputElement.value; // Safe to access value now
    this.dt1.filterGlobal(inputValue, 'contains');
  }

  checkTime(timestamp: any): boolean {
    // Check if the time is 'No Data' or null and if so, return 'No Data'
    if(timestamp == 'No Data' || timestamp == null) {
      return false;
    }
    // Check if the time is less than 12 hours ago and if so, return true else return false
    let date = new Date(timestamp);
    let now = new Date();
    let diff = now.getTime() - date.getTime();
    let hours = Math.floor(diff / 1000 / 60 / 60);
    if(hours <= 12) {
      return true;
    } else {
      return false;
    }
  }

  clear(table: Table) {
    table.clear();
    let searchInput = document.getElementById('searchBox') as HTMLInputElement;
    searchInput.value = '';
  }

  duplicateChecked: boolean = false;
  checkDuplicates() {
    if(this.duplicateChecked) {
      return;
    }
    this.duplicateChecked = true;
    // Check for duplicate email addresses
    let duplicates: string[] = [];
    this.allMembers.forEach((member) => {
      let count = 0;
      this.allMembers.forEach((m) => {
        if(member.email == m.email) {
          count++;
        }
      });
      if(count > 1) {
        duplicates.push('<span style="font-size: 10px">ID '+member.id+' UID:'+member.uid+'</span><br>'+member.name+' '+ member.email+'<hr>');
      }
    });
    if(duplicates.length > 0) {
      let msg = '';
      duplicates.forEach((email) => {
        msg += email+'<br>'
      });
      Swal.fire({
        icon: 'error',
        title: 'Duplicate Email Addresses Found',
        width: 600,
        heightAuto: true,
        html: '<b>Duplicate records have been found for these accounts:</b><div style="overflow-y: scroll; height:400px; width: 100%">'+msg+'</div>These will need to be corrected through the developer.',
      })
    }
  }



  ngOnInit(): void {
    // Initialize the charts when component loads
    this.updateChartData();
    this.updateTodayLoginsByRole();
  }

  // Statistics methods for dashboard
  getTotalUsers(): number {
    return this.originalAllMembers.length;
  }

  getActiveUsers(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.originalAllMembers.filter(member => {
      if (!member.lastLogin || member.lastLogin === 'No Data') {
        return false;
      }
      const loginDate = new Date(member.lastLogin);
      return loginDate >= thirtyDaysAgo;
    }).length;
  }

  getLoggedInToday(): number {
    const today = new Date();
    return this.originalAllMembers.filter(member => {
      if (!member.lastLogin || member.lastLogin === 'No Data') {
        return false;
      }
      const loginDate = new Date(member.lastLogin);
      return loginDate.getFullYear() === today.getFullYear() &&
             loginDate.getMonth() === today.getMonth() &&
             loginDate.getDate() === today.getDate();
    }).length;
  }

  getPendingApprovals(): number {
    return this.originalAllMembers.filter(member => member.status === 'New').length;
  }

  // Update chart data based on current user information
  updateChartData(): void {
    // Count users with each role
    const roleCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.originalAllMembers.forEach(member => {
      if (member.authAdmin) roleCounts[0]++;
      if (member.authJudge) roleCounts[1]++;
      if (member.authJudgeClerk) roleCounts[2]++;
      if (member.authMagistrate) roleCounts[3]++;
      if (member.authMagistrateClerk) roleCounts[4]++;
      if (member.authPrivAttorney) roleCounts[5]++;
      if (member.authAttorney) roleCounts[6]++;
      if (member.authRegistrar) roleCounts[7]++;
      if (member.authRegistrarClerk) roleCounts[8]++;
    });

    // Update the chart data
    this.roleDistributionData.datasets[0].data = roleCounts;
  }

  // Update today's logins by role chart data
  updateTodayLoginsByRole(): void {
    const today = new Date();
    const roleCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.originalAllMembers.forEach(member => {
      // Check if the user logged in today
      if (member.lastLogin && member.lastLogin !== 'No Data') {
        const loginDate = new Date(member.lastLogin);
        const isLoggedInToday = loginDate.getFullYear() === today.getFullYear() &&
                              loginDate.getMonth() === today.getMonth() &&
                              loginDate.getDate() === today.getDate();

        if (isLoggedInToday) {
          // Count by role
          if (member.authAdmin) roleCounts[0]++;
          if (member.authJudge) roleCounts[1]++;
          if (member.authJudgeClerk) roleCounts[2]++;
          if (member.authMagistrate) roleCounts[3]++;
          if (member.authMagistrateClerk) roleCounts[4]++;
          if (member.authPrivAttorney) roleCounts[5]++;
          if (member.authAttorney) roleCounts[6]++;
          if (member.authRegistrar) roleCounts[7]++;
          if (member.authRegistrarClerk) roleCounts[8]++;
        }
      }
    });

    // Update the chart data
    this.todayLoginsByRoleData.datasets[0].data = roleCounts;
  }

  getStyle(status: string) {
    if (status == 'New') {
      return 'background-color: yellow';
    } else if(status == 'Disapproved')  {
      return 'background-color: red; color: white';
    } else {
      return 'background-color: green; color: white';
    }
  }

  getWarnings(member) {
    if(!member.id) {
      return 'background-color: red; color: white';
    }
  }

  doStatusChange(evt, member: Members) {
    Swal.fire({
      title: 'Event Status Change',
      text: 'Are you sure you want to change the status of this event to '+evt.target.value+'?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        member.status = evt.target.value;
        // Update the member in the database
        this.db.collection('members').doc(member.id).set(member, {merge: true}).then(() => {
          Swal.fire({
            toast: true,
            icon: 'success',
            title: 'Success',
            text: 'Member status updated successfully!',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            position: 'top-end'
          })
        }).catch((error) => {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong!',
          })
        })
      }
    });
  }

  doRole(item: String, member: Members) {

    switch (item) {
      case 'admin':
        member.authAdmin = !member.authAdmin;
        break;
      case 'judge':
        member.authJudge = !member.authJudge;
        break;
      case 'judgeClerk':
        member.authJudgeClerk = !member.authJudgeClerk;
        break;
      case 'magistrate':
        member.authMagistrate = !member.authMagistrate;
        break;
      case 'magistrateClerk':
        member.authMagistrateClerk = !member.authMagistrateClerk;
        break;
      case 'private':
        member.authPrivAttorney = !member.authPrivAttorney;
        break;
      case 'dpp':
        member.authAttorney = !member.authAttorney;
        break;
      case 'registrar':
        member.authRegistrar = !member.authRegistrar;
        break;
      case 'registrarClerk':
        member.authRegistrarClerk = !member.authRegistrarClerk;
        break;
    }
    // Update the member in the database
    this.db.collection('members').doc(member.id).set(member, {merge: true}).then(() => {
      Swal.fire({
        toast: true,
        icon: 'success',
        title: 'Success',
        text: 'Member role updated successfully!',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        position: 'top-end'
      })
    }).catch((error) => {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Something went wrong!',
      })
    })

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    } );
  }

  toggleLoggedInTodayFilter() {
    this.showLoggedInTodayOnly = !this.showLoggedInTodayOnly;
    if (this.showLoggedInTodayOnly) {
      this.applyTodayFilter();
    } else {
      this.allMembers = [...this.originalAllMembers]; // Restore from backup
    }
  }

  applyTodayFilter() {
    const today = new Date();
    this.allMembers = this.originalAllMembers.filter(member => {
      if (!member.lastLogin || member.lastLogin === 'No Data') {
        return false;
      }
      // lastLogin is in format "Wed, 10 Apr 2024 00:35:53 GMT"
      const loginDate = new Date(member.lastLogin);

      // Compare year, month, and day components
      return loginDate.getFullYear() === today.getFullYear() &&
             loginDate.getMonth() === today.getMonth() &&
             loginDate.getDate() === today.getDate();
    });
  }
}
