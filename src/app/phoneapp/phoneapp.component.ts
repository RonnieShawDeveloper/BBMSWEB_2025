import {Component, ViewChild, ElementRef, OnInit, AfterViewInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireStorage, AngularFireStorageReference, AngularFireUploadTask} from "@angular/fire/compat/storage";
import {finalize, Observable} from "rxjs";
import swal from "sweetalert2";
import {Booking} from "../models/booking";
import {take} from "rxjs/operators";
@Component({
  selector: 'app-phoneapp',
  templateUrl: './phoneapp.component.html',
  styleUrls: ['./phoneapp.component.scss']
})
export class PhoneappComponent implements OnInit, AfterViewInit {

  @ViewChild('cameraFeed') cameraFeed: ElementRef;
  @ViewChild('snapshotCanvas') snapshotCanvas: ElementRef;

  booking: Booking;

  snapshotDataUrl: string | null = null;
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];

  downloadURL: Observable<AngularFireStorageReference> = new Observable<AngularFireStorageReference>();

  photoURL;
  constructor(private fs: AngularFirestore, private storage: AngularFireStorage) { }

  ngOnInit() {
    // Create a SWAL alert that asks the user to input a number code and then check to see if the number that was etered is correct
    swal.fire({
      title: 'ENTER YOUR UNLOCK CODE',
      input: 'number',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: false,
      confirmButtonText: 'UNLOCK',
      showLoaderOnConfirm: true,
      allowOutsideClick: false,
      preConfirm: (bookingNumber) => {
        this.fs.collection('magistrateBookings', ref => ref.where('unlockCode', '==', bookingNumber)).valueChanges().pipe(take(1)).subscribe((bookings: Booking[]) => {
          if (bookings.length > 0) {
            this.booking = bookings[0];
            console.log(this.booking);
          } else {
            // Create a SWAL alert letting the user know that the code was incorrect
            swal.fire({
              title: 'Incorrect Code',
              text: 'The code you entered was incorrect. Please refresh the page and try again.',
              icon: 'error',
              showConfirmButton: false,
              allowOutsideClick: false,
            });

          }
        } );
      }
    }).then((result) => {

    });
  }

  async ngAfterViewInit() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }});
      this.cameraFeed.nativeElement.srcObject = this.stream;
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }

  takeSnapshot() {
    const pictureButton = document.getElementById('snappicbutton') as HTMLButtonElement;
    pictureButton.disabled = true;
    // Hide the button so it can't be clicked again while we are processing the image
    pictureButton.style.display = 'none';
    if (this.stream) {
      const canvas = this.snapshotCanvas.nativeElement;
      canvas.width = this.cameraFeed.nativeElement.videoWidth;
      canvas.height = this.cameraFeed.nativeElement.videoHeight;
      canvas.getContext('2d').drawImage(this.cameraFeed.nativeElement, 0, 0);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "red";
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
      ctx.fillRect(0, 0, canvas.width, 40);
      // Set the font style for the text
      ctx.font = "20px Arial bold";
      ctx.textAlign = "center";
      ctx.fillStyle = "white"; // Set the text color to white

      // Center the text horizontally and vertically in the rectangle
      const text: string = "MAGISTRATE COURT BAIL";
      const textWidth = ctx.measureText(text).width;
      const x = canvas.width / 2;
      const y = (canvas.height - 20); // Adjusted for vertical centering
      // Draw the text in the center of the rectangle
      ctx.fillText(text, x, y);
      // Set the font style for the current date and time at the top of the canvas
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";

      // Get the current date and time
      var currentDate = new Date();
      var dateTimeString = currentDate.toLocaleString();

      // Display the current date and time at the top of the canvas
      ctx.fillText('Defendant: '+ this.booking.lastName+', '+ this.booking.firstName, canvas.width / 2, 15);
      ctx.fillText(dateTimeString, canvas.width / 2, 30);
      this.snapshotDataUrl = canvas.toDataURL('image/jpeg'); // Change the format if needed
      this.uploadSnapshot();
    }
  }
  uploadSnapshot() {
    if (this.snapshotDataUrl) {
      const storageRef = this.storage.ref('magistrate_photo/'); // Change the storage path if needed
      const fileName = 'magistrate_photo/magistrate_'+this.booking.id+'.jpg'; // Change the file name if needed
      const task: AngularFireUploadTask = this.storage.upload(fileName, this.dataURLtoBlob(this.snapshotDataUrl), { contentType: 'image/jpeg' });
      task.snapshotChanges().subscribe(
        (snapshot) => {
          if (snapshot.state === 'success') {
            this.getDownloadURL(fileName); // Get download URL
          }
        },
        (error) => {
          console.error('Error uploading file:', error);
        } );
    }

  }
  getDownloadURL(path: string) {
    const ref = this.storage.ref(path);

    ref.getDownloadURL().subscribe(
      (url) => {
        this.fs.collection('magistrateBookings').doc(this.booking.id).update({photoURL: url,unlockCode: null});
        // Create a swal alert letting the user know that the photo was uploaded successfully
        swal.fire({
          title: 'Photo Uploaded',
          text: 'Your photo has been uploaded successfully',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.reload();
          }
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
      return new Blob([raw], { type: contentType });
    }
    const parts = dataURL.split(BASE64_MARKER);
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  }

}
