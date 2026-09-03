import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { env } from '../config/env';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface SellerRegisterInput extends RegisterInput {
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  country: string;
  locationCity: string;
  locationState: string;
  locationPostalCode?: string;
}

export async function registerUser(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw ApiError.conflict('Ya existe un usuario con ese email');

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: Role.CUSTOMER,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      gamerCoins: true,
      createdAt: true,
    },
  });

  // Código de invitación propio (para ganar monedas invitando a otros)
  const inviteCode = `INV-${user.id}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await prisma.user.update({ where: { id: user.id }, data: { inviteCode } });

  return { ...user, inviteCode };
}

export async function registerSeller(input: SellerRegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw ApiError.conflict('Ya existe un usuario con ese email');

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: Role.SELLER,
      storeName: input.storeName,
      storeDescription: input.storeDescription,
      storeCategory: input.storeCategory,
      country: input.country,
      locationCity: input.locationCity,
      locationState: input.locationState,
      locationPostalCode: input.locationPostalCode ?? null,
      isApproved: false,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      storeName: true,
      isApproved: true,
      createdAt: true,
    },
  });

  // Código de invitación propio (para ganar monedas invitando a otros)
  const inviteCode = `INV-${user.id}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await prisma.user.update({ where: { id: user.id }, data: { inviteCode } });

  return { ...user, inviteCode };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Credenciales inválidas');

  if (!user.isActive) throw ApiError.forbidden('Usuario bloqueado');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  // RF-01.4: incluir forumProfile si el usuario ya lo tiene (sin romper el shape)
  const forumProfile = await prisma.forumProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, forumUsername: true, karma: true, tag: true, city: true },
  });

  return {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      storeName: user.storeName,
      isApproved: user.isApproved,
      gamerCoins: user.gamerCoins,
      inviteCode: user.inviteCode,
      ...(forumProfile ? { forumProfile } : {}),
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload: { userId: number };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token inválido');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) throw ApiError.unauthorized('Refresh token no válido');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) throw ApiError.unauthorized('Usuario no activo');

  return signAccessToken({ userId: user.id, role: user.role });
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken) },
    data: { revoked: true },
  });
}

export async function findUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      bio: true,
      role: true,
      storeName: true,
      storeDescription: true,
      storeLogo: true,
      storeBanner: true,
      country: true,
      locationCity: true,
      locationState: true,
      locationPostalCode: true,
      latitude: true,
      longitude: true,
      locationVerified: true,
      youtubeUrl: true,
      tiktokUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappPhone: true,
      rating: true,
      totalSales: true,
      isVerified: true,
      isApproved: true,
      storeRole: true,
      storeOwnerId: true,
      gamerCoins: true,
      inviteCode: true,
      createdAt: true,
      forumProfile: {
        select: { id: true, forumUsername: true, karma: true, karmaSpent: true, tag: true, city: true },
      },
    },
  });
}

export function getRefreshExpiry() {
  return new Date(Date.now() + 7 * 86400000);
}

export async function verifyPassword(userId: number, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export { env as authEnv };
