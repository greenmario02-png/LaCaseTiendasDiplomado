import { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ data });
}

export function paginated<T>(res: Response, data: T[], total: number, page: number, limit: number) {
  return res.json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
