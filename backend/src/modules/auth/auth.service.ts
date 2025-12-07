import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword, generateToken, JwtPayload } from '../../lib/auth';
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from '../../lib/errors';

export interface CreateUserData {
  email: string;
  temporaryPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    personalNumber?: string | null;
    name?: string | null;
    email: string;
    type?: string | null;
    departmentId?: number | null;
    roleId?: number | null;
    isCommander: boolean;
    isAdmin: boolean;
    needsProfileCompletion: boolean;
  };
}

export interface ProfileCompletionData {
  personalNumber: string;
  name: string;
  type: 'CONSCRIPT' | 'PERMANENT';
  departmentId: number;
  roleId?: number;
  isCommander?: boolean;
  newPassword: string; // User must change temporary password
}

export class AuthService {
  /**
   * Create a new user (Admin only)
   * Admin creates user with email and temporary password
   * User will complete profile on first login
   */
  async createUser(data: CreateUserData, createdBy: number) {
    // Check if email already exists
    const existingEmail = await prisma.soldier.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Check if this is the first user - if so, make them admin and approve automatically
    const userCount = await prisma.soldier.count();
    const isFirstUser = userCount === 0;

    // Hash temporary password
    const hashedPassword = await hashPassword(data.temporaryPassword);

    // Create soldier with minimal data - user will complete profile on first login
    // departmentId will be set by user during profile completion
    const soldier = await prisma.soldier.create({
      data: {
        email: data.email,
        password: hashedPassword,
        departmentId: null, // Will be set during profile completion
        isAdmin: isFirstUser, // First user becomes admin automatically
        approvalStatus: 'CREATED', // User created by admin, needs to complete profile
        needsProfileCompletion: true, // User must complete profile on first login
        // personalNumber, name, type, departmentId will be filled on first login
      },
      include: {
        department: true,
        role: true,
      },
    });

    // If this is the first user (admin), automatically approve and add to trusted users
    if (isFirstUser) {
      await prisma.soldier.update({
        where: { id: soldier.id },
        data: {
          approvalStatus: 'APPROVED',
          needsProfileCompletion: false, // First admin doesn't need profile completion
        },
      });

      try {
        const { addTrustedUser } = await import('../../lib/trustedUsers');
        await addTrustedUser({
          userId: soldier.id,
          email: soldier.email,
          name: `Admin (${soldier.email})`,
          reason: 'First registered user - automatic admin',
          createdBy: soldier.id,
        });
        console.log(`✅ First user created as admin: ${soldier.email} (ID: ${soldier.id})`);
      } catch (error) {
        console.error('Failed to add admin to trusted users:', error);
      }
    }

    return {
      id: soldier.id,
      email: soldier.email,
      approvalStatus: soldier.approvalStatus,
      needsProfileCompletion: soldier.needsProfileCompletion,
      createdAt: soldier.createdAt,
    };
  }

  /**
   * Login a soldier/user
   * SECURITY: 
   * - CREATED users can login only to complete their profile
   * - APPROVED users can login normally
   * - PENDING/REJECTED users cannot login
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

    // Verify password first
    const isPasswordValid = await comparePassword(data.password, soldier.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // SECURITY: Check approval status
    // CREATED users can login to complete profile
    // REJECTED users can login again if they need to re-enter data (needsProfileCompletion = true)
    if (soldier.approvalStatus === 'CREATED') {
      // Allow login for profile completion
    } else if (soldier.approvalStatus === 'APPROVED') {
      // Approved users can login normally
    } else if (soldier.approvalStatus === 'REJECTED' && soldier.needsProfileCompletion) {
      // REJECTED users can login again to re-enter data
      // After re-entering, status will change back to PENDING
    } else if (soldier.approvalStatus === 'PENDING') {
      throw new UnauthorizedError('Your account is pending admin approval. Please wait for approval before logging in.');
    } else if (soldier.approvalStatus === 'REJECTED') {
      throw new UnauthorizedError('Your account registration was rejected. Please contact an administrator.');
    } else {
      throw new UnauthorizedError('Your account is not approved. Please contact an administrator.');
    }

    // Generate token (use email as personalNumber if not set yet)
    const token = generateToken({
      userId: soldier.id,
      personalNumber: soldier.personalNumber || soldier.email,
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
        isAdmin: soldier.isAdmin,
        needsProfileCompletion: soldier.needsProfileCompletion,
      },
    };
  }

  /**
   * Complete user profile (called on first login)
   * User must provide all required information and change temporary password
   */
  async completeProfile(userId: number, data: ProfileCompletionData) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    // Allow profile completion if:
    // 1. needsProfileCompletion is true (first time or after rejection)
    // 2. Status is REJECTED (user needs to re-enter data)
    if (!soldier.needsProfileCompletion && soldier.approvalStatus !== 'REJECTED') {
      throw new ValidationError('Profile already completed');
    }

