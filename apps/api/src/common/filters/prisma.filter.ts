import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@must-iq/db';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let message = 'Internal database error';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    // Prisma Error Codes: https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        statusCode = HttpStatus.CONFLICT;
        message = `Unique constraint failed on the fields: ${(exception.meta as any)?.target || 'unknown'}`;
        break;
      case 'P2003': // Foreign key constraint violation
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation. The referenced record does not exist.';
        break;
      case 'P2025': // Record not found
        statusCode = HttpStatus.NOT_FOUND;
        message = 'The requested record was not found.';
        break;
      default:
        message = `Database Error: ${exception.message}`;
    }

    if (response.headersSent) {
      this.logger.error(`Prisma error occurred after headers were sent: ${exception.message}`, exception.stack);
      return ctx.getResponse().end();
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: 'PrismaError',
      code: exception.code,
    });
  }
}
