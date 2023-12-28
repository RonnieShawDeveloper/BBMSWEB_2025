import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Offender} from "../../../models/offender";
import {Booking} from "../../../models/booking";
import Swal from "sweetalert2";
import {Photos} from "../../../models/photos";
import {finalize, Observable, take} from "rxjs";
import {AngularFireStorage} from "@angular/fire/compat/storage";

@Component({
  selector: 'app-defendant-menu',
  templateUrl: './defendant-menu.component.html',
  styleUrls: ['./defendant-menu.component.scss'],
})
export class DefendantMenuComponent implements OnInit, AfterViewInit {
  @Input() defendant: Offender = {};
  @Output() exit: EventEmitter<boolean> = new EventEmitter<boolean>;
  @Output() doShowBooking: EventEmitter<Booking> = new EventEmitter<Booking>();
  events: Booking[] = [];
  editmenu = false;
  changesMade = false;
  originalDefendant: Offender = {};
  defendantPhotos: Photos[] = [];

  showDefendantMenu = true;
  showNewBookingWizard = false;

  downloadURL: Observable<any>;
  mainPhotoUrl = '';

  showWeb = false; // Show the webcam player

  constructor(private af: AngularFirestore, private storage: AngularFireStorage) {
  }

  ngAfterViewInit(): void {
    // Add readonly and disabled attributes to all input fields found within the fieldset with the id of 'userInfo'
    const inputs = document.querySelectorAll('#userInfo input');
    inputs.forEach((input) => {
      input.setAttribute('readonly', 'true');
      input.setAttribute('disabled', 'true');
      input.setAttribute('style', 'background-color: lightgrey');
    } );
  }

  ngOnInit() {
    this.originalDefendant = {...this.defendant};

    console.log('Booking Defendant', this.defendant);
    // Using the 'defendant.id' property, search the firestore database called 'bookings' for 'offender' equal to the defendant's id using snapshotChanges()
    this.af.collection('bookings', ref => ref.where('offender', '==', this.defendant.id)).snapshotChanges().subscribe((data: any) => {
      // Create the events array from each booking in the data array with the fields 'bookDate', 'bookTime', 'bookingStatus', and 'classification'
      this.events = data.map((booking) => {
        return {
          id: booking.payload.doc.id,
          ...booking.payload.doc.data()
        } as Booking;
      });
      // sort the events array by the 'bookDate' and add the array to the this.events array
      this.events = this.events.sort((a, b) => {
        // @ts-ignore
        return b.bookDate - a.bookDate;
      });
      console.log('Events', this.events);
    });


    // get the defendant's photos using the Defendant's id from the firestore collection called 'photos' and put them into the defendantPhotos object
    this.af.collection('photos', ref => ref.where('offenderID', '==', this.defendant.spn)).snapshotChanges().pipe(take(1)).subscribe((data: any) => {
      // Create the events array from each booking in the data array with the fields 'bookDate', 'bookTime', 'bookingStatus', and 'classification'
      this.defendantPhotos = data.map((photo) => {
        return {
          id: photo.payload.doc.id,
          ...photo.payload.doc.data()
        } as Photos;
      });
      console.log('Defendant Photos', this.defendantPhotos);
    });

  }

  // If the user clicks on the htmlImageElement with the id of 'webImage', open a large swal model with the image in it
  openImage(image: string) {
    Swal.fire({
      width: '70%',
      heightAuto: false,
      imageUrl: image,
      imageWidth: 600,
      imageHeight: 400,
      imageAlt: 'Booking Image',
    });
  }

