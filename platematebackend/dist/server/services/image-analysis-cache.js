import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
export class ImageAnalysisCache {
    constructor(config = {}) {
        this.cache = new Map();
        this.accessLock = Promise.resolve();
        // Default configuration
        this.config = {
            maxSize: 1000,
            ttlHours: 36, // 36 hours default
            enableFilePersistence: true,
            persistenceFile: 'cache/image-analysis-cache.json',
            cleanupIntervalMinutes: 60, // Clean up every hour
            ...config
        };
        // Initialize statistics
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            currentSize: 0,
            maxSize: this.config.maxSize,
            totalEvictions: 0
        };
        // Start periodic cleanup
        this.startCleanupTimer();
        // Load cache from disk if persistence is enabled
        if (this.config.enableFilePersistence) {
            this.loadFromDisk().catch(error => {
                console.warn('Failed to load cache from disk:', error.message);
            });
        }
        console.log(`📦 ImageAnalysisCache initialized: maxSize=${this.config.maxSize}, ttl=${this.config.ttlHours}h, persistence=${this.config.enableFilePersistence}`);
    }
    /**
     * Generate SHA-256 hash of image file content
     */
    async generateImageHash(imagePath) {
        try {
            const imageBuffer = await fs.readFile(imagePath);
            const hash = createHash('sha256').update(imageBuffer).digest('hex');
            return hash;
        }
        catch (error) {
            throw new Error(`Failed to generate image hash: ${error.message}`);
        }
    }
    /**
     * Get cached analysis result for an image
     */
    async get(imagePath) {
        return this.withLock(async () => {
            this.stats.totalRequests++;
            try {
                const imageHash = await this.generateImageHash(imagePath);
                const entry = this.cache.get(imageHash);
                if (!entry) {
                    this.stats.cacheMisses++;
                    this.updateHitRate();
                    console.log(`📦 Cache MISS for hash: ${imageHash.substring(0, 12)}...`);
                    return null;
                }
                // Check if entry has expired
                const now = Date.now();
                const ttlMs = this.config.ttlHours * 60 * 60 * 1000;
                if (now - entry.timestamp > ttlMs) {
                    console.log(`📦 Cache entry EXPIRED for hash: ${imageHash.substring(0, 12)}... (age: ${Math.round((now - entry.timestamp) / (60 * 60 * 1000))}h)`);
                    this.cache.delete(imageHash);
                    this.stats.cacheMisses++;
                    this.updateHitRate();
                    return null;
                }
                // Update access statistics
                entry.accessCount++;
                entry.lastAccessed = now;
                this.stats.cacheHits++;
                this.updateHitRate();
                console.log(`📦 Cache HIT for hash: ${imageHash.substring(0, 12)}... (accessed ${entry.accessCount} times)`);
                // Create a copy of the analysis with the correct image path
                const cachedAnalysis = {
                    ...entry.analysis,
                    imageUrl: imagePath // Update to current image path
                };
                return cachedAnalysis;
            }
            catch (error) {
                console.error('Cache get error:', error.message);
                this.stats.cacheMisses++;
                this.updateHitRate();
                return null;
            }
        });
    }
    /**
     * Store analysis result in cache
     */
    async set(imagePath, analysis) {
        return this.withLock(async () => {
            try {
                const imageHash = await this.generateImageHash(imagePath);
                const now = Date.now();
                const entry = {
                    imageHash,
                    analysis: { ...analysis }, // Create a copy
                    timestamp: now,
                    accessCount: 1,
                    lastAccessed: now
                };
                // Check if we need to evict entries
                if (this.cache.size >= this.config.maxSize) {
                    this.evictOldestEntries(1);
                }
                this.cache.set(imageHash, entry);
                this.updateStats();
                console.log(`📦 Cache SET for hash: ${imageHash.substring(0, 12)}... (size: ${this.cache.size}/${this.config.maxSize})`);
                // Persist to disk if enabled
                if (this.config.enableFilePersistence) {
                    await this.saveToDisk();
                }
            }
            catch (error) {
                console.error('Cache set error:', error.message);
                // Don't throw error to avoid breaking the analysis pipeline
            }
        });
    }
    /**
     * Check if analysis exists in cache (without retrieving it)
     */
    async has(imagePath) {
        return this.withLock(async () => {
            try {
                const imageHash = await this.generateImageHash(imagePath);
                const entry = this.cache.get(imageHash);
                if (!entry)
                    return false;
                // Check if entry has expired
                const now = Date.now();
                const ttlMs = this.config.ttlHours * 60 * 60 * 1000;
                if (now - entry.timestamp > ttlMs) {
                    this.cache.delete(imageHash);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('Cache has error:', error.message);
                return false;
            }
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }
    /**
     * Clear all cache entries
     */
    async clear() {
        return this.withLock(async () => {
            this.cache.clear();
            this.updateStats();
            console.log('📦 Cache cleared');
            if (this.config.enableFilePersistence) {
                await this.saveToDisk();
            }
        });
    }
    /**
     * Manually clean up expired entries
     */
    async cleanup() {
        return this.withLock(async () => {
            const now = Date.now();
            const ttlMs = this.config.ttlHours * 60 * 60 * 1000;
            let removedCount = 0;
            for (const [hash, entry] of Array.from(this.cache.entries())) {
                if (now - entry.timestamp > ttlMs) {
                    this.cache.delete(hash);
                    removedCount++;
                }
            }
            if (removedCount > 0) {
                this.updateStats();
                console.log(`📦 Cache cleanup: removed ${removedCount} expired entries`);
                if (this.config.enableFilePersistence) {
                    await this.saveToDisk();
                }
            }
            return removedCount;
        });
    }
    /**
     * Destroy cache and cleanup resources
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.cache.clear();
        console.log('📦 Cache destroyed');
    }
    // --- Private Methods ---
    /**
     * Thread-safe access control
     */
    async withLock(operation) {
        const currentLock = this.accessLock;
        let resolveLock;
        this.accessLock = new Promise(resolve => {
            resolveLock = resolve;
        });
        try {
            await currentLock;
            return await operation();
        }
        finally {
            resolveLock();
        }
    }
    /**
     * Update cache statistics
     */
    updateStats() {
        this.stats.currentSize = this.cache.size;
        this.updateHitRate();
        if (this.cache.size > 0) {
            const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
            this.stats.oldestEntry = Math.min(...timestamps);
            this.stats.newestEntry = Math.max(...timestamps);
        }
        else {
            this.stats.oldestEntry = undefined;
            this.stats.newestEntry = undefined;
        }
    }
    /**
     * Update hit rate calculation
     */
    updateHitRate() {
        if (this.stats.totalRequests > 0) {
            this.stats.hitRate = Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100);
        }
        else {
            this.stats.hitRate = 0;
        }
    }
    /**
     * Evict oldest entries when cache is full
     */
    evictOldestEntries(count) {
        const entries = Array.from(this.cache.entries());
        // Sort by last accessed time (oldest first)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        for (let i = 0; i < count && i < entries.length; i++) {
            const [hash] = entries[i];
            this.cache.delete(hash);
            this.stats.totalEvictions++;
        }
        console.log(`📦 Cache evicted ${count} oldest entries`);
    }
    /**
     * Start periodic cleanup timer
     */
    startCleanupTimer() {
        const intervalMs = this.config.cleanupIntervalMinutes * 60 * 1000;
        this.cleanupTimer = setInterval(async () => {
            try {
                await this.cleanup();
            }
            catch (error) {
                console.error('Periodic cache cleanup failed:', error.message);
            }
        }, intervalMs);
    }
    /**
     * Save cache to disk for persistence
     */
    async saveToDisk() {
        if (!this.config.persistenceFile)
            return;
        try {
            const cacheDir = path.dirname(this.config.persistenceFile);
            await fs.mkdir(cacheDir, { recursive: true });
            const cacheData = {
                entries: Array.from(this.cache.entries()),
                stats: this.stats,
                timestamp: Date.now()
            };
            await fs.writeFile(this.config.persistenceFile, JSON.stringify(cacheData, null, 2));
        }
        catch (error) {
            console.error('Failed to save cache to disk:', error.message);
        }
    }
    /**
     * Load cache from disk
     */
    async loadFromDisk() {
        if (!this.config.persistenceFile)
            return;
        try {
            const data = await fs.readFile(this.config.persistenceFile, 'utf-8');
            const cacheData = JSON.parse(data);
            // Restore cache entries
            for (const [hash, entry] of cacheData.entries) {
                // Check if entry is still valid
                const now = Date.now();
                const ttlMs = this.config.ttlHours * 60 * 60 * 1000;
                if (now - entry.timestamp <= ttlMs) {
                    this.cache.set(hash, entry);
                }
            }
            // Restore relevant stats
            this.stats.totalEvictions = cacheData.stats.totalEvictions || 0;
            this.updateStats();
            console.log(`📦 Cache loaded from disk: ${this.cache.size} entries restored`);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to load cache from disk:', error.message);
            }
        }
    }
}
// Export singleton instance
export const imageAnalysisCache = new ImageAnalysisCache({
    maxSize: 1000,
    ttlHours: 36,
    enableFilePersistence: true,
    persistenceFile: path.join(process.cwd(), 'cache', 'image-analysis-cache.json'),
    cleanupIntervalMinutes: 60
});
