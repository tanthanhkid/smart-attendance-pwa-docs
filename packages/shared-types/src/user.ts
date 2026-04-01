import { UserRole } from './enums';

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithEmployeeDto extends UserDto {
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    branchId: string;
    branchName?: string;
    departmentId: string | null;
    departmentName?: string;
  };
}