  updatePhoto() {
    const currentImage = this.defendant.mainPhoto;
    // Create a modal that open the webcam and allows the user to take a photo
    Swal.fire({
      width: '700px',
      heightAuto: false,
      title: 'Take Defendant Main Photo',
      html: '<div class="text-center" id="webcam-container"></div>',
      showCancelButton: true,
      confirmButtonText: 'Take New Photo',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        // Create a video element and add it to the modal
        const video = document.createElement('video');
        video.setAttribute('id', 'webcam-player');
        video.setAttribute('autoplay', 'true');
        // Add the video element to the modal
        const webcamContainer = document.getElementById('webcam-container');
        webcamContainer.appendChild(video);
        // Create a canvas element and add it to the modal
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'webcam-canvas');
        // Add the canvas element to the modal
        webcamContainer.appendChild(canvas);
        // Create a canvas element and add it to the modal
        const webcamCanvas = document.getElementById('webcam-canvas') as HTMLCanvasElement;
        // Create a canvas element and add it to the modal
        const webcamPlayer = document.getElementById('webcam-player') as HTMLVideoElement;
        // Create a canvas element and add it to the modal
        const webcamConstraints = {
          video: true,
          audio: false
        };
        // Create a canvas element and add it to the modal
        navigator.mediaDevices.getUserMedia(webcamConstraints).then((stream) => {
          webcamPlayer.srcObject = stream;
          webcamPlayer.play();
        });
        // Create a canvas element and add it to the modal
        const webcamContext = webcamCanvas.getContext('2d');
        // Create a canvas element and add it to the modal
        const webcamPlayerWidth = webcamPlayer.offsetWidth;
        // Create a canvas element and add it to the modal
        const webcamPlayerHeight = webcamPlayer.offsetHeight;
        // Create a canvas element and add it to the modal
        webcamCanvas.setAttribute('width', webcamPlayerWidth.toString());
        // Create a canvas element and add it to the modal
        webcamCanvas.setAttribute('height', webcamPlayerHeight.toString());
        // Create a canvas element and add it to the modal
        webcamContext.drawImage(webcamPlayer, 0, 0, webcamPlayerWidth, webcamPlayerHeight);
      }
    } as any).then((result) => {
      if (result.isConfirmed) {
        // Create a canvas element and add it to the modal
        const webcamCanvas = document.getElementById('webcam-canvas') as HTMLCanvasElement;
        // Create a canvas element and add it to the modal
        const webcamPlayer = document.getElementById('webcam-player') as HTMLVideoElement;
        // Create a canvas element and add it to the modal
        const webcamContext = webcamCanvas.getContext('2d');
        // Create a canvas element and add it to the modal
        const webcamPlayerWidth = webcamPlayer.offsetWidth;
        // Create a canvas element and add it to the modal
        const webcamPlayerHeight = webcamPlayer.offsetHeight;
        // Create a canvas element and add it to the modal
        webcamCanvas.setAttribute('width', webcamPlayerWidth.toString());
        // Create a canvas element and add it to the modal
        webcamCanvas.setAttribute('height', webcamPlayerHeight.toString());
        // Create a canvas element and add it to the modal
        webcamContext.drawImage(webcamPlayer, 0, 0, webcamPlayerWidth, webcamPlayerHeight);
        // Create a black 50% transparent box that is 30px high across the top of the canvas
        webcamContext.fillStyle = 'rgba(255, 255, 255, 0.6)';
        // Create a canvas element and add it to the modal
        webcamContext.fillRect(0, 0, webcamPlayerWidth, 40);
        // Create a black 50% transparent box that is 30px high across the bottom of the canvas
        webcamContext.fillStyle = 'rgba(255, 255, 255, 0.6)';
        // Create a canvas element and add it to the modal
        webcamContext.fillRect(0, webcamPlayerHeight - 40, webcamPlayerWidth, 40);
        // Create a canvas element and add it to the modal
        webcamContext.textAlign = 'center';
        // make the text red
        webcamContext.fillStyle = 'red';
        // Make the text bold
        webcamContext.font = 'bold 30px Arial';
        // Create a canvas element and add it to the modal
        webcamContext.fillText('Bahamas Department of Corrections', webcamPlayerWidth / 2, webcamPlayerHeight - 10);
        // add the date to the upper right corner of the canvas
        webcamContext.textAlign = 'right';
        webcamContext.fillText(new Date().toLocaleDateString(), webcamPlayerWidth - 10, 30);
        // Make the text bold
        webcamContext.font = 'bold 30px Arial';
        // Put the defendants name in the upper left corner of the canvas
        webcamContext.textAlign = 'left';
        webcamContext.fillText(this.defendant.lName + ', ' + this.defendant.fName, 10, 30);
        // Create a canvas element and add it to the modal
        const webcamCanvasData = webcamCanvas.toDataURL('image/png');
        // Create a canvas element and add it to the modal
        this.defendant.mainPhoto = webcamCanvasData;
        // Get the html image element called 'webimage' and add the webcamCanvasData to the src attribute
        const webImg = document.getElementById('webImage') as HTMLImageElement;
        webImg.src = webcamCanvasData;
        // Create a canvas element and add it to the modal
        this.changesMade = true;

        // Using the webcamCanvasData, create a blob and upload it to the firebase storage into the folder 'mainPhotos' and name the photo using the unix timestamp. Once the photo is uploaded, get the download url and add store it in the mainPhotoUrl string
        const blob = this.dataURLtoBlob(webcamCanvasData);
        // Create a canvas element and add it to the modal
        const date = new Date().getTime();
        // Create a canvas element and add it to the modal
        const file = new File([blob], this.defendant.id + '-' + date + '-mainPhoto.png', {type: 'image/png'});
        // Create a canvas element and add it to the modal
        const filePath = 'mainPhotos/' + this.defendant.id + '-' + date + '-mainPhoto.png';
        // Create a canvas element and add it to the modal
        const fileRef = this.storage.ref(filePath);
        // Create a canvas element and add it to the modal
        const task = this.storage.upload(filePath, file);

        // Check to see if the currentImage contains the string 'default-user.jpg'
        if (!currentImage.includes('default-user.jpg')) {
          // Delete the current image from the storage bucket using the secure image url
          this.storage.storage.refFromURL(currentImage).delete().then(() => {
            // console.log('Image Deleted');
          }).catch((error) => {
            console.log('Error deleting image', error);
          });
        }
        // Turn off the webcam

        // Create a swal alert to show the user that the photo is being uploaded and to please hold
        Swal.fire({
          title: 'Uploading photo',
          html: 'Please wait while the photo is being uploaded',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        } as any);
        task.snapshotChanges().pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe((url) => {
              // Add the url to the mainPhotoUrl string
              this.mainPhotoUrl = url;
              let photo = this.defendantPhotos[0];
              console.log('Photo', photo);
              console.log('Photo Url', url);
              // in the photo object, go through the photos array and find the entry with the mainPhoto property set to true. Once found, set the photoUrl to the url that was just uploaded to firebase
              if (this.defendantPhotos.length > 0 && this.defendantPhotos[0].photos.length > 0) {
                console.log('Updating existing photo object');
                photo.photos.forEach((p) => {
                  if (p.photoMain) {
                    p.photoUrl = url;
                  }
                });
              } else {
                // Create a new photo object and set the photoUrl to the url that was just uploaded to firebase
                console.log('Creating new photo object');
                const newPhoto: Photos = {
                  id: this.af.createId(),
                  offenderID: this.defendant.spn,
                  photos: [{
                    photoUrl: url,
                    photoMain: true,
                    photoDate: new Date().getTime().toString(),
                    photoComment: 'Photo added during booking process'
                  }]
                };
                this.defendantPhotos.push(newPhoto);
              }

              // Update the photo object in the database collection called 'photos' with the photo object that was just updated
              this.af.collection('photos').doc(this.defendantPhotos[0].id).set(this.defendantPhotos[0]).then(() => {
                // Create a Swal alert to let the user know that the photo was successfully uploaded
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Photo successfully uploaded!',
                  showConfirmButton: false,
                  timer: 1500
                });
              }).catch((error) => {
                // Create a Swal alert to let the user know that the photo was not successfully uploaded
                Swal.fire({
                  icon: 'error',
                  title: 'Oops...',
                  text: 'Something went wrong! Please try again. ' + error,
                  showConfirmButton: false,
                  timer: 3000
                });
              });
            });
          })
        ).subscribe();
      }
    });
  }

  // Create a function to convert a data url to a blob
  dataURLtoBlob(dataurl) {
    // Create a variable to hold the byte characters
    const arr = dataurl.split(',');
    // Create a variable to hold the mime type
    const mime = arr[0].match(/:(.*?);/)[1];
    // Create a variable to hold the byte characters
    const bstr = atob(arr[1]);
    // Create a variable to hold the byte characters
    let n = bstr.length;
    // Create a variable to hold the byte characters
    const u8arr = new Uint8Array(n);
    // Create a variable to hold the byte characters
    while (n--) {
      // Create a variable to hold the byte characters
      u8arr[n] = bstr.charCodeAt(n);
    }
    // Create a variable to hold the byte characters
    return new Blob([u8arr], {type: mime});
  }


  dateFromUnixTime(unixTime) {
    // Check to see if the unixTime is null or undefined
    if (!unixTime) {
      // Return null if the unixTime is null or undefined
      return null;
    }
    // Check if the unitTime is in seconds or milliseconds and convert to seconds if needed
    if (unixTime.toString().length > 10) {
      unixTime = Math.floor(unixTime / 1000);
    }
    // Return the date with the format of Month Day, Year from the unixTime using midnight as the time
    return new Date(unixTime * 1000).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  }

  closeMenu() {
    this.exit.emit(true);
  }

  doEditRecord() {
    this.originalDefendant = {};
    this.originalDefendant = {...this.defendant};
    // Remove all readonly attributes from all input fields found within the fieldset with the id of 'userInfo'
    const inputs = document.querySelectorAll('#userInfo input');
    inputs.forEach((input) => {
      input.removeAttribute('readonly');
      input.removeAttribute('disabled');
      input.setAttribute('style', 'background-color: yellow');
    } );
    this.editmenu = true;
  }

  doUpdateRecord() {
    // Create a swal alert to show the user that the record is being updated and to please hold
    Swal.fire({
      title: 'Updating record',
      html: 'Please wait while the record is being updated',
      text: '',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    } as any);
    // Create a 2-second timer to simulate the record being updated
    setTimeout(() => {
      // Update the record in the database collection called 'defendants' with the defendant object that was just updated
      this.af.collection('users').doc(this.defendant.id).set(this.defendant).then(() => {
        // Create a Swal alert to let the user know that the record was successfully updated
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Record successfully updated!',
          showConfirmButton: false,
          timer: 1500
        });
        this.editmenu = false;
        // Add readonly and disabled attributes to all input fields found within the fieldset with the id of 'userInfo'
        const inputs = document.querySelectorAll('#userInfo input');
        inputs.forEach((input) => {
          input.setAttribute('readonly', 'true');
          input.setAttribute('disabled', 'true');
          input.setAttribute('style', 'background-color: lightgrey');
        } );
      }).catch((error) => {
        // Create a Swal alert to let the user know that the record was not successfully updated
        Swal.fire({
          icon: 'error',
          title: 'Oops... Record not updated',
          text: 'Something went wrong! Please try again. ' + error,
          showConfirmButton: false,
          timer: 3000
        });
      });
    }, 2000);

  }

  cancelEdit() {
    Swal.fire({
      title: 'Warning',
      text: 'Are you sure you want to cancel? Any edits will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'No, keep editing'
    }).then((result) => {
      if (result.isConfirmed) {
        this.defendant = {...this.originalDefendant};
        this.editmenu = false;
        // Add readonly and disabled attributes to all input fields found within the fieldset with the id of 'userInfo'
        const inputs = document.querySelectorAll('#userInfo input');
        inputs.forEach((input) => {
          input.setAttribute('readonly', 'true');
          input.setAttribute('disabled', 'true');
          input.setAttribute('style', 'background-color: lightgrey');
        });
      }
    });
  }

  getDays(unixTime) {
    // Check to see if the unixTime is null or undefined
    if (!unixTime) {
      // Return null if the unixTime is null or undefined
      return null;
    }
    // Calculate the number of days between the unixTime and today
    let daysBetween = (new Date(unixTime * 1000).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    // Change the number of days to a positive number
    daysBetween = Math.abs(daysBetween);
    // Return the number of days between the unixTime and today
    return Math.round(daysBetween);
  }

  getYearsDays(unixTime) {
    // Check to see if the unixTime is null or undefined
    if (!unixTime) {
      // Return null if the unixTime is null or undefined
      return null;
    }
    // Calculate the number of days between the unixTime and today
    let daysBetween = (new Date(unixTime * 1000).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    // Change the number of days to a positive number
    daysBetween = Math.abs(daysBetween);
    // Calculate the number of years between the unixTime and today
    const yearsBetween = Math.floor(daysBetween / 365);
    // Calculate the number of days between the unixTime and today
    const days = Math.round(daysBetween % 365);
    // Return the number of years and days between the unixTime and today
    return yearsBetween + ' years ' + days + ' days';
  }

  // Convert a 24 hour time to a 12 hour time with AM or PM
  convertTime(time) {
    // Check to see if the time is null or undefined
    if (!time) {
      // Return null if the time is null or undefined
      return null;
    }
    // Split the time into hours and minutes
    const splitTime = time.split(':');
    // Check to see if the hours is greater than 12
    if (parseInt(splitTime[0]) > 12) {
      // Return the time in 12 hour format with PM
      return (parseInt(splitTime[0]) - 12) + ':' + splitTime[1] + ' PM';
    } else {
      // Return the time in 12 hour format with AM
      return splitTime[0] + ':' + splitTime[1] + ' AM';
    }
  }


  showBooking(booking) {
    this.doShowBooking.emit(booking);
  }

  deleteBooking(event) {
    Swal.fire({
      title: 'Warning',
      text: 'Are you sure you want to delete this booking?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'No, keep editing'
    }).then((result) => {
      if (result.isConfirmed) {
        this.af.collection('bookings').doc(event.id).delete();
        Swal.fire(
          'Deleted!',
          'The booking has been deleted.',
          'success'
        );
      }
    });
  }

  doAddBooking() {
    this.showNewBookingWizard = true;
    this.showDefendantMenu = false;
  }

  doCloseBookingWizard() {
    this.showNewBookingWizard = false;
    this.showDefendantMenu = true;
    // Refresh the this.events array to show the newest bookings
    this.events = [];
    this.af.collection('bookings', ref => ref.where('offender', '==', this.defendant.id)).snapshotChanges().subscribe((data: any) => {
      // Create the events array from each booking in the data array with the fields 'bookDate', 'bookTime', 'bookingStatus', and 'classification'
      this.events = data.map((booking) => {
        return {
          id: booking.payload.doc.id,
          ...booking.payload.doc.data()
        } as Booking;
      });
      // sort the events array by the 'bookDate' and add the array to the this.events array
      this.events = this.events.sort((a, b) => {
        // @ts-ignore
        return b.bookDate - a.bookDate;
      });
    });
  }

}
