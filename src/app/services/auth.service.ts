import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import {from, Observable, switchMap, take, timer} from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import {Members} from "../models/members";
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/compat/firestore";
import Swal from "sweetalert2";
import { FirebaseError } from '@firebase/util';

/**
 * AuthService is a service that provides authentication functionality.
 * It uses Firebase for authentication and Firestore for storing user data.
 * It also uses SweetAlert2 for displaying alerts.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<firebase.User>;
  // Single Offender
  singleMember: Observable<Members[]>;
  ipAddress: string;

  // Firebase Collection
  memberCollection: AngularFirestoreCollection<Members>;

  /**
   * AuthService constructor
   * @param {AngularFirestore} afs - AngularFirestore instance
   * @param {AngularFireAuth} afAuth - AngularFireAuth instance
   * @param {Router} router - Router instance
   */
  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth, private router: Router) {
    this.user$ = afAuth.authState;
    this.checkAuthExpiration();
    this.memberCollection = afs.collection('members');
    this.getIpAddress();

  }

  getIpAddress() {
    // Write and HTTPS get request to "https://api.ipify.org/?format=json" and console log the IP Address
    fetch('https://api.ipify.org/?format=json')
      .then(response => response.json())
      .then(data => {
        this.ipAddress = data.ip;
        console.log('Your IP Address is: ' + this.ipAddress);
      });
  }

  /**
   * Checks if the user is logged in
   * @returns {Observable<boolean>} - Observable that emits true if the user is logged in, false otherwise
   */
  isLoggedIn() {
    return this.user$.pipe(map(user => !!user));
  }

  /**
   * Logs in a user with the given email and password
   * @param {string} email - The email of the user
   * @param {string} password - The password of the user
   * @returns {Promise<void>} - A promise that resolves when the login is successful and rejects when there is an error
   */
  async login(email: string, password: string): Promise<void> {
    return this.afAuth.signInWithEmailAndPassword(email, password)
      .then((user) => {
        this.saveAuthExpiration();
        this.checkAuthExpiration();
        this.getSingleMember(user.user.uid);
        this.singleMember.pipe(take(1)).subscribe(async (data) => {
          // Check to see that a member was found and if not, inform the user that there is a problem with their account and to contact the administrator
          if (data.length === 0) {
            Swal.fire({
              icon: 'error',
              title: 'Account Not Found',
              text: 'There was a problem with your account. Please contact the administrator.',
              confirmButtonText: 'Ok'
            }).then((result) => {
              return;
            });
          }
          let currentMember = data[0];
          currentMember.ipAddress = this.ipAddress;
          // Check to see the members email address and the email address they used to login is the same, and if not, ask them if they want to update their email address with the one used to login
          if (currentMember.email !== email && currentMember.emailMismatch !== true) {
            await Swal.fire({
              icon: 'question',
              title: 'Email Address Mismatch',
              html: `
                  <div style="overflow: hidden; border: solid 1px black; border-radius: 10px">
                      <div class="row">
                          <div class="col">
                            <span>
                              The Email address you used to login<br><b>(${email})</b><br>does not match the email address we have on file<br><b>(${currentMember.email})</b><br>
                              Would you like to update the email address on file with<br><b>${email}</b>?
                            </span>
                          </div>
                      </div>
                      <div class="row small">
                          <div class="col"><span style="color: var(--red);font-weight: bold;">The email address on file is used to send you important email notifications. You can always update this later in your profile</span></div>
                      </div>
                  </div>`,
              confirmButtonText: 'Yes',
              cancelButtonText: 'No',
              showCancelButton: true,
              focusConfirm: false,
              preConfirm: () => {
                return {
                  email: user.user.email
                }
              }
            }).then((result) => {
              if (result.isConfirmed) {
                currentMember.email = result.value.email;
                this.updateMemberRecord(currentMember);
              } else {
                currentMember.emailMismatch = true;
                this.updateMemberRecord(currentMember);
              }
            });
          }
          currentMember.lastLogin = user.user.metadata.lastSignInTime;
          currentMember.memberSince = user.user.metadata.creationTime;
          console.log('Current Member: ',currentMember);
          localStorage.setItem('member', JSON.stringify(currentMember));
          this.updateMemberRecord(currentMember);
          if (data[0].status === 'New') {
            // Create a Swal Alert letting the user know that their access has not been granted yet
            Swal.fire({
              icon: 'info',
              title: 'Access Pending',
              text: 'Your access is pending. Please contact the administrator for access.',
              confirmButtonText: 'Ok'
            }).then((result) => {
              this.router.navigate(['/login']);
              return;
            });
          } else {
            // Get the last login date and time from the user object and format it to a readable date and time
            let lastLogin = new Date(user.user.metadata.lastSignInTime);
            const lastLoginTime = user.user.metadata.lastSignInTime;
            localStorage.setItem('lastLogin', lastLoginTime);
            // Format the lastLogin with data and time
            let lastLoginDate = lastLogin.toLocaleDateString() + ' ' + lastLogin.toLocaleTimeString();
            let membersince = user.user.metadata.creationTime;

            Swal.fire({
              icon: 'success',
              title: 'You are logged in',
              html: `
                <div style="overflow: hidden; border: solid 1px black; border-radius: 10px">
                  <div class="row">
                      <div class="col" style="text-align: center;background: var(--blue);color: var(--light);">
                        <span style="font-weight: bold;font-size: 19px;">Welcome ${currentMember.fName}</span>
                      </div>
                  </div>
                  <div class="row small" style="margin-top: 5px;margin-bottom: 5px;">
                      <div class="col d-flex flex-column align-items-sm-center" style="background: #f9f0f0;">
                        <span style="font-weight: bold;">Your Last Login was</span><span>${currentMember.lastLogin}</span>
                      </div>
                  </div>
                  <div class="row small">
                      <div class="col d-flex flex-column align-items-sm-center" style="background: #f9f0f0;">
                        <span style="font-weight: bold;">You have been a member since</span><span>${currentMember.memberSince}</span>
                      </div>
                  </div>
                    <div class="m-1 text-danger font-weight-bold text-center">
                    YOUR IP ADDRESS (${this.ipAddress}) HAS BEEN LOGGED AND ALL MOVEMENT, CHANGES, DELETIONS, AND UPDATES ARE BEING MONITORED AND RECORDED.
                    </div>
                </div>`,
              confirmButtonText: 'Ok'
            });
            this.router.navigate(['/']);
          }
        });
      })
      .catch((error: FirebaseError) => {
        // Create a Swal Alert providing the user with the error message from Firebase
        Swal.fire({
          icon: 'error',
          title: 'Login Error',
          text: error.message,
          confirmButtonText: 'Ok'
        });
      });
  }


  /**
   * Logs in a user with the given email and password, leveraging OpenAI for error handling
   * @param {string} email - The email of the user
   * @param {string} password - The password of the user
   * @param {Function} handleOpenAIResponse - Callback to send messages via OpenAI
   * @returns {Promise<void>} - A promise that resolves when the login is successful
   */
  // async loginAI(email: string, password: string, handleOpenAIResponse: (message: string) => void): Promise<void> {
  //   try {
  //     const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);

  //     // Handle successful login
  //     this.saveAuthExpiration();
  //     this.checkAuthExpiration();
  //     this.getSingleMember(userCredential.user.uid);

  //     this.singleMember.pipe(take(1)).subscribe(async (data) => {
  //       if (data.length === 0) {
  //         handleOpenAIResponse(
  //           `There was a problem finding your account. Please contact the administrator for assistance.`
  //         );
  //         return;
  //       }

  //       let currentMember = data[0];
  //       currentMember.ipAddress = this.ipAddress;

  //       // Check for email mismatch
  //       if (currentMember.email !== email && !currentMember.emailMismatch) {
  //         handleOpenAIResponse(
  //           `The email address you used (${email}) does not match our records (${currentMember.email}). Would you like to update it?`
  //         );
  //         currentMember.emailMismatch = true;
  //         await this.updateMemberRecord(currentMember);
  //         return;
  //       }

  //       // Success response
  //       handleOpenAIResponse(
  //         `Welcome back, ${currentMember.fName}! Your last login was on ${new Date(
  //           userCredential.user.metadata.lastSignInTime
  //         ).toLocaleString()} and you have been a member since ${new Date(
  //           currentMember.memberSince
  //         ).toLocaleString()}. I will now direct you to the Dashboard`
  //       );

  //       setTimeout(() => {
  //         this.router.navigate(['/']); // Navigate to the root route
  //       }, 5000);
  //     });
  //   } catch (error: any) {
  //     const errorMessage = this.getFirebaseErrorMessage(error.code);
  //     handleOpenAIResponse(errorMessage);
  //   }
  // }

  async loginAI(email: string, password: string, handleOpenAIResponse: (message: string) => void): Promise<void> {
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
  
      // Handle successful login
      this.saveAuthExpiration();
      this.checkAuthExpiration();
      this.getSingleMember(userCredential.user.uid);
  
      this.singleMember.pipe(take(1)).subscribe(async (data) => {
        if (data.length === 0) {
          handleOpenAIResponse(
            `There was a problem finding your account. Please contact the administrator for assistance.`
          );
          return;
        }
  
        let currentMember = data[0];
        currentMember.ipAddress = this.ipAddress;
        currentMember.lastLogin = new Date().toISOString(); // Update last login timestamp
        currentMember.memberSince = userCredential.user.metadata.creationTime;
  
        // Check for email mismatch
        if (currentMember.email !== email && !currentMember.emailMismatch) {
          handleOpenAIResponse(
            `The email address you used (${email}) does not match our records (${currentMember.email}). Updating Current Email Address to ${email}.`
          );
  
          // Mark email mismatch and optionally update
          currentMember.email = email;
          await this.updateMemberRecord(currentMember);        
        }
  
        // Update the member record
        await this.updateMemberRecord(currentMember);
  
        // Check member status
        if (currentMember.status === 'New') {
          handleOpenAIResponse(
            `Your access is pending. Please contact the administrator for approval.`
          );
          return;
        }
  
        // Construct and send a success response
        const formattedLastLogin = new Date(currentMember.lastLogin).toLocaleString();
        const formattedMemberSince = new Date(currentMember.memberSince).toLocaleString();
  
        handleOpenAIResponse(
          `Welcome back, ${currentMember.fName}! Your last login was on ${formattedLastLogin}, and you have been a member since ${formattedMemberSince}. I will now direct you to the Dashboard.`
        );
  
        // Save the updated member record in localStorage
        localStorage.setItem('member', JSON.stringify(currentMember));
        localStorage.setItem('lastLogin', currentMember.lastLogin);
  
        // Navigate to the dashboard after a delay
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 5000);
      });
    } catch (error: any) {
      const errorMessage = this.getFirebaseErrorMessage(error.code);
      handleOpenAIResponse(errorMessage);
    }
  }
  

  /**
   * Maps Firebase error codes to user-friendly messages
   * @param {string} errorCode - The Firebase error code
   * @returns {string} - A user-friendly error message
   */
  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'The email address provided is invalid. Please check and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact the administrator for assistance.';
      case 'auth/user-not-found':
        return 'No account found with the provided email. Please ensure you have registered.';
      case 'auth/wrong-password':
        return 'The password provided is incorrect. Please reenter you email address and try again. Let me know if we need to reset your password.';
      default:
        return 'An unexpected error occurred during login. Please try again later.';
    }
  }



  /**
   * Gets a single member with the given id
   * @param {string} id - The id of the member
   * @returns {Observable<Members[]>} - An observable that emits the member data
   */
  getSingleMember(id: string) {
    this.singleMember = this.afs.collection('members', res => res.where('uid', '==', id)).snapshotChanges().pipe(
      map( changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Members;
          data.id = action.payload.doc.id;
          return data;
        });
      })
    );
    return this.singleMember;
  }
  /**
   * Updates a member record in Firestore
   * @param {Members} currentMember - The member data to update
   */
  updateMemberRecord(currentMember) {
    this.memberCollection.doc(currentMember.id).update(currentMember);
  }
  /**
   * Saves a new member to Firestore
   * @param {Members} member - The member data to save
   */
  saveNewMember(member: Members) {

    // Check the member collection and see if a record with this email address already exists
    this.afs.collection('members', res => res.where('email', '==', member.email)).snapshotChanges().pipe(
      map( changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Members;
          data.id = action.payload.doc.id;
          return data;
        });
      })
    ).pipe(take(1)).subscribe((data) => {
      if (data.length > 0) {
        // Create a Swal Alert letting the user know that their access has not been granted yet
        Swal.fire({
          icon: 'error',
          title: 'Email Address Already Exists',
          text: 'The email address you entered is already in use. Please contact the administrator for assistance.',
          confirmButtonText: 'Ok'
        }).then((result) => {
          return;
        });
      } else {
        this.memberCollection.add(member).then(
          data => {
            Swal.fire({
              icon: 'success',
              title: 'Account Created',
              text: 'Your account has been created. You will be notified when you have access to the system.',
              confirmButtonText: 'Ok'
            }).then((result) => {
              this.router.navigate(['/login']);
              return;
            });
          }
        );
      }
    });

  }

  /**
   * Registers a new user with the given email and password
   * @param {string} email - The email of the user
   * @param {string} password - The password of the user
   * @returns {Promise<any>} - A promise that resolves with the user data when the registration is successful and rejects when there is an error
   */
  register(email: string, password: string) {
    return new Promise((resolve, reject) => {
      this.afAuth.createUserWithEmailAndPassword(email, password)
        .then(userData => {
            resolve(userData);
          },
          err => reject(err));
    });
  }

  /**
   * Logs out the current user
   * @returns {Promise<void>} - A promise that resolves when the logout is successful and rejects when there is an error
   */
  logout(): Promise<void> {
    return this.afAuth.signOut()
      .then(() => {
        localStorage.removeItem('authExpiration');
        this.router.navigate(['/clogin']);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  /**
   * Saves the authentication expiration date to localStorage
   */
  private saveAuthExpiration() {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 9); // Tests the expiration for 9 hours
    // expirationDate.setMinutes(expirationDate.getMinutes() + 1); // Tests the expiration for 2 minutes
    localStorage.setItem('authExpiration', expirationDate.toISOString());
  }

  /**
   * Checks if the authentication has expired and logs out the user if it has
   */
  private checkAuthExpiration() {
    const expirationString = localStorage.getItem('authExpiration');
    if (expirationString) {
      const expirationDate = new Date(expirationString);
      const timeDifference = expirationDate.getTime() - new Date().getTime();
      if (timeDifference <= 0) {
        this.logout();
      } else {
        timer(timeDifference).subscribe(() => {
          this.logout();
        });
      }
    }
  }

  /**
   * Sends a password reset email to the given email
   * @param {string} email - The email to send the password reset email to
   * @returns {Promise<string>} - A promise that resolves with a success message or an error message
   */
  resetPassword(email: string): Promise<string> {
    return this.afAuth.sendPasswordResetEmail(email)
      .then(() => {
        return 'A password reset email has been sent to your email address.';
      })
      .catch((error) => {
        // Return a user-friendly error message
        if (error.code === 'auth/invalid-email') {
          return 'The email address provided is not valid. Please check and try again.';
        } else if (error.code === 'auth/user-not-found') {
          return 'There is no account associated with this email address.';
        } else {
          return 'An error occurred while sending the password reset email. Please try again later.';
        }
      });
  }


}
