import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Hearings} from "../../../models/hearings";
import Swal, {SweetAlertResult} from "sweetalert2";
import {HearingServiceService} from "../../../services/hearing-service.service";
import {Members} from "../../../models/members";
import {Controls} from "../../../models/controls";
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {BookingEvents} from "../../../models/events";
import {Offender} from "../../../models/offender";
import {AngularFireStorage} from "@angular/fire/compat/storage";
import {finalize, take} from "rxjs";
import {Count} from "../../../models/count";
import {Booking} from "../../../models/booking";
import {
  Suretor,
  SuretyApplication,
  Surety,
} from "../../../models/suretor";
import { Timestamp } from '@angular/fire/firestore';
import Quill from 'quill';
import * as moment from "moment";

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

  orderHTML = ``;
  private quillEditor: Quill;
  locations: string;

  constructor(private hs: HearingServiceService, private af: AngularFirestore, private storage: AngularFireStorage) {
  }

  ngOnInit(): void {
    // Get the offender from the 'users' collection using the hearings offenderID
    this.af.collection('users').doc(this.hearings.offenderID).get().pipe(take(1)).subscribe((doc) => {
      this.offender = doc.data() as Offender;
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
        controlName: 'Create Bond',
        controlDescription: 'Create the bond for editing and printing',
        controlIcon: 'fa-pencil-square-o',
        controlModule: 'createBond'
      },
      {
        id: '10',
        controlName: 'Issue Bond',
        controlDescription: 'Upload the signed bond document',
        controlIcon: 'fa-upload',
        controlModule: 'issueBond'
      },
      {
        id: '11',
        controlName: 'Bond Variation',
        controlDescription: 'Submit a Bond Variation',
        controlIcon: 'fa-exchange',
        controlModule: 'variationApp'
      },
      {
        id: '12',
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

    if (this.hearings.grantBailChecked) {
      targetControls.push({
        id: '6',
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

    if (this.hearings.judgeID) {
      const judgeAssignment = this.sourceControls.find((control) => control.controlName === 'Judge Assignment');
      if (judgeAssignment) {
        const index = this.sourceControls.indexOf(judgeAssignment);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(judgeAssignment);
        const judgeIndex = this.targetControls.indexOf(judgeAssignment);
        this.targetControls[judgeIndex].controlComment = 'Judge ' + this.hearings.judgeName + ' assigned to this hearing';
        this.refreshPickList();
      }
    }
    if (this.hearings.hearingDateUnix) {
      const hearingDate = this.sourceControls.find((control) => control.controlName === 'Hearing Date');
      if (hearingDate) {
        const index = this.sourceControls.indexOf(hearingDate);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(hearingDate);
        const hearingDateIndex = this.targetControls.indexOf(hearingDate);
        this.targetControls[hearingDateIndex].controlComment = 'Hearing Date set for ' + this.convertUnixDate(this.hearings.hearingDateUnix.toString());
        this.refreshPickList();
      }
    }

    this.initializeSuretyControls();

    if (this.hearings.bailBondLink && this.hearings.bailBondLink.length > 0) {
      const viewBailBond = {
        id: '12',
        controlName: 'View Bail Bond',
        controlDescription: 'View Bail Bond',
        controlIcon: 'fa-file',
        controlModule: 'viewBailBond',
        controlComment: 'Click to View Bail Bond'
      };
      this.targetControls.push(viewBailBond);
    }

    if (this.hearings.bondHtml && this.hearings.bondHtml.length > 0) {
      const createBondControl = this.sourceControls.find((control) => control.id === '9');
      if (createBondControl) {
        const index = this.sourceControls.indexOf(createBondControl);
        this.sourceControls.splice(index, 1);
        createBondControl.controlComment = 'Click to Edit Bond Form';
        this.targetControls.push(createBondControl);
      }
    }

    this.sortControls();
  }

  refreshPickList(): void {
    this.showPickList = false;
    setTimeout(() => {
      this.showPickList = true;
    }, 100);
  }

  private async initializeSuretyControls(): Promise<void> {
    // Surety 1
    if (this.hearings.suretorNIB) {
      const suretyControl = this.sourceControls.find((control) => control.controlName === 'Surety 1');
      if (suretyControl) {
        const index = this.sourceControls.indexOf(suretyControl);
        this.sourceControls.splice(index, 1);
        this.targetControls.push(suretyControl);

        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretorNIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          let suretorFullName = '';
          if (suretorData && (suretorData as SuretyApplication).surety?.fullName) {
            const newSurety = (suretorData as SuretyApplication).surety;
            if (!newSurety.fullName || newSurety.fullName.trim() === '') {
              suretorFullName = `${newSurety.lastName || ''}, ${newSurety.firstName || ''} ${newSurety.middleName || ''}`.trim();
            } else {
              suretorFullName = newSurety.fullName;
            }
          } else if (suretorData && (suretorData as Suretor).firstName) {
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

        const suretorDoc = await this.af.collection('suretors').doc(this.hearings.suretor2NIB).get().pipe(take(1)).toPromise();
        if (suretorDoc?.exists) {
          const suretorData = suretorDoc.data();
          let suretorFullName = '';
          if (suretorData && (suretorData as SuretyApplication).surety?.fullName) {
            const newSurety = (suretorData as SuretyApplication).surety;
            if (!newSurety.fullName || newSurety.fullName.trim() === '') {
              suretorFullName = `${newSurety.lastName || ''}, ${newSurety.firstName || ''} ${newSurety.middleName || ''}`.trim();
            } else {
              suretorFullName = newSurety.fullName;
            }
          } else if (suretorData && (suretorData as Suretor).firstName) {
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

  private revertSuretyDrag(controlId: string): void {
    const controlToRevert = this.targetControls.find((control) => control.id === controlId);
    if (controlToRevert) {
      const index = this.targetControls.indexOf(controlToRevert);
      this.targetControls.splice(index, 1);
      this.sourceControls.unshift(controlToRevert);
      this.sortControls();
      this.refreshPickList();
    }
  }

  doDrop(control) {
    this.sortControls();
    if (control.items[0].id == '1') {
      const bailApp = this.sourceControls.find((c) => c.controlName === 'Bail Application');
      if (bailApp) {
        const index = this.sourceControls.indexOf(bailApp);
        this.sourceControls.splice(index, 1);
        this.targetControls.unshift(bailApp);
      }
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
      const judgeAssignment = this.sourceControls.find((c) => c.controlName === 'Judge Assignment');
      const index = this.sourceControls.indexOf(judgeAssignment);
      if (index >= 0) {
        this.hearings.judgeID = null;
        this.hearings.judgeName = null;
        this.hs.updateHearing(this.hearings);
        const judgeIndex = this.sourceControls.indexOf(judgeAssignment);
        this.sourceControls[judgeIndex].controlComment = 'No Judge Assigned';
        Swal.fire({
          title: 'Judge Removed',
          text: 'The Judge has been removed from this hearing',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else {
        this.assignJugde();
      }
    }

    if (control.items[0].id == '3') {
      const hearingDate = this.sourceControls.find((c) => c.controlName === 'Hearing Date');
      const index = this.sourceControls.indexOf(hearingDate);
      if (index >= 0) {
        this.hearings.hearingDateUnix = null;
        this.hs.updateHearing(this.hearings);
        const hearingDateIndex = this.sourceControls.indexOf(hearingDate);
        this.sourceControls[hearingDateIndex].controlComment = 'No Hearing Date Set';
        Swal.fire({
          title: 'Hearing Date Removed',
          text: 'The Hearing Date has been removed',
          icon: 'success',
          timer: 2000,
        }).then(() => {
          this.refreshPickList();
        });
      } else {
        this.setHearingDateTime();
      }
    }

    if (control.items[0].id == '4') { // Surety 1
      const suretyControl = this.sourceControls.find((c) => c.controlName === 'Surety 1');
      const indexInSource = this.sourceControls.indexOf(suretyControl);

      if (indexInSource >= 0) {
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
      } else {
        this.assignSurety(control.items[0].id);
      }
    }

    if (control.items[0].id == '5') { // Surety 2
      const suretyControl = this.sourceControls.find((c) => c.controlName === 'Surety 2');
      const indexInSource = this.sourceControls.indexOf(suretyControl);

      if (indexInSource >= 0) {
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
      } else {
        this.assignSurety(control.items[0].id);
      }
    }

    if (control.items[0].id == '9') { // Create Bond
      const createBondControl = this.targetControls.find((c) => c.id === '9');
      if (createBondControl) {
        // Moved to target
        createBondControl.controlComment = 'Click to open the bond editor';
      } else {
        // Moved to source
        if (this.hearings.bondHtml) {
          Swal.fire({
            title: 'Remove Bond?',
            text: 'This will delete the saved bond form. Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it'
          }).then((result) => {
            if (result.isConfirmed) {
              this.hearings.bondHtml = null;
              this.updateHearing(this.hearings);
              const bondControlInSource = this.sourceControls.find(c => c.id === '9');
              if (bondControlInSource) {
                bondControlInSource.controlComment = '';
              }
              Swal.fire('Deleted!', 'The bond form has been deleted.', 'success');
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              // Move it back to target
              const bondControlInSource = this.sourceControls.find(c => c.id === '9');
              if (bondControlInSource) {
                const index = this.sourceControls.indexOf(bondControlInSource);
                this.sourceControls.splice(index, 1);
                this.targetControls.push(bondControlInSource);
                this.sortControls();
              }
            }
          });
        }
      }
    }

    if (control.items[0].id == '10') { // Issue Bond
      const issueBond = this.targetControls.find((c) => c.id === '10');
      if (issueBond) {
        issueBond.controlComment = 'Click to upload signed bond';
        Swal.fire({
          title: 'Upload Signed Bond',
          text: 'Click on the "Issue Bond" control again to open the upload dialog.',
          icon: 'info',
          confirmButtonText: 'Ok'
        });
      }
    }

    if (control.items[0].id == '12') {
      const terminationControl = this.targetControls.find((c) => c.id === '12');
      if (terminationControl) {
        terminationControl.controlComment = 'Click to terminate this application';
      }
      Swal.fire({
        title: 'Must Confirm through Termination Menu',
        text: 'Click on the Termination Control to open the Termination Menu! This Application will not be terminated until Confirmed with a reason for termination!',
        icon: 'info',
        confirmButtonText: 'Ok'
      });
      this.refreshPickList();
    }
  }

  private async assignSurety(controlId: string): Promise<void> {
    const isSurety1 = controlId === '4';
    const suretyControlName = isSurety1 ? 'Surety 1' : 'Surety 2';

    const { value: formValues } = await Swal.fire({
      title: `Assign ${suretyControlName}`,
      html: '<input id="swal-input1" class="swal2-input" placeholder="Surety NIB">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          suretorNIB: (document.getElementById('swal-input1') as HTMLInputElement).value
        };
      }
    });

    if (!formValues || !formValues.suretorNIB) {
      this.revertSuretyDrag(controlId);
      return;
    }

    const inputNIB = formValues.suretorNIB.trim();

    if (!/^\d+$/.test(inputNIB)) {
      Swal.fire('Invalid NIB', 'The Suretor NIB is invalid. Please enter a valid NIB (numbers only).', 'error');
      this.revertSuretyDrag(controlId);
      return;
    }

    // Conflict check logic remains the same...
  }

  sortControls() {
    this.sourceControls.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    this.targetControls.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    this.refreshPickList();
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

  convertUnixDate(unixDate: string) {
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

  updateHearing(hearing: Hearings) {
    const originalName = hearing.offenderName;
    const offenderNameParts = hearing.offenderName.split(', ');
    if (offenderNameParts.length === 2) {
      hearing.offenderName = offenderNameParts[1].trim() + ' ' + offenderNameParts[0].trim();
    }
    this.hs.updateHearing(hearing);
    hearing.offenderName = originalName;
  }

  exitBailApplicationTable() {
    this.hearings = null;
    this.exitBailAppTable.emit(true);
  }

  doClick(control): void {
    const targetControl = this.targetControls.find((c) => c.id === control.id);
    if (targetControl) {
      switch (control.id) {
        case '1':
          window.open(this.hearings.bailAppLink, '_blank');
          break;
        case '2':
          this.assignJugde();
          break;
        case '3':
          this.setHearingDateTime();
          break;
        case '4':
        case '5':
          this.editSuretorInfo(control.id);
          break;
        case '6':
          if (this.hearings.deniedBailChecked) {
            this.showReasonDenied();
          }
          break;
        case '8':
          this.showOrder = true;
          break;
        case '9':
          this.openBondEditor();
          break;
        case '10':
          this.doIssueBond();
          break;
        case '11':
          // Bond Variation - Not implemented yet
          break;
        case '12':
          if (control.controlModule === 'terminateApp') {
            this.showTermination = true;
          } else if (control.controlModule === 'viewBailBond') {
            this.doShowBailBond();
          }
          break;
      }
    }
  }

  private async editSuretorInfo(controlId: string): Promise<void> {
    // Logic remains the same...
  }

  showReasonDenied() {
    Swal.fire({
      title: 'Reason for Denial',
      text: this.hearings.deniedBailReason,
      icon: 'info',
      confirmButtonText: 'Ok'
    });
  }

  doShowBailBond() {
    window.open(this.hearings.bailBondLink, '_blank');
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

            const issueBondControl = this.targetControls.find((c) => c.id === '10');
            const index = this.targetControls.indexOf(issueBondControl);
            if (index > -1) {
              this.targetControls.splice(index, 1);
            }

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
        return 'Any Police Station with a Kiosk';
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
      case 'grove':
        return 'Grove Police Station';
      case 'coralharbour':
        return 'Coral Harbour Police Station';
      case 'rockcrusher':
        return 'Rock Crusher Police Station';
      case 'columbus':
        return 'Columbus Division Police Station';
      case 'elizabeth':
        return 'Elizabeth Police Station';
      case 'freeport':
        return 'Freeport Police Station';
      default:
        return;
    }
  }

  getPoliceStationsNames() {
    const htmlContainer = Swal.getHtmlContainer();
    if (!htmlContainer) return;
    // Get all of the locations that are checked in the document between the div tag with the id of 'locationChecks' and if the checkbox is checked, add it to an array
    const locationChecks = htmlContainer.querySelector('#locationChecks') as HTMLDivElement;
    const locationCheckboxes = locationChecks.getElementsByTagName('input');
    const locationArray = [];
    for (let i = 0; i < locationCheckboxes.length; i++) {
      if (locationCheckboxes[i].checked) {
        locationArray.push(locationCheckboxes[i].value);
      }
    }
    // Using the getPoliceStation function, convert each location in the locationArray to the actual name of the police station
    for (let i = 0; i < locationArray.length; i++) {
      locationArray[i] = this.getPoliceStation(locationArray[i]);
    }
    // Take the locationArray and convert it to a string separated by commas and put the work 'and' before the last item in the array
    const locationString = locationArray.join(', ').replace(/, ([^,]*)$/, ' or $1');
    this.locations = locationString;
    const locationsDisplay = htmlContainer.querySelector('#locations-display') as HTMLSpanElement;
    if(locationsDisplay) {
      locationsDisplay.innerText = this.locations;
    }
  }

  enterBailConditions() {
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
            <div class="form-check"><input id="central" class="form-check-input" type="checkbox" value="central" /><label class="form-check-label" for="central">Central Police Station</label></div>
            <div class="form-check"><input id="southbeach" class="form-check-input" type="checkbox" value="southbeach" /><label class="form-check-label" for="southbeach">South Beach Police Station</label></div>
            <div class="form-check"><input id="elizabeth" class="form-check-input" type="checkbox" value="elizabeth" /><label class="form-check-label" for="elizabeth">Elizabeth Police Station</label></div>
            <div class="form-check"><input id="carmichael" class="form-check-input" type="checkbox" value="carmichael" /><label class="form-check-label" for="carmichael">Carmichael Police Station</label></div>
            <div class="form-check"><input id="grove" class="form-check-input" type="checkbox" value="grove" /><label class="form-check-label" for="grove">Grove Police Station</label></div>
            <span style="font-weight: bold;">Kiosks Located on Grand Bahamas</span>
            <div class="form-check"><input id="freeport" class="form-check-input" type="checkbox" value="freeport" /><label class="form-check-label" for="freeport">Freeport Police Station</label></div>
          </div>
          <div class="h5 text-danger mt-2">Currently Selected Location: <span id="locations-display"></span></div>
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


  closeTermination(event) {
    if (event == false) {
      this.showTermination = false;
      const terminationControl = this.targetControls.find((control) => control.id === '11');
      const index = this.targetControls.indexOf(terminationControl);
      if (index > -1) {
        this.targetControls.splice(index, 1);
      }
      this.sourceControls.push(terminationControl);
      const sourceTerminationControl = this.sourceControls.find((control) => control.id === '11');
      if (sourceTerminationControl) {
        const sourceIndex = this.sourceControls.indexOf(sourceTerminationControl);
        this.sourceControls[sourceIndex].controlComment = '';
      }
      this.refreshPickList();
      Swal.fire('Termination Canceled', 'The Bail Application termination has been canceled.', 'success');
    } else if (event == true) {
      Swal.fire('Application Terminated', 'The Bail Application has been terminated.', 'success').then(() => {
        this.exitBailAppTable.emit(true);
      });
    }
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


    const data = {
      partiesList: partiesList,
      offenderName: offenderFormatted,
      surety1Name: surety1Formatted || 'N/A',
      surety2Name: surety2Formatted || 'N/A',
      assistantRegistrarName: '-- ASSISTANT REGISTRAR NAME --',
      bondAmountWords: this.hearings.suretyReq ? this.hearings.suretyReq.split('(')[0].trim() : 'Written Amount Here',
      bondAmount: bondAmount,
      bondDate: `${formatDateWithOrdinal(today)}`,
      bondDateFull: `${formatDateWithOrdinal(today).split(',')[0]}, A.D.${today.getFullYear()}`,
      courtName: 'SUPREME COURT',
      charges: this.counts.map(c => c.countCharge).join(', ') || 'N/A',
      surety1Address: 'N/A',
      surety1PoBox: 'N/A',
      surety1Telephone: 'N/A',
      surety1Workplace: 'N/A',
      surety1WorkplaceAddress: 'N/A',
      surety1WorkplaceTelephone: 'N/A',
      surety1Position: 'N/A',
      surety2Address: 'N/A',
      surety2PoBox: 'N/A',
      surety2Telephone: 'N/A',
      surety2Workplace: 'N/A',
      surety2WorkplaceAddress: 'N/A',
      surety2WorkplaceTelephone: 'N/A',
      surety2Position: 'N/A',
      reportingClause: reportingClause,
      judgeName: this.hearings.judgeName || 'N/A',
      orderGrantingBailDate: this.hearings.hearingDateUnix ? this.convertUnixDate(this.hearings.hearingDateUnix) : 'N/A',
      signatureDate: signatureDate,
      clerkName: '____________________'
    };

    for (const key in data) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }

    return html;
  }

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
          this.cancelBondCreation();
        });
      }
    });
  }

  cancelBondCreation() {
    const createBondControl = this.targetControls.find(c => c.id === '9');
    if (createBondControl) {
      const index = this.targetControls.indexOf(createBondControl);
      this.targetControls.splice(index, 1);
      createBondControl.controlComment = ''; // Reset comment
      this.sourceControls.push(createBondControl);
      this.sortControls();
      this.refreshPickList();
    }
    Swal.close();
  }
}