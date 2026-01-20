/**
 * User Service
 *
 * Handles user account creation and password management.
 */

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

interface CreateUserFromJoinRequestParams {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  jobTitle: string;
}

interface CreateUserResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  temporaryPassword: string;
}

/**
 * Generate a secure temporary password
 * Format: 3 letters + 4 numbers + 3 letters (e.g., Abc2345Xyz)
 */
function generateTemporaryPassword(): string {
  // Exclude confusing characters (0, O, l, 1, I)
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";

  let password = "";
  for (let i = 0; i < 3; i++)
    password += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++)
    password += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 0; i < 3; i++)
    password += letters[Math.floor(Math.random() * letters.length)];

  return password;
}

/**
 * Create a new user account from an approved join request
 */
export async function createUserFromJoinRequest(
  params: CreateUserFromJoinRequestParams
): Promise<CreateUserResult> {
  const { email, firstName, lastName, organizationId, jobTitle } = params;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error(`User with email ${email} already exists`);
  }

  // Generate temporary password
  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

  // Create the user with ANSP_ADMIN role (organization focal point)
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash: hashedPassword,
      role: UserRole.ANSP_ADMIN,
      organizationId,
      title: jobTitle,
      isActive: true,
      emailVerified: new Date(), // Auto-verify since email is valid from application
      mustChangePassword: true, // Force password change on first login
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(
    `✅ Created user account for ${email} (${firstName} ${lastName}) as ANSP_ADMIN`
  );

  return {
    user,
    temporaryPassword,
  };
}

/**
 * Check if user needs to change password (for login flow)
 */
export async function checkMustChangePassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true },
  });
  return user?.mustChangePassword ?? false;
}

/**
 * Update password and clear mustChangePassword flag
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashedPassword,
      mustChangePassword: false,
    },
  });
}
