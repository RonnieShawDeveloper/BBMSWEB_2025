import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Booking} from "../../../models/booking";
import {BookingEvents} from "../../../models/events";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import Swal from "sweetalert2";
import {AngularFireStorage} from "@angular/fire/compat/storage";
import {finalize, Observable, take} from "rxjs";
import {Offender} from "../../../models/offender";
import {Hearings} from "../../../models/hearings";
import { HelperService } from "../../../services/helper.service";
import { Count } from "../../../models/count";
import * as moment from "moment/moment";

@Component({
  selector: 'app-view-booking',
  templateUrl: './view-booking.component.html',
  styleUrls: ['./view-booking.component.scss']
})
export class ViewBookingComponent implements OnInit, OnDestroy {

  @Input() booking: Booking = {};
  @Output() exit: EventEmitter<boolean> = new EventEmitter<boolean>();

  downloadURL: Observable<any> // Bail Application
  downloadURL2: Observable<any> // PDF Document
  downloadURL3: Observable<any> // Remand Warrant

  selectedDefendant: Offender = {};

  bookingEvents: BookingEvents[] = [];
  eventID = '';
  charges: Count[] = [];

  subscriptions: any[] = [];
  crimeCodes: { code?: string, value?: string }[] = [];

  constructor(private hs: HelperService, private fs: AngularFirestore, private storage: AngularFireStorage) {
  }

  ngOnDestroy(): void {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }

  ngOnInit(): void {
    this.crimeCodes = this.hs.getCrimes();
    // Get the booking data from the Firestore database called 'bookings' where 'id' is equal to the booking id
    this.subscriptions.push(this.fs.collection('bookings', ref => ref.where('id', '==', this.booking.id)).valueChanges().subscribe((data: Booking[]) => {
      this.booking = data[0];
      // Get the defendant data from the Firestore database called 'offenders' where 'id' is equal to the defendant id and store it in the 'selectedDefendant' variable
      this.fs.collection('users', ref => ref.where('id', '==', this.booking.offender)).valueChanges().subscribe((data: Offender[]) => {
        this.selectedDefendant = data[0];
      });
    }));

    // Get all Counts for this booking using snapshotChanges() to get the document id
    this.subscriptions.push(this.fs.collection('counts', ref => ref.where('bookingID', '==', this.booking.id)).snapshotChanges().subscribe((data: any) => {
      // Get the data and the id and store it in the 'charges' array
      this.charges = data.map((charge: any) => {
        return {
          id: charge.payload.doc.id,
          ...charge.payload.doc.data()
        } as Count;
      });
      // Sort the data on the 'countNo' field and store it in the 'charges' array
      this.charges = this.charges.sort((a, b) => {
        return parseInt(a.countNo) - parseInt(b.countNo);
      });
    }));


    // this.subscriptions.push(this.fs.collection('counts', ref => ref.where('bookingID', '==', this.booking.id)).valueChanges().subscribe((data: Count[]) => {
    //   // Sort the data on the 'countNo' field and store it in the 'charges' array
    //   this.charges = data.sort((a, b) => {
    //     return parseInt(a.countNo) - parseInt(b.countNo);
    //   });
    //
    // }));

    // Get all booking events from the Firestore database called 'BookingEvents' where 'bookingid' is equal to the booking id
    this.subscriptions.push(this.fs.collection('BookingEvents', ref => ref.where('bookingID', '==', this.booking.id)).valueChanges().subscribe((data: BookingEvents[]) => {
      let events: BookingEvents[] = data.map((event: BookingEvents) => {
        return {
          bookingID: event.id,
          description: event.description,
          title: event.title,
          link: event.link,
          type: event.type,
          judge: event.judge,
          judgeID: event.judgeID,
          offenderID: event.offenderID,
          offenderName: event.offenderName,
          disposition: event.disposition,
          status: event.status,
          date: this.dateFromUnixTime(event.unixDate),
          unixDate: event.unixDate,
        } as BookingEvents;
      });
      // Check each event unixDate and if the unix timestamp is in milliseconds, convert the timestamp to seconds
      events.forEach((event: BookingEvents) => {
        if (event.unixDate.toString().length > 10) {
          event.unixDate = (parseInt(event.unixDate) / 1000).toString();
        }
      });
      // Sort the events by unixDate in descending order
      events.sort((a: BookingEvents, b: BookingEvents) => {
        if (a.unixDate < b.unixDate) {
          return 1;
        } else if (a.unixDate > b.unixDate) {
          return -1;
        } else {
          return 0;
        }
      });
      // Convert each event unixDate to a date string
      events.forEach((event: BookingEvents) => {
        event.date = this.dateFromUnixTime(event.unixDate);
      });
      // Set the bookingEvents array equal to the events array


      this.bookingEvents = events;
    }));
  }

