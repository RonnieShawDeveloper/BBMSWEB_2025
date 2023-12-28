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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<firebase.User>;
  // Single Offender
  singleMember: Observable<Members[]>;

  // Firebase Collection
  memberCollection: AngularFirestoreCollection<Members>;
  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth, private router: Router) {
    this.user$ = afAuth.authState;
    this.checkAuthExpiration();
    this.memberCollection = afs.collection('members');
  }
  isLoggedIn() {
    return this.user$.pipe(map(user => !!user));
  }

  // Create a login function that takes an email and password and returns a promise
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
                  <div *ngIf="currentMember.authAdmin" class="row" style="color: var(--light);background: var(--red);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>YOU HAVE BEEN GRANTED ADMIN ACCESS</span></div>
                  </div>
                  <div *ngIf="currentMember.authJudge" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>SUPREME COURT JUSTICE ACCESS</span></div>
                  </div>
                  <div *ngIf="currentMember.authJudgeClerk" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>SUPREME COURT JUDICIAL ASSISTANT</span></div>
                  </div>
                  <div *ngIf="currentMember.authClerk" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>INTAKE STAFF ACCESS</span></div>
                  </div>
                  <div *ngIf="currentMember.authRegistrar" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>SUPREME COURT CRIMINAL REGISTRAR</span></div>
                  </div>
                  <div *ngIf="currentMember.authRegistrarClerk" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>CRIMINAL REGISTRAR STAFF</span></div>
                  </div>
                  <div *ngIf="currentMember.authAttorney" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>DEPTARTMENT OF PUBLIC PROSECTION</span></div>
                  </div>
                  <div *ngIf="currentMember.authpRIVaTTORNEY" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>PRIVATE ATTORNEY/PUBLIC DEFENDER</span></div>
                  </div>
                  <div *ngIf="currentMember.authMagistrate" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>MAGISTRATE COURT</span></div>
                  </div>
                  <div *ngIf="currentMember.authMagistrateClerk" class="row" style="color: var(--light);background: var(--green);font-weight: bold;font-size: 12px;text-align: center;margin-top: 4px;">
                      <div class="col"><span>MAGISTRATE COURT CLERK</span></div>
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

  updateMemberRecord(currentMember) {
    this.memberCollection.doc(currentMember.id).update(currentMember);
  }

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

  register(email: string, password: string) {
    return new Promise((resolve, reject) => {
      this.afAuth.createUserWithEmailAndPassword(email, password)
        .then(userData => {
            resolve(userData);
          },
          err => reject(err));
    });
  }

  // Create a Signout function that returns a promise
  logout(): Promise<void> {
    return this.afAuth.signOut()
      .then(() => {
        localStorage.removeItem('authExpiration');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.log(error);
      });
  }
  private saveAuthExpiration() {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 9); // Tests the expiration for 9 hours
    // expirationDate.setMinutes(expirationDate.getMinutes() + 1); // Tests the expiration for 2 minutes
    localStorage.setItem('authExpiration', expirationDate.toISOString());
  }

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

  // Create a password reset function that takes an email and returns a promise
  resetPassword(email: string): Promise<boolean> {
    return this.afAuth.sendPasswordResetEmail(email)
      .then(() => {
        return true;
      })
      .catch((error) => {
        return false;
      });
  }

}
