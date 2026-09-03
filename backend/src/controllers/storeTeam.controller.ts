import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

function storeIdOf(user: any): number {
  return user.storeOwnerId ?? user.id;
}

export async function inviteEmployee(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body;
    const storeId = storeIdOf(req.user);
    if (req.user!.role !== Role.SELLER && req.user!.role !== Role.ADMIN) {
      throw ApiError.forbidden('Solo el administrador de la tienda puede invitar empleados');
    }
    if (req.user!.role === Role.SELLER && req.user!.storeRole !== 'OWNER' && req.user!.storeRole !== 'ADMIN') {
      throw ApiError.forbidden('Solo el administrador de la tienda puede invitar empleados');
    }
    if (!email) throw ApiError.badRequest('El email del empleado es obligatorio');
    const targetRole = role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw ApiError.notFound('No existe un usuario registrado con ese email');
    if (target.role === Role.ADMIN) throw ApiError.badRequest('No se puede invitar a un administrador del sistema');
    if (target.id === storeId) throw ApiError.badRequest('No podés invitarte a vos mismo');

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        role: Role.SELLER,
        storeRole: targetRole,
        storeOwnerId: storeId,
        storeName: req.user!.storeName || 'Tienda',
        storeDescription: req.user!.storeDescription,
        isApproved: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, storeRole: true, storeOwnerId: true },
    });

    return created(res, updated);
  } catch (e) { next(e); }
}

export async function searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? '').trim();
    const storeId = storeIdOf(req.user);
    if (req.user!.role !== Role.SELLER && req.user!.role !== Role.ADMIN) {
      throw ApiError.forbidden('Solo el administrador de la tienda puede invitar empleados');
    }
    if (q.length < 2) return ok(res, []);

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.CUSTOMER, Role.SELLER] },
        // Libres: sin tienda asignada como empleado (storeOwnerId nulo) y distintos del dueño actual
        storeOwnerId: null,
        NOT: { id: storeId },
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      orderBy: { firstName: 'asc' },
    });
    return ok(res, users);
  } catch (e) { next(e); }
}

export async function listEmployees(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = storeIdOf(req.user);
    const employees = await prisma.user.findMany({
      where: { storeOwnerId: storeId, storeRole: { in: ['ADMIN', 'EMPLOYEE'] } },
      select: { id: true, email: true, firstName: true, lastName: true, storeRole: true, storeOwnerId: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return ok(res, employees);
  } catch (e) { next(e); }
}

export async function updateEmployeeRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const employeeId = Number(req.params.id);
    const storeId = storeIdOf(req.user);
    if (req.user!.role === Role.SELLER && req.user!.storeRole !== 'OWNER') {
      throw ApiError.forbidden('Solo el dueño de la tienda puede cambiar roles');
    }
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee || employee.storeOwnerId !== storeId) {
      throw ApiError.notFound('Empleado no encontrado en tu tienda');
    }
    const { role } = req.body;
    if (!['ADMIN', 'EMPLOYEE'].includes(role)) throw ApiError.badRequest('Rol inválido');
    const updated = await prisma.user.update({
      where: { id: employeeId },
      data: { storeRole: role },
      select: { id: true, email: true, storeRole: true },
    });
    return ok(res, updated);
  } catch (e) { next(e); }
}

export async function removeEmployee(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const employeeId = Number(req.params.id);
    const storeId = storeIdOf(req.user);
    if (req.user!.role === Role.SELLER && req.user!.storeRole !== 'OWNER') {
      throw ApiError.forbidden('Solo el dueño de la tienda puede quitar empleados');
    }
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee || employee.storeOwnerId !== storeId) {
      throw ApiError.notFound('Empleado no encontrado en tu tienda');
    }
    await prisma.user.update({
      where: { id: employeeId },
      data: { storeOwnerId: null, storeRole: null, isApproved: false },
    });
    return ok(res, { message: 'Empleado removido de la tienda' });
  } catch (e) { next(e); }
}
