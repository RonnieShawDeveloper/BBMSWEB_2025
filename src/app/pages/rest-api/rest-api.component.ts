import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "@angular/fire/compat/firestore";

@Component({
  selector: 'app-rest-api',
  standalone: true,
  imports: [],
  templateUrl: './rest-api.component.html',
  styleUrl: './rest-api.component.scss'
})
export class RestAPIComponent implements OnInit {
  constructor(private activateRoute: ActivatedRoute, private db: AngularFirestore) {
  }

  ngOnInit(): void {
    this.searchMagistrate();
  }

  searchMagistrate() {
    this.activateRoute.params.subscribe(params => {
      //  get the id from the url
      const id = params['afisid'];
      // search the firestore database called 'magistrateBookings' for the 'afisID' that matches the id
      this.db.collection('magistrateBookings', res=> res.where('afisID', '==', id)).valueChanges().subscribe((doc) => {
        if(doc.length > 0){
          // sort the documents using the 'unixDate' string field showing the newest first
          doc.sort((a, b) => {
            return b['unixDate'] - a['unixDate'];
          });
          // get the first document in the array and add it to the div called 'restinfo' as a JSON string
          document.getElementById('afisinfo').innerHTML = JSON.stringify(doc);
        }
        else{
          // if there are no documents found, display a message
          // document.getElementById('afisinfo').innerHTML = "JSON.stringify({error: 'true'})";
          this.searchSupreme();
        }
      });
    });
  }

  searchSupreme() {
    this.activateRoute.params.subscribe(params => {
      //  get the id from the url
      const id = params['afisid'];
      // search the firestore database called 'supremeBookings' for the 'afisID' that matches the id
      this.db.collection('users', res=> res.where('spn', '==', id)).valueChanges().subscribe((doc) => {
        if(doc.length > 0){
          // sort the documents using the 'unixDate' string field showing the newest first
          doc.sort((a, b) => {
            return b['unixDate'] - a['unixDate'];
          });
          // get the first document in the array and add it to the div called 'restinfo' as a JSON string
          document.getElementById('afisinfo').innerHTML = JSON.stringify(doc);
        }
        else{
          // if there are no documents found, display a message
          document.getElementById('afisinfo').innerHTML = "JSON.stringify({error: 'true'})";

        }
      });
    });
  }

}
