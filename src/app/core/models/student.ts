export interface StudentAssignmentPayload {
  subjectId: string;
  teacherId: string;
  sessionPrice: number;
  currency: string;
}

export interface StudentProfilePayload {
  fullName: string;
  phoneNumber: string;
  parentName: string;
  parentPhoneNumber: string;
  gradeLevelId: string;
  curriculumId: string;
  subjectIds: string[];
  teacherAssignments: StudentAssignmentPayload[];
  educationStageId: string | null;
}

export interface CreateStudentPayload extends StudentProfilePayload {
  userName: string;
  password: string;
}

export interface UpdateStudentPayload extends StudentProfilePayload {
  expirationDate: string | null;
  status: string;
}

export interface CreditAdjustmentPayload {
  quantity: number;
  description: string;
  idempotencyKey: string;
}
