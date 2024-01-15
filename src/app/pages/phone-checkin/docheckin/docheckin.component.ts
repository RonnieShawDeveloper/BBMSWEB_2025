import {AfterContentInit, AfterViewInit, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {catchError, Observable, of} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {map} from "rxjs/operators";
import swal from "sweetalert2";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Phonecheckin} from "../../../models/phonecheckin";

@Component({
  selector: 'app-docheckin',
  templateUrl: './docheckin.component.html',
  styleUrls: ['./docheckin.component.scss']
})
export class DocheckinComponent implements OnInit, AfterViewInit, AfterContentInit {

  @Output() exit = new EventEmitter<boolean>();
  lat: string = '0.00';
  lon: string = '0.00';
  geolocation: boolean = true;
  apiLoaded: Observable<boolean>;
  center: google.maps.LatLngLiteral = {
    "lat": 0.0,
    "lng": 0.0
  };
  zoom: 10;
  markerOptions: google.maps.MarkerOptions = {draggable: false};
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    mapTypeId: 'roadmap',
    maxZoom: 18,
    minZoom: 10,
    gestureHandling: 'none',
  };
  BBMSID: string = '';
  AFISID: string = '';
  fName: string = '';
  lName: string = '';
  address1: string = '';
  address2: string = '';
  city: string = '';
  state: string = '';
  phone: string = '';
  magistrate: boolean = false;
  supreme: boolean = false;
  month: number;
  day: number;
  year: number;
  dob: string = '';
  distance: string = '';
  policeStation: string = '';
  json: Phonecheckin = {};
  validate = false;

  photo: string = '';

  constructor(private httpClient: HttpClient, private fs: AngularFirestore) {
    // Using the browsers geolocation service, check that the user has given permission and if so, get the current location

  }

    /**
     * Get the distance between the user and the authorized police stations and check user in ONLY if they are closer than .25 miles
     */
  getDistanceCheckin() {
    let station = '';
       // Create an object showing AUTHORIZED Police Station name, Lat and Long
      let policeStation = [
          { "name": "Central Police Station Nassau","lat": 25.077521,"lon": -77.339841},
          { "name": "Elizabeth Estates Police Station Nassau","lat": 25.0367114,"lon": -77.2861464},
          { "name": "Carmichael Road Police Station Nassau","lat": 25.0179632,"lon": -77.3855093},
          { "name": "Southeastern Police Station Nassau","lat": 25.0185498,"lon": -77.3452121},
          { "name": "Grove Street Police Station Nassau","lat": 25.0448224,"lon": -77.3605021},
          { "name": "Wulf Road Police Station Nassau","lat": 25.0577254,"lon": -77.3460541},
          { "name": "Paradise Island Police Station Nassau","lat": 25.0807329,"lon": -77.3388512},
          { "name": "Nassau Street Police Station Nassau","lat": 25.072834,"lon": -77.3703865},
          { "name": "Quakoo Street Police Station Nassau","lat": 25.0656095,"lon": -77.3636363},
          { "name": "Fox Hill Police Station Nassau","lat": 25.0495375,"lon": -77.3110242},
          { "name": "Potters Cay Police Station Nassau","lat": 25.0772726,"lon": -77.3400106},
          { "name": "Central Police Station Grand Bahamas","lat": 25.0714701,"lon": -77.4224648},
          { "name": "Holiday Florida Test Location","lat": 28.1950350,"lon": -82.7399109},

      ];
      // Loop through the Police Station array and get the station that is within .25 miles of the user
      for (let i = 0; i < policeStation.length; i++) {
          let distance = this.calculateDistance(this.center.lat, this.center.lng, policeStation[i].lat, policeStation[i].lon);
          if (distance < .25) {
            station = policeStation[i].name;
            // If the user is within .25 miles of a police station, continue
              // Create a swal alert asking if the Defendant is at the station
              swal.fire({
                  title: 'Confirm',
                  text: 'Are you at ' + station + '?',
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonText: 'Yes',
                  cancelButtonText: 'No'
              }).then((result) => {
                  // If the user confirms they are at the station, continue
                  if (result.isConfirmed) {
                    this.distance = distance.toFixed(2);
                    this.policeStation = station;
                    // Continue Check-in
                      this.continueCheckin();
                  } else {
                      return;
                  }
              });
          } else {
            // Determine the closest police station to the user
            let closest = 1000;
            let closestStation = '';
            for (let i = 0; i < policeStation.length; i++) {
            let distance = this.calculateDistance(this.center.lat, this.center.lng, policeStation[i].lat, policeStation[i].lon);
              if (distance < closest) {
                closest = distance;
                closestStation = policeStation[i].name;
              }
            }
              // If the user is not within .25 miles of a police station, show an error
              swal.fire({
                  title: 'Not at an Authorized Location',
                  text: 'Currently, the Closest Authorized Station to your location is ' + closestStation + ' which is approximately ' + closest.toFixed(2) + ' miles away.',
                  icon: 'error',
                  confirmButtonText: 'OK'
              }).then((result) => {
                if(result.isConfirmed) {
                  this.continueCheckin();
                }
              });
          }
      }
  }

  /**
   * Convert degrees to radians
    * @param degrees
   */
   toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
  /**
   * Convert Latitude and Longitude of the users current location and the lat and long provided to miles using the Haversine formula
   * @param lat2 is the latitude of the police station the defendant is currently at
   * @param lon2 is the longitude of the police station the defendant is currently at
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusMiles = 3958.8; // Earth's radius in miles

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    lat1 = this.toRadians(lat1);
    lat2 = this.toRadians(lat2);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMiles * c;
  }


   /**
   * When the user clicks the check-in button, validate the form and then check them in
   * */
  continueCheckin() {

    // The month, day and Year are numbers and need to be stored as a string for leading zeros
    let _month: string;
    let _day: string;
    let _year: string;

    // Perform error checking to be sure all fields are filled out
    if(this.fName == '' || this.lName == '' || this.month == null || this.day == null || this.year == null || this.address1 == '' || this.city == '' || this.state == '' || this.phone == '') {
      swal.fire({
        title: 'Error',
        text: 'You must complete all fields on the form to complete your check-in.',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.validate = false;
        return;
      });
    }

    // Check that day is not greater than 31
    if (this.day > 31) {
      swal.fire({
        title: 'Error',
        text: 'Please enter a valid day for your Birth Date',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.validate = false;
        return;
      });
    }

    // Check that month is not greater than 12
    if (this.month > 12) {
      swal.fire({
        title: 'Error',
        text: 'Please enter a valid month for your Birth Date',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.validate = false;
        return;
      });
    }

    // Remove any whitespace from first and last name
    this.fName = this.fName.trim();
    this.lName = this.lName.trim();

    // Remove any characters from First and Last name that are not letters
    this.fName = this.fName.replace(/[^a-zA-Z ]/g, "");
    this.lName = this.lName.replace(/[^a-zA-Z ]/g, "");

    // Format the phone number to remove any characters that are not numbers
    this.phone = this.phone.replace(/[^0-9]/g, "");
    // Check that the phone number is 10 digits
    if (this.phone.length != 10) {
      swal.fire({
        title: 'Error',
        text: 'Please enter a valid phone number',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.validate = false;
        return;
      });
    }
    // Add hiphens to the phone number
    this.phone = this.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

    // Get the fName, lName and Capitalize the First Latter and Lowercase the rest
    this.fName = this.fName.charAt(0).toUpperCase() + this.fName.slice(1).toLowerCase();
    this.lName = this.lName.charAt(0).toUpperCase() + this.lName.slice(1).toLowerCase();
    // Check the Month and Day and add a 0 if necessary
    if (this.month < 10) {
      _month = '0' + this.month.toString();
    }
    else {
      _month = this.month.toString();
    }
    if (this.day < 10) {
      _day = '0' + this.day.toString();
    }
    else {
      _day = this.day.toString();
    }
    // Check that the year is a 4 digit year
    if (this.year < 1900) {
      swal.fire({
        title: 'Error',
        text: 'Please enter a valid year',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.validate = false;
        return;
      } );
    } else {
      _year = this.year.toString();
    }
    this.dob = _year + '-' + _month + '-' + _day;
    // Create a swal alert and ask if name and date of birth are correct
    swal.fire({
      title: 'Confirm',
      text: 'Please confirm your name is ' + this.fName + ' ' + this.lName + ' and your date of birth is ' + this.dob + '?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then((result) => {
      // If the user confirms the name and date of birth, continue
      if (result.isConfirmed) {
        swal.fire({
          title: 'Confirm',
          text: 'Is this your current address? ' + this.address1 + ' ' + this.address2 + ', ' + this.city + ', ' + this.state,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No'
        }).then((result) => {
          // If the user confirms the address, continue
          if (result.isConfirmed) {
            // If the user has agreed to the terms, continue
            if (this.magistrate || this.supreme) {
              this.getBBMS();
            } else {
              // If the user has not agreed to the terms, show an error
              swal.fire({
                title: 'Error',
                text: 'Please Select a Court',
                icon: 'error',
                confirmButtonText: 'OK'
              }).then(() => {
                this.validate = false;
                return;
              });
            }
          } else {
            // If the user does not confirm the address, show an error
            swal.fire({
              title: 'Error',
              text: 'Please enter your address',
              icon: 'error',
              confirmButtonText: 'OK'
            }).then(() => {
              this.validate = false;
              return;
            });
          }
        });
        } else {
        return;
      }
    });

  }

    /**
     * Gets the BBMSID and AFISID from the firestore collection "users" if the user exists
     */
  getBBMS() {
    // Get all records from the Users collection where the last name and dob match the entered values
    this.fs.collection('users', ref => ref.where('lName', '==', this.lName).where('dob', '==', this.dob)).get().subscribe((data) => {
      // If there are no records, show an error
      if (data.docs.length == 0) {
        swal.fire({
          title: 'Error',
          text: 'You were NOT located in the Bail Management System, however your check-in will still be recorded.',
          icon: 'error',
          confirmButtonText: 'CONTINUE'
        }).then(() => {
          this.getPhoto();
        });
      } else {
        // If there is only 1 record, get the BBMSID and AFISID
        if (data.docs.length == 1) {
          // @ts-ignore
          this.BBMSID = data.docs[0].data().id;
          // @ts-ignore
          this.AFISID = data.docs[0].data().spn;
        } else {
          // If there are more than 1 record, show a list of the records and get the BBMSID and AFISID
          swal.fire({
            title: 'Multiple Records Found!',
            icon: 'info',
            text: 'There were multiple records found. Your will still be checked in, but it will not be linked to a Bail Management Record',
            confirmButtonText: 'CONTINUE'
          }).then(() => {
            this.getPhoto();
          });
        }
        // If there are records, show a success message and get the BBMSID and AFISID
        swal.fire({
          title: 'Success',
          text: 'You were located in the Bail Management System.',
          icon: 'success',
          confirmButtonText: 'CONTINUE'
        }).then(() => {
          this.getPhoto();
        });
      }
    });
  }

    /**
     * Gets a photo from the user and then stores it in this.photo
     */
  getPhoto() {
    // Create a Swal dialog showing a file input and then store the file in this.photo
    swal.fire({
      title: 'Take A Photo',
      text: 'Please take a photo of yourself to be used for identification purposes. Press the Choose File button to take a photo.',
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        capture: 'camera',
        'aria-label': 'Upload your profile picture'
      }
    }).then((result) => {
      // If the user uploads a photo, continue
      if (result.isConfirmed) {
        // Get the file from the result
        const file = result.value;
        // Create a FileReader
        const reader = new FileReader();
        // Read the file as a data url
        reader.readAsDataURL(file);
        // When the reader is done reading the file
        reader.onload = () => {
          // Store the data url in this.photo
          this.photo = reader.result as string;
          // Resize the image to 200px by 200px
          this.resizeImage(this.photo, 800, 800, 0.7).then((dataUrl) => {
            // Store the resized image in this.photo
            this.photo = dataUrl;
            // Create a variable with the current time in 12-hour format
            let time = new Date().toLocaleTimeString('en-US', { hour12: true, hour: "numeric", minute: "numeric"});

            // Create a json object with the name, date of birth and photo
            this.json = {
              "BBMSID": this.BBMSID,
              "AFISID": this.AFISID,
              "fName": this.fName,
              "lName": this.lName,
              "address1": this.address1,
              "address2": this.address2,
              "city": this.city,
              "state": this.state,
              'phone': this.phone,
              "magistrate": this.magistrate,
              "supreme": this.supreme,
              "dob": this.dob,
              "photo": this.photo,
              "lat": this.lat,
              "lon": this.lon,
              "distance": this.distance,
              "policestation": this.policeStation,
              "timestamp": Date.now().toString(),
              "datetime": new Date().toLocaleDateString() + ' ' + time
            };
            // Add the json object to the firestore collection "phonecheckins"
            this.fs.collection('phonecheckins').add(this.json).then(() => {
              this.showLoggedIn();
            }).catch((error) => {
              swal.fire({
                title: 'Error',
                text: 'There was an error checking you in. Please try again. '+error,
                icon: 'error',
                confirmButtonText: 'OK'
              }).then(() => {
                this.exitCheckin();
              });
            });
          });
        };
      }
    });
  }

  showLoggedIn() {
    swal.fire({
      title: 'Checked In',
      text: 'Thank you '+ this.fName + ' ' + this.lName + ' for checking in. The court has been notified.',
      icon: 'info',
      confirmButtonText: 'OK'
    });
    this.exitCheckin();
  }

  exitCheckin() {
    this.exit.emit(true);
  }

  resizeImage(dataUrl: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create an image element
      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        // Create a canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if necessary
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas to a data URL
        const newDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Resolve the Promise with the new Data URL
        resolve(newDataUrl);
      };

      img.onerror = (error) => {
        reject(error);
      };
    });
  }
  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
