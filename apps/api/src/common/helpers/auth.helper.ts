import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/auth.interface';

export function requireAdminOrManager(req: AuthenticatedRequest | any): void {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        throw new ForbiddenException('Admin or Manager access required');
    }
}
