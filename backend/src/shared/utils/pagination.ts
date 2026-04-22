import { PaginationMeta } from '../types';

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface OffsetPaginationOptions {
  page?: number;
  limit?: number;
}

export const parseCursorPagination = (query: CursorPaginationOptions) => {
  const limit = Math.min(Number(query.limit) || 20, 50);
  const cursor = query.cursor || null;
  return { limit, cursor };
};

export const parseOffsetPagination = (query: OffsetPaginationOptions) => {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
};

export const buildCursorMeta = <T extends { _id: { toString(): string } }>(
  docs: T[],
  limit: number
): PaginationMeta => {
  const hasMore = docs.length === limit;
  const cursor = hasMore ? docs[docs.length - 1]._id.toString() : undefined;
  return { hasMore, cursor };
};

export const buildOffsetMeta = (total: number, page: number, limit: number): PaginationMeta => {
  return {
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
};
