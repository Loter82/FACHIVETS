import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Внутрішня помилка сервера' };

    if (status >= 500) {
      const req = ctx.getRequest<{ method?: string; url?: string }>();
      const where = `${req?.method ?? '?'} ${req?.url ?? '?'}`;
      if (exception instanceof Error) {
        this.logger.error(`${where} → ${exception.name}: ${exception.message}`, exception.stack);
      } else {
        this.logger.error(`${where} → non-Error thrown: ${JSON.stringify(exception)}`);
      }
    }

    const body =
      typeof payload === 'string'
        ? { statusCode: status, message: payload }
        : { statusCode: status, ...(payload as object) };

    response.status(status).json(body);
  }
}
