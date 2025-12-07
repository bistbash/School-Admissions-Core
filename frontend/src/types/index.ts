export interface Soldier {
  id: number;
  personalNumber: string;
  name: string;
  type: 'CONSCRIPT' | 'PERMANENT';
  departmentId: number;
  roleId?: number;
  isCommander: boolean;
  department?: Department;
  role?: Role;
}

export interface Department {
  id: number;
  name: string;
  soldiers?: Soldier[];
}

export interface Role {
  id: number;
  name: string;
  soldiers?: Soldier[];
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
}

export interface SelectOption {
  value: number | string;
  label: string;
}

