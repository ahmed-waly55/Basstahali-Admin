import { Component } from '@angular/core';
import { Login } from "../../core/components/login/login";

@Component({
  selector: 'app-auth',
  imports: [Login],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {}
