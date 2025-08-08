import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Hearings } from "../../../models/hearings";
import Swal from "sweetalert2";
import { HearingServiceService } from "../../../services/hearing-service.service";
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BookingEvents } from "../../../models/events";
import { Offender } from "../../../models/offender";
import { Count } from "../../../models/count";
import { KioskCheckin } from "../../../models/kiosk-checkin";
import * as moment from "moment";
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-hearing-view',
  templateUrl: './hearing-view.component.html',
  styleUrls: ['./hearing-view.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [
        animate('0.5s ease-in-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideInRight', [
      state('void', style({ transform: 'translateX(100%)' })),
      transition(':enter', [
        animate('0.5s ease-out', style({ transform: 'translateX(0)' }))
      ])
    ]),
    trigger('slideInLeft', [
      state('void', style({ transform: 'translateX(-100%)' })),
      transition(':enter', [
        animate('0.5s ease-out', style({ transform: 'translateX(0)' }))
      ])
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', [
        animate('0.3s ease-in-out')
      ])
    ])
  ]
})
export class HearingViewComponent implements OnInit {
  @Input() hearings: Hearings;
  @Output() exitHearingView: EventEmitter<boolean> = new EventEmitter<boolean>();

  // Data properties
  offender: Offender = {};
  bookingEvents: BookingEvents[] = [];
  counts: Count[] = [];
  remandLink: string = '';
  dppLink: string = '';
  surety1Data: any = null;
  surety2Data: any = null;

  // Kiosk check-in data
  kioskCheckins: KioskCheckin[] = [];
  missedCheckins: any[] = [];
  isLoadingCheckins: boolean = false;

  // UI state properties
  activeSection: string = 'overview'; // Default active section

  // Animation states
  animationStates: { [key: string]: string } = {
    offenderPanel: 'expanded',
    documentsPanel: 'collapsed',
    hearingPanel: 'collapsed',
    bailPanel: 'collapsed',
    suretyPanel: 'collapsed',
    kioskPanel: 'collapsed'
  };

  constructor(
    private hs: HearingServiceService,
    private af: AngularFirestore
  ) {}

  ngOnInit(): void {
    // Load offender data
    if (this.hearings && this.hearings.offenderID) {
      this.af.collection('offenders').doc(this.hearings.offenderID).get().subscribe(doc => {
        if (doc.exists) {
          this.offender = doc.data() as Offender;
        }
      });
    }

    // Load counts/charges
    if (this.hearings && this.hearings.bookingID) {
      this.af.collection('counts', ref =>
        ref.where('bookingID', '==', this.hearings.bookingID)
      ).get().subscribe(querySnapshot => {
        querySnapshot.forEach(doc => {
          const count = doc.data() as Count;
          this.counts.push(count);
        });
      });
    }

    // Load booking events
    if (this.hearings && this.hearings.bookingID) {
      this.af.collection('BookingEvents', ref =>
        ref.where('bookingID', '==', this.hearings.bookingID)
      ).get().subscribe(querySnapshot => {
        querySnapshot.forEach(doc => {
          const event = doc.data() as BookingEvents;
          this.bookingEvents.push(event);

          // Check for remand warrant and DPP response
          if (event.type === 'remand_warrant') {
            this.remandLink = event.link;
          } else if (event.type === 'dpp_affidavit') {
            this.dppLink = event.link;
          }
        });
      });
    }

    // Load surety data if available
    if (this.hearings.suretorNIB) {
      this.fetchSuretyData(this.hearings.suretorNIB, true);
    }

    if (this.hearings.suretor2NIB) {
      this.fetchSuretyData(this.hearings.suretor2NIB, false);
    }

    // Load kiosk check-ins if bail was granted
    if (this.hearings.grantBailChecked) {
      this.loadKioskCheckins();
    }
  }

  // Fetch surety data
  fetchSuretyData(suretorNIB: string, isSurety1: boolean): void {
    this.af.collection('sureties', ref =>
      ref.where('nib', '==', suretorNIB)
    ).get().subscribe(doc => {
      if (!doc.empty) {
        const suretyData = doc.docs[0].data();
        if (isSurety1) {
          this.surety1Data = suretyData;
        } else {
          this.surety2Data = suretyData;
        }
      }
    });
  }

