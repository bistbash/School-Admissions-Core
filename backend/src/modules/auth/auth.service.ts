import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword, generateToken, JwtPayload } from '../../lib/auth';
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from '../../lib/errors';

export interface RegisterData {
  personalNumber: string;
  name: string;
  email: string;
  password: string;
  type: 'CONSCRIPT' | 'PERMANENT';
  departmentId: number;
  roleId?: number;
  isCommander?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    personalNumber: string;
    name: string;
    email: string;
    type: string;
    departmentId: number;
    roleId?: number;
    isCommander: boolean;
  };
}

export class AuthService {
  /**
   * Register a new soldier/user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if email already exists
    const existingEmail = await prisma.soldier.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Check if personal number already exists
    const existingPersonalNumber = await prisma.soldier.findUnique({
      where: { personalNumber: data.personalNumber },
    });
    if (existingPersonalNumber) {
      throw new ConflictError('Personal number already registered');
    }

    // Validate department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      throw new NotFoundError('Department');
    }

    // Validate role if provided
    if (data.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });
      if (!role) {
        throw new NotFoundError('Role');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create soldier
    const soldier = await prisma.soldier.create({
      data: {
        personalNumber: data.personalNumber,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        type: data.type,
        departmentId: data.departmentId,
        roleId: data.roleId,
        isCommander: data.isCommander || false,
      },
      include: {
        department: true,
        role: true,
      },
    });

    // Generate token
    const token = generateToken({
      userId: soldier.id,
      personalNumber: soldier.personalNumber,
      email: soldier.email,
    });

    // Return user data (without password)
    return {
      token,
      user: {
        id: soldier.id,
        personalNumber: soldier.personalNumber,
        name: soldier.name,
        email: soldier.email,
        type: soldier.type,
        departmentId: soldier.departmentId,
        roleId: soldier.roleId || undefined,
        isCommander: soldier.isCommander,
      },
    };
  }

  /**
   * Login a soldier/user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    // Find soldier by email
    const soldier = await prisma.soldier.findUnique({
      where: { email: data.email },
      include: {
        department: true,
        role: true,
      },
    });

    if (!soldier) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, soldier.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: soldier.id,
      personalNumber: soldier.personalNumber,
      email: soldier.email,
    });

    // Return user data (without password)
    return {
      token,
      user: {
        id: soldier.id,
        personalNumber: soldier.personalNumber,
        name: soldier.name,
        email: soldier.email,
        type: soldier.type,
        departmentId: soldier.departmentId,
        roleId: soldier.roleId || undefined,
        isCommander: soldier.isCommander,
      },
    };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        department: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude password
      },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    return soldier;
  }
}

