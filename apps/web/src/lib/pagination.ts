
export const PER_PAGE = 30;

/**
 * Slices an array based on the given page number and default per-page size.
 */
export function paginate<T>(arr: T[], page: number, perPage: number = PER_PAGE): T[] {
    if (!arr) return [];
    return arr.slice((page - 1) * perPage, page * perPage);
}

/**
 * Calculates the total number of pages based on array length and per-page size.
 */
export function totalPages(arr: any[], perPage: number = PER_PAGE): number {
    if (!arr) return 1;
    return Math.max(1, Math.ceil(arr.length / perPage));
}
