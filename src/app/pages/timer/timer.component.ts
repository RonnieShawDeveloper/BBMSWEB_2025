import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../services/auth.service";
import {Observable, timer} from "rxjs";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss']
})
export class TimerComponent implements OnInit {

  timeLeft: string;
  constructor(private authService: AuthService) {}

  ngOnInit() {
    const expirationString = localStorage.getItem('authExpiration');
    if (expirationString) {
      const expirationDate = new Date(expirationString);
      const timeDifference = expirationDate.getTime() - new Date().getTime();
      if (timeDifference > 0) {
        this.timeLeft = this.formatTime(timeDifference);
        timer(0, 1000).subscribe(() => {
          const remainingTime = Math.max(0, expirationDate.getTime() - new Date().getTime());
          this.timeLeft = this.formatTime(remainingTime);
        });
      }
    }
  }

  private formatTime(time: number): string {
    const hours = Math.floor(time / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((time % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }


}