    // Check if personal number already exists (if provided)
    if (data.personalNumber) {
      const existingPersonalNumber = await prisma.soldier.findUnique({
        where: { personalNumber: data.personalNumber },
      });
      if (existingPersonalNumber && existingPersonalNumber.id !== userId) {
        throw new ConflictError('Personal number already registered');
      }
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

    // Hash new password
    const hashedPassword = await hashPassword(data.newPassword);

    // Update soldier with profile information
    // If user was REJECTED, change status back to PENDING after re-entering data
    const updateData: any = {
        personalNumber: data.personalNumber,
        name: data.name,
        type: data.type,
      departmentId: data.departmentId,
        roleId: data.roleId,
        isCommander: data.isCommander || false,
        password: hashedPassword, // Update to new password
        needsProfileCompletion: false, // Profile is now complete
    };
    
    // If status is CREATED or REJECTED, change to PENDING after profile completion
    if (soldier.approvalStatus === 'CREATED' || soldier.approvalStatus === 'REJECTED') {
      updateData.approvalStatus = 'PENDING';
    }
    
    const updated = await prisma.soldier.update({
      where: { id: userId },
      data: updateData,
      include: {
        department: true,
        role: true,
      },
    });

    return {
      id: updated.id,
      personalNumber: updated.personalNumber,
      name: updated.name,
      email: updated.email,
      type: updated.type,
      departmentId: updated.departmentId,
      roleId: updated.roleId,
      isCommander: updated.isCommander,
      needsProfileCompletion: updated.needsProfileCompletion,
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
        isAdmin: true,
        approvalStatus: true,
        needsProfileCompletion: true,
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

  /**
   * Get all users with CREATED status (for admin review)
   * These are users created by admin who haven't completed their profile yet
   */
  async getCreatedUsers() {
    return prisma.soldier.findMany({
      where: {
        approvalStatus: 'CREATED',
      },
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        approvalStatus: true,
        needsProfileCompletion: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        role: true,
        // Explicitly exclude password
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get all pending users (for admin approval)
   * Includes users who completed profile but are waiting for approval
   */
  async getPendingUsers() {
    return prisma.soldier.findMany({
      where: {
        approvalStatus: 'PENDING',
      },
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        approvalStatus: true,
        needsProfileCompletion: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        role: true,
        // Explicitly exclude password
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Approve a user (admin only)
   */
  async approveUser(userId: number, approvedBy: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    if (soldier.approvalStatus !== 'PENDING') {
      throw new ValidationError(`User is not pending approval. Current status: ${soldier.approvalStatus}`);
    }

    const updated = await prisma.soldier.update({
      where: { id: userId },
      data: {
        approvalStatus: 'APPROVED',
      },
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        isAdmin: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        role: true,
        // Explicitly exclude password
      },
    });

    return updated;
  }

  /**
   * Reject a user (admin only)
   * When rejecting, reset needsProfileCompletion so user can re-enter data
   */
  async rejectUser(userId: number, rejectedBy: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    if (soldier.approvalStatus !== 'PENDING') {
      throw new ValidationError(`User is not pending approval. Current status: ${soldier.approvalStatus}`);
    }

    const updated = await prisma.soldier.update({
      where: { id: userId },
      data: {
        approvalStatus: 'REJECTED',
        needsProfileCompletion: true, // Reset so user can re-enter data
      },
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        isAdmin: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        role: true,
        // Explicitly exclude password
      },
    });

    return updated;
  }

  /**
   * Reset user password (admin only)
   * Sets a new temporary password for the user
   */
  async resetUserPassword(userId: number, newPassword: string, resetBy: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and mark as needing profile completion (user should change password)
    const updated = await prisma.soldier.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        needsProfileCompletion: true, // Force user to change password on next login
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return updated;
  }

  /**
   * Update user details (admin only)
   */
  async updateUser(userId: number, data: {
    name?: string;
    personalNumber?: string;
    email?: string;
    type?: 'CONSCRIPT' | 'PERMANENT';
    departmentId?: number;
    roleId?: number | null;
    isCommander?: boolean;
    isAdmin?: boolean;
    approvalStatus?: 'CREATED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  }, updatedBy: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    // Check for email conflicts
    if (data.email && data.email !== soldier.email) {
      const existingEmail = await prisma.soldier.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictError('Email already registered');
      }
    }

    // Check for personal number conflicts
    if (data.personalNumber && data.personalNumber !== soldier.personalNumber) {
      const existingPersonalNumber = await prisma.soldier.findUnique({
        where: { personalNumber: data.personalNumber },
      });
      if (existingPersonalNumber) {
        throw new ConflictError('Personal number already registered');
      }
    }

    // Validate department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        throw new NotFoundError('Department');
      }
    }

    // Validate role if provided
    if (data.roleId !== undefined && data.roleId !== null) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });
      if (!role) {
        throw new NotFoundError('Role');
      }
    }

    // Build update data - only include defined fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.personalNumber !== undefined) updateData.personalNumber = data.personalNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.isCommander !== undefined) updateData.isCommander = data.isCommander;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
    if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;

    const updated = await prisma.soldier.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        personalNumber: true,
        name: true,
        email: true,
        type: true,
        departmentId: true,
        roleId: true,
        isCommander: true,
        isAdmin: true,
        approvalStatus: true,
        needsProfileCompletion: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        role: true,
        // Explicitly exclude password
      },
    });

    return updated;
  }

  /**
   * Delete a user (admin only)
   * Admin can delete users at any time, regardless of their status
   */
  async deleteUser(userId: number, deletedBy: number) {
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
      },
    });

    if (!soldier) {
      throw new NotFoundError('User');
    }

    // Prevent admin from deleting themselves
    if (soldier.id === deletedBy) {
      throw new ValidationError('You cannot delete your own account');
    }

    // Prevent deleting the last admin
    if (soldier.isAdmin) {
      const adminCount = await prisma.soldier.count({
        where: { isAdmin: true },
      });
      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user');
      }
    }

    // Delete the user
    await prisma.soldier.delete({
      where: { id: userId },
    });

    return {
      id: soldier.id,
      email: soldier.email,
      deleted: true,
    };
  }
}

