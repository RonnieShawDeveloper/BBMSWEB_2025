import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Hearings} from "../../../models/hearings"; // Assuming Hearings model exists
import Swal, {SweetAlertResult} from "sweetalert2";
import {HearingServiceService} from "../../../services/hearing-service.service"; // Assuming HearingServiceService exists
import {Members} from "../../../models/members"; // Assuming Members model exists
import {Controls} from "../../../models/controls"; // Assuming Controls model exists
import {AngularFirestore, DocumentSnapshot, QuerySnapshot} from '@angular/fire/compat/firestore';
import {BookingEvents} from "../../../models/events"; // Assuming BookingEvents model exists
import {Offender} from "../../../models/offender"; // Assuming Offender model exists
import {AngularFireStorage} from "@angular/fire/compat/storage";
import {finalize, take} from "rxjs";
import {Count} from "../../../models/count"; // Assuming Count model exists
import {Booking} from "../../../models/booking"; // Import Booking model for magistrateBookings

// Import the new and old Suretor interfaces, and directly import Timestamp from firestore
import {
  Suretor, // Old interface
  SuretyApplication, // New top-level interface
  Surety, // Nested interface within SuretyApplication
  CaseDetails,
  Declarations,
  Execution,
  Metadata,
  MoveableAsset,
  BankAccount,
  ImmovableProperty,
} from "../../../models/suretor";
import { Timestamp } from '@angular/fire/firestore'; // Corrected Timestamp import

@Component({
  selector: 'app-bail-app-table',
  templateUrl: './bail-app-table.component.html',
  styleUrls: ['./bail-app-table.component.scss']
})
export class BailAppTableComponent implements OnInit {
  @Input() hearings: Hearings;
  @Output() exitBailAppTable: EventEmitter<boolean> = new EventEmitter<boolean>();

  members: Members[] = [];
  offender: Offender = {};

  sourceControls: Controls[] = [];
  targetControls: Controls[] = [];

  showPickList = true;
  showTermination = false;
  showOrder = false;
  bookingEvents: BookingEvents[] = [];
  counts: Count[] = [];
  remandLink: string = '';
  dppLink: string = '';

  orderHTML = ``; // This seems to be an empty string, might be for dynamic content generation later

  // NOTE TO SELF: Inject AngularFirestore and AngularFireStorage for Firebase operations.
  constructor(private hs: HearingServiceService, private af: AngularFirestore, private storage: AngularFireStorage) {
  }

  ngOnInit(): void {
    console.log('Hearing: ', this.hearings);
    // Get the offender from the 'users' collection using the hearings offenderID
    this.af.collection('users').doc(this.hearings.offenderID).get().pipe(take(1)).subscribe((doc) => {
      this.offender = doc.data() as Offender;
    });

    // Get counts from the 'counts' collection where bookingID is equal to the hearings bookingID
    this.af.collection('counts', ref => ref.where('bookingID', '==', this.hearings.bookingID)).get().pipe(take(1)).subscribe((querySnapshot) => {
      this.counts = querySnapshot.docs.map((doc) => {
        return doc.data() as Count;
      });
      // Foreach count, use regex to check to see if the first 5 characters of 'countCharge' fits the patters '####-' and if so, set the countCharge to the substring of the countCharge from index 5 to the end of the string
      this.counts.forEach((count) => {
        if (count.countCharge && count.countCharge.match(/^\d{4}-/)) {
          count.countCharge = count.countCharge.substring(5);
        }
      });
    });

    // Get the BookingEvents for this booking
    this.af.collection('BookingEvents', ref => ref.where('bookingID', '==', this.hearings.bookingID)).get().pipe(take(1)).subscribe((querySnapshot) => {
      this.bookingEvents = querySnapshot.docs.map((doc) => {
        return doc.data() as BookingEvents;
      });
      // Foreach bookingevent, if the title is 'Remand Warrant', set the remandLink to the link in the booking event
      this.bookingEvents.forEach((event) => {
        console.log('Event: ', event);
        if (event.title == 'Remand Warrant') {
          this.remandLink = event.link;
        }
        if (event.type == 'dpp_affidavit') {
          this.dppLink = event.link;
        }
      });
    });


    // Check to see if this app has been acknowledged by the registrar using the field called 'registrarAck' in hearings and if not, set the field to true and update the hearing
    if (this.hearings.registrarAck == false || this.hearings.registrarAck == undefined || this.hearings.registrarAck == null) {
      this.hearings.registrarAck = true;
      this.hearings.registrarAckDate = new Date().getTime().toString();
      this.updateHearing(this.hearings);
      // Create a swal alert letting the user know that the record has been acknowledged by the Criminal Registry
      Swal.fire({
        title: 'Acknowledged by Criminal Registry',
        text: 'This record has been updated to show that the Criminal Registry has acknowledged this Bail Application. Please set a hearing date, time and judge for this application.',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    }

    // NOTE TO SELF: Initialize source and target controls for drag and drop
    const sourceControls: Controls[] = [
      {
        id: '2',
        controlName: 'Judge Assignment',
        controlDescription: 'Assign a Judge to the Hearing',
        controlIcon: 'fa-gavel',
        controlModule: 'judgeAssignment'
      },
      {
        id: '3',
        controlName: 'Hearing Date',
        controlDescription: 'Set a Hearing Date',
        controlIcon: 'fa-calendar',
        controlModule: 'hearingDate'
      },
      {
        id: '4',
        controlName: 'Surety 1',
        controlDescription: 'Assign Suretor 1',
        controlIcon: 'fa-money',
        controlModule: 'suretyApp'
      },
      {
        id: '5',
        controlName: 'Surety 2',
        controlDescription: 'Assign Suretor 2',
        controlIcon: 'fa-money',
        controlModule: 'suretyApp'
      },
      {
        id: '7',
        controlName: 'Revoke Bail',
        controlDescription: 'Bail Revoked',
        controlIcon: 'fa-ban',
        controlModule: 'bailRevoked'
      },
      {
        id: '9',
        controlName: 'Issue Bond',
        controlDescription: 'Create and Issue Bond',
        controlIcon: 'fa-newspaper-o',
        controlModule: 'issueBond'
      },
      {
        id: '10',
        controlName: 'Bond Variation',
        controlDescription: 'Submit a Bond Variation',
        controlIcon: 'fa-exchange',
        controlModule: 'variationApp'
      },
      {
        id: '11',
        controlName: 'Terminate Application',
        controlDescription: 'Terminate Application',
        controlIcon: 'fa-power-off',
        controlModule: 'terminateApp'
      },
    ];
    this.sourceControls = sourceControls;

    const targetControls: Controls[] = [
      {
        id: '1',
        controlName: 'Bail Application',
        controlDescription: 'Bail Application',
        controlIcon: 'fa-edit',
        controlModule: 'bailApp',
        controlComment: 'Bail Application submitted by Defendant',
        controlDate: this.convertUnixDate(this.hearings.unixDate.toString())
      }
    ];

    // NOTE TO SELF: Dynamically add controls based on existing hearing data
    if (this.hearings.grantBailChecked) {
      targetControls.push({
        id: '5', // Reusing ID 5, but this is a different control from Surety 2
        controlName: 'Bail Granted',
        controlDescription: 'Bail Granted',
        controlIcon: 'fa-check',
        controlModule: 'bailGranted',
        controlComment: 'Bail Granted',
        controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())
      });
      targetControls.push({
        id: '8',
        controlName: 'Bail Conditions',
        controlDescription: 'Bail Conditions',
        controlIcon: 'fa-heartbeat',
        controlModule: 'bailConditions',
        controlComment: 'Click to see the Order Granting Bail',
        controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())
      });
    }
    if (this.hearings.deniedBailChecked) {
      targetControls.push({
        id: '6',
        controlName: 'Bail Denied',
        controlDescription: 'Bail Denied',
        controlIcon: 'fa-remove',
        controlModule: 'bailDenied',
        controlComment: 'CLICK TO SEE REASON BAIL WAS DENIED',
        controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())
      });
    }

