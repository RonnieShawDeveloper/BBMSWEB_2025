import { Injectable } from '@angular/core';
import { SwUpdate } from "@angular/service-worker";
import Swal from "sweetalert2";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class UpdateServiceService {

  constructor(private swUpdate: SwUpdate, private router: Router) {
    swUpdate.versionUpdates.subscribe(event => {
      console.log('current event', event);
      if(event.type === 'VERSION_DETECTED' || event.type === 'VERSION_READY') {
        Swal.fire({
          icon: 'info',
          title: 'Update Available',
          text: 'A new version of the application is available. Your software needs to update to the latest version to continue.',
          confirmButtonText: 'Ok'
        }).then((result) => {
          router.navigateByUrl('/');
          window.location.reload();
        } );
      }
    });
  }
}
