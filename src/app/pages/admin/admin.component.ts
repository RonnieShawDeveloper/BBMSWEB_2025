import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import Swal from "sweetalert2";
import {Members} from "../../models/members";
import {Router} from "@angular/router";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat/app";
import {Table} from "primeng/table";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {

  currentMember: Members = JSON.parse(localStorage.getItem('member') || '{}');
  allMembers: Members[] = [];
  subscriptions: any[] = [];

  constructor(private db: AngularFirestore, private router: Router, private auth: AngularFireAuth) {
    console.log('currentMember',this.currentMember)
    if(this.currentMember.authAdmin !== true ){
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You must have Admin access to view this page!',
      })
      router.navigate(['/']);
    }

    // Get the snapshotchanges of the members collection
    this.subscriptions.push(db.collection('members').snapshotChanges().subscribe((data: any) => {
      this.allMembers = [];
      data.forEach((item: any) => {
        let member: Members = item.payload.doc.data();
        member.id = item.payload.doc.id;
        this.allMembers.push(member);
      });
      // Loop through the members records and check if lastLogin and memberSince are undefined and if so, set them to 'No Data'
      this.allMembers.forEach((member) => {
        // Check the fName, mName and lName and capitalize the first letter and lowercase the rest
        if(member.fName) {
          member.fName = member.fName.charAt(0).toUpperCase() + member.fName.slice(1).toLowerCase();
        }
        if(member.mName) {
          member.mName = member.mName.charAt(0).toUpperCase() + member.mName.slice(1).toLowerCase();
        }
        if(member.lName) {
          member.lName = member.lName.charAt(0).toUpperCase() + member.lName.slice(1).toLowerCase();
        }
        if(!member.lastLogin) {
          member.lastLogin = 'No Data';
        }
        if(!member.memberSince) {
          member.memberSince = 'No Data';
        }
      });
      // Sort the members array by lName alphabetically
      this.allMembers.sort((a, b) => {
        if(a.lName < b.lName) { return -1; }
        if(a.lName > b.lName) { return 1; }
        return 0;
      })
      this.checkDuplicates();
    }));
  }

  localTime(timestamp: any): string {
    if(timestamp == 'No Data' || timestamp == null) {
      return timestamp;
    }
    // Convert GMT time in the format of 'Thu, 19 Aug 2021 13:07:45 GMT' to local time
    let date = new Date(timestamp);
    return date.toLocaleString();
  }

  checkTime(timestamp: any): boolean {
    // Check if the time is 'No Data' or null and if so, return 'No Data'
    if(timestamp == 'No Data' || timestamp == null) {
      return false;
    }
    // Check if the time is less than 12 hours ago and if so, return true else return false
    let date = new Date(timestamp);
    let now = new Date();
    let diff = now.getTime() - date.getTime();
    let hours = Math.floor(diff / 1000 / 60 / 60);
    if(hours <= 12) {
      return true;
    } else {
      return false;
    }
  }

  clear(table: Table) {
    table.clear();
    let searchInput = document.getElementById('searchBox') as HTMLInputElement;
    searchInput.value = '';
  }

  duplicateChecked: boolean = false;
  checkDuplicates() {
    if(this.duplicateChecked) {
      return;
    }
    this.duplicateChecked = true;
    // Check for duplicate email addresses
    let duplicates: string[] = [];
    this.allMembers.forEach((member) => {
      let count = 0;
      this.allMembers.forEach((m) => {
        if(member.email == m.email) {
          count++;
        }
      });
      if(count > 1) {
        duplicates.push('<span style="font-size: 10px">ID '+member.id+' UID:'+member.uid+'</span><br>'+member.name+' '+ member.email+'<hr>');
      }
    });
    if(duplicates.length > 0) {
      let msg = '';
      duplicates.forEach((email) => {
        msg += email+'<br>'
      });
      Swal.fire({
        icon: 'error',
        title: 'Duplicate Email Addresses Found',
        width: 600,
        heightAuto: true,
        html: '<b>Duplicate records have been found for these accounts:</b><div style="overflow-y: scroll; height:400px; width: 100%">'+msg+'</div>These will need to be corrected through the developer.',
      })
    }
  }



  ngOnInit(): void {
  }

  getStyle(status: string) {
    if (status == 'New') {
      return 'background-color: yellow';
    } else if(status == 'Disapproved')  {
      return 'background-color: red; color: white';
    } else {
      return 'background-color: green; color: white';
    }
  }

  getWarnings(member) {
    if(!member.id) {
      return 'background-color: red; color: white';
    }
  }

  doStatusChange(evt, member: Members) {
    Swal.fire({
      title: 'Event Status Change',
      text: 'Are you sure you want to change the status of this event to '+evt.target.value+'?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        member.status = evt.target.value;
        // Update the member in the database
        this.db.collection('members').doc(member.id).set(member, {merge: true}).then(() => {
          Swal.fire({
            toast: true,
            icon: 'success',
            title: 'Success',
            text: 'Member status updated successfully!',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            position: 'top-end'
          })
        }).catch((error) => {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong!',
          })
        })
      }
    });
  }

  doRole(item: String, member: Members) {

    switch (item) {
      case 'admin':
        member.authAdmin = !member.authAdmin;
        break;
      case 'judge':
        member.authJudge = !member.authJudge;
        break;
      case 'judgeClerk':
        member.authJudgeClerk = !member.authJudgeClerk;
        break;
      case 'magistrate':
        member.authMagistrate = !member.authMagistrate;
        break;
      case 'magistrateClerk':
        member.authMagistrateClerk = !member.authMagistrateClerk;
        break;
      case 'private':
        member.authPrivAttorney = !member.authPrivAttorney;
        break;
      case 'dpp':
        member.authAttorney = !member.authAttorney;
        break;
      case 'registrar':
        member.authRegistrar = !member.authRegistrar;
        break;
      case 'registrarClerk':
        member.authRegistrarClerk = !member.authRegistrarClerk;
        break;
    }
    // Update the member in the database
    this.db.collection('members').doc(member.id).set(member, {merge: true}).then(() => {
      Swal.fire({
        toast: true,
        icon: 'success',
        title: 'Success',
        text: 'Member role updated successfully!',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        position: 'top-end'
      })
    }).catch((error) => {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Something went wrong!',
      })
    })

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    } );
  }

}
