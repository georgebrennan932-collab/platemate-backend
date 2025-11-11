// AI Provider Types and Interfaces
export class AIProvider {
    constructor() {
        this.requestCount = 0;
        this.errorCount = 0;
    }
    getStatus() {
        return {
            name: this.name,
            available: this.isAvailable(),
            lastError: this.lastError,
            lastSuccess: this.lastSuccess,
            requestCount: this.requestCount,
            errorCount: this.errorCount
        };
    }
    isAvailable() {
        // Provider is unavailable if it has recent rate limit errors
        if (this.lastError?.isRateLimit) {
            const retryAfter = this.lastError.retryAfter || 60;
            const canRetryAt = new Date(this.lastError.timestamp + retryAfter * 1000);
            return new Date() > canRetryAt;
        }
        // Provider is unavailable if error rate is too high
        const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
        return errorRate < 0.8; // Available if less than 80% error rate
    }
    recordSuccess() {
        this.requestCount++;
        this.lastSuccess = new Date();
        this.lastError = undefined;
    }
    recordError(error) {
        this.requestCount++;
        this.errorCount++;
        this.lastError = {
            ...error,
            timestamp: Date.now()
        };
    }
    createError(code, message, isRateLimit = false, isTemporary = true, retryAfter) {
        return {
            code,
            message,
            isRateLimit,
            isTemporary,
            retryAfter
        };
    }
}
