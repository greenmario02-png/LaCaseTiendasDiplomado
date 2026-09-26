import { prisma } from '../config/database';

export async function listUniversities(department?: string) {
  return prisma.university.findMany({
    where: {
      isActive: true,
      ...(department ? { city: { department } } : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      city: { select: { id: true, name: true, department: true } },
      categories: { select: { slug: true }, take: 1 },
    },
  });
}

export async function adminListUniversities() {
  return prisma.university.findMany({
    orderBy: { name: 'asc' },
    include: { city: { select: { id: true, name: true, department: true } }, _count: { select: { categories: true } } },
  });
}

export async function adminCreateUniversity(data: { name: string; cityId: number }) {
  return prisma.university.create({ data });
}

export async function adminUpdateUniversity(id: number, data: Partial<{ name: string; cityId: number; isActive: boolean }>) {
  return prisma.university.update({ where: { id }, data });
}
