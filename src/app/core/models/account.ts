export interface ModeratorRecord {
  id: string;
  userName: string;
  fullName: string;
  phoneNumber: string;
  status: string;
  fixedMonthlySalary: number;
  salaryCurrency: string;
}

export interface CreateModeratorRequest {
  userName: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  fixedMonthlySalary: number;
  salaryCurrency: string;
}

export interface UpdateModeratorRequest {
  fullName: string;
  phoneNumber: string;
  status: string;
  fixedMonthlySalary: number;
  salaryCurrency: string;
}
