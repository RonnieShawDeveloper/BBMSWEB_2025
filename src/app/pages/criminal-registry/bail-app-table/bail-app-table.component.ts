import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Hearings} from "../../../models/hearings";
import Swal, {SweetAlertResult} from "sweetalert2";
import {HearingServiceService} from "../../../services/hearing-service.service";
import {Members} from "../../../models/members";
import {Controls} from "../../../models/controls";
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {BookingEvents} from "../../../models/events";
import {Offender} from "../../../models/offender";
import {AngularFireStorage} from "@angular/fire/compat/storage";
import {finalize, take} from "rxjs";
import {Count} from "../../../models/count";
@Component({
  selector: 'app-bail-app-table',
  templateUrl: './bail-app-table.component.html',
  styleUrls: ['./bail-app-table.component.scss']
})
export class BailAppTableComponent implements OnInit{
  @Input() hearings: Hearings;
  @Output() exitBailAppTable:EventEmitter<boolean> = new EventEmitter<boolean>();

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

  constructor(private hs: HearingServiceService, private af: AngularFirestore, private storage: AngularFireStorage) { }

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
        if (count.countCharge.match(/^\d{4}-/)) {
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
        if(event.title == 'Remand Warrant') {
          this.remandLink = event.link;
        }
        if(event.type == 'dpp_affidavit') {
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
    const sourceControls:Controls[] = [
      {id: '2', controlName: 'Judge Assignment', controlDescription: 'Assign a Judge to the Hearing', controlIcon: 'fa-gavel', controlModule: 'judgeAssignment'},
      {id: '3', controlName: 'Hearing Date', controlDescription: 'Set a Hearing Date', controlIcon: 'fa-calendar', controlModule: 'hearingDate'},
      {id: '4', controlName: 'Surety', controlDescription: 'Assign the Surety(s)', controlIcon: 'fa-money', controlModule: 'suretyApp'},
      // {id: '5', controlName: 'Bail Granted', controlDescription: 'Bail Granted', controlIcon: 'fa-check', controlModule: 'bailGranted'},
      // {id: '6', controlName: 'Bail Denied', controlDescription: 'Bail Denied', controlIcon: 'fa-remove', controlModule: 'bailDenied'},
      {id: '7', controlName: 'Revoke Bail', controlDescription: 'Bail Revoked', controlIcon: 'fa-ban', controlModule: 'bailRevoked'},
      // {id: '8', controlName: 'Bail Conditions', controlDescription: 'Bail Conditions', controlIcon: 'fa-heartbeat', controlModule: 'bailConditions'},
      {id: '9', controlName: 'Issue Bond', controlDescription: 'Create and Issue Bond', controlIcon: 'fa-newspaper-o', controlModule: 'issueBond'},
      {id: '10', controlName: 'Bond Variation', controlDescription: 'Submit a Bond Variation', controlIcon: 'fa-exchange', controlModule: 'variationApp'},
      {id: '11', controlName: 'Terminate Application', controlDescription: 'Terminate Application', controlIcon: 'fa-power-off', controlModule: 'terminateApp'},
    ];
    this.sourceControls = sourceControls;

    const targetControls:Controls[] = [
      {id: '1', controlName: 'Bail Application', controlDescription: 'Bail Application', controlIcon: 'fa-edit', controlModule: 'bailApp', controlComment: 'Bail Application submitted by Defendant', controlDate: this.convertUnixDate(this.hearings.unixDate.toString())}
    ];
      // If Bail Granted is true, add the Bail Granted control to the target controls array
      if(this.hearings.grantBailChecked) {
        targetControls.push({id: '5', controlName: 'Bail Granted', controlDescription: 'Bail Granted', controlIcon: 'fa-check', controlModule: 'bailGranted', controlComment: 'Bail Granted', controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())});
        targetControls.push({id: '8', controlName: 'Bail Conditions', controlDescription: 'Bail Conditions', controlIcon: 'fa-heartbeat', controlModule: 'bailConditions', controlComment: 'Click to see the Order Granting Bail', controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())});
      }
      if(this.hearings.deniedBailChecked) {
        targetControls.push({id: '6', controlName: 'Bail Denied', controlDescription: 'Bail Denied', controlIcon: 'fa-remove', controlModule: 'bailDenied', controlComment: 'CLICK TO SEE REASON BAIL WAS DENIED', controlDate: this.convertUnixDate(this.hearings.hearingDateUnix.toString())});
      }


    this.targetControls = targetControls;