    this.targetControls = targetControls;

    // NOTE TO SELF: Update controls based on existing hearing data (Judge, Hearing Date, Suretors)
    if (this.hearings.judgeID) {
      const judgeAssignment = this.sourceControls.find((control) => control.controlName === 'Judge Assignment');
      if (judgeAssignment) { // Ensure it exists before trying to remove/add
        const index = this.sourceControls.indexOf(judgeAssignment);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(judgeAssignment);
        const judgeIndex = this.targetControls.indexOf(judgeAssignment);
        this.targetControls[judgeIndex].controlComment = 'Judge ' + this.hearings.judgeName + ' assigned to this hearing';
        this.refreshPickList(); // Helper to refresh PrimeNG PickList
      }
    }
    if (this.hearings.hearingDateUnix) {
      const hearingDate = this.sourceControls.find((control) => control.controlName === 'Hearing Date');
      if (hearingDate) { // Ensure it exists
        const index = this.sourceControls.indexOf(hearingDate);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(hearingDate);
        const hearingDateIndex = this.targetControls.indexOf(hearingDate);
        this.targetControls[hearingDateIndex].controlComment = 'Hearing Date set for ' + this.convertUnixDate(this.hearings.hearingDateUnix.toString());
        this.refreshPickList();
      }
    }

    // NOTE TO SELF: Initialize Surety 1 and Surety 2 controls based on existing hearing data
    this.initializeSuretyControls();

