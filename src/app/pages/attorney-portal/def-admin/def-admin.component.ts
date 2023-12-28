import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Offender} from '../../../models/offender';

@Component({
  selector: 'app-def-admin',
  templateUrl: './def-admin.component.html',
  styleUrls: ['./def-admin.component.css']
})
export class DefAdminComponent implements OnInit {
  @Input() offender: Offender;
  @Output() exit: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }

  doExit() {
    this.exit.emit(true);
  }

}