    if(this.hearings.judgeID) {
    // Remove the Judge Assignment control from the source controls array if a judge has been assigned and add it to the target controls array
      const judgeAssignment = this.sourceControls.find((control) => control.controlName === 'Judge Assignment');
      const index = this.sourceControls.indexOf(judgeAssignment);
      this.sourceControls.splice(index, 1);
      this.targetControls.push(judgeAssignment);
      // Edit the Judge Assignment control in the targetControls array to show the name of the judge that has been assigned and the date that the judge was assigned
      const judge = this.members.find((member) => member.id === this.hearings.judgeID);
      const judgeIndex = this.targetControls.indexOf(judgeAssignment);
      this.targetControls[judgeIndex].controlComment = 'Judge ' + this.hearings.judgeName + ' assigned to this hearing';
      this.showPickList = false;
      setTimeout(() => {
        this.showPickList = true;
      } , 100);
    }
    if(this.hearings.hearingDateUnix) {
      // Remove the Hearing Date control from the source controls array if a hearing date has been set and add it to the target controls array
      const hearingDate = this.sourceControls.find((control) => control.controlName === 'Hearing Date');
      const index = this.sourceControls.indexOf(hearingDate);
      this.sourceControls.splice(index, 1);
      this.targetControls.push(hearingDate);
      // Edit the Hearing Date control in the targetControls array to show the date that the hearing has been set for
      const hearingDateIndex = this.targetControls.indexOf(hearingDate);
      this.targetControls[hearingDateIndex].controlComment = 'Hearing Date set for ' + this.convertUnixDate(this.hearings.hearingDateUnix.toString());
      this.showPickList = false;
      setTimeout(() => {
        this.showPickList = true;
      } , 100);
    }
    // If a bond has been issued
    if(this.hearings.bailBondLink && this.hearings.bailBondLink.length > 0) {
      // Add a new control to the target controls array called 'View Bail Bond' and add 'Click to View Bail Bond' to the control comment
      const viewBailBond = {id: '12', controlName: 'View Bail Bond', controlDescription: 'View Bail Bond', controlIcon: 'fa-file', controlModule: 'viewBailBond', controlComment: 'Click to View Bail Bond'};
      this.targetControls.push(viewBailBond);
      this.sortControls();
    }
    // // Create an event listener to listen for changes to the element called 'cdk-drop-list-1' for drag and drop events
    // const dropListOne = document.getElementById('cdk-drop-list-1');
    // dropListOne.addEventListener('DOMNodeInserted', (event) => {
    //   console.log('DOMNodeInserted: ', event);
    // });
    this.sortControls();
  }

  showApplication() {
    window.open(this.hearings.bailAppLink, '_blank');
  }

  showRemandWarrant() {
    // Check to see if the remandLink contains a link, and if it does not, create a swal modal alert to notify the user that the remand warrant has not been uploaded yet
    if(this.remandLink.length < 1) {
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
    if(this.remandLink.length < 1) {
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

  doDrop(control) {
    // console.log('doDrop: ', control.items[0].id);
    // Check to see if the user has dragged the Bail Application Control into the source Controls Array and if so, add it back to the target controls array
    this.sortControls();
    if(control.items[0].id == '1') {
      const bailApp = this.sourceControls.find((control) => control.controlName === 'Bail Application');
      const index = this.sourceControls.indexOf(bailApp);
      this.sourceControls.splice(index, 1);
      this.targetControls.unshift(bailApp);
      // Create a Swall Modal Alert to notify the user that the Bail Application can not be removed and to use the Terminate Application Control instead
      Swal.fire({
        title: 'Bail Application',
        text: 'The Bail Application can not be removed. Please use the Terminate Application Control instead',
        icon: 'warning',
        confirmButtonText: 'OK'
      }).then(() => {
      this.showPickList = false;
      setTimeout(() => {
        this.showPickList = true;
      } , 100);
    });
    }

    if(control.items[0].id == '2') {
      // Check to see if the  user has dragged the Judge Assignment control into the target controls array or the source controls array
      const judgeAssignment = this.sourceControls.find((control) => control.controlName === 'Judge Assignment');
      const index = this.sourceControls.indexOf(judgeAssignment);
      console.log('index: ', index);
      if(index >= 0) {
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
            this.showPickList = false;
            setTimeout(() => {
              this.showPickList = true;
            } , 100);
        });
      } else {
        this.assignJugde();
      }


    }
    if(control.items[0].id == '3') {
      // Check to see if the  user has dragged the Hearing Date control into the target controls array or the source controls array
      const hearingDate = this.sourceControls.find((control) => control.controlName === 'Hearing Date');
      const index = this.sourceControls.indexOf(hearingDate);
      if(index >= 0) {
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
          this.showPickList = false;
          setTimeout(() => {
            this.showPickList = true;
          } , 100);
        });
      } else {
        this.setHearingDateTime();
      }
    }
    if(control.items[0].id == '9') {
      // Check if the grantBailChecked property is false and if so, open a Swal Modal and tell the user that they need to Grant Bail before issuing a bond but give them the choice to continue or cancel
      if(!this.hearings.grantBailChecked) {
        Swal.fire({
          title: 'Grant Bail',
          text: 'You must Grant Bail before issuing a bond. Do you want to Grant Bail now?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No'
        }).then((result) => {
          if(result.value) {
            // Locate the Issue Bond control and add a comment that says 'click to issue bond'
            const issueBond = this.targetControls.find((control) => control.id === '9');
            const index = this.targetControls.indexOf(issueBond);
            this.targetControls[index].controlComment = 'Click to issue bond';
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
            const index = this.targetControls.indexOf(issueBond);
            this.targetControls.splice(index, 1);
            this.sourceControls.unshift(issueBond);
            this.showPickList = false;
            setTimeout(() => {
              this.showPickList = true;
            }, 100);
          }
        });
      } else {
        // Locate the Issue Bond control and add a comment that says 'click to issue bond'
        const issueBond = this.targetControls.find((control) => control.id === '9');
        const index = this.targetControls.indexOf(issueBond);
        this.targetControls[index].controlComment = 'Click to issue bond';
        // Open a Swal Modal and tell the user that they need to Click on the Issue Bond Control to Open the Issue Bond Menu
        Swal.fire({
          title: 'Click on Issue Bond Tab',
          text: 'Click on the Issue Bond Control Tab to open the Issue Bond Menu! The Bond can then be uploaded to the system and issued',
          icon: 'info',
          confirmButtonText: 'Ok'
        });
      }
    }

    if(control.items[0].id == '11') {
      // Locate the Termination Control and add a comment that says 'click to terminate this application'
      const terminationControl = this.targetControls.find((control) => control.id === '11');
      const index = this.targetControls.indexOf(terminationControl);
      this.targetControls[index].controlComment = 'Click to terminate this application';
      // Open a Swal Modal and tell the user that they need to Click on the Termination Control to Open the Termination Menu
      Swal.fire({
        title: 'Must Confirm through Termination Menu',
        text: 'Click on the Termination Control to open the Termination Menu! This Application will not be terminated until Confirmed with a reason for termination!',
        icon: 'info',
        confirmButtonText: 'Ok'
      });
      this.showPickList = false;
      setTimeout(() => {
        this.showPickList = true;
      }, 100);
    }
  }

  // Sort the SourceControls array and the TargetControls array by the id property
  sortControls() {
    this.sourceControls.sort((a, b) => a.id.localeCompare(b.id));
    this.targetControls.sort((a, b) => a.id.localeCompare(b.id));
    this.showPickList = false;
    setTimeout(() => {
      this.showPickList = true;
    }, 100);
  }

  setHearingDateTime() {
    // Open a model with Swal to show a calendar and time selection to set a hearing date and time
    Swal.fire({
      title: 'Set Hearing Date and Time',
      html: '<input id="swal-input1" type="datetime-local" class="swal2-input" placeholder="Date">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const datetime = (<HTMLInputElement>document.getElementById('swal-input1')).value;
        return { date: datetime};
      }
    } as any).then((result) => {
      // Check to see if the user canceled or dismissed the swal modal
      if(result.isConfirmed == false) {
        // Check to see if a hearing date and time has already been set in this matter
        if(this.hearings.hearingDateUnix) {
          return;
        }
        // In the array targetSource find the item with the ID of '3' and remove it from the array
        const hearingDate = this.targetControls.find((control) => control.id === '3');
        const index = this.targetControls.indexOf(hearingDate);
        this.targetControls.splice(index, 1);
        // Add the hearingDate to the top of the sourceControls array
        this.sourceControls.unshift(hearingDate);
      } else {
        const unixTimestamp = new Date(result.value.date).getTime();
        this.hearings.hearingDateUnix = unixTimestamp.toString();
        this.updateHearing(this.hearings);
        // Get the BookingEvent for this hearing
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEvent:BookingEvents) => {
          const bailApp: BookingEvents = bookingEvent[0];
          bailApp.hearingDateSet = unixTimestamp.toString();
          this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
        } );
        // Find the hearing date control in the targetControls array and update the comment to show the date that the hearing has been set for
        const hearingDate = this.targetControls.find((control) => control.id === '3');
        const index = this.targetControls.indexOf(hearingDate);
        this.targetControls[index].controlComment = 'Hearing Date set for ' + this.convertUnixDate(this.hearings.hearingDateUnix.toString());
      }
    }).then(() => {
      this.showPickList = false;
      setTimeout(() => {
        this.showPickList = true;
      } , 100);
    });
  }

  assignJugde() {
    // Load the members from the collection called 'members' and save then to the array called 'members'
    this.hs.getJudges().subscribe((members) => {
      this.members = members;
      console.log('Judges: ',this.members);
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
        // Set the judge field in the hearings collection to the selected judge
        this.hearings.judgeName = this.members[result.value].name;
        this.hearings.judgeID = this.members[result.value].id;
        this.updateHearing(this.hearings);

        // Get the BookingEvent for this hearing
        this.af.collection('BookingEvents').doc(this.hearings.eventID).get().subscribe((bookingEvent:BookingEvents) => {
          const bailApp: BookingEvents = bookingEvent[0];
          bailApp.judge = this.hearings.judgeName;
          bailApp.judgeID = this.hearings.judgeID;
          this.af.collection('BookingEvents').doc(this.hearings.eventID).update(bailApp);
        } );
        // Locate the Judge Assignment control in the targetControls array and edit it to show the name of the judge that has been assigned
        const judgeAssignment = this.targetControls.find((control) => control.id === '2');
        const judgeIndex = this.targetControls.indexOf(judgeAssignment);
        this.targetControls[judgeIndex].controlComment = 'Judge ' + this.hearings.judgeName + ' assigned to this hearing';
        // Provide a swal alert to let the user know that the judge has been assigned
        Swal.fire({
          title: 'Judge Assigned',
          text: 'The judge has been assigned to this Bail Application',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.showPickList = false;
          setTimeout(() => {
            this.showPickList = true;
          }, 100);
        });
      });
    });

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

    const month = date.toLocaleString('en-US', { month: 'long' });
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
    hearing.offenderName = offenderName[1] + ' ' + offenderName[0];
    // Update the hearing in the database
    this.hs.updateHearing(hearing);
    // Set the offender name back to the original value
    hearing.offenderName = originalName;
  }

  exitBailApplicationTable() {
    this.hearings = null;
    this.exitBailAppTable.emit(true);
  }

  doClick(control) : void {
    // Check to see if the control is in the targetControls array
    const targetControl = this.targetControls.find((targetControl) => targetControl.id === control.id);
    if(targetControl) {
      if(control.id == '1') {
        // Open a new window with the bail application found in 'hearings.bailAppLink'
        window.open(this.hearings.bailAppLink, '_blank');
      }
      if(control.id == '2') {
        this.assignJugde();
      }
      if(control.id == '3') {
        this.setHearingDateTime();
      }
      if(control.id == '6') {
        this.showReasonDenied();
      }
      if(control.id == '8') {
       this.showOrder = true;
      }
      if(control.id == '9') {
        this.doIssueBond();
      }
      if(control.id == '11') {
        this.showTermination = true;
      }
      if(control.id == '12') {
        this.doShowBailBond();
      }
    }
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
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target.result);
          };
          reader.readAsDataURL(file);
        });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result :SweetAlertResult<string>) => {
    // get the offender name and remove all spaces and commas
    const offenderName = this.hearings.offenderName.replace(/ /g, '').replace(/,/g, '');
    // Upload the file to firebase storage and then save the link to the database in the bailBondLink field
    const unixTimestamp = Math.round((new Date()).getTime() / 1000);
    const bondFileName = unixTimestamp + '-' + this.hearings.offenderID+'-'+offenderName +'-bond.pdf';
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
          const viewBailBond = {id: '12', controlName: 'View Bail Bond', controlDescription: 'View Bail Bond', controlIcon: 'fa-file', controlModule: 'viewBailBond', controlComment: 'Click to View Bail Bond'};
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
    if(event == false) {
      // False event means the termination was canceled
      this.showTermination = false;
      // Move the termination control back to the sourceControls array and remove from the targetControls array and remove the comment
      const terminationControl = this.targetControls.find((control) => control.id === '11');
      const index = this.targetControls.indexOf(terminationControl);
      this.targetControls.splice(index, 1);
      this.sourceControls.push(terminationControl);
      // Remove the comment from the termination control in the sourceControls array
      const sourceTerminationControl = this.sourceControls.find((control) => control.id === '11');
      const sourceIndex = this.sourceControls.indexOf(sourceTerminationControl);
      this.sourceControls[sourceIndex].controlComment = '';
      this.showPickList = false;
      // Open a Swal modal to let the user know the termination was canceled
      Swal.fire({
        title: 'Termination Canceled',
        text: 'The Bail Application termination has been canceled',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
      setTimeout(() => {
        this.showPickList = true;
      } , 100);
    } else if(event == true) {
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