  // Format timestamp for display
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';

    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US');
    }

    return new Date(timestamp).toLocaleDateString('en-US');
  }

  // Set active section
  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  // Toggle panel expansion
  togglePanel(panel: string): void {
    this.animationStates[panel] = this.animationStates[panel] === 'expanded' ? 'collapsed' : 'expanded';
  }

  // View bail application
  showApplication(): void {
    window.open(this.hearings.bailAppLink, '_blank');
  }

  // View remand warrant
  showRemandWarrant(): void {
    if (this.remandLink) {
      window.open(this.remandLink, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No Remand Warrant',
        text: 'No remand warrant has been uploaded for this case.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  }

  // View DPP response
  showDPPResponse(): void {
    if (this.dppLink) {
      window.open(this.dppLink, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No DPP Response',
        text: 'No DPP response has been uploaded for this case.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  }

  // View bail bond
  doShowBailBond(): void {
    if (this.hearings.bailBondLink) {
      window.open(this.hearings.bailBondLink, '_blank');
    }
  }

  // Load kiosk check-ins
  loadKioskCheckins(): void {
    this.isLoadingCheckins = true;

    if (!this.hearings.id) {
      this.isLoadingCheckins = false;
      return;
    }

    this.af.collection('kioskCheckins', ref =>
      ref.where('hearingID', '==', this.hearings.id)
      .orderBy('checkinDate', 'desc')
    ).get().subscribe(
      querySnapshot => {
        this.kioskCheckins = [];
        querySnapshot.forEach(doc => {
          const checkin = doc.data() as KioskCheckin;
          // Convert timestamp to date if needed
          this.kioskCheckins.push(checkin);
        });

        this.detectMissedCheckins();
        this.isLoadingCheckins = false;
      },
      error => {
        console.error('Error loading kiosk check-ins:', error);
        this.isLoadingCheckins = false;
      }
    );
  }

  // Check if a check-in is compliant
  checkCompliance(checkin: KioskCheckin): boolean {
    if (!checkin || !checkin.datetime) return false;

    // Get the day of the week (0-6, where 0 is Sunday)
    const checkinDate = new Date(parseInt(checkin.unix) * 1000);
    const dayOfWeek = checkinDate.getDay();

    // Check if this day was required
    const isDayRequired =
      (dayOfWeek === 0 && this.hearings.sundayChecked) ||
      (dayOfWeek === 1 && this.hearings.mondayChecked) ||
      (dayOfWeek === 2 && this.hearings.tuesdayChecked) ||
      (dayOfWeek === 3 && this.hearings.wednesdayChecked) ||
      (dayOfWeek === 4 && this.hearings.thursdayChecked) ||
      (dayOfWeek === 5 && this.hearings.fridayChecked) ||
      (dayOfWeek === 6 && this.hearings.saturdayChecked);

    if (!isDayRequired) return true; // Not required to check in on this day

    // Check if the time was before the required time
    const checkinHour = checkinDate.getHours();
    const requiredHour = this.getRequiredHour();

    return checkinHour <= requiredHour;
  }

  // Get the required hour for check-in
  getRequiredHour(): number {
    if (this.hearings.threepmChecked) return 15;
    if (this.hearings.fourpmChecked) return 16;
    if (this.hearings.fivepmChecked) return 17;
    if (this.hearings.sixpmChecked) return 18;
    if (this.hearings.sevenpmChecked) return 19;
    if (this.hearings.eightpmChecked) return 20;
    if (this.hearings.ninepmChecked) return 21;
    if (this.hearings.tenpmChecked) return 22;
    return 17; // Default to 5 PM
  }

  // Detect missed check-ins
  detectMissedCheckins(): void {
    if (!this.hearings.grantBailChecked || !this.hearings.bailReportDays) {
      this.missedCheckins = [];
      return;
    }

    // Get the required days
    const requiredDays = [];
    if (this.hearings.sundayChecked) requiredDays.push(0);
    if (this.hearings.mondayChecked) requiredDays.push(1);
    if (this.hearings.tuesdayChecked) requiredDays.push(2);
    if (this.hearings.wednesdayChecked) requiredDays.push(3);
    if (this.hearings.thursdayChecked) requiredDays.push(4);
    if (this.hearings.fridayChecked) requiredDays.push(5);
    if (this.hearings.saturdayChecked) requiredDays.push(6);

    if (requiredDays.length === 0) {
      this.missedCheckins = [];
      return;
    }

    // Get the date bail was granted (using hearing creation date as a fallback)
    const bailGrantedDate = new Date(parseInt(this.hearings.unixDate || '0') * 1000);
    const today = new Date();

    // Create a map of check-in dates
    const checkinMap = new Map();
    this.kioskCheckins.forEach(checkin => {
      const date = new Date(parseInt(checkin.unix) * 1000);
      const dateString = date.toDateString();
      checkinMap.set(dateString, checkin);
    });

    // Check each day from bail granted to today
    const missed = [];
    const currentDate = new Date(bailGrantedDate);

    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();

      // If this day is required
      if (requiredDays.includes(dayOfWeek)) {
        const dateString = currentDate.toDateString();

        // If no check-in for this date
        if (!checkinMap.has(dateString)) {
          missed.push({
            date: new Date(currentDate),
            day: this.getDayName(dayOfWeek),
            requiredTime: this.getRequiredTimeString(this.getRequiredHour())
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.missedCheckins = missed;
  }

  // Get day name
  getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  // Get required time string
  getRequiredTimeString(hour: number): string {
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  }

  // Convert Unix date to readable format
  convertUnixDate(unixDate: string): string {
    if (!unixDate) {
      return 'N/A';
    }

    // If unixDate is in milliseconds, convert to seconds
    if (unixDate.length > 10) {
      unixDate = unixDate.substring(0, 10);
    }

    const date = new Date(parseInt(unixDate) * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Humanize date for relative time display
  humanizeDate(unixDate: string): string {
    if (!unixDate) {
      return '';
    }

    // If unixDate is in milliseconds, convert to seconds
    let timestamp = parseInt(unixDate);
    if (unixDate.length > 10) {
      timestamp = Math.floor(timestamp / 1000);
    }

    return moment(timestamp * 1000).fromNow();
  }

  // Format missed date
  formatMissedDate(date: Date): string {
    if (!date) return 'N/A';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  }

  // Exit the component
  exit(): void {
    this.exitHearingView.emit(true);
  }
}
