import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Hearings } from "../../../models/hearings";
import Swal, { SweetAlertResult } from "sweetalert2";
import { HearingServiceService } from "../../../services/hearing-service.service";
import { Members } from "../../../models/members";
import { Controls } from "../../../models/controls";
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BookingEvents } from "../../../models/events";
import { Offender } from "../../../models/offender";
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { finalize, take } from "rxjs";
import { Count } from "../../../models/count";
import { Booking } from "../../../models/booking";
import {
  Suretor,
  SuretyApplication,
  Surety,
} from "../../../models/suretor";
import { KioskCheckin } from "../../../models/kiosk-checkin";
import { Timestamp } from '@angular/fire/firestore';
import Quill from 'quill';
import * as moment from "moment";
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-case-management',
  templateUrl: './case-management.component.html',
  styleUrls: ['./case-management.component.scss'],
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
export class CaseManagementComponent implements OnInit {
  @Input() hearings: Hearings;
  @Output() exitCaseManagement: EventEmitter<boolean> = new EventEmitter<boolean>();

  // Data properties
  members: Members[] = [];
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
  showOrder: boolean = false;
  showTermination: boolean = false;
  expandedCards: { [key: string]: boolean } = {}; // Track expanded/collapsed state of cards

  // Edit state properties
  editingAddress: boolean = false;
  editingPhone: boolean = false;
  editingNIB: boolean = false;
  tempAddress: string = '';
  tempPhone: string = '';
  tempNIB: string = '';

  // Animation states
  animationStates: { [key: string]: string } = {
    offenderPanel: 'expanded',
    documentsPanel: 'collapsed',
    hearingPanel: 'collapsed',
    bailPanel: 'collapsed',
    suretyPanel: 'collapsed',
    kioskPanel: 'collapsed'
  };

  // Bond editor
  orderHTML = ``;
  private quillEditor: Quill;
  locations: string;

