import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-header',
  imports: [CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  @Input() isSidebarOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();


  userName: string | null = localStorage.getItem('user');
}
