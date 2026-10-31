import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DirectoryPageChange } from '../../../core/models/directory-page';

@Component({selector:'app-directory-paginator',standalone:true,imports:[MatIconModule],templateUrl:'./directory-paginator.html',styleUrl:'./directory-paginator.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class DirectoryPaginator {
  @Input() pageNumber = 1;
  @Input() pageSize = 20;
  @Input() totalCount: number | null = null;
  @Input() totalPages: number | null = null;
  @Input() hasPreviousPage = false;
  @Input() hasNextPage = false;
  @Input() disabled = false;
  @Input() itemCount = 0;
  @Input() localMode = false;
  @Output() pageChange = new EventEmitter<DirectoryPageChange>();
  readonly pageSizes = [10,20,50,100];
  get rangeLabel(): string {
    if (this.totalCount === 0) return '0 من 0';
    if (!this.itemCount) return 'لا توجد سجلات في هذه الصفحة';
    const first=(this.pageNumber-1)*this.pageSize+1;
    if(this.totalCount!==null) return `${first}–${Math.min(first+this.itemCount-1,this.totalCount)} من ${this.totalCount}${this.localMode ? ' سجل محمّل' : ''}`;
    return `${this.itemCount} سجل في الصفحة ${this.pageNumber}`;
  }
  go(pageNumber: number): void {
    if(this.disabled || !Number.isSafeInteger(pageNumber) || pageNumber<1 || pageNumber===this.pageNumber) return;
    if(pageNumber<this.pageNumber && !this.hasPreviousPage) return;
    if(pageNumber>this.pageNumber && !this.hasNextPage) return;
    if(this.totalPages!==null && pageNumber>Math.max(1,this.totalPages)) return;
    this.pageChange.emit({pageNumber,pageSize:this.pageSize});
  }
  changeSize(event: Event): void {
    const pageSize=Number((event.target as HTMLSelectElement).value);
    if(!this.disabled && this.pageSizes.includes(pageSize) && pageSize!==this.pageSize) this.pageChange.emit({pageNumber:1,pageSize});
  }
}