    // If a bond has been issued
    if (this.hearings.bailBondLink && this.hearings.bailBondLink.length > 0) {
      // Add a new control to the target controls array called 'View Bail Bond' and add 'Click to View Bail Bond' to the control comment
      const viewBailBond = {
        id: '12',
        controlName: 'View Bail Bond',
        controlDescription: 'View Bail Bond',
        controlIcon: 'fa-file',
        controlModule: 'viewBailBond',
        controlComment: 'Click to View Bail Bond'
      };
      this.targetControls.push(viewBailBond);
      this.sortControls();
    }
    this.sortControls();
  }

  // NOTE TO SELF: Helper to refresh PrimeNG PickList after changes
  refreshPickList(): void {
    this.showPickList = false;
    setTimeout(() => {
      this.showPickList = true;
    }, 100);
  }

  // NOTE TO SELF: Initialize Surety controls logic
  private async initializeSuretyControls(): Promise<void> {
    // Surety 1
    if (this.hearings.suretorNIB) {
      const suretyControl = this.sourceControls.find((control) => control.controlName === 'Surety 1');
      if (suretyControl) {
        const index = this.sourceControls.indexOf(suretyControl);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(suretyControl);

        // Fetch Suretor data to get the full name for the comment
        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretorNIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          let suretorFullName = '';
          // NOTE TO SELF: Check if it's the new SuretyApplication format or old Suretor format
          if (suretorData && (suretorData as SuretyApplication).surety?.fullName) { // New format
            const newSurety = (suretorData as SuretyApplication).surety;
            // Ensure fullName is present, construct if not
            if (!newSurety.fullName || newSurety.fullName.trim() === '') {
              suretorFullName = `${newSurety.lastName || ''}, ${newSurety.firstName || ''} ${newSurety.middleName || ''}`.trim();
            } else {
              suretorFullName = newSurety.fullName;
            }
          } else if (suretorData && (suretorData as Suretor).firstName) { // Old format
            const oldSuretor = suretorData as Suretor;
            suretorFullName = `${oldSuretor.lastName || ''}, ${oldSuretor.firstName || ''} ${oldSuretor.middleName || ''}`.trim();
          }

          const suretyIndex = this.targetControls.indexOf(suretyControl);
          this.targetControls[suretyIndex].controlComment = `Surety ${suretorFullName} assigned to this hearing. Click to edit Suretor.`;
        }
        this.refreshPickList();
      }
    }

    // Surety 2
    if (this.hearings.suretor2NIB) {
      const suretyControl = this.sourceControls.find((control) => control.controlName === 'Surety 2');
      if (suretyControl) {
        const index = this.sourceControls.indexOf(suretyControl);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(suretyControl);

        // Fetch Suretor data to get the full name for the comment
        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretor2NIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          let suretorFullName = '';
          // NOTE TO SELF: Check if it's the new SuretyApplication format or old Suretor format
          if (suretorData && (suretorData as SuretyApplication).surety?.fullName) { // New format
            const newSurety = (suretorData as SuretyApplication).surety;
            // Ensure fullName is present, construct if not
            if (!newSurety.fullName || newSurety.fullName.trim() === '') {
              suretorFullName = `${newSurety.lastName || ''}, ${newSurety.firstName || ''} ${newSurety.middleName || ''}`.trim();
            } else {
              suretorFullName = newSurety.fullName;
            }
          } else if (suretorData && (suretorData as Suretor).firstName) { // Old format
            const oldSuretor = suretorData as Suretor;
            suretorFullName = `${oldSuretor.lastName || ''}, ${oldSuretor.firstName || ''} ${oldSuretor.middleName || ''}`.trim();
          }

          const suretyIndex = this.targetControls.indexOf(suretyControl);
          this.targetControls[suretyIndex].controlComment = `Surety ${suretorFullName} assigned to this hearing. Click to edit Suretor.`;
        }
        this.refreshPickList();
      }
    }
  }


  showApplication() {
    window.open(this.hearings.bailAppLink, '_blank');
  }

  showRemandWarrant() {
    // Check to see if the remandLink contains a link, and if it does not, create a swal modal alert to notify the user that the remand warrant has not been uploaded yet
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

  showDPPResponse() {
    // Check to see if a remandLink exists, and if it does not, create a swal modal alert to notify the user that the DPP Response has not been provided in this case
    if (this.remandLink.length < 1) { // NOTE TO SELF: This should probably check dppLink, not remandLink
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

  // NOTE TO SELF: Helper to revert a drag-and-drop operation for Surety controls
  private revertSuretyDrag(controlId: string): void {
    const controlToRevert = this.targetControls.find((control) => control.id === controlId);
    if (controlToRevert) {
      const index = this.targetControls.indexOf(controlToRevert);
      this.targetControls.splice(index, 1);
      this.sourceControls.unshift(controlToRevert); // Add back to source
      this.sortControls(); // Re-sort for consistency
      this.refreshPickList(); // Refresh the UI
    }
  }


  doDrop(control) {
    // console.log('doDrop: ', control.items[0].id);
    // Check to see if the user has dragged the Bail Application Control into the source Controls Array and if so, add it back to the target controls array
    this.sortControls();
    if (control.items[0].id == '1') {
      const bailApp = this.sourceControls.find((control) => control.controlName === 'Bail Application');
      if (bailApp) { // Ensure control exists
        const index = this.sourceControls.indexOf(bailApp);
        this.sourceControls.splice(index, 1);
        this.targetControls.unshift(bailApp);
      }
      // Create a Swall Modal Alert to notify the user that the Bail Application can not be removed and to use the Terminate Application Control instead
      Swal.fire({
        title: 'Bail Application',
        text: 'The Bail Application can not be removed. Please use the Terminate Application Control instead',
        icon: 'warning',
        confirmButtonText: 'OK'
      }).then(() => {
        this.refreshPickList();
      });
    }

    if (control.items[0].id == '2') {
      // Check to see if the  user has dragged the Judge Assignment control into the target controls array or the source controls array
      const judgeAssignment = this.sourceControls.find((control) => control.controlName === 'Judge Assignment');
      const index = this.sourceControls.indexOf(judgeAssignment);
      console.log('index: ', index);
      if (index >= 0) { // If it's in sourceControls, it means it was dragged *from* target to source (removed)
        // Remove the assigned judge from the hearing and set the judgeID and judgeName to null and then set the judge assignment control comment to 'No Judge Assigned'
        this.hearings.judgeID = null;
        this.hearings.judgeName = null;
        // Update the hearing in the database
        this.hs.updateHearing(this.hearings);
        const judgeIndex = this.sourceControls.indexOf(judgeAssignment);
        this.sourceControls[judgeIndex].controlComment = 'No Judge Assigned';
        // Create a Swal Modal alert letting the user know the Judge has been removed from the hearing
        Swal.fire({
          title: 'Judge Removed',
          text: 'The Judge has been removed from this hearing',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else { // It was dragged *to* target from source (assigned)
        this.assignJugde();
      }
    }

    if (control.items[0].id == '3') {
      // Check to see if the  user has dragged the Hearing Date control into the target controls array or the source controls array
      const hearingDate = this.sourceControls.find((control) => control.controlName === 'Hearing Date');
      const index = this.sourceControls.indexOf(hearingDate);
      if (index >= 0) { // If in sourceControls, it was dragged *from* target to source (removed)
        // Remove the hearing date from the hearing and set the hearingDateUnix to null and then set the hearing date control comment to 'No Hearing Date Set'
        this.hearings.hearingDateUnix = null;
        // Update the hearing in the database
        this.hs.updateHearing(this.hearings);
        const hearingDateIndex = this.sourceControls.indexOf(hearingDate);
        this.sourceControls[hearingDateIndex].controlComment = 'No Hearing Date Set';
        // Create a Swal Modal alert letting the user know the Judge has been removed from the hearing
        Swal.fire({
          title: 'Hearing Date Removed',
          text: 'The Hearing Date has been removed',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else { // It was dragged *to* target from source (assigned)
        this.setHearingDateTime();
      }
    }

    // NOTE TO SELF: Handle Surety 1 assignment and conversion logic
    if (control.items[0].id == '4') { // Surety 1
      const suretyControl = this.sourceControls.find((c) => c.controlName === 'Surety 1');
      const indexInSource = this.sourceControls.indexOf(suretyControl);

      if (indexInSource >= 0) { // Surety 1 was dragged *from* target to source (removed)
        this.hearings.suretorNIB = null;
        this.hearings.suretorName = null;
        this.hs.updateHearing(this.hearings);
        this.sourceControls[indexInSource].controlComment = 'No Surety Assigned';
        Swal.fire({
          title: 'Surety #1 Removed',
          text: 'The Surety has been removed from this Bail Application',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else { // Surety 1 was dragged *to* target from source (assigned)
        this.assignSurety(control.items[0].id);
      }
    }

    // NOTE TO SELF: Handle Surety 2 assignment and conversion logic
    if (control.items[0].id == '5') { // Surety 2
      const suretyControl = this.sourceControls.find((c) => c.controlName === 'Surety 2');
      const indexInSource = this.sourceControls.indexOf(suretyControl);

      if (indexInSource >= 0) { // Surety 2 was dragged *from* target to source (removed)
        this.hearings.suretor2NIB = null;
        this.hearings.suretor2Name = null;
        this.hs.updateHearing(this.hearings);
        this.sourceControls[indexInSource].controlComment = 'No Surety Assigned';
        Swal.fire({
          title: 'Surety #2 Removed',
          text: 'The Surety has been removed from this Bail Application',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else { // Surety 2 was dragged *to* target from source (assigned)
        this.assignSurety(control.items[0].id);
      }
    }


    if (control.items[0].id == '9') {
      // Check if the grantBailChecked property is false and if so, open a Swal Modal and tell the user that they need to Grant Bail before issuing a bond but give them the choice to continue or cancel
      if (!this.hearings.grantBailChecked) {
        Swal.fire({
          title: 'Grant Bail',
          text: 'You must Grant Bail before issuing a bond. Do you want to Grant Bail now?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No'
        }).then((result) => {
          if (result.value) {
            // Locate the Issue Bond control and add a comment that says 'click to issue bond'
            const issueBond = this.targetControls.find((control) => control.id === '9');
            if (issueBond) {
              issueBond.controlComment = 'Click to issue bond';
            }
            // Open a Swal Modal and tell the user that they need to Click on the Issue Bond Control to Open the Issue Bond Menu
            Swal.fire({
              title: 'Must Confirm through Issue Bond Menu',
              text: 'Click on the Issue Bond Control to open the Issue Bond Menu! The Bond can then be uploaded to the system and issued',
              icon: 'info',
              confirmButtonText: 'Ok'
            });
          } else {
            // Remove the Issue Bond Control from the target controls array and add it back to the source controls array
            const issueBond = this.targetControls.find((control) => control.id === '9');
            if (issueBond) {
              const index = this.targetControls.indexOf(issueBond);
              this.targetControls.splice(index, 1);
              this.sourceControls.unshift(issueBond);
            }
            this.refreshPickList();
          }
        });
      } else {
        // Locate the Issue Bond control and add a comment that says 'click to issue bond'
        const issueBond = this.targetControls.find((control) => control.id === '9');
        if (issueBond) {
          issueBond.controlComment = 'Click to issue bond';
        }
        // Open a Swal Modal and tell the user that they need to Click on the Issue Bond Control to Open the Issue Bond Menu
        Swal.fire({
          title: 'Click on Issue Bond Tab',
          text: 'Click on the Issue Bond Control Tab to open the Issue Bond Menu! The Bond can then be uploaded to the system and issued',
          icon: 'info',
          confirmButtonText: 'Ok'
        });
      }
    }

    if (control.items[0].id == '11') {
      // Locate the Termination Control and add a comment that says 'click to terminate this application'
      const terminationControl = this.targetControls.find((control) => control.id === '11');
      if (terminationControl) {
        terminationControl.controlComment = 'Click to terminate this application';
      }
      // Open a Swal Modal and tell the user that they need to Click on the Termination Control to Open the Termination Menu
      Swal.fire({
        title: 'Must Confirm through Termination Menu',
        text: 'Click on the Termination Control to open the Termination Menu! This Application will not be terminated until Confirmed with a reason for termination!',
        icon: 'info',
        confirmButtonText: 'Ok'
      });
      this.refreshPickList();
    }
  }

  // NOTE TO SELF: New helper function to handle Suretor assignment logic, including conversion
  private assignSurety(controlId: string): void {
    const isSurety1 = controlId === '4';
    const suretyControlName = isSurety1 ? 'Surety 1' : 'Surety 2';

    Swal.fire({
      title: `Assign ${suretyControlName}`,
      html: '<input id="swal-input1" class="swal2-input" placeholder="Surety NIB">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const suretorNIB = (<HTMLInputElement>document.getElementById('swal-input1')).value;
        return {suretorNIB: suretorNIB};
      }
    } as any).then(async (result) => { // Use async here for await
      if (!result.isConfirmed || !result.value.suretorNIB) {
        this.revertSuretyDrag(controlId); // Revert drag if cancelled or NIB not entered
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
        this.revertSuretyDrag(controlId);
        return;
      }

      // --- START NEW SURETOR CONFLICT CHECK ---
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

      // If conflicts found, show warning and revert
      if (conflictingCases.length > 0) {
        const conflictList = conflictingCases.map(c => `<li>${c}</li>`).join('');
        Swal.fire({
          title: 'Suretor Already Assigned!',
          html: `The Suretor with NIB ${inputNIB} was found on the following ACTIVE case(s):<br><ul>${conflictList}</ul><br>A Suretor can only be assigned to one active/open case at a time.`,
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        this.revertSuretyDrag(controlId);
        return;
      }
      // --- END NEW SURETOR CONFLICT CHECK ---


      // NOTE TO SELF: Fetch the Suretor document from the 'suretors' collection
      const suretorDoc = await this.af.collection('suretors').doc(inputNIB).get().pipe(take(1)).toPromise();

      if (!suretorDoc?.exists) {
        Swal.fire({
          title: 'Suretor Not Found',
          text: 'The Suretor does not exist in the system with this NIB. Please have the Suretor complete the Digital Application first!',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        this.revertSuretyDrag(controlId);
        return;
      }

      // NOTE TO SELF: Determine if it's old or new format and convert if necessary
      let suretorData: Suretor | SuretyApplication = suretorDoc.data() as any; // Use 'any' for initial type flexibility
      let suretorToAssign: Surety; // This will hold the Surety object from either format
      let suretorFullName: string;

      // Detection: Check for the 'surety' nested object, which is unique to the new format
      if ((suretorData as SuretyApplication).surety?.nib) {
        // NOTE TO SELF: It's the new SuretyApplication format
        console.log('NOTE TO SELF: Detected new SuretyApplication format.');
        const newSuretyApp = suretorData as SuretyApplication;
        suretorToAssign = newSuretyApp.surety;

        // Ensure fullName is present, construct if not
        if (!suretorToAssign.fullName || suretorToAssign.fullName.trim() === '') {
          suretorFullName = `${suretorToAssign.lastName || ''}, ${suretorToAssign.firstName || ''} ${suretorToAssign.middleName || ''}`.trim();
          // Optionally, update the suretorData in Firestore with the generated fullName
          await this.af.collection('suretors').doc(inputNIB).update({ 'surety.fullName': suretorFullName })
            .then(() => console.log('NOTE TO SELF: Updated fullName in new SuretyApplication format.'))
            .catch(error => console.error('NOTE TO SELF: Error updating fullName in new SuretyApplication:', error));
        } else {
          suretorFullName = suretorToAssign.fullName;
        }
      } else {
        // NOTE TO SELF: It's the old Suretor format. Perform on-the-fly conversion.
        console.log('NOTE TO SELF: Detected old Suretor format. Converting to new SuretyApplication.');
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

        // NOTE TO SELF: Overwrite the old document in Firestore with the new format
        await this.af.collection('suretors').doc(inputNIB).set(newSuretyApplication)
          .then(() => console.log('NOTE TO SELF: Successfully converted and saved old Suretor to new SuretyApplication format.'))
          .catch(error => console.error('NOTE TO SELF: Error converting and saving old Suretor:', error));

        suretorToAssign = newSurety; // Use the newly constructed Surety object
        suretorFullName = newSurety.fullName; // Use the constructed fullName
        suretorData = newSuretyApplication; // Update suretorData to the new format for consistency
      }

      // NOTE TO SELF: Assign the Suretor to the current hearing
      if (isSurety1) {
        this.hearings.suretorNIB = suretorToAssign.nib;
        this.hearings.suretorName = suretorFullName;
        // NOTE TO SELF: Optionally store the full SuretyApplication ID if needed for deeper linking
        // this.hearings.suretor1ApplicationId = (suretorData as SuretyApplication).applicationId;
      } else {
        this.hearings.suretor2NIB = suretorToAssign.nib;
        this.hearings.suretor2Name = suretorFullName;
        // this.hearings.suretor2ApplicationId = (suretorData as SuretyApplication).applicationId;
      }
      this.hs.updateHearing(this.hearings);

      // NOTE TO SELF: Update the control comment in the UI
      const suretyControl = this.targetControls.find((c) => c.id === controlId);
      if (suretyControl) {
        suretyControl.controlComment = `Surety ${suretorFullName} assigned to this hearing. Click to edit Suretor.`;
      }

      Swal.fire({
        title: 'Suretor Added',
        text: `The Suretor (${suretorFullName}) has been added to this Bail Application`,
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        this.refreshPickList();
      });
    });
  }


  // Sort the SourceControls array and the TargetControls array by the id property
  sortControls() {
    this.sourceControls.sort((a, b) => a.id.localeCompare(b.id));
    this.targetControls.sort((a, b) => a.id.localeCompare(b.id));
    this.refreshPickList(); // Use the helper
  }

  setHearingDateTime() {
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
      if (result.isConfirmed == false) {
        // Check to see if a hearing date and time has already been set in this matter
        if (this.hearings.hearingDateUnix) {
          return;
        }
        // In the array targetSource find the item with the ID of '3' and remove it from the array
        const hearingDate = this.targetControls.find((control) => control.id === '3');
        if (hearingDate) {
          const index = this.targetControls.indexOf(hearingDate);
          this.targetControls.splice(index, 1);
          // Add the hearingDate to the top of the sourceControls array
          this.sourceControls.unshift(hearingDate);
        }
      } else {
        const unixTimestamp = result.value.toString(); // Result is already in milliseconds
        this.hearings.hearingDateUnix = unixTimestamp;
        this.updateHearing(this.hearings);
        // Get the BookingEvent for this hearing
        // NOTE TO SELF: This part might need adjustment if BookingEvents structure changes or is not directly accessible this way.
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEventDoc) => {
          if (bookingEventDoc.exists) {
            const bailApp = bookingEventDoc.data() as BookingEvents;
            bailApp.hearingDateSet = unixTimestamp; // Save as string
            this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
          }
        });
        // Find the hearing date control in the targetControls array and update the comment to show the date that the hearing has been set for
        const hearingDate = this.targetControls.find((control) => control.id === '3');
        if (hearingDate) {
          const index = this.targetControls.indexOf(hearingDate);
          this.targetControls[index].controlComment = 'Hearing Date set for ' + this.convertUnixDate(this.hearings.hearingDateUnix.toString());
        }
      }
    }).then(() => {
      this.refreshPickList();
    });
  }

  assignJugde() {
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
          this.revertJudgeDrag(); // Revert the drag if cancelled
          return;
        }
        // Set the judge field in the hearings collection to the selected judge
        this.hearings.judgeName = this.members[result.value].name;
        this.hearings.judgeID = this.members[result.value].id;
        this.updateHearing(this.hearings);

        // Get the BookingEvent for this hearing
        // NOTE TO SELF: This part might need adjustment if BookingEvents structure changes or is not directly accessible this way.
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEventDoc) => {
          if (bookingEventDoc.exists) {
            const bailApp = bookingEventDoc.data() as BookingEvents;
            bailApp.judge = this.hearings.judgeName;
            bailApp.judgeID = this.hearings.judgeID;
            this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
          }
        });
        // Locate the Judge Assignment control in the targetControls array and edit it to show the name of the judge that has been assigned
        const judgeAssignment = this.targetControls.find((control) => control.id === '2');
        if (judgeAssignment) {
          const judgeIndex = this.targetControls.indexOf(judgeAssignment);
          this.targetControls[judgeIndex].controlComment = 'Judge ' + this.hearings.judgeName + ' assigned to this hearing';
        }
        // Provide a swal alert to let the user know that the judge has been assigned
        Swal.fire({
          title: 'Judge Assigned',
          text: 'The judge has been assigned to this Bail Application',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.refreshPickList();
        });
      });
    });
  }

  // NOTE TO SELF: Helper to revert judge drag if assignment is cancelled
  private revertJudgeDrag(): void {
    const judgeControl = this.targetControls.find((control) => control.id === '2');
    if (judgeControl) {
      const index = this.targetControls.indexOf(judgeControl);
      this.targetControls.splice(index, 1);
      this.sourceControls.unshift(judgeControl);
      this.sortControls();
      this.refreshPickList();
    }
  }


  // Convert unixDate to localDate for display
  convertUnixDate(unixDate: string) {
    // Check to see if the unixDate is null or undefined and return an empty string if it is
    if (unixDate == null || unixDate == undefined) {
      return "Date Not Set";
    }
    let unixTimestamp = parseInt(unixDate);
    // Convert the unixTimestamp to milliseconds if needed
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
    hour = hour % 12 || 12; // Convert hour to 12-hour format

    const formattedDate = `${month} ${day}, ${year} ${hour}:${minute.toString().padStart(2, '0')} ${amOrPm}`;

    return formattedDate;
  }


  updateHearing(hearing: Hearings) {
    const originalName = hearing.offenderName;
    // We need to reverse the offender name to First Last from Last, First before saving to the database
    const offenderName = hearing.offenderName.split(', ');
    if (offenderName.length === 2) { // Ensure it's in "Last, First" format
      hearing.offenderName = offenderName[1].trim() + ' ' + offenderName[0].trim();
    }
    // Update the hearing in the database
    this.hs.updateHearing(hearing);
    // Set the offender name back to the original value
    hearing.offenderName = originalName;
  }

  exitBailApplicationTable() {
    this.hearings = null; // Clear hearings data
    this.exitBailAppTable.emit(true);
  }

  doClick(control): void {
    // Check to see if the control is in the targetControls array
    const targetControl = this.targetControls.find((targetControl) => targetControl.id === control.id);
    if (targetControl) {
      if (control.id == '1') {
        // Open a new window with the bail application found in 'hearings.bailAppLink'
        window.open(this.hearings.bailAppLink, '_blank');
      }
      if (control.id == '2') {
        this.assignJugde();
      }
      if (control.id == '3') {
        this.setHearingDateTime();
      }
      if (control.id == '4' || control.id == '5') { // Handle click for Surety 1 or Surety 2
        this.editSuretorInfo(control.id);
      }
      if (control.id == '6') {
        this.showReasonDenied();
      }
      if (control.id == '8') {
        this.showOrder = true;
      }
      if (control.id == '9') {
        this.doIssueBond();
      }
      if (control.id == '11') {
        this.showTermination = true;
      }
      if (control.id == '12') {
        this.doShowBailBond();
      }
    }
  }

  // New method to edit Suretor information
  private async editSuretorInfo(controlId: string): Promise<void> {
    const isSurety1 = controlId === '4';
    const suretorNIB = isSurety1 ? this.hearings.suretorNIB : this.hearings.suretor2NIB;

    if (!suretorNIB) {
      Swal.fire({
        title: 'Suretor Not Assigned',
        text: 'No suretor is currently assigned to this slot.',
        icon: 'info',
        confirmButtonText: 'Ok'
      });
      return;
    }

    const suretorDoc = await this.af.collection('suretors').doc(suretorNIB).get().pipe(take(1)).toPromise();

    if (!suretorDoc?.exists) {
      Swal.fire({
        title: 'Suretor Not Found',
        text: 'The suretor record could not be found in the system.',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }

    let suretorData: SuretyApplication = suretorDoc.data() as SuretyApplication;
    let currentSurety: Surety = suretorData.surety;

    // Format DOB for input type="date"
    const dobFormatted = currentSurety.dob instanceof Timestamp ?
      currentSurety.dob.toDate().toISOString().split('T')[0] : '';

    // Generate HTML for the form
    const formHtml = `
      <style>
        .swal2-input-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 10px;
          text-align: left;
        }
        .swal2-input-group label {
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }
        .swal2-input-group input,
        .swal2-input-group textarea {
          width: 100%;
          padding: 8px;
          margin-top: 2px;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-sizing: border-box; /* Include padding in width */
        }
        .swal2-textarea {
          resize: vertical;
          min-height: 60px;
        }
        .swal2-title {
          color: #0056b3; /* A nice blue for titles */
        }
        .swal2-container {
            font-family: 'Inter', sans-serif; /* Use Inter font */
        }
        .swal2-styled.swal2-confirm {
            background-color: #007bff !important; /* Blue save button */
            border-radius: 8px !important;
            padding: 10px 20px !important;
            font-size: 16px !important;
        }
        .swal2-styled.swal2-cancel {
            border-radius: 8px !important;
            padding: 10px 20px !important;
            font-size: 16px !important;
        }
      </style>
      <div class="swal2-input-group">
        <label for="swal-nib">NIB (Not Editable):</label>
        <input id="swal-nib" class="swal2-input" value="${currentSurety.nib || ''}" readonly>
      </div>
      <div class="swal2-input-group">
        <label for="swal-firstName">First Name:</label>
        <input id="swal-firstName" class="swal2-input" value="${currentSurety.firstName || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-middleName">Middle Name:</label>
        <input id="swal-middleName" class="swal2-input" value="${currentSurety.middleName || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-lastName">Last Name:</label>
        <input id="swal-lastName" class="swal2-input" value="${currentSurety.lastName || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-address">Address:</label>
        <input id="swal-address" class="swal2-input" value="${currentSurety.address || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-dob">Date of Birth:</label>
        <input id="swal-dob" type="date" class="swal2-input" value="${dobFormatted}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-email">Email:</label>
        <input id="swal-email" type="email" class="swal2-input" value="${currentSurety.email || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-phone">Phone:</label>
        <input id="swal-phone" type="tel" class="swal2-input" value="${currentSurety.phone || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-poBox">PO Box:</label>
        <input id="swal-poBox" class="swal2-input" value="${currentSurety.poBox || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-spn">SPN:</label>
        <input id="swal-spn" class="swal2-input" value="${currentSurety.spn || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-empName">Employer Name:</label>
        <input id="swal-empName" class="swal2-input" value="${currentSurety.empName || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-empAddress">Employer Address:</label>
        <input id="swal-empAddress" class="swal2-input" value="${currentSurety.empAddress || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-empPhone">Employer Phone:</label>
        <input id="swal-empPhone" type="tel" class="swal2-input" value="${currentSurety.empPhone || ''}">
      </div>

      <h3 style="margin-top: 20px; color: #0056b3;">Immovable Property</h3>
      <div class="swal2-input-group">
        <label for="swal-immovableParticulars">Particulars:</label>
        <textarea id="swal-immovableParticulars" class="swal2-textarea">${currentSurety.immovableProperty?.particulars || ''}</textarea>
      </div>
      <div class="swal2-input-group">
        <label for="swal-immovableValue">Estimated Value:</label>
        <input id="swal-immovableValue" type="number" step="0.01" class="swal2-input" value="${currentSurety.immovableProperty?.estimatedValue || 0}">
      </div>

      <h3 style="margin-top: 20px; color: #0056b3;">Bank Account</h3>
      <div class="swal2-input-group">
        <label for="swal-bankName">Bank Name:</label>
        <input id="swal-bankName" class="swal2-input" value="${currentSurety.bankAccount?.bankName || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-accountType">Account Type:</label>
        <input id="swal-accountType" class="swal2-input" value="${currentSurety.bankAccount?.accountType || ''}">
      </div>
      <div class="swal2-input-group">
        <label for="swal-accountBalance">Account Balance:</label>
        <input id="swal-accountBalance" type="number" step="0.01" class="swal2-input" value="${currentSurety.bankAccount?.accountBalance || 0}">
      </div>

      <h3 style="margin-top: 20px; color: #0056b3;">Other Moveable Property</h3>
      <div class="swal2-input-group">
        <label for="swal-otherMoveableProperty">Description (Comma Separated):</label>
        <textarea id="swal-otherMoveableProperty" class="swal2-textarea">${currentSurety.otherMoveableProperty?.map(a => a.description).join(', ') || ''}</textarea>
      </div>
    `;

    Swal.fire({
      title: `Edit Suretor Information (${suretorNIB})`,
      html: formHtml,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Retrieve values from the form
        const firstName = (<HTMLInputElement>document.getElementById('swal-firstName')).value;
        const middleName = (<HTMLInputElement>document.getElementById('swal-middleName')).value;
        const lastName = (<HTMLInputElement>document.getElementById('swal-lastName')).value;
        const address = (<HTMLInputElement>document.getElementById('swal-address')).value;
        const dobInput = (<HTMLInputElement>document.getElementById('swal-dob')).value;
        const email = (<HTMLInputElement>document.getElementById('swal-email')).value;
        const phone = (<HTMLInputElement>document.getElementById('swal-phone')).value;
        const poBox = (<HTMLInputElement>document.getElementById('swal-poBox')).value;
        const spn = (<HTMLInputElement>document.getElementById('swal-spn')).value;
        const empName = (<HTMLInputElement>document.getElementById('swal-empName')).value;
        const empAddress = (<HTMLInputElement>document.getElementById('swal-empAddress')).value;
        const empPhone = (<HTMLInputElement>document.getElementById('swal-empPhone')).value;

        const immovableParticulars = (<HTMLTextAreaElement>document.getElementById('swal-immovableParticulars')).value;
        const immovableValue = parseFloat((<HTMLInputElement>document.getElementById('swal-immovableValue')).value);

        const bankName = (<HTMLInputElement>document.getElementById('swal-bankName')).value;
        const accountType = (<HTMLInputElement>document.getElementById('swal-accountType')).value;
        const accountBalance = parseFloat((<HTMLInputElement>document.getElementById('swal-accountBalance')).value);

        const otherMoveablePropertyText = (<HTMLTextAreaElement>document.getElementById('swal-otherMoveableProperty')).value;

        // Basic validation
        if (!firstName || !lastName || !address || !phone) {
          Swal.showValidationMessage('Please fill in all required personal fields (First Name, Last Name, Address, Phone).');
          return false;
        }

        // Convert DOB string to Timestamp
        let dobTimestamp: Timestamp | null = null;
        if (dobInput) {
          try {
            dobTimestamp = Timestamp.fromDate(new Date(dobInput));
          } catch (e) {
            Swal.showValidationMessage('Invalid Date of Birth format.');
            return false;
          }
        }

        // Convert otherMoveablePropertyText to array of MoveableAsset
        const otherMoveableProperty: MoveableAsset[] = otherMoveablePropertyText.split(',').map(desc => ({
          description: desc.trim(),
          estimatedValue: 0 // Default value, as we only capture description here
        })).filter(asset => asset.description !== '');


        return {
          firstName, middleName, lastName, address, dob: dobTimestamp, email, phone, poBox, spn,
          empName, empAddress, empPhone,
          immovableProperty: {
            particulars: immovableParticulars,
            estimatedValue: isNaN(immovableValue) ? 0 : immovableValue
          },
          bankAccount: {
            bankName,
            accountType,
            accountBalance: isNaN(accountBalance) ? 0 : accountBalance
          },
          otherMoveableProperty
        };
      },
      allowOutsideClick: () => !Swal.isLoading()
    } as any).then(async (formValues) => {
      if (formValues.isConfirmed && formValues.value) {
        const updatedSuretyData = formValues.value;

        // Construct full name for updated data
        const newFullName = `${updatedSuretyData.lastName || ''}, ${updatedSuretyData.firstName || ''} ${updatedSuretyData.middleName || ''}`.trim();
        updatedSuretyData.fullName = newFullName;

        try {
          // Update only the 'surety' sub-object within the SuretyApplication document
          // Firestore update syntax for nested objects
          const updatePayload: any = {
            'surety.firstName': updatedSuretyData.firstName,
            'surety.middleName': updatedSuretyData.middleName,
            'surety.lastName': updatedSuretyData.lastName,
            'surety.fullName': updatedSuretyData.fullName,
            'surety.address': updatedSuretyData.address,
            'surety.dob': updatedSuretyData.dob,
            'surety.email': updatedSuretyData.email,
            'surety.phone': updatedSuretyData.phone,
            'surety.poBox': updatedSuretyData.poBox,
            'surety.spn': updatedSuretyData.spn,
            'surety.empName': updatedSuretyData.empName,
            'surety.empAddress': updatedSuretyData.empAddress,
            'surety.empPhone': updatedSuretyData.empPhone,
            'surety.immovableProperty.particulars': updatedSuretyData.immovableProperty.particulars,
            'surety.immovableProperty.estimatedValue': updatedSuretyData.immovableProperty.estimatedValue,
            'surety.bankAccount.bankName': updatedSuretyData.bankAccount.bankName,
            'surety.bankAccount.accountType': updatedSuretyData.bankAccount.accountType,
            'surety.bankAccount.accountBalance': updatedSuretyData.bankAccount.accountBalance,
            'surety.otherMoveableProperty': updatedSuretyData.otherMoveableProperty,
          };

          await this.af.collection('suretors').doc(suretorNIB).update(updatePayload);

          Swal.fire({
            title: 'Suretor Info Updated!',
            text: 'The suretor information has been successfully saved.',
            icon: 'success',
            confirmButtonText: 'Ok'
          });

          // Update the control comment in the UI to reflect potential name changes
          const suretyControl = this.targetControls.find((c) => c.id === controlId);
          if (suretyControl) {
            suretyControl.controlComment = `Surety ${updatedSuretyData.fullName} assigned to this hearing. Click to edit Suretor.`;
          }
          this.refreshPickList(); // Refresh the UI to reflect changes

        } catch (error) {
          console.error('Error updating suretor:', error);
          Swal.fire({
            title: 'Error!',
            text: 'There was an error saving the suretor information: ' + error.message,
            icon: 'error',
            confirmButtonText: 'Ok'
          });
        }
      }
    });
  }

  showReasonDenied() {
    // Create a swal modal showing the reason Bail was denied
    Swal.fire({
      title: 'Reason for Denial',
      text: this.hearings.deniedBailReason,
      icon: 'info',
      confirmButtonText: 'Ok'
    });
  }

  doShowBailBond() {
    // Open a new window with the bail application found in 'hearings.bailAppLink'
    window.open(this.hearings.bailBondLink, '_blank');
  }

  doIssueBond() {
    // Create a swal modal allowing the user to upload a pdf file and then save the file to firebase storage in the directory called 'bonds' using a name format of 'unix timestamp-offenderid-bond.pdf'
    Swal.fire({
      title: 'Upload Bond',
      text: 'Please upload the bond for this bail application',
      icon: 'info',
      input: 'file',
      inputAttributes: {
        accept: 'application/pdf',
        'aria-label': 'Upload your bond'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string); // Cast to string
          };
          reader.readAsDataURL(file);
        });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result: SweetAlertResult<string>) => {
      if (!result.isConfirmed || !result.value) { // Handle cancel or no file selected
        return;
      }

      // get the offender name and remove all spaces and commas
      const offenderName = this.hearings.offenderName.replace(/ /g, '').replace(/,/g, '');
      // Upload the file to firebase storage and then save the link to the database in the bailBondLink field
      const unixTimestamp = Math.round((new Date()).getTime() / 1000);
      const bondFileName = unixTimestamp + '-' + this.hearings.offenderID + '-' + offenderName + '-bond.pdf';
      const storageRef = this.storage.ref('bonds/' + bondFileName);
      const uploadTask = storageRef.putString(result.value, 'data_url');
      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          storageRef.getDownloadURL().subscribe((downloadURL) => {
            this.hearings.bailBondLink = downloadURL;
            this.hearings.bailBondIssueDateUnix = unixTimestamp.toString();
            this.hs.updateHearing(this.hearings);
            // Create a swal alert to let the user know that the bond has been uploaded and created
            Swal.fire({
              title: 'Bond Uploaded',
              text: 'The bond has been uploaded and created',
              icon: 'success',
              confirmButtonText: 'Ok'
            });
            const issueBondControl = this.targetControls.find((targetControl) => targetControl.id === '9');
            const index = this.targetControls.indexOf(issueBondControl);
            if (index > -1) {
              this.targetControls.splice(index, 1);
            }
            // Add the view bond control to the targetControls array
            const viewBailBond = {
              id: '12',
              controlName: 'View Bail Bond',
              controlDescription: 'View Bail Bond',
              controlIcon: 'fa-file',
              controlModule: 'viewBailBond',
              controlComment: 'Click to View Bail Bond'
            };
            this.targetControls.push(viewBailBond);
            this.sortControls();
          });
        })
      ).subscribe();
    });
  }

  closeOrder() {
    this.showOrder = false;
  }

  getPoliceStation(option: string): string {
    switch (option) {
      case 'any':
        return 'any Police Station';
      case 'central':
        return 'Central Police Station (Nassau)';
      case 'cablebeach':
        return 'Cable Beach Police Station';
      case 'southwestern':
        return 'Southwestern Division Police Station';
      case 'eastern':
        return 'Eastern Division Police Station';
      case 'southcentral':
        return 'South Central Division Police Station';
      case 'northeastern':
        return 'Northeastern Division Police Station';
      case 'carmichael':
        return 'Carmichael Division Police Station';
      case 'mobile':
        return 'Mobile Division Police Station';
      case 'ranson':
        return 'Ranson Division Police Station';
      case 'wulff':
        return 'Wulff Road Police Station';
      case 'hawthorne':
        return 'Hawthorne Road Police Station';
      case 'winton':
        return 'Winton Police Station';
      case 'flamingo':
        return 'Flamingo Gardens Police Station';
      case 'englerston':
        return 'Englerston Police Station';
      case 'southbeach':
        return 'South Beach Police Station';
      case 'grovewest':
        return 'Grove West Police Station';
      case 'coralharbour':
        return 'Coral Harbour Police Station';
      case 'rockcrusher':
        return 'Rock Crusher Police Station';
      case 'columbus':
        return 'Columbus Division Police Station';
      default:
        return 'ANY Police Station';
    }
  }

  closeTermination(event) {
    if (event == false) {
      // False event means the termination was canceled
      this.showTermination = false;
      // Move the termination control back to the sourceControls array and remove from the targetControls array and remove the comment
      const terminationControl = this.targetControls.find((control) => control.id === '11');
      const index = this.targetControls.indexOf(terminationControl);
      if (index > -1) { // Ensure it exists before splicing
        this.targetControls.splice(index, 1);
      }
      this.sourceControls.push(terminationControl);
      // Remove the comment from the termination control in the sourceControls array
      const sourceTerminationControl = this.sourceControls.find((control) => control.id === '11');
      if (sourceTerminationControl) {
        const sourceIndex = this.sourceControls.indexOf(sourceTerminationControl);
        this.sourceControls[sourceIndex].controlComment = '';
      }
      this.refreshPickList();
      // Open a Swal modal to let the user know the termination was canceled
      Swal.fire({
        title: 'Termination Canceled',
        text: 'The Bail Application termination has been canceled',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    } else if (event == true) {
      // Open a Swal modal letting the user know the Application has been Terminated
      Swal.fire({
        title: 'Application Terminated',
        text: 'The Bail Application has been terminated',
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        // True event means the termination was submitted and this application is terminated
        this.exitBailAppTable.emit(true);
      });
    }
  }
}
