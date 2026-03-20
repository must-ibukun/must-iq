// ============================================================
// Auth Guard — Validates JWT on every protected route
// Extracts user + role from token payload
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { JWTPayload } from "@must-iq/shared-types";
import { PrismaService } from "@must-iq/db";

export const IS_PUBLIC = "isPublic";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const payload: JWTPayload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Verify user actually exists in DB (essential after DB resets)
      const userExists = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true }
      });

      if (!userExists) {
        throw new UnauthorizedException("User no longer exists. Please log in again.");
      }

      // Attach user to request — available in all controllers
      request.user = payload;
    } catch (e: any) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Invalid or expired token");
    }

    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : null;
  }
}
