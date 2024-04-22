import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {HelperService} from "../../../services/helper.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireStorage, AngularFireUploadTask} from "@angular/fire/compat/storage";
import Swal from "sweetalert2";
import {Count} from "../../../models/count";
import {finalize, Observable} from "rxjs";
import {Offender} from "../../../models/offender";
import {BookingEvents} from "../../../models/events";
import {Booking} from "../../../models/booking";
import {Members} from "../../../models/members";
import swal from "sweetalert2";
import {take} from "rxjs/operators";
import {Afis} from "../../../models/afis";
import {HttpClient} from "@angular/common/http";


@Component({
  selector: 'app-magistrate-booking',
  templateUrl: './magistrate-booking.component.html',
  styleUrls: ['./magistrate-booking.component.scss']
})
export class MagistrateBookingComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() booking: Booking;
  @Output() onExit = new EventEmitter<boolean>();

  notsaved = false;
  activeBooking: Booking = {};
  downloadURL: Observable<any> // Bail Application
  downloadURL2: Observable<any> // PDF Document
  downloadURL3: Observable<any> // Remand Warrant
  snapshotDataUrl: any;

  selectedDefendant: Offender = {};

  bookingEvents: BookingEvents[] = [];
  eventID = '';
  charges: Count[] = [];
  currentCharge: string;
  magistrates: Members[] = [];
  selectedJudge: Members = {};
  currentMember: Members = {};
  linkedOffenders: Offender[] = [];
  linkedOffender: Offender = {};

  subscriptions: any[] = [];
  crimeCodes: { code?: string, value?: string }[] = [];

  constructor(private hs: HelperService, private fs: AngularFirestore, private storage: AngularFireStorage, private http: HttpClient) {
  }

  ngOnInit(): void {
    // console.log('Not Saved', this.notsaved);
    this.activeBooking = {};
    if (this.booking.id) {
      // Get the Booking from the firestore database called 'magistrateBookings' where 'id' is equal to the booking id
      this.subscriptions.push(this.fs.collection('magistrateBookings').doc(this.booking.id).valueChanges().subscribe((data: Booking) => {
        this.activeBooking = data;
        console.log('Active Booking', this.activeBooking);
        // Change all input fields to white
        const inputs = document.querySelectorAll('input');
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].style.backgroundColor = 'white';
        }
        this.subscriptions.push(this.fs.collection('BookingEvents', ref => ref.where('bookingID', '==', this.activeBooking.id)).valueChanges().subscribe((data: BookingEvents[]) => {
          this.bookingEvents = data;
          console.log('Booking Events', this.bookingEvents);
          // If activeBooking.court is empty or null, set all checkboxes to unchecked and create a Swal Dialog letting the user know that they must select a court of jurisdiction
          if (!this.activeBooking.court) {
            (document.getElementById('formCheck-10') as HTMLInputElement).checked = false;
            (document.getElementById('formCheck-30') as HTMLInputElement).checked = false;
            (document.getElementById('formCheck-20') as HTMLInputElement).checked = false;
            Swal.fire({
              title: 'Select Court',
              text: 'This booking does not have a Court assigned. You must select a court of jurisdiction for this hearing.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
          }
         // Sort the bookingEvents by unixDate showing the newest first
          this.bookingEvents.sort((a, b) => {
            return parseInt(b.unixDate) - parseInt(a.unixDate);
          });
        }));
      }));
      // Get all members from the 'members' collection in the firestore database that has the 'authMagistrate' property set to true and store them in the magistrates array

    }
    // Get the current member from localstorage and store it in the currentMember variable
    this.currentMember = JSON.parse(localStorage.getItem('member'));

    // Get all members from the 'members' collection in the firestore database that has the 'authMagistrate' property set to true and store them in the magistrates array
    this.subscriptions.push(this.fs.collection('members', ref => ref.where('authMagistrate', '==', true)).valueChanges().subscribe((data: Members[]) => {
      this.magistrates = data;

    }));
    this.crimeCodes = this.hs.getCrimes();
  }

  ngAfterViewInit(): void {
    // add an event listener to every input field and listen for a change and set the not saved variable to true
    const inputs = document.querySelectorAll('input');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('change', () => {
        this.notsaved = true;
        inputs[i].style.backgroundColor = 'lightgreen';
        console.log('Not Saved', this.notsaved);
      });
    }
    // add an event listener to every textarea field and listen for a change and set the notsaved variable to true
    const textareas = document.querySelectorAll('textarea');
    for (let i = 0; i < textareas.length; i++) {
      textareas[i].addEventListener('change', () => {
        this.notsaved = true;
        textareas[i].style.backgroundColor = 'lightgreen';
      });
    }

    // Add an event listener to all select elements on the page and listen for a change and set the notsaved variable to true
    const selects = document.querySelectorAll('select');
    for (let i = 0; i < selects.length; i++) {
      selects[i].addEventListener('change', () => {
        this.notsaved = true;
        console.log('Not Saved', this.notsaved);
      });
    }

  }


  courtChanged(event: any) {
    // Using the event, determine which checkbox was chosen and unselect the other two checkboxes
    if (event.target.id == 'formCheck-10') {
      (document.getElementById('formCheck-30') as HTMLInputElement).checked = false;
      (document.getElementById('formCheck-20') as HTMLInputElement).checked = false;
    }
    if (event.target.id == 'formCheck-30') {
      (document.getElementById('formCheck-10') as HTMLInputElement).checked = false;
      (document.getElementById('formCheck-20') as HTMLInputElement).checked = false;
    }
    if (event.target.id == 'formCheck-20') {
      (document.getElementById('formCheck-10') as HTMLInputElement).checked = false;
      (document.getElementById('formCheck-30') as HTMLInputElement).checked = false;
    }

    // when someone selects a court from the checkboxs with ID's formCheck-10, formCheck-30 and formCheck-20, set the activeBooking.court to the value of the selected checkbox
    if ((document.getElementById('formCheck-10') as HTMLInputElement).checked) {
      this.activeBooking.court = 'Nassau';
    }
    if ((document.getElementById('formCheck-30') as HTMLInputElement).checked) {
      this.activeBooking.court = 'Grand Bahamas';
    }
    if ((document.getElementById('formCheck-20') as HTMLInputElement).checked) {
      this.activeBooking.court = 'Abaco';
    }
    this.saveupdate();
  }

  exit() {
    console.log('Not Saved Exit', this.notsaved);
    // Check if the notsaved variable is true and if so, provide a swal message to the user telling them they must save the current booking before exiting and then return
    if (this.notsaved) {
      Swal.fire({
        title: 'Save Booking',
        text: 'Changes have been made to this document. You must save the current booking before exiting.',
        icon: 'warning',
        confirmButtonText: 'OK',
        showCancelButton: true,
        cancelButtonText: 'Exit without Saving',
      }).then((result) => {
        if (result.isConfirmed) {
          return;
        } else {
          // Loop through all subscriptions and unsubscribe
          for (let i = 0; i < this.subscriptions.length; i++) {
            this.subscriptions[i].unsubscribe();
          }
          this.onExit.emit(true);
        }
      });
    } else {
      // Loop through all subscriptions and unsubscribe
      for (let i = 0; i < this.subscriptions.length; i++) {
        this.subscriptions[i].unsubscribe();
      }
      this.onExit.emit(true);
    }
  }

  doDocumentUpload() {
    // Create a Swal Dialog Box that first asks for a title for a document using the input text box and then show a file dialog allowing the user to only upload a pdf document and then save that document to the Firebase Storage bucket called 'pdf-documents' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL2
    Swal.fire({
      title: 'Enter Document Title',
      input: 'text',
      inputAttributes: {
        'aria-label': 'Type your document title here'
      },
      showCancelButton: true,
      confirmButtonText: 'Next',
      showLoaderOnConfirm: true,
      preConfirm: (title) => {
        // Open a file dialog to select a pdf file
        Swal.fire({
          title: 'Select PDF Document',
          input: 'file',
          inputAttributes: {
            'accept': 'application/pdf',
            'aria-label': 'Upload your PDF document'
          },
          showCancelButton: true,
          confirmButtonText: 'Upload',
          showLoaderOnConfirm: true,
          preConfirm: (file) => {
            const filePath = 'pdf-documents/' + this.activeBooking.id + '-' + Date.now();
            const fileRef = this.storage.ref(filePath);
            const task = this.storage.upload(filePath, file);
            return task.snapshotChanges().pipe(
              // If the upload is successful, get the downloadURL and put it in the observable called downloadURL2
              finalize(() => {
                this.downloadURL2 = fileRef.getDownloadURL();
              })
            );
          }
        }).then((result) => {
          // If the upload is successful, update the booking event in the Firestore database called 'BookingEvents' where 'id' is equal to the event id and set the link to the downloadURL2 observable value
          if (result.isConfirmed) {
            // Get the downloadURL string from the URL observable
            this.downloadURL2.subscribe((url: string) => {
              // console.log('Download URL', url);
              // Create a new event ID and set the event ID equal to the new event ID
              this.eventID = this.fs.createId();
              this.fs.collection('BookingEvents').doc(this.eventID).set({
                id: this.eventID,
                bookingID: this.activeBooking.id,
                type: 'pdf',
                offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
                title: title,
                description: 'Magistrate Bail Document submitted by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
                status: 'active',
                link: url,
                date: new Date().toDateString(),
                unixDate: Date.now(),
              }).then(() => {
                Swal.fire({
                  icon: 'success',
                  title: 'PDF Document Uploaded',
                  showConfirmButton: false,
                  timer: 1500
                });
              });
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'PDF Document Not Uploaded',
              showConfirmButton: false,
              timer: 1500
            });
          }
        });
      }
    }).then((result) => {

    });
  }

  approveSurtor() {
    // Create a SWAL dialog asking the user to select approve or deny the Suretor using 2 checkboxes and allow the user to enter a comment using a textarea and then save the booking event to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
    Swal.fire({
      title: 'Approve Suretor',
      html: '<div class="form-check"><input class="form-check-input" type="checkbox" value="" id="approveSuretor"><label class="form-check-label" for="approveSuretor">Approve Suretor and Documents</label></div>' +
        '<div class="form-check"><input class="form-check-input" type="checkbox" value="" id="denySuretor"><label class="form-check-label" for="denySuretor">Deny Suretor and Documents</label></div>' +
        '<div class="form-group"><label for="comment">Comments, Reasoning and Instructions:</label><textarea class="form-control" id="comment" rows="3"></textarea></div>',
      showCancelButton: true,
      confirmButtonText: 'Save',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Get the comment from the textarea
        const comment = (document.getElementById('comment') as HTMLTextAreaElement).value;
        // Get the approve checkbox value
        const approve = (document.getElementById('approveSuretor') as HTMLInputElement).checked;
        // Get the deny checkbox value
        const deny = (document.getElementById('denySuretor') as HTMLInputElement).checked;
        // Create a new event ID and set the event ID equal to the new event ID
        this.eventID = this.fs.createId();
        // Create a new booking event and set the booking event properties
        const bookingEvent: BookingEvents = {
          id: this.eventID,
          bookingID: this.activeBooking.id,
          type: 'approveSurtor',
          offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
          title: approve ? 'Suretor/Documents Approved' : 'Suretor/Documents Denied' + ' by ' + this.currentMember.fName + ' '+ this.currentMember.lName,
          description: comment,
          status: 'active',
          link: '',
          date: new Date().toDateString(),
          unixDate: Date.now().toString(),
          comment: comment,
          approved: approve,
          denied: deny,
        };
        // Save the booking event to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
        this.fs.collection('BookingEvents').doc(this.eventID).set(bookingEvent).then(() => {
          Swal.fire({
            title: 'Ruling Submitted',
            text: 'The Ruling was submitted successfully.',
            icon: 'success',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            color: '#000000',
            iconColor: '#000000',
            toast: true,
            position: 'top-end',
            background: '#00ff00',
          });
          this.activeBooking.bailStatus = approve ? 'approved' : 'denied';
          this.saveupdate();
        }).catch((error) => {
          // Create a Swal message letting the user know the booking event was not saved successfully
          Swal.fire({
            title: 'Ruling Not Saved',
            text: 'The Reling was not saved successfully.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        });
      }
    }).then((result) => {

    });
  }

  async submitMagistrate() {
    // Create a SWAL dialog asking the user to select the magistrate using a dropdown of magistrates and save the activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and then provide a SWAL Toast to the user letting them know the booking was saved successfully
    Swal.fire({
      title: 'Submit to Magistrate',
      html: 'This suretor and all documents will be submitted to ' + this.activeBooking.judge + ' for approval.',
      showCancelButton: true,
      confirmButtonText: 'Submit to Magistrate for Approval',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Save the activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and then provide a SWAL Toast to the user letting them know the booking was saved successfully
        this.fs.collection('magistrateBookings').doc(this.activeBooking.id).update({bailStatus: 'pending', magistrateEmailSent: false}).then(() => {
          this.fs.collection('magistrateBookings').doc(this.activeBooking.id).update({bailStatus: 'submitted', magistrateEmailSent: false}).then(() => {
            Swal.fire({
              title: 'Magistrate Assigned',
              text: 'The Magistrate was assigned successfully.',
              icon: 'success',
              showConfirmButton: false,
              timer: 2500,
              timerProgressBar: true,
              color: '#000000',
              iconColor: '#000000',
              toast: true,
              position: 'top-end',
              background: '#00ff00',
            });
            // Create a new bookingevent and set the booking event properties showing that the booking was submitted to the magistrate
            const bookingEvent: BookingEvents = {
              id: this.fs.createId(),
              bookingID: this.activeBooking.id,
              type: 'submitMagistrate',
              offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
              title: 'Submitted to ' + this.activeBooking.judge + ' for Approval',
              description: 'Submitted to ' + this.activeBooking.judge + ' for Approval by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
              status: 'active',
              link: '',
              date: new Date().toDateString(),
              unixDate: Date.now().toString(),
              judge: this.activeBooking.judge,
              judgeID: this.activeBooking.judgeID,
            };
            this.fs.collection('BookingEvents').doc(bookingEvent.id).set(bookingEvent).then(() => {
            })
          }).catch((error) => {
            // Create a Swal message letting the user know the booking was not saved successfully
            Swal.fire({
              title: 'Magistrate Booking Event Error',
              text: 'An error occured when creating a booking event for the magistrate.',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });// End of Second Change
        }); // End of First Change
      } // End of PreConfirm
    }).catch((error) => {
      // Create a Swal message letting the user know the booking was not saved successfully
      Swal.fire({
        title: 'Magistrate Not Assigned',
        text: 'The Magistrate was not assigned successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  openPDF(link) {
    // Open the PDF document in a new tab
    window.open(link, '_blank');
  }

  deletePDF(link, id) {
    // Remove the Event using the id from the firestore database called 'BookingEvents'
    this.fs.collection('BookingEvents').doc(id).delete().then(() => {
      // Create a Swal Alert letting the user know the document was deleted successfully
      Swal.fire({
        title: 'Document Deleted',
        text: 'The document was deleted successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#000000',
        iconColor: '#000000',
        toast: true,
        position: 'top-end',
        background: '#00ff00',
      });
    }).catch((error) => {
      // Create a Swal Alert letting the user know the document was not deleted successfully
      Swal.fire({
        title: 'Document Not Deleted',
        text: 'The document was not deleted successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
    // Delete the document from firebase storage using the link of the document
    this.storage.storage.refFromURL(link).delete().then(() => {
      // Create a SWAL message letting the user know the document was deleted successfully
      Swal.fire({
        title: 'Document Deleted',
        text: 'The document was deleted successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#000000',
        iconColor: '#000000',
        toast: true,
        position: 'top-end',
        background: '#00ff00',
      });
    }).catch((error) => {
      // Create a SWAL Alert letting the user know the document was not deleted successfully
      Swal.fire({
        title: 'Document Not Deleted',
        text: 'The document was not deleted successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  doTakePhoto() {
    // Check to see if activeBooking.id exists and if not, provide a swal message to the user telling them they must save the current booking before taking a photo and then return
    if (!this.activeBooking.id) {
      Swal.fire({
        title: 'Save Booking',
        text: 'You must save the current booking before taking a photo.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return; // Exit the function
    }
    // Pick a random number that is 5 digits in length and store it in a variable called randomNumber
    const randomNumber = Math.floor(Math.random() * 90000) + 10000;
    this.fs.collection('magistrateBookings').doc(this.activeBooking.id).update({unlockCode: randomNumber.toString()});
    // Create a swal alert that tells the user the random number
    Swal.fire({
      title: 'Take Photo',
      html: '<b>PHOTO UNLOCK CODE</b><br><h1 class="text-danger"><b>' + randomNumber + '</b></h1><br>Enter the code above to unlock the camera.<br>' +
        '<div class="small text-muted mt-2 text-danger">Take a photo by visiting "bbmsweb.com/phone" using your phone browser. You must allow the app permission to use your camera.</div>' +
        '<div class="text-danger font-weight-bold">DO NOT CLOSE THIS DIALOG UNTIL PHOTO HAS BEEN TAKEN</div>',
      icon: 'info',
      confirmButtonText: 'OK',
      showCancelButton: true,
      cancelButtonText: 'Cancel Photo',
    }).then((result) => {
      this.fs.collection('magistrateBookings').doc(this.activeBooking.id).update({unlockCode: '99999999999999'});
    });
  }

  doUploadPhoto() {
    // Open a SWAL File Dialog for images and convert the image to a dataURL and use uploadSnapShot() to save the photo to the Firebase Storage bucket called 'magistrate_photo'
    Swal.fire({
      title: 'Select Booking Photo',
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Upload your booking photo'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.snapshotDataUrl = e.target.result;
          this.uploadSnapshot();
        };
        reader.readAsDataURL(file);
      }
    }).then((result) => {

    });
  }

  uploadSnapshot() {
    if (this.snapshotDataUrl) {
      const storageRef = this.storage.ref('magistrate_photo/'); // Change the storage path if needed
      const fileName = 'magistrate_photo/magistrate_' + this.booking.id + '.jpg'; // Change the file name if needed
      const task: AngularFireUploadTask = this.storage.upload(fileName, this.dataURLtoBlob(this.snapshotDataUrl), {contentType: 'image/jpeg'});
      task.snapshotChanges().subscribe(
        (snapshot) => {
          if (snapshot.state === 'success') {
            this.getDownloadURL(fileName); // Get download URL
          }
        },
        (error) => {
          console.error('Error uploading file:', error);
        });
    }

  }

  getDownloadURL(path: string) {
    const ref = this.storage.ref(path);

    ref.getDownloadURL().subscribe(
      (url) => {
        this.fs.collection('magistrateBookings').doc(this.booking.id).update({photoURL: url, unlockCode: null});
        // Create a swal alert letting the user know that the photo was uploaded successfully
        swal.fire({
          title: 'Photo Uploaded',
          text: 'Your photo has been uploaded successfully',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then((result) => {

        });
      },
      (error) => {
        // Create a swal alert letting the user know that the photo was not uploaded successfully
        swal.fire({
          title: 'Photo Not Uploaded',
          text: 'Your photo was not uploaded successfully',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    );
  }

  dataURLtoBlob(dataURL: string) {
    const BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) === -1) {
      const parts = dataURL.split(',');
      const contentType = parts[0].split(':')[1];
      const raw = parts[1];
      return new Blob([raw], {type: contentType});
    }
    const parts = dataURL.split(BASE64_MARKER);
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], {type: contentType});
  }

  doAddCharges() {
    if (this.activeBooking.charges == undefined || this.activeBooking.charges == null || this.activeBooking.charges.length == 0) {
      this.activeBooking.charges = [];
    }
    // check booking to see if booking.id exists and if not, provide a swal message to the user telling them they must save the current booking before adding charges and then return
    if (!this.activeBooking.id) {
      Swal.fire({
        title: 'Save Booking',
        text: 'You must save the current booking before adding charges.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    const charge: Count = {
      bookingID: this.activeBooking.id,
      countCharge: this.currentCharge,
      countDate: new Date().toDateString(),
      unixDate: new Date().getTime(),
    };
    this.activeBooking.charges.push(charge);
    this.currentCharge = '';
    // Save activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and provide an SWAL Toast to  let the user know the charge was added successfully
    this.fs.collection('magistrateBookings').doc(this.activeBooking.id).set(this.activeBooking, {merge: true}).then(() => {
      Swal.fire({
        title: 'Charge Added',
        text: 'The charge was added successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#000000',
        iconColor: '#000000',
        toast: true,
        position: 'top-end',
        background: '#00ff00',
      });
    }).catch((error) => {
      // Create a Swal message letting the user know the charge was not added successfully
      Swal.fire({
        title: 'Charge Not Added',
        text: 'The charge was not added successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  doSelectJudge() {
    // Locate the selected judge by activebooking.judgeID and copy that judge to the selectedJudge variable
    for (let i = 0; i < this.magistrates.length; i++) {
      if (this.magistrates[i].uid == this.activeBooking.judgeID) {
        this.selectedJudge = this.magistrates[i];
      }
    }
    console.log('Selected Judge', this.selectedJudge);
  }

  enlargePhoto(photoURL: string, fName: string, lName: string) {
    // open a SWAL alert dialog and adjust the SWAL window to hold the image so it will show the image at 100% size
    Swal.fire({
      title: lName + ', ' + fName,
      html: '<img src="' + photoURL + '" style="width: 100%; height: auto;">',
      confirmButtonText: 'OK',
      showCancelButton: false,
      cancelButtonText: 'Cancel Photo',
      width: '30vw',
      heightAuto: true,
      padding: '0px',
      background: 'rgba(255,255,255,1)',
      backdrop: 'rgba(0,0,0,.8)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      allowEnterKey: true,
      stopKeydownPropagation: false,
      showCloseButton: true,
      closeButtonAriaLabel: 'Close Photo',
      showConfirmButton: false,
      showDenyButton: false,
      footer: '',
      didOpen: () => {

      }
    });
  }

  removeChage(countCharge) {
    // Find the charge in the activeBooking.charges array and remove it
    for (let i = 0; i < this.activeBooking.charges.length; i++) {
      if (this.activeBooking.charges[i].countCharge == countCharge) {
        this.activeBooking.charges.splice(i, 1);
      }
    }
  }

  saveupdate() {
    // Check to see if the activebooking has a firstname, lastname and dob entered and if not, provide a swal message to the user telling them they must enter a firstname, lastname and dob before saving and then return
    if (!this.activeBooking.firstName || !this.activeBooking.lastName || !this.activeBooking.dob) {
      Swal.fire({
        title: 'Missing Information',
        text: 'You must enter a First Name, Last Name and Date of Birth before saving.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    // get the activeBooking.lastName, activeBooking.firstName and activeBooking.middleName and set the first letter to uppercase and the rest of the letters to lowercase
    this.activeBooking.lastName = this.activeBooking.lastName.charAt(0).toUpperCase() + this.activeBooking.lastName.slice(1).toLowerCase();
    this.activeBooking.firstName = this.activeBooking.firstName.charAt(0).toUpperCase() + this.activeBooking.firstName.slice(1).toLowerCase();
    if (this.activeBooking.middleName) {
      this.activeBooking.middleName = this.activeBooking.middleName.charAt(0).toUpperCase() + this.activeBooking.middleName.slice(1).toLowerCase();
    }
    // Create a unique id using firebase
    if (!this.activeBooking.id) {
      this.activeBooking.id = this.fs.createId();
      // Create a BookingeEvent and set the booking event properties
      const bookingEvent: BookingEvents = {
        id: this.fs.createId(),
        bookingID: this.activeBooking.id,
        type: 'newBooking',
        offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
        title: 'Booking Created',
        description: 'Booking Created by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
        status: 'active',
        link: '',
        date: new Date().toDateString(),
        unixDate: Date.now().toString(),
      };
      // Save the booking event to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
      this.fs.collection('BookingEvents').doc(bookingEvent.id).set(bookingEvent).then(() => {
      });
    }
    if (this.selectedJudge.uid) {
      this.activeBooking.judgeID = this.selectedJudge.uid;
      this.activeBooking.judge = this.activeBooking.judgeID == '0' ? '' : this.selectedJudge.name;
      this.activeBooking.judgeAssigned = this.activeBooking.judgeID == '0' ? '' : this.selectedJudge.lName + ', ' + this.selectedJudge.fName;
    }
    if (this.activeBooking.unixDate == undefined || this.activeBooking.unixDate == null || this.activeBooking.unixDate == '') {
      this.activeBooking.unixDate = new Date().getTime().toString();
    }

    if (!this.activeBooking.bookingStatus) {
      this.activeBooking.bookingStatus = 'Open';
    }
    if (!this.activeBooking.bailStatus) {
      this.activeBooking.bailStatus = 'pending';
    }
    // Save the activebooking to the collection called 'magistrateBookings' in the firestore database using the id created above
    this.fs.collection('magistrateBookings').doc(this.activeBooking.id).set(this.activeBooking, {merge: true}).then(() => {
      // Create a Swal message letting the user know the booking was saved successfully
      Swal.fire({
        title: 'Booking Saved',
        text: 'The booking was saved successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#000000',
        iconColor: '#000000',
        toast: true,
        position: 'top-end',
        background: '#00ff00',
      });
      this.notsaved = false;
      // Change all input fields to white
      const inputs = document.querySelectorAll('input');
      for (let i = 0; i < inputs.length; i++) {
        inputs[i].style.backgroundColor = 'white';
      }
    }).catch((error) => {
      // Create a Swal message letting the user know the booking was not saved successfully
      Swal.fire({
        title: 'Booking Not Saved',
        text: 'The booking was not saved successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      this.notsaved = true;
    });
  }

   doAttchSuretor() {
    // Open a SWAL dialog and ask the user for the Suretors full name, date of birth and NIB number and then save the info to the magistratebooking and then save the magistratebooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and provide a SWAL Toast to the user letting them know the booking was saved successfully
    Swal.fire({
      title: 'Attach Suretor',
      html: '<div class="form-group"><label for="suretorName">Suretor Name:</label><input type="text" class="form-control" id="suretorName" placeholder="Enter Suretor Name"></div>' +
        '<div class="form-group"><label for="suretorDOB">Suretor Date of Birth:</label><input type="date" class="form-control" id="suretorDOB" placeholder="Enter Suretor Date of Birth"></div>' +
        '<div class="form-group"><label for="suretorNIB">Suretor NIB Number:</label><input type="text" class="form-control" id="suretorNIB" placeholder="Enter Suretor NIB Number"></div>',
      showCancelButton: true,
      confirmButtonText: 'Attach Suretor',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Get the suretor name from the input box
        const suretorName = (document.getElementById('suretorName') as HTMLInputElement).value;
        // Get the suretor DOB from the input box
        const suretorDOB = (document.getElementById('suretorDOB') as HTMLInputElement).value;
        // Get the suretor NIB from the input box
        const suretorNIB = (document.getElementById('suretorNIB') as HTMLInputElement).value;

        try {
          // get all magistratebookings with the same suretorNIB as the activeBooking.suretorNIB and store them in the suretorBookings array
          this.subscriptions.push(this.fs.collection('magistrateBookings', ref =>
            ref.where('suretorNIB', '==', suretorNIB)).valueChanges().pipe(take(1)).subscribe((data: Booking[]) => {
            console.log('Suretor Bookings Search Completed', data);
            if (data.length >= 1) {
              // Create a SWAL Dialog telling the user that there is already a Suretor with the same NIB number
             Swal.fire({
                title: 'Suretor Already Exists',
                html: 'There is already a Suretor with the same NIB number as this Suretor.<br><br><b>Booking ID:</b> ' + data[0].id + '<br><b>Offender Name:</b> ' + data[0].firstName + ' ' + data[0].lastName + '<br><b>Offender DOB:</b> ' + data[0].dob,
                icon: 'warning',
                confirmButtonText: 'OK',
                showCancelButton: true,
                cancelButtonText: 'CANCEL'
              }).then((result) => {
                if(result.isConfirmed) {
                  return;
                }
                return;
              });
             return;
            }

            // Get all BookingEvents with the type of 'attachSuretor'
            this.subscriptions.push(this.fs.collection('BookingEvents', ref =>
              ref.where('type', '==', 'attachSuretor')).valueChanges().pipe(take(1)).subscribe((data: BookingEvents[]) => {
              // Loop through all the BookingEvents and see if the Suretor NIB exist in the 'Title' field
              for (let i = 0; i < data.length; i++) {
                if (data[i].title.includes(suretorNIB)) {
                 // Create a SWAL dialog asking if they wish to continue adding this Suretor. If they choose NO, return else saveSuretor
                  Swal.fire({
                    title: 'Suretor Already Attached',
                    html: 'There is already a Suretor with the same NIB number as this Suretor.<br><br><b>Booking ID:</b> ' + data[i].bookingID + '<br><b>Offender Name:</b> ' + data[i].offenderName,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Continue',
                    cancelButtonText: 'Cancel'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      this.saveSurtor(suretorName, suretorDOB, suretorNIB);
                      return;
                    } else {
                      return;
                    }
                  });
                  return;
                }
              }
            }));
            this.saveSurtor(suretorName, suretorDOB, suretorNIB);
          }));
        } catch (error) {
          console.log('Error', error)
        }
      }
    }).then((result) => {

    } );
  }

  saveSurtor(surName, surDOB, surNIB) {
    console.log('Saving Suretor');
    // Save the suretor name to the activeBooking
    this.activeBooking.suretorName = surName;
    // Save the suretor DOB to the activeBooking
    this.activeBooking.suretorDOB = surDOB;
    // Save the suretor NIB to the activeBooking
    this.activeBooking.suretorNIB = surNIB;
    // Save the Suretor Assign Date to the activeBooking
    this.activeBooking.surtorAssignDate = new Date().toDateString();
    // Save the activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and provide a SWAL Toast to the user letting them know the booking was saved successfully
    this.fs.collection('magistrateBookings').doc(this.activeBooking.id).set(this.activeBooking, {merge: true}).then(() => {
      Swal.fire({
        title: 'Suretor Attached',
        text: 'The Suretor was attached successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#ffffff',
        iconColor: '#ffffff',
        toast: true,
        position: 'top-end',
        background: '#ff0000',
      });
      // Create a bookingEvent and set the booking event properties
      const bookingEvent: BookingEvents = {
        id: this.fs.createId(),
        bookingID: this.activeBooking.id,
        type: 'attachSuretor',
        offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
        title: 'Suretor Attached - ' + surName + ' - ' + surDOB + ' - ' + surNIB,
        description: 'Suretor Attached by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
        status: 'active',
        link: '',
        date: new Date().toDateString(),
        unixDate: Date.now().toString(),
      };
      // Save the bookingEvent to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
      this.fs.collection('BookingEvents').doc(bookingEvent.id).set(bookingEvent).then(() => {

      }).catch((error) => {

      });
    }).catch((error) => {
      // Create a Swal message letting the user know the Suretor was not attached successfully
      Swal.fire({
        title: 'Suretor Not Attached',
        text: 'The Suretor was not attached successfully.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  removeSuretor(id: string) {
    // Remove the BookingEvent using the id from the firestore database called 'BookingEvents'
    this.fs.collection('BookingEvents').doc(id).delete().then(() => {
    });
    const surName = this.activeBooking.suretorName;
    this.activeBooking.suretorNIB = '';
    this.activeBooking.suretorName = '';
    this.activeBooking.suretorDOB = '';
    this.activeBooking.surtorAssignDate = '';
    // Save the activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and provide a SWAL Toast to the user letting them know the booking was saved successfully
    this.fs.collection('magistrateBookings').doc(this.activeBooking.id).set(this.activeBooking, {merge: true}).then(() => {
      Swal.fire({
        title: 'Suretor Removed',
        text: 'The Suretor was removed successfully.',
        icon: 'success',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        color: '#ffffff',
        iconColor: '#ffffff',
        toast: true,
        position: 'top-end',
        background: '#ff0000',
      });
      // Create a bookingEvent and set the booking event properties
      const bookingEvent: BookingEvents = {
        id: this.fs.createId(),
        bookingID: this.activeBooking.id,
        type: 'removeSuretor',
        offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
        title: 'Suretor Removed',
        description: 'Active Suretor ('+surName+') Removed by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
        status: 'active',
        link: '',
        date: new Date().toDateString(),
        unixDate: Date.now().toString(),
      };
      // Save the bookingEvent to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
      this.fs.collection('BookingEvents').doc(bookingEvent.id).set(bookingEvent).then(() => {

      }).catch((error) => {
        swal.fire({
          title: 'Booking Event Error - Suretor Not Removed Properly',
          text: error,
          icon: 'error',
          confirmButtonText: 'OK'
        });
        });
    });
  }


  doLink() {
    // Take the lastname and uppercase the first letter and lowercase all other letters
    const formatedLastName = this.activeBooking.lastName.charAt(0).toUpperCase() + this.activeBooking.lastName.slice(1).toLowerCase();
    // Take the dob and format it to MM/DD/YYYYT00:00:00
    const date = new Date(this.activeBooking.dob + 'T00:00:00');
    const formatedDOB = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    // Encode the date of birth for the url
    const encodedDOB = encodeURIComponent(formatedDOB);
    console.log('Last Name, DOB, Encoded DOB', formatedLastName, formatedDOB, encodedDOB)
    // Search for a profile
    this.http.get(`https://us-central1-bbms-1283c.cloudfunctions.net/afis/getOffenderByName/${formatedLastName}/${encodedDOB}`).pipe(take(1)).subscribe((profile: Afis[]) => {
      // Sort the results by the datetime field
      profile.sort((a, b) => {
        return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
      });
      // If there are no profiles, provide a SWAL message to the user telling them that there are no profiles
      if (profile.length == 0) {
        Swal.fire({
          title: 'Offender Not Found',
          text: 'The Offender was not found in the AFIS Database. Has the Offender been fingerprinted?',
          icon: 'info',
          confirmButtonText: 'OK'
        });
        return;
      }
      // If there are profiles, get the id in the profile[0] and save that in the activeBooking.linkedOffenderID
      this.activeBooking.afisID = profile[0].id;
      // Save the activeBooking to the firestore database called 'magistrateBookings' where 'id' is equal to the booking id and provide a SWAL Toast to the user letting them know the booking was saved successfully
      this.fs.collection('magistrateBookings').doc(this.activeBooking.id).set(this.activeBooking, {merge: true}).then(() => {
        Swal.fire({
          title: 'Offender Linked',
          text: 'The Offender was linked successfully.',
          icon: 'success',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
          color: '#ffffff',
          iconColor: '#ffffff',
          toast: true,
          position: 'top-end',
          background: '#ff0000',
        });
        // Create a bookingEvent and set the booking event properties
        const bookingEvent: BookingEvents = {
          id: this.fs.createId(),
          bookingID: this.activeBooking.id,
          type: 'linkOffender',
          offenderName: this.activeBooking.firstName + ' ' + this.activeBooking.lastName,
          title: 'Offender Linked',
          description: 'Offender Linked to ' + profile[0].id + ' by ' + this.currentMember.name + ' on ' + new Date().toDateString(),
          status: 'active',
          link: '',
          date: new Date().toDateString(),
          unixDate: Date.now().toString(),
        };
        // Save the bookingEvent to the firestore database called 'BookingEvents' and then provide a SWAL Toast to the user letting them know the booking event was saved successfully
        this.fs.collection('BookingEvents').doc(bookingEvent.id).set(bookingEvent).then(() => {

        }).catch((error) => {
          swal.fire({
            title: 'Booking Event Error - Offender Not Linked Properly',
            text: error,
            icon: 'error',
            confirmButtonText: 'OK'
          });
        });
      });


    }); // End of HTTP Get
  }

  doNameCheck() {
    console.log('Name Check', this.activeBooking);
  }

  ngOnDestroy(): void {
    // Go through all subscriptions and unsubscribe
    for (let i = 0; i < this.subscriptions.length; i++) {
      this.subscriptions[i].unsubscribe();
    }
  }

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


}
