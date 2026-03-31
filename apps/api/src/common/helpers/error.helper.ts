import { Logger } from '@nestjs/common';

const logger = new Logger('ErrorHelper');

export interface SanitizedError {
    message: string;
    technicalDetails: string;
    code: number;
}

/**
 * Sanitizes raw error objects/strings to prevent leaking sensitive information
 * such as API keys, internal endpoints, or specific provider failure messages.
 */
export function sanitizeError(error: any): SanitizedError {
    const rawError = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

    const sensitivePatterns = [
        /(api[_-]?key[:=]\s*)['"]?([a-zA-Z0-9_\-]{10,})['"]?/gi,
        /(bearer\s+)([a-zA-Z0-9.\-_]{20,})/gi,
        /(https?:\/\/)([a-zA-Z0-9.\-_/]+)/gi,
        /([a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,5})/gi,
        /(api[_-]?key)/gi,
    ];

    let technicalDetails = rawError;

    sensitivePatterns.forEach(pattern => {
        technicalDetails = technicalDetails.replace(pattern, (match, prefix) => `${prefix}[REDACTED]`);
    });

    let message = "An unexpected error occurred while processing your request.";
    let code = 500;

    const lowerError = rawError.toLowerCase();

    if (lowerError.includes('429') || lowerError.includes('quota') || lowerError.includes('rate limit')) {
        message = "Rate limit reached. Your AI provider is currently throttled. Please wait a moment for the limits to reset.";
        code = 429;
    } else if (lowerError.includes('401') || lowerError.includes('invalid api key') || lowerError.includes('auth')) {
        message = "Authentication failure with the AI provider. Please verify your API key in settings.";
        code = 401;
    } else if (lowerError.includes('timeout') || lowerError.includes('deadline')) {
        message = "The request timed out. The AI provider took too long to respond. Please try again.";
        code = 504;
    } else if (lowerError.includes('prisma') || lowerError.includes('database') || lowerError.includes('unique constraint')) {
        message = "A database error occurred. We could not save or retrieve the required information.";
        code = 500;
        technicalDetails = "Internal Database Error [Obfuscated]";
    }

    return {
        message,
        technicalDetails: technicalDetails.slice(0, 500),
        code
    };
}