// Get selectedOffender json object in localstorage and assign it to this.selectedOffender as Intake



  }

  resetLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.lat = position.coords.latitude.toString();
        this.lon = position.coords.longitude.toString();
        this.center = {
          "lat": position.coords.latitude,
          "lng": position.coords.longitude
        }
        this.apiLoaded = null;
        this.apiLoaded = this.httpClient.jsonp('https://maps.googleapis.com/maps/api/js?key=AIzaSyAj0NVNgZvAy3iFvAmUIr2szCApUqC4bv0', 'callback')
          .pipe(
            map((d) => {
              return true
            }),
            catchError((err, caught) => {
              console.log('Error: ', err);
              return of(false);
            }),
          );
      }, (error) => {
        // If the user has denied permission for the browser to use their location, set a flag to hide the location
        this.geolocation = false;
      });
    } else {
      // If the browser doesn't support geolocation, set a flag to hide the location
      this.geolocation = false;
    }
  }

  /**
   * After the content is initialized, get the current location and set the map center
   */
  ngAfterContentInit(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.lat = position.coords.latitude.toString();
        this.lon = position.coords.longitude.toString();
        this.center = {
          "lat": position.coords.latitude,
          "lng": position.coords.longitude
        }
        this.apiLoaded = this.httpClient.jsonp('https://maps.googleapis.com/maps/api/js?key=AIzaSyAj0NVNgZvAy3iFvAmUIr2szCApUqC4bv0', 'callback')
          .pipe(
            map((d) => {
              window.scrollTo(0, 0);
              return true
            }),
            catchError((err, caught) => {
              console.log('Error: ', err);
              return of(false);
            }),
          );
        window.scrollTo(0, 0);
      }, (error) => {
        // If the user has denied permission for the browser to use their location, set a flag to hide the location
        this.geolocation = false;
      });
    } else {
      // If the browser doesn't support geolocation, set a flag to hide the location
      this.geolocation = false;
    }


  }

}
