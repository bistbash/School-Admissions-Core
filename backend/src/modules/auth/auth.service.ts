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

    // Check if this is the first user - if so, make them admin
    const userCount = await prisma.soldier.count();
    const isFirstUser = userCount === 0;

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
        isAdmin: isFirstUser, // First user becomes admin automatically
      },
      include: {
        department: true,
        role: true,
      },
    });

    // If this is the first user (admin), automatically add them to trusted users whitelist
    if (isFirstUser) {
      try {
        const { addTrustedUser } = await import('../../lib/trustedUsers');
        
        // Add admin to trusted users whitelist by userId and email
        await addTrustedUser({
          userId: soldier.id,
          email: soldier.email,
          name: `${soldier.name} (Admin)`,
          reason: 'First registered user - automatic admin',
          createdBy: soldier.id,
        });
        
        console.log(`✅ First user registered as admin: ${soldier.email} (ID: ${soldier.id})`);
        console.log(`✅ Admin automatically added to trusted users whitelist`);
      } catch (error) {
        // Log but don't fail registration if trusted user creation fails
        console.error('Failed to add admin to trusted users:', error);
      }
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
        isAdmin: soldier.isAdmin, // Include admin status
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
        isAdmin: soldier.isAdmin, // Include admin status
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