  constructor(
    private hs: HearingServiceService,
    private af: AngularFirestore,
    private storage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    // Scroll to the top of the page when the component is initialized
    window.scrollTo(0, 0);

    // Get the offender from the 'users' collection using the hearings offenderID
    this.af.collection('users').doc(this.hearings.offenderID).get().pipe(take(1)).subscribe((doc) => {
      this.offender = doc.data() as Offender;

      // Initialize temp fields for editing
      this.tempAddress = `${this.offender.addLine1 || ''} ${this.offender.addLine2 || ''} ${this.offender.city || ''} ${this.offender.state || ''}`;
      this.tempPhone = this.offender.phone || '';
      this.tempNIB = this.offender.nib || '';

      // Load kiosk check-ins after offender data is loaded
      this.loadKioskCheckins();
    });

    // Get counts from the 'counts' collection where bookingID is equal to the hearings bookingID
    this.af.collection('counts', ref => ref.where('bookingID', '==', this.hearings.bookingID)).get().pipe(take(1)).subscribe((querySnapshot) => {
      this.counts = querySnapshot.docs.map((doc) => doc.data() as Count);
      this.counts.forEach((count) => {
        if (count.countCharge && count.countCharge.match(/^\d{4}-/)) {
          count.countCharge = count.countCharge.substring(5);
        }
      });
    });

    // Get the BookingEvents for this booking
    this.af.collection('BookingEvents', ref => ref.where('bookingID', '==', this.hearings.bookingID)).get().pipe(take(1)).subscribe((querySnapshot) => {
      this.bookingEvents = querySnapshot.docs.map((doc) => doc.data() as BookingEvents);
      this.bookingEvents.forEach((event) => {
        if (event.title == 'Remand Warrant') {
          this.remandLink = event.link;
        }
        if (event.type == 'dpp_affidavit') {
          this.dppLink = event.link;
        }
      });
    });

    // Fetch surety data if available
    if (this.hearings.suretorNIB) {
      this.fetchSuretyData(this.hearings.suretorNIB, true);
    }

    if (this.hearings.suretor2NIB) {
      this.fetchSuretyData(this.hearings.suretor2NIB, false);
    }

    // Handle registrar acknowledgment
    if (this.hearings.registrarAck == false || this.hearings.registrarAck == undefined || this.hearings.registrarAck == null) {
      this.hearings.registrarAck = true;
      this.hearings.registrarAckDate = new Date().getTime().toString();
      this.updateHearing(this.hearings);
      Swal.fire({
        title: 'Acknowledged by Criminal Registry',
        text: 'This record has been updated to show that the Criminal Registry has acknowledged this Bail Application. Please set a hearing date, time and judge for this application.',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    }
  }

  // Fetch surety data from Firestore
  private fetchSuretyData(suretorNIB: string, isSurety1: boolean): void {
    this.af.collection('suretors').doc(suretorNIB).get().pipe(take(1)).subscribe((doc) => {
      if (doc.exists) {
        const suretorData = doc.data();

        // Process the data based on format (old or new)
        let processedData: any = {};

        if ((suretorData as SuretyApplication).surety?.nib) {
          // New format with nested surety object
          const newSurety = (suretorData as SuretyApplication).surety;
          processedData = {
            fullName: newSurety.fullName || `${newSurety.lastName || ''}, ${newSurety.firstName || ''} ${newSurety.middleName || ''}`.trim(),
            nib: newSurety.nib || '',
            address: newSurety.address || '',
            poBox: newSurety.poBox || '',
            phone: newSurety.phone || '',
            phone2: newSurety.phone2 || '',
            email: newSurety.email || '',
            dob: newSurety.dob ? this.formatTimestamp(newSurety.dob) : '',
            employment: {
              name: newSurety.empName || '',
              address: newSurety.empAddress || '',
              phone: newSurety.empPhone || ''
            },
            bankAccount: {
              bankName: newSurety.bankAccount?.bankName || '',
              accountType: newSurety.bankAccount?.accountType || '',
              balance: newSurety.bankAccount?.accountBalance || 0
            },
            property: {
              description: newSurety.immovableProperty?.particulars || '',
              value: newSurety.immovableProperty?.estimatedValue || 0
            }
          };
        } else if ((suretorData as Suretor).firstName) {
          // Old format with direct properties
          const oldSuretor = suretorData as Suretor;
          processedData = {
            fullName: `${oldSuretor.lastName || ''}, ${oldSuretor.firstName || ''} ${oldSuretor.middleName || ''}`.trim(),
            nib: oldSuretor.NIB || '',
            address: oldSuretor.addressFull || '',
            poBox: oldSuretor.poBox || '',
            phone: oldSuretor.phone || '',
            phone2: oldSuretor.phone2 || '',
            email: oldSuretor.email || '',
            dob: '',
            employment: {
              name: oldSuretor.empName || '',
              address: oldSuretor.empAddress || '',
              phone: oldSuretor.empPhone || ''
            },
            bankAccount: {
              bankName: oldSuretor.bankName || '',
              accountType: oldSuretor.bankAccountType || '',
              balance: parseFloat(oldSuretor.bankBalance || '0') || 0
            },
            property: {
              description: oldSuretor.immovablePropDesc || '',
              value: parseFloat(oldSuretor.immovablePropValue || '0') || 0
            }
          };
        }

        // Store the processed data
        if (isSurety1) {
          this.surety1Data = processedData;
        } else {
          this.surety2Data = processedData;
        }
      }
    });
  }

  // Format Firestore timestamp to readable date
  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  // Navigation methods
  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  togglePanel(panel: string): void {
    this.animationStates[panel] = this.animationStates[panel] === 'expanded' ? 'collapsed' : 'expanded';
  }

  // Document viewing methods
  showApplication(): void {
    window.open(this.hearings.bailAppLink, '_blank');
  }

  showRemandWarrant(): void {
    if (this.remandLink.length < 1) {
      Swal.fire({
        title: 'Remand Warrant Not Uploaded',
        text: 'The Remand Warrant has not been uploaded yet. Please check back later.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    window.open(this.remandLink, '_blank');
  }

  showDPPResponse(): void {
    if (this.dppLink.length < 1) {
      Swal.fire({
        title: 'DPP Response Not Uploaded',
        text: 'The DPP Response has not been uploaded yet. Please check back later.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    window.open(this.dppLink, '_blank');
  }

  // Judge assignment methods
  assignJudge(): void {
    // Load the members from the collection called 'members' and save then to the array called 'members'
    this.hs.getJudges().subscribe((members) => {
      this.members = members;
      console.log('Judges: ', this.members);
      // Open a Swal model to show a dropdown list of judges to select from
      Swal.fire({
        title: 'Assign Judge',
        input: 'select',
        inputOptions: this.members.map((member) => {
          return member.name;
        }),
        inputPlaceholder: 'Select a Judge',
        showCancelButton: true,
        inputValidator: (value) => {
          return new Promise((resolve) => {
            if (value !== '') {
              // @ts-ignore
              resolve();
            } else {
              resolve('You need to select a Judge');
            }
          });
        }
      } as any).then((result) => {
        if (!result.isConfirmed) { // Handle cancel
          return;
        }
        // Set the judge field in the hearings collection to the selected judge
        this.hearings.judgeName = this.members[result.value].name;
        this.hearings.judgeID = this.members[result.value].id;
        this.updateHearing(this.hearings);

        // Get the BookingEvent for this hearing
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEventDoc) => {
          if (bookingEventDoc.exists) {
            const bailApp = bookingEventDoc.data() as BookingEvents;
            bailApp.judge = this.hearings.judgeName;
            bailApp.judgeID = this.hearings.judgeID;
            this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
          }
        });

        // Provide a swal alert to let the user know that the judge has been assigned
        Swal.fire({
          title: 'Judge Assigned',
          text: 'The judge has been assigned to this Bail Application',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      });
    });
  }

  // Hearing date methods
  setHearingDateTime(): void {
    // Pre-populate with current or existing date/time
    let currentDateFormatted = '';
    let currentTimeFormatted = '';
    if (this.hearings.hearingDateUnix) {
      let existingTimestamp = parseInt(this.hearings.hearingDateUnix);
      // Convert the unixTimestamp to milliseconds if needed
      if (existingTimestamp.toString().length < 13) {
        existingTimestamp = existingTimestamp * 1000;
      }
      const existingDate = new Date(existingTimestamp);
      currentDateFormatted = existingDate.toISOString().split('T')[0]; // YYYY-MM-DD
      currentTimeFormatted = existingDate.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    } else {
      // Default to current date/time if not set, for user convenience
      const now = new Date();
      currentDateFormatted = now.toISOString().split('T')[0];
      currentTimeFormatted = now.toTimeString().split(' ')[0].substring(0, 5);
    }

    // Open a model with Swal to show a calendar and time selection to set a hearing date and time
    Swal.fire({
      title: 'Set Bail Application Hearing Date & Time',
      html: `
        <div class="form-group text-left">
          <label for="swal-date-input" class="col-form-label">Select Hearing Date:</label>
          <input id="swal-date-input" type="date" class="form-control" value="${currentDateFormatted}">
        </div>
        <div class="form-group mt-3 text-left">
          <label for="swal-time-input" class="col-form-label">Select Hearing Time:</label>
          <input id="swal-time-input" type="time" class="form-control" value="${currentTimeFormatted}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Set Date & Time',
      preConfirm: () => {
        const dateInput = (<HTMLInputElement>document.getElementById('swal-date-input')).value;
        const timeInput = (<HTMLInputElement>document.getElementById('swal-time-input')).value;

        if (!dateInput || !timeInput) {
          Swal.showValidationMessage('Please select both a date and a time.');
          return false;
        }

        const combinedDateTimeString = `${dateInput}T${timeInput}:00`; // ISO 8601 format
        const selectedDate = new Date(combinedDateTimeString);

        if (isNaN(selectedDate.getTime())) {
          Swal.showValidationMessage('Invalid date or time entered.');
          return false;
        }

        return selectedDate.getTime(); // Return Unix timestamp in milliseconds
      }
    } as any).then((result) => {
      // Check to see if the user canceled or dismissed the swal modal
      if (result.isConfirmed) {
        const unixTimestamp = result.value.toString(); // Result is already in milliseconds
        this.hearings.hearingDateUnix = unixTimestamp;
        this.updateHearing(this.hearings);
        // Get the BookingEvent for this hearing
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEventDoc) => {
          if (bookingEventDoc.exists) {
            const bailApp = bookingEventDoc.data() as BookingEvents;
            bailApp.hearingDateSet = unixTimestamp; // Save as string
            this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
          }
        });
      }
    });
  }

  // Surety management methods
  removeSurety(isSurety1: boolean): void {
    Swal.fire({
      title: `Remove ${isSurety1 ? 'Surety 1' : 'Surety 2'}`,
      text: `Are you sure you want to remove this surety from the bail application?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        if (isSurety1) {
          this.hearings.suretorNIB = null;
          this.hearings.suretorName = null;
        } else {
          this.hearings.suretor2NIB = null;
          this.hearings.suretor2Name = null;
        }
        this.hs.updateHearing(this.hearings);

        Swal.fire({
          title: `Surety ${isSurety1 ? '1' : '2'} Removed`,
          text: 'The surety has been removed from this bail application',
          icon: 'success',
          timer: 2000
        });
      }
    });
  }

  assignSurety(isSurety1: boolean): void {
    Swal.fire({
      title: `Assign ${isSurety1 ? 'Surety 1' : 'Surety 2'}`,
      html: '<input id="swal-input1" class="swal2-input" placeholder="Surety NIB">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const suretorNIB = (<HTMLInputElement>document.getElementById('swal-input1')).value;
        return {suretorNIB: suretorNIB};
      }
    } as any).then(async (result) => {
      if (!result.isConfirmed || !result.value.suretorNIB) {
        return;
      }

      const inputNIB = result.value.suretorNIB.trim();

      if (!/^\d+$/.test(inputNIB)) { // Simple numeric validation for NIB
        Swal.fire({
          title: 'Invalid NIB',
          text: 'The Suretor NIB is invalid. Please enter a valid NIB (numbers only).',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return;
      }

      // Check for conflicts
      let conflictingCases: string[] = [];

      // 1. Check Supreme Court (hearings collection)
      const supremeCourtQuery1 = this.af.collection('hearings', ref =>
        ref.where('suretorNIB', '==', inputNIB).where('active', '==', true)
      ).get().pipe(take(1));
      const supremeCourtQuery2 = this.af.collection('hearings', ref =>
        ref.where('suretor2NIB', '==', inputNIB).where('active', '==', true)
      ).get().pipe(take(1));

      const [supremeSnapshot1, supremeSnapshot2] = await Promise.all([
        supremeCourtQuery1.toPromise(),
        supremeCourtQuery2.toPromise()
      ]);

      if (supremeSnapshot1 && !supremeSnapshot1.empty) {
        supremeSnapshot1.docs.forEach(doc => {
          const hearing = doc.data() as Hearings;
          // Exclude the current hearing being processed
          if (hearing.id !== this.hearings.id) {
            conflictingCases.push(`Supreme Court (Offender: ${hearing.offenderName})`);
          }
        });
      }
      if (supremeSnapshot2 && !supremeSnapshot2.empty) {
        supremeSnapshot2.docs.forEach(doc => {
          const hearing = doc.data() as Hearings;
          // Exclude the current hearing being processed
          if (hearing.id !== this.hearings.id) {
            conflictingCases.push(`Supreme Court (Offender: ${hearing.offenderName})`);
          }
        });
      }

      // 2. Check Magistrate Court (magistrateBookings collection)
      const magistrateCourtQuery1 = this.af.collection('magistrateBookings', ref =>
        ref.where('suretorNIB', '==', inputNIB).where('bookingStatus', '==', 'Open')
      ).get().pipe(take(1));
      const magistrateCourtQuery2 = this.af.collection('magistrateBookings', ref =>
        ref.where('suretorNIB2', '==', inputNIB).where('bookingStatus', '==', 'Open')
      ).get().pipe(take(1));

      const [magistrateSnapshot1, magistrateSnapshot2] = await Promise.all([
        magistrateCourtQuery1.toPromise(),
        magistrateCourtQuery2.toPromise()
      ]);

      if (magistrateSnapshot1 && !magistrateSnapshot1.empty) {
        magistrateSnapshot1.docs.forEach(doc => {
          const booking = doc.data() as Booking;
          // Construct full name for Magistrate Court records
          const offenderFullName = `${booking.lastName || ''}, ${booking.firstName || ''} ${booking.middleName || ''}`.trim();
          conflictingCases.push(`Magistrate Court (Offender: ${offenderFullName})`);
        });
      }
      if (magistrateSnapshot2 && !magistrateSnapshot2.empty) {
        magistrateSnapshot2.docs.forEach(doc => {
            const booking = doc.data() as Booking;
            // Construct full name for Magistrate Court records
            const offenderFullName = `${booking.lastName || ''}, ${booking.firstName || ''} ${booking.middleName || ''}`.trim();
            conflictingCases.push(`Magistrate Court (Offender: ${offenderFullName})`);
          }
        );
      }

      // If conflicts found, show warning
      if (conflictingCases.length > 0) {
        const conflictList = conflictingCases.map(c => `<li>${c}</li>`).join('');
        Swal.fire({
          title: 'Suretor Already Assigned!',
          html: `The Suretor with NIB ${inputNIB} was found on the following ACTIVE case(s):<br><ul>${conflictList}</ul><br>A Suretor can only be assigned to one active/open case at a time.`,
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return;
      }

      // Fetch the Suretor document
      const suretorDoc = await this.af.collection('suretors').doc(inputNIB).get().pipe(take(1)).toPromise();

      if (!suretorDoc?.exists) {
        Swal.fire({
          title: 'Suretor Not Found',
          text: 'The Suretor does not exist in the system with this NIB. Please have the Suretor complete the Digital Application first!',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return;
      }

      // Determine if it's old or new format and convert if necessary
      let suretorData: Suretor | SuretyApplication = suretorDoc.data() as any;
      let suretorToAssign: Surety;
      let suretorFullName: string;

      // Detection: Check for the 'surety' nested object, which is unique to the new format
      if ((suretorData as SuretyApplication).surety?.nib) {
        // It's the new SuretyApplication format
        console.log('Detected new SuretyApplication format.');
        const newSuretyApp = suretorData as SuretyApplication;
        suretorToAssign = newSuretyApp.surety;

        // Ensure fullName is present, construct if not
        if (!suretorToAssign.fullName || suretorToAssign.fullName.trim() === '') {
          suretorFullName = `${suretorToAssign.lastName || ''}, ${suretorToAssign.firstName || ''} ${suretorToAssign.middleName || ''}`.trim();
          // Optionally, update the suretorData in Firestore with the generated fullName
          await this.af.collection('suretors').doc(inputNIB).update({ 'surety.fullName': suretorFullName })
            .then(() => console.log('Updated fullName in new SuretyApplication format.'))
            .catch(error => console.error('Error updating fullName in new SuretyApplication:', error));
        } else {
          suretorFullName = suretorToAssign.fullName;
        }
      } else {
        // It's the old Suretor format. Perform on-the-fly conversion.
        console.log('Detected old Suretor format. Converting to new SuretyApplication.');
        const oldSuretor = suretorData as Suretor;

        // Construct the new Surety object from the old Suretor data
        const newSurety: Surety = {
          // Always construct fullName during conversion for old format
          fullName: `${oldSuretor.lastName || ''}, ${oldSuretor.firstName || ''} ${oldSuretor.middleName || ''}`.trim(),
          firstName: oldSuretor.firstName || '',
          middleName: oldSuretor.middleName || '',
          lastName: oldSuretor.lastName || '',
          address: oldSuretor.addressFull || '',
          nib: oldSuretor.NIB || '', // Map old NIB to new nib
          dob: null, // Old format doesn't have DOB, default to null
          email: oldSuretor.email || '',
          phone: oldSuretor.phone || '',
          phone2: oldSuretor.phone2 || '',
          poBox: oldSuretor.poBox || '',
          spn: oldSuretor.spn || '',
          empName: oldSuretor.empName || '',
          empAddress: oldSuretor.empAddress || '',
          empPhone: oldSuretor.empPhone || '',
          immovableProperty: { // Default empty immovable property
            particulars: oldSuretor.immovablePropDesc || '',
            estimatedValue: parseFloat(oldSuretor.immovablePropValue || '0') || 0.0
          },
          bankAccount: { // Default empty bank account
            bankName: oldSuretor.bankName || '',
            accountType: oldSuretor.bankAccountType || '',
            accountBalance: parseFloat(oldSuretor.bankBalance || '0') || 0.0
          },
          otherMoveableProperty: [] // Old format has movablePropAdditional as string, new has list. Default to empty.
        };

        // Construct the full new SuretyApplication object
        const newSuretyApplication: SuretyApplication = {
          applicationId: suretorDoc.id, // Use NIB as applicationId for converted records
          caseDetails: { // Default empty CaseDetails
            defendantName: '',
            defendantAddress: '',
            bondAmount: 0.0,
            court: ''
          },
          surety: newSurety,
          declarations: { // Default empty Declarations
            encumbranceStatus: '',
            mortgageHolder: null,
            priorSuretyCases: '',
            hasPendingCriminalCharges: false,
            isCurrentlySurety: false
          },
          execution: { // Default Execution with current date
            suretySignatureUrl: '',
            dateSigned: Timestamp.now(),
            attestingOfficialName: ''
          },
          metadata: { // Default Metadata
            status: 'Legacy Converted', // Indicate this was converted
            scannedAt: Timestamp.now(),
            scannedByUserId: 'system-conversion', // Indicate system conversion
            reviewedAt: null,
            reviewedByUserId: null,
            originalImageUrls: []
          },
          aiComments: { 'conversion': 'Automatically converted from old Suretor format.' },
          approval: 'pending' // Default approval status
        };

        // Overwrite the old document in Firestore with the new format
        await this.af.collection('suretors').doc(inputNIB).set(newSuretyApplication)
          .then(() => console.log('Successfully converted and saved old Suretor to new SuretyApplication format.'))
          .catch(error => console.error('Error converting and saving old Suretor:', error));

        suretorToAssign = newSurety; // Use the newly constructed Surety object
        suretorFullName = newSurety.fullName; // Use the constructed fullName
        suretorData = newSuretyApplication; // Update suretorData to the new format for consistency
      }

      // Assign the Suretor to the current hearing
      if (isSurety1) {
        this.hearings.suretorNIB = suretorToAssign.nib;
        this.hearings.suretorName = suretorFullName;
      } else {
        this.hearings.suretor2NIB = suretorToAssign.nib;
        this.hearings.suretor2Name = suretorFullName;
      }
      this.hs.updateHearing(this.hearings);

      Swal.fire({
        title: 'Suretor Added',
        text: `The Suretor (${suretorFullName}) has been added to this Bail Application`,
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    });
  }

  // Bail status methods
  grantBail(): void {
    Swal.fire({
      title: 'Grant Bail',
      text: 'Are you sure you want to grant bail for this defendant?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Grant Bail',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Set bail as granted
        this.hearings.grantBailChecked = true;
        this.hearings.deniedBailChecked = false;
        this.hearings.deniedBailReason = null;
        this.hearings.hearingDateUnix = moment().unix().toString();

        // Update the hearing record
        this.updateHearing(this.hearings);

        // Show success message and prompt to set conditions
        Swal.fire({
          title: 'Bail Granted',
          text: 'Bail has been granted. Would you like to set bail conditions now?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Yes, Set Conditions',
          cancelButtonText: 'Later'
        }).then((result) => {
          if (result.isConfirmed) {
            // Open the bail conditions dialog
            this.enterBailConditions();
          }
        });
      }
    });
  }

  denyBail(): void {
    Swal.fire({
      title: 'Deny Bail',
      text: 'Please provide a reason for denying bail:',
      input: 'textarea',
      inputPlaceholder: 'Enter reason here...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deny Bail',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return 'You must provide a reason for denying bail';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Set bail as denied with the provided reason
        this.hearings.deniedBailChecked = true;
        this.hearings.grantBailChecked = false;
        this.hearings.deniedBailReason = result.value;
        this.hearings.deniedBailUnixTime = moment().unix().toString();
        this.hearings.hearingDateUnix = moment().unix().toString();

        // Update the hearing record
        this.updateHearing(this.hearings);

        // Show success message
        Swal.fire({
          title: 'Bail Denied',
          text: 'Bail has been denied for this defendant.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  // Bail conditions methods
  enterBailConditions(): void {
    let currentStep = 0;
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];

    Swal.fire({
      title: 'Enter/Edit Bail Conditions',
      html: `
        <div id="step1">
          <h5>Step 1: Check-in Location</h5>
          <div id="locationChecks">
            <div class="form-check"><input id="any" class="form-check-input" type="checkbox" value="any" /><label class="form-check-label" for="any">Any Police Station with a Kiosk (Default)</label></div>
            <span style="font-weight: bold;">Kiosks Located on New Providence</span>
            <div class="form-check"><input id="central" class="form-check-input" type="checkbox" value="Central Police Station" /><label class="form-check-label" for="central">Central Police Station</label></div>
            <div class="form-check"><input id="southbeach" class="form-check-input" type="checkbox" value="South Beach Police Station" /><label class="form-check-label" for="southbeach">South Beach Police Station</label></div>
            <div class="form-check"><input id="elizabeth" class="form-check-input" type="checkbox" value="Elizabeth Police Station" /><label class="form-check-label" for="elizabeth">Elizabeth Police Station</label></div>
            <div class="form-check"><input id="carmichael" class="form-check-input" type="checkbox" value="Carmichael Police Station" /><label class="form-check-label" for="carmichael">Carmichael Police Station</label></div>
            <div class="form-check"><input id="grove" class="form-check-input" type="checkbox" value="Grove Police Station" /><label class="form-check-label" for="grove">Grove Police Station</label></div>
            <span style="font-weight: bold;">Kiosks Located on Grand Bahamas</span>
            <div class="form-check"><input id="freeport" class="form-check-input" type="checkbox" value="Freeport Police Station" /><label class="form-check-label" for="freeport">Freeport Police Station</label></div>
          </div>
          <div class="h5 text-danger mt-2">Currently Selected Location: <span id="locations-display">${this.hearings.bailReportLocation}</span></div>
        </div>
        <div id="step2" style="display: none;">
          <h5>Step 2: Check-in Days & Time</h5>
          <div class="row">
            <div class="col" style="background: #f9ebeb;"><span style="font-weight: bold;">Check-In Days (Select all that Apply)</span>
              <div class="form-check"><input id="formCheck-1" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-1">Sunday</label></div>
              <div class="form-check"><input id="formCheck-2" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-2">Monday</label></div>
              <div class="form-check"><input id="formCheck-7" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-7">Tuesday</label></div>
              <div class="form-check"><input id="formCheck-6" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-6">Wednesday</label></div>
              <div class="form-check"><input id="formCheck-5" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-5">Thursday</label></div>
              <div class="form-check"><input id="formCheck-4" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-4">Friday</label></div>
              <div class="form-check"><input id="formCheck-3" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-3">Saturday</label></div>
            </div>
            <div class="col" style="background: #ddf8cd;"><span style="font-weight: bold;">Must check-in BEFORE (Select 1 Only)</span>
              <div class="form-check"><input id="formCheck-9" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-9">3pm</label></div>
              <div class="form-check"><input id="formCheck-10" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-10">4pm</label></div>
              <div class="form-check"><input id="formCheck-11" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-11">5pm</label></div>
              <div class="form-check"><input id="formCheck-12" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-12">6pm</label></div>
              <div class="form-check"><input id="formCheck-13" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-13">7pm</label></div>
              <div class="form-check"><input id="formCheck-14" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-14">8pm</label></div>
              <div class="form-check"><input id="formCheck-15" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-15">9pm</label></div>
              <div class="form-check"><input id="formCheck-16" class="form-check-input" type="checkbox" /><label class="form-check-label" for="formCheck-16">10pm</label></div>
            </div>
          </div>
        </div>
        <div id="step3" style="display: none;">
          <h5>Step 3: Surety Information</h5>
          <textarea id="suretyReq" class="form-control" rows="5"></textarea>
          <div class="form-group m-2 d-flex flex-row">
            <input type="checkbox" class="form-check-input" id="formCheck-20" style="scale: 1.5" />
            <label class="form-check-label font-weight-bold" for="formCheck-20">Check to Release on Own Recognizance - Provide Instructions Above</label>
          </div>
        </div>
        <div id="step4" style="display: none;">
          <h5>Step 4: Written Conditions</h5>
          <textarea id="additionalConditions" class="form-control" rows="5"></textarea>
        </div>
        <div id="step5" style="display: none;">
          <h5>Step 5: Additional Conditions & Comments</h5>
          <input id="surrenderPassportChecked" type="checkbox" class="custom-checkbox">&nbsp; <label>Must Surrender Passport to Criminal Registry</label><br>
          <input id="elecMonitorChecked" type="checkbox" class="custom-checkbox">&nbsp; <label>Must be placed on Electronic Monitoring before release on Bond</label>
          <h5 class="mt-3">Comments</h5>
          <textarea id="judicialNotes" class="form-control" rows="5"></textarea>
        </div>
      `,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Next',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const confirmButton = Swal.getConfirmButton();
        const cancelButton = Swal.getCancelButton();
        const htmlContainer = Swal.getHtmlContainer();

        const showStep = (stepIndex) => {
          steps.forEach((step, index) => {
            const stepElement = htmlContainer.querySelector('#' + step) as HTMLElement;
            if (stepElement) {
              stepElement.style.display = index === stepIndex ? 'block' : 'none';
            }
          });
          currentStep = stepIndex;

          if (currentStep === 0) {
            cancelButton.innerText = 'Cancel';
          } else {
            cancelButton.innerText = 'Back';
          }

          if (currentStep === steps.length - 1) {
            confirmButton.innerText = 'Submit';
          } else {
            confirmButton.innerText = 'Next';
          }
        };

        // Initial setup
        showStep(0);

        // Step 1 Initialization
        const locationChecks = htmlContainer.querySelector('#locationChecks') as HTMLDivElement;
        const locationCheckboxes = locationChecks.getElementsByTagName('input');
        for (let i = 0; i < locationCheckboxes.length; i++) {
          locationCheckboxes[i].addEventListener('click', () => this.getPoliceStationsNames());
          if (this.hearings.bailReportLocation?.includes(this.getPoliceStation(locationCheckboxes[i].value))) {
            locationCheckboxes[i].checked = true;
          }
        }
        this.getPoliceStationsNames();

        // Step 2 Initialization
        (htmlContainer.querySelector('#formCheck-1') as HTMLInputElement).checked = this.hearings.sundayChecked;
        (htmlContainer.querySelector('#formCheck-2') as HTMLInputElement).checked = this.hearings.mondayChecked;
        (htmlContainer.querySelector('#formCheck-7') as HTMLInputElement).checked = this.hearings.tuesdayChecked;
        (htmlContainer.querySelector('#formCheck-6') as HTMLInputElement).checked = this.hearings.wednesdayChecked;
        (htmlContainer.querySelector('#formCheck-5') as HTMLInputElement).checked = this.hearings.thursdayChecked;
        (htmlContainer.querySelector('#formCheck-4') as HTMLInputElement).checked = this.hearings.fridayChecked;
        (htmlContainer.querySelector('#formCheck-3') as HTMLInputElement).checked = this.hearings.saturdayChecked;
        (htmlContainer.querySelector('#formCheck-9') as HTMLInputElement).checked = this.hearings.threepmChecked;
        (htmlContainer.querySelector('#formCheck-10') as HTMLInputElement).checked = this.hearings.fourpmChecked;
        (htmlContainer.querySelector('#formCheck-11') as HTMLInputElement).checked = this.hearings.fivepmChecked;
        (htmlContainer.querySelector('#formCheck-12') as HTMLInputElement).checked = this.hearings.sixpmChecked;
        (htmlContainer.querySelector('#formCheck-13') as HTMLInputElement).checked = this.hearings.sevenpmChecked;
        (htmlContainer.querySelector('#formCheck-14') as HTMLInputElement).checked = this.hearings.eightpmChecked;
        (htmlContainer.querySelector('#formCheck-15') as HTMLInputElement).checked = this.hearings.ninepmChecked;
        (htmlContainer.querySelector('#formCheck-16') as HTMLInputElement).checked = this.hearings.tenpmChecked;

        // Step 3 Initialization
        (htmlContainer.querySelector('#suretyReq') as HTMLTextAreaElement).value = this.hearings.suretyReq || '';
        (htmlContainer.querySelector('#formCheck-20') as HTMLInputElement).checked = this.hearings.releaseOnRecognizance;

        // Step 4 Initialization
        (htmlContainer.querySelector('#additionalConditions') as HTMLTextAreaElement).value = this.hearings.additionalConditions || '';

        // Step 5 Initialization
        (htmlContainer.querySelector('#surrenderPassportChecked') as HTMLInputElement).checked = this.hearings.surrenderPassportChecked;
        (htmlContainer.querySelector('#elecMonitorChecked') as HTMLInputElement).checked = this.hearings.elecMonitorChecked;
        (htmlContainer.querySelector('#judicialNotes') as HTMLTextAreaElement).value = this.hearings.judicialNotes || '';

        // Override button actions
        confirmButton.onclick = () => {
          if (currentStep < steps.length - 1) {
            showStep(currentStep + 1);
          } else {
            // Submit logic
            this.hearings.bailReportLocation = this.locations;
            this.hearings.sundayChecked = (htmlContainer.querySelector('#formCheck-1') as HTMLInputElement).checked;
            this.hearings.mondayChecked = (htmlContainer.querySelector('#formCheck-2') as HTMLInputElement).checked;
            this.hearings.tuesdayChecked = (htmlContainer.querySelector('#formCheck-7') as HTMLInputElement).checked;
            this.hearings.wednesdayChecked = (htmlContainer.querySelector('#formCheck-6') as HTMLInputElement).checked;
            this.hearings.thursdayChecked = (htmlContainer.querySelector('#formCheck-5') as HTMLInputElement).checked;
            this.hearings.fridayChecked = (htmlContainer.querySelector('#formCheck-4') as HTMLInputElement).checked;
            this.hearings.saturdayChecked = (htmlContainer.querySelector('#formCheck-3') as HTMLInputElement).checked;
            this.hearings.threepmChecked = (htmlContainer.querySelector('#formCheck-9') as HTMLInputElement).checked;
            this.hearings.fourpmChecked = (htmlContainer.querySelector('#formCheck-10') as HTMLInputElement).checked;
            this.hearings.fivepmChecked = (htmlContainer.querySelector('#formCheck-11') as HTMLInputElement).checked;
            this.hearings.sixpmChecked = (htmlContainer.querySelector('#formCheck-12') as HTMLInputElement).checked;
            this.hearings.sevenpmChecked = (htmlContainer.querySelector('#formCheck-13') as HTMLInputElement).checked;
            this.hearings.eightpmChecked = (htmlContainer.querySelector('#formCheck-14') as HTMLInputElement).checked;
            this.hearings.ninepmChecked = (htmlContainer.querySelector('#formCheck-15') as HTMLInputElement).checked;
            this.hearings.tenpmChecked = (htmlContainer.querySelector('#formCheck-16') as HTMLInputElement).checked;
            this.hearings.suretyReq = (htmlContainer.querySelector('#suretyReq') as HTMLTextAreaElement).value;
            this.hearings.releaseOnRecognizance = (htmlContainer.querySelector('#formCheck-20') as HTMLInputElement).checked;
            this.hearings.additionalConditions = (htmlContainer.querySelector('#additionalConditions') as HTMLTextAreaElement).value;
            this.hearings.surrenderPassportChecked = (htmlContainer.querySelector('#surrenderPassportChecked') as HTMLInputElement).checked;
            this.hearings.elecMonitorChecked = (htmlContainer.querySelector('#elecMonitorChecked') as HTMLInputElement).checked;
            this.hearings.judicialNotes = (htmlContainer.querySelector('#judicialNotes') as HTMLTextAreaElement).value;
            this.hearings.grantBailChecked = true;
            this.hearings.hearingDateUnix = moment().unix().toString();
            this.updateHearing(this.hearings);
            Swal.close();
            Swal.fire('Success', 'Bail conditions have been updated.', 'success');
          }
        };

        cancelButton.onclick = () => {
          if (currentStep > 0) {
            showStep(currentStep - 1);
          } else {
            Swal.close();
          }
        };
      }
    });
  }

  // Helper method to get police station names for the bail conditions form
  getPoliceStationsNames(): void {
    const htmlContainer = Swal.getHtmlContainer();
    if (!htmlContainer) return;

    const locationChecks = htmlContainer.querySelector('#locationChecks') as HTMLDivElement;
    if (!locationChecks) return;

    const locationCheckboxes = locationChecks.getElementsByTagName('input');
    const locationArray = [];

    for (let i = 0; i < locationCheckboxes.length; i++) {
      if ((locationCheckboxes[i] as HTMLInputElement).checked) {
        locationArray.push(this.getPoliceStation(locationCheckboxes[i].value));
      }
    }

    // Take the locationArray and convert it to a string separated by commas and put the work 'and' before the last item in the array
    const locationString = locationArray.join(', ').replace(/, ([^,]*)$/, ' or $1');
    this.locations = locationString;
    const locationsDisplay = htmlContainer.querySelector('#locations-display') as HTMLSpanElement;
    if(locationsDisplay) {
      locationsDisplay.innerText = this.locations;
    }
  }

  closeOrder(): void {
    this.showOrder = false;
  }

  // Bail bond methods
  async openBondEditor() {
    const bondHtml = this.hearings.bondHtml ? this.hearings.bondHtml : await this.getBondHtml();

    // Fetch the Quill stylesheet
    const quillStyles = await fetch('node_modules/quill/dist/quill.snow.css').then(res => res.text());

    Swal.fire({
      title: 'Bail Bond Editor',
      html: `
        <div id="editor-wrapper" style="width: 8.5in; min-height: 11in; padding: 0.5in; margin: auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
          <div id="editor-container" style="border: none; height: 100%;"></div>
        </div>
        <div style="margin-top: 15px;">
          <button id="print-bond" class="swal2-confirm swal2-styled">Print Bond</button>
          <button id="cancel-bond" class="swal2-cancel swal2-styled">Cancel</button>
        </div>
      `,
      width: '95vw',
      padding: '1em',
      showConfirmButton: false,
      showCancelButton: false, // We use custom buttons in the HTML
      didOpen: () => {
        this.quillEditor = new Quill('#editor-container', {
          theme: 'snow',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'indent': '-1'}, { 'indent': '+1' }],
              [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
              ['clean']
            ]
          }
        });
        const delta = this.quillEditor.clipboard.convert({ html: bondHtml });
        this.quillEditor.setContents(delta, 'silent');

        document.getElementById('print-bond').addEventListener('click', () => {
          this.hearings.bondHtml = this.quillEditor.root.innerHTML;
          this.updateHearing(this.hearings);

          const printContent = this.quillEditor.root.innerHTML;
          const printWindow = window.open('', '', 'height=800,width=850');
          printWindow.document.write('<html><head><title>Print Bail Bond</title>');
          printWindow.document.write(`<style>${quillStyles}</style>`);
          printWindow.document.write('</head><body>');
          printWindow.document.write(printContent);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        });

        document.getElementById('cancel-bond').addEventListener('click', () => {
          Swal.close();
        });
      }
    });
  }

  private async getBondHtml(): Promise<string> {
    const response = await fetch('assets/BailBondText.html');
    let html = await response.text();

    // Helper to reformat names from "Last, First Middle" to "First Middle Last"
    const reformatName = (name: string) => {
      if (!name || !name.includes(',')) {
        return name;
      }
      const parts = name.split(',');
      const lastName = parts[0].trim();
      const firstMiddle = parts[1].trim();
      return `${firstMiddle} ${lastName}`;
    };

    // Helper to format the date like "19th day of November, 2025"
    const formatDateWithOrdinal = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      }
      return `${getOrdinal(day)} day of ${month}, ${year}`;
    };

    const today = new Date();
    const signatureDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Build the list of parties involved
    const offenderFormatted = reformatName(this.hearings.offenderName);
    const surety1Formatted = reformatName(this.hearings.suretorName);
    const surety2Formatted = reformatName(this.hearings.suretor2Name);

    let partiesList = `<strong>${offenderFormatted}</strong>`;
    if (surety1Formatted) {
      if (surety2Formatted) {
        partiesList += `, <strong>${surety1Formatted}</strong> and <strong>${surety2Formatted}</strong>`;
      } else {
        partiesList += ` and <strong>${surety1Formatted}</strong>`;
      }
    }

    // Reporting Clause Logic
    const reportingLocation = this.getPoliceStation(this.hearings.bailReportLocation) || 'ANY POLICE STATION';
    const reportingDays = 'N/A'; // Placeholder for now
    const reportingTime = 'N/A'; // Placeholder for now
    let reportingClause = `APPLICANT TO REPORT TO ${reportingLocation}, EVERY ${reportingDays === 'N/A' ? '_____' : reportingDays} BEFORE ${reportingTime === 'N/A' ? '_____' : reportingTime}`;
    if (!reportingLocation.startsWith('ANY')) {
      reportingClause = `APPLICANT TO REPORT TO THE ${reportingLocation}, EVERY ${reportingDays === 'N/A' ? '_____' : reportingDays} BEFORE ${reportingTime === 'N/A' ? '_____' : reportingTime}`;
    }

    const bondAmountMatch = this.hearings.suretyReq ? this.hearings.suretyReq.match(/\(([^)]+)\)/) : null;
    const bondAmount = bondAmountMatch ? bondAmountMatch[1] : '$0.00';

    // Initialize suretor data with empty strings (not 'N/A')
    let surety1Data = {
      address: '',
      poBox: '',
      phone: '',
      empName: '',
      empAddress: '',
      empPhone: '',
      empPosition: ''
    };

    let surety2Data = {
      address: '',
      poBox: '',
      phone: '',
      empName: '',
      empAddress: '',
      empPhone: '',
      empPosition: ''
    };

    // Fetch Suretor 1 data if available
    if (this.hearings.suretorNIB) {
      try {
        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretorNIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          if (suretorData && (suretorData as SuretyApplication).surety) {
            // New format with nested surety object
            const newSurety = (suretorData as SuretyApplication).surety;
            surety1Data = {
              address: newSurety.address || '',
              poBox: newSurety.poBox || '',
              phone: newSurety.phone || '',
              empName: newSurety.empName || '',
              empAddress: newSurety.empAddress || '',
              empPhone: newSurety.empPhone || '',
              empPosition: ''  // Not available in new format
            };
          } else if (suretorData && (suretorData as Suretor).firstName) {
            // Old format with direct properties
            const oldSuretor = suretorData as Suretor;
            surety1Data = {
              address: oldSuretor.addressFull || '',
              poBox: oldSuretor.poBox || '',
              phone: oldSuretor.phone || '',
              empName: oldSuretor.empName || '',
              empAddress: oldSuretor.empAddress || '',
              empPhone: oldSuretor.empPhone || '',
              empPosition: oldSuretor.empPosition || ''
            };
          }
        }
      } catch (error) {
        console.error('Error fetching surety 1 data:', error);
      }
    }

    // Fetch Suretor 2 data if available
    if (this.hearings.suretor2NIB) {
      try {
        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretor2NIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          if (suretorData && (suretorData as SuretyApplication).surety) {
            // New format with nested surety object
            const newSurety = (suretorData as SuretyApplication).surety;
            surety2Data = {
              address: newSurety.address || '',
              poBox: newSurety.poBox || '',
              phone: newSurety.phone || '',
              empName: newSurety.empName || '',
              empAddress: newSurety.empAddress || '',
              empPhone: newSurety.empPhone || '',
              empPosition: ''  // Not available in new format
            };
          } else if (suretorData && (suretorData as Suretor).firstName) {
            // Old format with direct properties
            const oldSuretor = suretorData as Suretor;
            surety2Data = {
              address: oldSuretor.addressFull || '',
              poBox: oldSuretor.poBox || '',
              phone: oldSuretor.phone || '',
              empName: oldSuretor.empName || '',
              empAddress: oldSuretor.empAddress || '',
              empPhone: oldSuretor.empPhone || '',
              empPosition: oldSuretor.empPosition || ''
            };
          }
        }
      } catch (error) {
        console.error('Error fetching surety 2 data:', error);
      }
    }

    const data = {
      partiesList: partiesList,
      offenderName: offenderFormatted,
      surety1Name: surety1Formatted || '',
      surety2Name: surety2Formatted || '',
      assistantRegistrarName: '-- ASSISTANT REGISTRAR NAME --',
      bondAmountWords: this.hearings.suretyReq ? this.hearings.suretyReq.split('(')[0].trim() : 'Written Amount Here',
      bondAmount: bondAmount,
      bondDate: `${formatDateWithOrdinal(today)}`,
      bondDateFull: `${formatDateWithOrdinal(today).split(',')[0]}, A.D.${today.getFullYear()}`,
      courtName: 'SUPREME COURT',
      charges: this.counts.map(c => c.countCharge).join(', ') || '',
      // Suretor 1 information
      surety1Address: surety1Data.address,
      surety1PoBox: surety1Data.poBox,
      surety1Telephone: surety1Data.phone,
      surety1Workplace: surety1Data.empName,
      surety1WorkplaceAddress: surety1Data.empAddress,
      surety1WorkplaceTelephone: surety1Data.empPhone,
      surety1Position: surety1Data.empPosition,
      // Suretor 2 information
      surety2Address: surety2Data.address,
      surety2PoBox: surety2Data.poBox,
      surety2Telephone: surety2Data.phone,
      surety2Workplace: surety2Data.empName,
      surety2WorkplaceAddress: surety2Data.empAddress,
      surety2WorkplaceTelephone: surety2Data.empPhone,
      surety2Position: surety2Data.empPosition,
      reportingClause: reportingClause,
      judgeName: this.hearings.judgeName || '',
      orderGrantingBailDate: this.hearings.hearingDateUnix ? this.convertUnixDate(this.hearings.hearingDateUnix) : '',
      signatureDate: signatureDate,
      clerkName: '____________________'
    };

    for (const key in data) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }

    return html;
  }

  doIssueBond() {
    Swal.fire({
      title: 'Upload Signed Bond',
      text: 'Please upload the signed bond for this bail application.',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your signed bond'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result: SweetAlertResult<string>) => {
      if (!result.isConfirmed || !result.value) {
        return;
      }

      const offenderName = this.hearings.offenderName.replace(/ /g, '').replace(/,/g, '');
      const unixTimestamp = Math.round((new Date()).getTime() / 1000);
      const bondFileName = `${unixTimestamp}-${this.hearings.offenderID}-${offenderName}-bond.pdf`;
      const storageRef = this.storage.ref(`bonds/${bondFileName}`);
      const uploadTask = storageRef.putString(result.value, 'data_url');

      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          storageRef.getDownloadURL().subscribe((downloadURL) => {
            this.hearings.bailBondLink = downloadURL;
            this.hearings.bailBondIssueDateUnix = unixTimestamp.toString();
            this.updateHearing(this.hearings);

            Swal.fire('Bond Uploaded', 'The signed bond has been successfully uploaded.', 'success');
          });
        })
      ).subscribe();
    });
  }

  doShowBailBond() {
    window.open(this.hearings.bailBondLink, '_blank');
  }

  // Termination methods
  closeTermination(event: any): void {
    this.showTermination = false;
  }

  // Kiosk Monitoring methods
  loadKioskCheckins(): void {
    if (!this.offender || !this.offender.spn) {
      console.error('Cannot load kiosk check-ins: offender or spn is missing');
      return;
    }

    this.isLoadingCheckins = true;

    // Fetch check-ins from the kioskCheckins collection where afisID matches the offender's spn
    this.af.collection('kioskCheckins', ref =>
      ref.where('afisID', '==', this.offender.spn)
         .orderBy('unix', 'desc') // Sort by unix timestamp in descending order (newest first)
    ).get().pipe(take(1)).subscribe(
      (querySnapshot) => {
        this.kioskCheckins = querySnapshot.docs.map(doc => doc.data() as KioskCheckin);

        // Process check-ins to determine compliance
        this.kioskCheckins.forEach(checkin => {
          checkin['isCompliant'] = this.checkCompliance(checkin);
        });

        // Detect missed check-ins
        this.detectMissedCheckins();

        this.isLoadingCheckins = false;
      },
      (error) => {
        console.error('Error fetching kiosk check-ins:', error);
        this.isLoadingCheckins = false;
      }
    );
  }

  // Check if a check-in complies with court-ordered conditions
  checkCompliance(checkin: KioskCheckin): boolean {
    if (!checkin || !checkin.unix) return false;

    // Convert unix timestamp to Date
    const checkinDate = new Date(parseInt(checkin.unix) * 1000);
    const checkinDay = checkinDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const checkinHour = checkinDate.getHours();

    // Check if the day is required
    let isDayRequired = false;
    switch (checkinDay) {
      case 0: isDayRequired = this.hearings.sundayChecked; break;
      case 1: isDayRequired = this.hearings.mondayChecked; break;
      case 2: isDayRequired = this.hearings.tuesdayChecked; break;
      case 3: isDayRequired = this.hearings.wednesdayChecked; break;
      case 4: isDayRequired = this.hearings.thursdayChecked; break;
      case 5: isDayRequired = this.hearings.fridayChecked; break;
      case 6: isDayRequired = this.hearings.saturdayChecked; break;
    }

    if (!isDayRequired) return true; // If check-in on a non-required day, it's still compliant

    // Check if the time is before the required time
    let requiredHour = 24; // Default to end of day
    if (this.hearings.threepmChecked) requiredHour = 15;
    else if (this.hearings.fourpmChecked) requiredHour = 16;
    else if (this.hearings.fivepmChecked) requiredHour = 17;
    else if (this.hearings.sixpmChecked) requiredHour = 18;
    else if (this.hearings.sevenpmChecked) requiredHour = 19;
    else if (this.hearings.eightpmChecked) requiredHour = 20;
    else if (this.hearings.ninepmChecked) requiredHour = 21;
    else if (this.hearings.tenpmChecked) requiredHour = 22;

    return checkinHour < requiredHour;
  }

  // Detect days when check-ins were required but not performed
  detectMissedCheckins(): void {
    if (!this.hearings.bailBondIssueDateUnix) {
      // Bail has not been issued yet, so no missed check-ins
      this.missedCheckins = [];
      return;
    }

    const missedCheckins = [];

    // Get the date bail was issued
    const bailIssueDate = new Date(parseInt(this.hearings.bailBondIssueDateUnix) * 1000);

    // Get today's date
    const today = new Date();

    // Create an array of required days (0 = Sunday, 1 = Monday, etc.)
    const requiredDays = [];
    if (this.hearings.sundayChecked) requiredDays.push(0);
    if (this.hearings.mondayChecked) requiredDays.push(1);
    if (this.hearings.tuesdayChecked) requiredDays.push(2);
    if (this.hearings.wednesdayChecked) requiredDays.push(3);
    if (this.hearings.thursdayChecked) requiredDays.push(4);
    if (this.hearings.fridayChecked) requiredDays.push(5);
    if (this.hearings.saturdayChecked) requiredDays.push(6);

    if (requiredDays.length === 0) {
      // No days are required, so no missed check-ins
      this.missedCheckins = [];
      return;
    }

    // Get the required check-in time
    let requiredHour = 24; // Default to end of day
    if (this.hearings.threepmChecked) requiredHour = 15;
    else if (this.hearings.fourpmChecked) requiredHour = 16;
    else if (this.hearings.fivepmChecked) requiredHour = 17;
    else if (this.hearings.sixpmChecked) requiredHour = 18;
    else if (this.hearings.sevenpmChecked) requiredHour = 19;
    else if (this.hearings.eightpmChecked) requiredHour = 20;
    else if (this.hearings.ninepmChecked) requiredHour = 21;
    else if (this.hearings.tenpmChecked) requiredHour = 22;

    // Create a map of check-in dates for quick lookup
    const checkinDates = new Map();
    this.kioskCheckins.forEach(checkin => {
      const date = new Date(parseInt(checkin.unix) * 1000);
      const dateString = date.toDateString();
      checkinDates.set(dateString, true);
    });

    // Loop through each day from bail issue date to today
    for (let date = new Date(bailIssueDate); date <= today; date.setDate(date.getDate() + 1)) {
      const day = date.getDay();

      // Check if this day is required
      if (requiredDays.includes(day)) {
        const dateString = date.toDateString();

        // Check if there was a check-in on this day
        if (!checkinDates.has(dateString)) {
          // If today, only consider it missed if the required time has passed
          if (dateString === today.toDateString()) {
            const currentHour = today.getHours();
            if (currentHour >= requiredHour) {
              missedCheckins.push({
                date: new Date(date),
                day: this.getDayName(day),
                requiredTime: this.getRequiredTimeString(requiredHour)
              });
            }
          } else {
            // For past days, it's definitely missed
            missedCheckins.push({
              date: new Date(date),
              day: this.getDayName(day),
              requiredTime: this.getRequiredTimeString(requiredHour)
            });
          }
        }
      }
    }

    this.missedCheckins = missedCheckins;
  }

  // Helper method to get day name
  getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  // Helper method to get required time string
  getRequiredTimeString(hour: number): string {
    if (hour === 15) return '3:00 PM';
    if (hour === 16) return '4:00 PM';
    if (hour === 17) return '5:00 PM';
    if (hour === 18) return '6:00 PM';
    if (hour === 19) return '7:00 PM';
    if (hour === 20) return '8:00 PM';
    if (hour === 21) return '9:00 PM';
    if (hour === 22) return '10:00 PM';
    return 'End of day';
  }

  // Utility methods
  convertUnixDate(unixDate: string): string {
    if (unixDate == null || unixDate == undefined) {
      return "Date Not Set";
    }
    let unixTimestamp = parseInt(unixDate);
    if (unixTimestamp.toString().length < 13) {
      unixTimestamp = unixTimestamp * 1000;
    }
    const date = new Date(unixTimestamp);
    const month = date.toLocaleString('en-US', {month: 'long'});
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = date.getMinutes();
    const amOrPm = hour < 12 ? 'AM' : 'PM';
    hour = hour % 12 || 12;
    return `${month} ${day}, ${year} ${hour}:${minute.toString().padStart(2, '0')} ${amOrPm}`;
  }

  updateHearing(hearing: Hearings): void {
    const originalName = hearing.offenderName;
    const offenderNameParts = hearing.offenderName.split(', ');
    if (offenderNameParts.length === 2) {
      hearing.offenderName = offenderNameParts[1].trim() + ' ' + offenderNameParts[0].trim();
    }
    this.hs.updateHearing(hearing);
    hearing.offenderName = originalName;
  }

  getPoliceStation(stationCode: string): string {
    // This would be implemented to return the full name of a police station based on its code
    return stationCode || 'Unknown Station';
  }

  exit(): void {
    this.hearings = null;
    this.exitCaseManagement.emit(true);
  }

  // Offender editing methods
  toggleAddressEdit(): void {
    if (this.editingAddress) {
      // Save changes
      this.saveAddress();
    } else {
      // Enter edit mode
      this.editingAddress = true;
      this.tempAddress = `${this.offender.addLine1 || ''} ${this.offender.addLine2 || ''} ${this.offender.city || ''} ${this.offender.state || ''}`.trim();
    }
  }

  togglePhoneEdit(): void {
    if (this.editingPhone) {
      // Save changes
      this.savePhone();
    } else {
      // Enter edit mode
      this.editingPhone = true;
      this.tempPhone = this.offender.phone || '';
    }
  }

  toggleNIBEdit(): void {
    if (this.editingNIB) {
      // Save changes
      this.saveNIB();
    } else {
      // Enter edit mode
      this.editingNIB = true;
      this.tempNIB = this.offender.nib || '';
    }
  }

  saveAddress(): void {
    // Split the address into components (this is a simplified approach)
    const addressParts = this.tempAddress.split(' ');

    if (addressParts.length > 0) {
      // Update the offender object
      this.offender.addLine1 = addressParts[0] || '';

      if (addressParts.length > 1) {
        this.offender.addLine2 = addressParts.slice(1, addressParts.length - 2).join(' ') || '';
        this.offender.city = addressParts[addressParts.length - 2] || '';
        this.offender.state = addressParts[addressParts.length - 1] || '';
      }

      // Update the offender in Firestore
      this.af.collection('users').doc(this.offender.id).update({
        addLine1: this.offender.addLine1,
        addLine2: this.offender.addLine2,
        city: this.offender.city,
        state: this.offender.state
      }).then(() => {
        // Show success message
        Swal.fire({
          title: 'Success',
          text: 'Address updated successfully',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }).catch(error => {
        console.error('Error updating address:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to update address',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    }

    // Exit edit mode
    this.editingAddress = false;
  }

  savePhone(): void {
    // Update the offender object
    this.offender.phone = this.tempPhone;

    // Update the offender in Firestore
    this.af.collection('users').doc(this.offender.id).update({
      phone: this.offender.phone
    }).then(() => {
      // Show success message
      Swal.fire({
        title: 'Success',
        text: 'Phone number updated successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }).catch(error => {
      console.error('Error updating phone number:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update phone number',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });

    // Exit edit mode
    this.editingPhone = false;
  }

  saveNIB(): void {
    // Update the offender object
    this.offender.nib = this.tempNIB;

    // Update the offender in Firestore
    this.af.collection('users').doc(this.offender.id).update({
      nib: this.offender.nib
    }).then(() => {
      // Show success message
      Swal.fire({
        title: 'Success',
        text: 'NIB number updated successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }).catch(error => {
      console.error('Error updating NIB number:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update NIB number',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });

    // Exit edit mode
    this.editingNIB = false;
  }

  cancelAddressEdit(): void {
    this.editingAddress = false;
  }

  cancelPhoneEdit(): void {
    this.editingPhone = false;
  }

  cancelNIBEdit(): void {
    this.editingNIB = false;
  }
}
