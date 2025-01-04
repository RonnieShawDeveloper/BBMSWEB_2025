import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import Swal from 'sweetalert2';
import { BehaviorSubject, interval } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  public updateAvailable$ = this.updateAvailableSubject.asObservable();

  constructor(private swUpdate: SwUpdate) {
    console.log('UpdateService instantiated');
    if (this.swUpdate.isEnabled) {
      // Subscribe to the version updates observable
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.promptUser();
        }
      });

      // Periodically check for updates (every 30 minutes)
      interval(1 * 60 * 1000).subscribe(() => {
        console.log('Checking for updates');
        this.swUpdate.checkForUpdate().catch((err) => {
          console.error('Error checking for updates:', err);
        });
      });
    }
  }

  private promptUser() {
    Swal.fire({
      title: 'An Update is Available',
      text: 'A new version of the BBMS application has been downloaded and is ready to install. Would you like to update now?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Yes, update now',
      cancelButtonText: 'No, I will update later',
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      } else {
        this.updateAvailableSubject.next(true);
        // Show an additional alert about the update button
        Swal.fire({
          title: 'Update Deferred',
          text: 'You can apply the update later using the red button at the top of the screen. This update includes important fixes and new features, so please install it as soon as possible.',
          icon: 'warning',
          confirmButtonText: 'Got it!',
        });
      }
    });
  }
  
}