  private dateFromUnixTime(date: any) {
    return new Date(date * 1000).toLocaleDateString('en-US');
  }

  private convertTime(time: any) {
    const hours = Math.floor(time / 60 / 60);
    const minutes = Math.floor(time / 60) - (hours * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return hours + ':' + minutes + ' ' + ampm;
  }

  doExit() {
    this.exit.emit(true);
  }

  goToLink(link) {
    console.log('Link: ', link);
    window.open(link, "_blank");
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
            const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
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
                bookingID: this.booking.id,
                type: 'pdf',
                offenderID: this.booking.offender,
                offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
                title: title,
                description: 'Magistrate Bail Document',
                status: 'active',
                link: url,
                date: new Date().toLocaleDateString('en-US'),
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

  doBondApproval() {
    // Create a SweetAlert Dialog that provides a select box of judges names and then provides a file dialog to select a pdf file and then upload that file to the Firebase Storage bucket called 'pdf-documents' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL2
    Swal.fire({
      title: 'Select Magistrate',
      input: 'select',
      inputOptions: {
        'Magistrate 1': 'Magistrate 1',
        'Magistrate 2': 'Magistrate 2',
        'Magistrate 3': 'Magistrate 3',
        'Magistrate 4': 'Magistrate 4',
        'Magistrate 5': 'Magistrate 5',

      },
      inputPlaceholder: 'Select a Magistrate',
      showCancelButton: true,
      confirmButtonText: 'Next',
      showLoaderOnConfirm: true,
      preConfirm: (judge) => {
        // Open a file dialog that selects the pdf file to be uploaded to Firebase Storage bucket called 'pdf-documents' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL2
        Swal.fire({
          title: 'Select the PDF Bond to submit for Approval',
          input: 'file',
          inputAttributes: {
            'accept': 'application/pdf',
            'aria-label': 'PDF Bond Document'
          },
          showCancelButton: true,
          confirmButtonText: 'Upload',
          showLoaderOnConfirm: true,
          preConfirm: (file) => {
            const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
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
                bookingID: this.booking.id,
                type: 'pdf',
                offenderID: this.booking.offender,
                offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
                title: 'Bond Approval - ' + judge,
                description: 'Bond Approval Request Document',
                status: 'active',
                link: url,
                date: new Date().toLocaleDateString('en-US'),
                unixDate: Date.now(),
                judge: judge,
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

  doPDFDocument() {
    // Use Sweet Alert to open a File Dialog to select a pdf file and provide an input text box for a title and then upload that file to the Firebase Storage bucket called 'pdf-documents' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL2
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
        const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          // If the upload is successful, get the downloadURL and put it in the observable called downloadURL2
          finalize(() => {
            this.downloadURL2 = fileRef.getDownloadURL();
          })
        );
      },
    }).then((result) => {
      // If the upload is successful, update the booking event in the Firestore database called 'BookingEvents' where 'id' is equal to the event id and set the link to the downloadURL2 observable value
      if (result.isConfirmed) {
        // Get the downloadURL string from the URL observable
        this.downloadURL2.subscribe((url: string) => {
          // console.log('Download URL', url);
          // Create a new event ID and set the event ID equal to the new event ID
          this.eventID = this.fs.createId();
          this.fs.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'pdf',
            offenderID: this.booking.offender,
            offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
            title: 'Booking Document (PDF)',
            description: 'Booking Document',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
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

  doRemand() {
    // Use Sweet Alert to open a File Dialog to select a pdf file and provide an input text box for a title and then upload that file to the Firebase Storage bucket called 'pdf-documents' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL2
    Swal.fire({
      title: 'Select Remand Warrant PDF Document',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your PDF document'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          // If the upload is successful, get the downloadURL and put it in the observable called downloadURL2
          finalize(() => {
            this.downloadURL3 = fileRef.getDownloadURL();
          })
        );
      },
    }).then((result) => {
      // If the upload is successful, update the booking event in the Firestore database called 'BookingEvents' where 'id' is equal to the event id and set the link to the downloadURL2 observable value
      if (result.isConfirmed) {
        // Get the downloadURL string from the URL observable
        this.downloadURL3.subscribe((url: string) => {
          // console.log('Download URL', url);
          // Create a new event ID and set the event ID equal to the new event ID
          this.eventID = this.fs.createId();
          this.fs.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'pdf',
            offenderID: this.booking.offender,
            offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
            title: 'Remand Warrant',
            description: 'Booking Document',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
            unixDate: Date.now(),
          }).then(() => {
            Swal.fire({
              icon: 'success',
              title: 'Remand Warrant Uploaded',
              showConfirmButton: false,
              timer: 1500
            });
          });
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Remand Warrant Not Uploaded',
          showConfirmButton: false,
          timer: 1500
        });
      }
    });
  }

  doNote() {
    // Use Sweet Alert to provide a text input field called Note and then save the note to the Booking Events collection in the Firestore database called 'BookingEvents' where 'id' is equal to the event id
    Swal.fire({
      title: 'Enter Note',
      input: 'text',
      inputAttributes: {
        'aria-label': 'Type your note here'
      },
      showCancelButton: true,
      confirmButtonText: 'Save',
      showLoaderOnConfirm: true,
      preConfirm: (note) => {
        // Create a new event ID and set the event ID equal to the new event ID
        this.eventID = this.fs.createId();
        this.fs.collection('BookingEvents').doc(this.eventID).set({
          bookingID: this.booking.id,
          type: 'note',
          offenderID: this.booking.offender,
          offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
          title: 'Note',
          description: note,
          status: 'active',
          date: new Date().toLocaleDateString('en-US'),
          unixDate: Date.now(),
        }).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Note Saved',
            showConfirmButton: false,
            timer: 1500
          });
        });
      },
    });
  }

  convertUnixTime(unixTime: string) {
    // If unixTime is in Milliseconds, convert to seconds
    if (unixTime.length > 10) {
      unixTime = unixTime.substring(0, 10);
    }
    return moment.unix(parseInt(unixTime)).format('MMMM Do YYYY');
  }

  doBailApplicaion() {

    // Use Sweet Alert to open a File Dialog to select a pdf file and then upload that file to the Firebase Storage bucket called 'bail-applications' with the file name equal to the booking id + unix timestamp and the file type equal to the file type selected and then put the downloadURL in the observable called downloadURL
    Swal.fire({
      title: 'Select Bail Application',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your bail application'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const filePath = 'bail-applications/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          // If the upload is successful, get the downloadURL and put it in the observable called downloadURL
          finalize(() => this.downloadURL = fileRef.getDownloadURL())
        );
      },
      // If the upload is successful, create a new booking event in the Firestore database called 'BookingEvents' with the booking id, type as 'bailApp', title as 'Bail Application', description as 'Bail Application submitted', link equal to the downloadURL, date as current date and unixDate
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        // Get the downloadURL string from the URL observable
        this.downloadURL.subscribe((url: string) => {
          // console.log('Download URL', url);
          // Create a new event ID and set the event ID equal to the new event ID
          this.eventID = this.fs.createId();
          this.fs.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'bailApp',
            offenderID: this.booking.offender,
            offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
            title: 'Bail Application',
            description: 'Bail Application Submitted by Defendant',
            disposition: 'pending',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
            unixDate: Date.now(),
          }).then(() => {
            Swal.fire({
              title: 'Bail Application Submitted',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
          });
          // Update the bookings record in the Firestore database called 'bookings' where 'id' is equal to the booking id and set the field 'bailAppPending' to true and the bailAppSubmittedDate to the current unix timestamp and the bookingStatus to 'Open'
          this.fs.collection('bookings').doc(this.booking.id).update({
            bailAppPending: true,
            bailAppSubmitedDate: Date.now(),
            bookingStatus: 'Open',
            bailStatus: '',
          });
          // Create a New Hearing Object to add to the Registrar New Listings
          const hearing: Hearings = {
            active: true,
            newApplicationEmail: false,
            bookingID: this.booking.id,
            bailAppLink: url,
            deniedBailChecked: false,
            eventID: this.eventID,
            grantBailChecked: false,
            holdRulingChecked: false,
            bailBondEmailed: false,
            denyBailEmail: false,
            grantBailEmail: false,
            holdRulingEmail: false,
            id: this.fs.createId(),
            offenderID: this.booking.offender,
            offenderName: this.selectedDefendant.fName + ' ' + this.selectedDefendant.lName,
            registrarAck: false,
            released: false,
            disposition: 'pending',
            unixDate: Date.now().toString(),
          } as Hearings;
          // Create a new hearing in the Firestore database called 'hearings' with the hearing id equal to the new hearing id and the hearing object equal to the hearing object
          this.fs.collection('hearings').doc(hearing.id).set(hearing);
          console.log('Hearing: ', hearing);
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Cancelled',
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  }

  doViewNote(i: string) {
    // Use Sweet Alert to display the note
    Swal.fire({
      title: 'Note',
      text: i,
      showCancelButton: false,
      confirmButtonText: 'OK',
    });
  }

  editCharge(charge: Count) {

  }

  deleteCharge(charge: Count) {
    // Create a Swal Modal verifying if they want to delete this charge
    Swal.fire({
      title: 'Delete Charge',
      text: 'Are you sure you want to delete this charge?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      // If they confirm they want to delete the charge, delete the charge from the Firestore database called 'counts' where 'id' is equal to the charge id
      if (result.isConfirmed) {
        console.log('Charge: ', charge);
        this.fs.collection('counts').doc(charge.id).delete().then(() => {
          for (let i = 0; i < this.charges.length; i++) {
            this.fs.collection('counts').doc(this.charges[i].id).update({
              countNo: i + 1,
            });
          }
        });
        // Loop through the remaining charges and update the count number to reflect the new order

      } else {
        Swal.fire({
          title: 'Cancelled',
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  }

  doAddCharges() {
    // Create a Swal modal the provides a date picker to select the date of the offence and an input box to type the Crime
    Swal.fire({
      title: 'Add Charge',
      html: '<label class="small">Please provide the Offence and the Offence Date</label><br><input id="swal-input1" class="swal2-input" list="crimeDataList" autocomplete="off" placeholder="Type Offence to Search">' +
        '<input id="swal-input2" class="swal2-input" type="date">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const crime = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const date = (document.getElementById('swal-input2') as HTMLInputElement).value;
        if (!crime || !date) {
          Swal.showValidationMessage('Please enter a crime and date of offence');
        } else {
          return {crime: crime, date: date};
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        // Create a new charge object with the crime and date of offence
        const count: Count = {
          bookingID: this.booking.id,
          countNo: (this.charges.length + 1).toString(),
          countCharge: result.value.crime,
          countDate: new Date(result.value.date).getTime().toString(),
          offenderID: this.booking.offender,
          id: this.fs.createId(),
        };
        // Add the charge to the charges array
        this.charges.push(count);
        // Update the booking in the Firestore database called 'bookings' where 'id' is equal to the booking id and set the field 'charges' to the charges array
        this.fs.collection('counts').doc(count.id).set(count);
        Swal.fire({
          title: 'Charge Added',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Cancelled',
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  }
}

