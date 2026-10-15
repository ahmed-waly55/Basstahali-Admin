import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CurriculumService } from '../../core/services/curriculum-service';
import { environment } from '../../../environments/environment';

describe('Academic admin API contract', () => {
  let service: CurriculumService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CurriculumService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('posts the documented education stage body and deletes by ID', () => {
    const payload = { nameAr: 'ابتدائي', nameEn: 'Primary', code: 'PRI', curriculumId: 'curriculum-id', sortOrder: 0 };
    service.createEducationStage(payload).subscribe();
    const create = http.expectOne(`${environment.baseUrl}/api/v1/education-stages`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ success: true });
    service.deleteEducationStage('stage-id').subscribe();
    const remove = http.expectOne(`${environment.baseUrl}/api/v1/education-stages/stage-id`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('includes educationStageId in both grade level creation and updates', () => {
    const payload = { nameAr: 'أول', nameEn: 'First', code: 'G1', curriculumId: 'curriculum-id', sortOrder: 0, educationStageId: 'stage-id' };
    service.createGradeLevel(payload).subscribe();
    const create = http.expectOne(`${environment.baseUrl}/api/v1/grade-levels`);
    expect(create.request.body.educationStageId).toBe('stage-id');
    create.flush(null);
    service.updateGradeLevel('grade-id', payload).subscribe();
    const update = http.expectOne(`${environment.baseUrl}/api/v1/grade-levels/grade-id`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.educationStageId).toBe('stage-id');
    update.flush(null);
  });
});
