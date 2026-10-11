/**
 * TeleHealth Unified Database Layer
 * Supports PostgreSQL connection (when DATABASE_URL is set, e.g., Supabase/Railway)
 * with automatic schema validation, two-way sync, and auto-persisted relational file store.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const { DEFAULT_CATEGORIES, DEFAULT_SOURCES, DEFAULT_KNOWLEDGE } = require('./data/defaultMedicalData');

const DB_FILE = path.join(__dirname, '../database/telehealth_store.json');

class DatabaseService {
    constructor() {
        this.isPg = false;
        this.pgPool = null;
        this.memoryStore = {
            users: [],
            categories: [],
            sources: [],
            knowledge: [],
            knowledge_candidates: [],
            questions: [],
            doctor_questions: [],
            doctor_responses: [],
            validation_logs: []
        };
        this.init();
    }

    async init() {
        if (process.env.DATABASE_URL) {
            try {
                this.pgPool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });

                // Test connection
                const client = await this.pgPool.connect();
                this.isPg = true;
                client.release();
                console.log('[DB] ✅ Connected to PostgreSQL / Supabase Database');

                await this.syncFromPostgreSQL();
                return;
            } catch (err) {
                console.warn('[DB] ⚠️ Failed to connect to PostgreSQL, falling back to local persistent store:', err.message);
                this.isPg = false;
            }
        }

        // Initialize local store
        this.loadLocalStore();
    }

    async syncFromPostgreSQL() {
        if (!this.isPg || !this.pgPool) return;

        try {
            const tables = [
                'categories', 'sources', 'knowledge', 'knowledge_candidates',
                'users', 'questions', 'doctor_questions', 'doctor_responses', 'validation_logs'
            ];

            for (const tbl of tables) {
                try {
                    const res = await this.pgPool.query(`SELECT * FROM ${tbl}`);
                    if (res && res.rows) {
                        this.memoryStore[tbl] = res.rows.map(r => {
                            // Ensure date and JSON fields format cleanly
                            const copy = { ...r };
                            if (copy.created_at instanceof Date) copy.created_at = copy.created_at.toISOString();
                            if (copy.updated_at instanceof Date) copy.updated_at = copy.updated_at.toISOString();
                            return copy;
                        });
                    }
                } catch (tblErr) {
                    // If table doesn't exist yet, ignore
                }
            }

            // If categories or knowledge in Supabase are empty, seed baseline
            if (!this.memoryStore.categories || this.memoryStore.categories.length === 0) {
                console.log('[DB] Seeding baseline data into PostgreSQL...');
                this.seedInitialData();
                await this.syncAllToPostgreSQL();
            }

            this.saveLocalStore();
            console.log('[DB] 🔄 Synchronized data cache with PostgreSQL / Supabase.');
        } catch (e) {
            console.warn('[DB] Error during PostgreSQL sync:', e.message);
            this.loadLocalStore();
        }
    }

    async syncAllToPostgreSQL() {
        if (!this.isPg || !this.pgPool) return;

        try {
            // Seed categories
            for (const cat of this.memoryStore.categories) {
                await this.pgPool.query(
                    `INSERT INTO categories (id, name, slug, description, icon, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (id) DO NOTHING`,
                    [cat.id, cat.name, cat.slug, cat.description, cat.icon || 'stethoscope', cat.created_at || new Date().toISOString()]
                );
            }

            // Seed sources
            for (const src of this.memoryStore.sources) {
                await this.pgPool.query(
                    `INSERT INTO sources (id, name, type, publisher, year, url, is_trusted, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (id) DO NOTHING`,
                    [src.id, src.name, src.type, src.publisher, src.year, src.url, src.is_trusted, src.created_at || new Date().toISOString()]
                );
            }

            // Seed knowledge
            for (const kn of this.memoryStore.knowledge) {
                const pointsStr = typeof kn.important_points === 'string' ? kn.important_points : JSON.stringify(kn.important_points || []);
                await this.pgPool.query(
                    `INSERT INTO knowledge (id, title, topic_keywords, short_answer, important_points, when_to_see_doctor, content_full, category_id, source_id, status, validated_by, validated_at, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                        kn.id, kn.title, kn.topic_keywords, kn.short_answer, pointsStr,
                        kn.when_to_see_doctor, kn.content_full, kn.category_id, kn.source_id,
                        kn.status || 'ACTIVE', kn.validated_by || 'Admin', kn.validated_at || new Date().toISOString(),
                        kn.created_at || new Date().toISOString(), kn.updated_at || new Date().toISOString()
                    ]
                );
            }
        } catch (err) {
            console.warn('[DB] Sync to PostgreSQL warning:', err.message);
        }
    }

    loadLocalStore() {
        const dbDir = path.dirname(DB_FILE);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (fs.existsSync(DB_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                this.memoryStore = Object.assign(this.memoryStore, data);
                // Ensure all default categories exist
                if (this.memoryStore.categories) {
                    DEFAULT_CATEGORIES.forEach(defCat => {
                        if (!this.memoryStore.categories.some(c => c.id === defCat.id)) {
                            this.memoryStore.categories.push({
                                ...defCat,
                                created_at: new Date().toISOString()
                            });
                        }
                    });
                }
                console.log('[DB] Loaded TeleHealth persistent local store from disk');
                return;
            } catch (e) {
                console.error('[DB] Error parsing existing db file, re-initializing seeds:', e.message);
            }
        }

        this.seedInitialData();
        this.saveLocalStore();
    }

    saveLocalStore() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf8');
        } catch (e) {
            console.error('[DB] Failed to save local store to disk:', e.message);
        }
    }

    seedInitialData() {
        console.log('[DB] Seeding baseline clinical knowledge (Rawat Jalan & Gawat Darurat)...');

        const now = new Date().toISOString();
        this.memoryStore.categories = DEFAULT_CATEGORIES.map(c => ({
            ...c,
            created_at: c.created_at || now
        }));

        this.memoryStore.sources = DEFAULT_SOURCES.map(s => ({
            ...s,
            created_at: s.created_at || now
        }));

        this.memoryStore.knowledge = DEFAULT_KNOWLEDGE.map(k => ({
            ...k,
            created_at: k.created_at || now,
            updated_at: k.updated_at || now,
            validated_at: k.validated_at || now
        }));

        this.memoryStore.knowledge_candidates = [];
        this.memoryStore.users = [];
        this.memoryStore.doctor_questions = [];
        this.memoryStore.validation_logs = [];
    }

    // Generic Helper Methods for Collections
    getTable(tableName) {
        if (!this.memoryStore[tableName]) {
            this.memoryStore[tableName] = [];
        }
        return this.memoryStore[tableName];
    }

    find(tableName, filterFn) {
        const table = this.getTable(tableName);
        return filterFn ? table.filter(filterFn) : [...table];
    }

    findById(tableName, id) {
        const table = this.getTable(tableName);
        return table.find(item => String(item.id) === String(id)) || null;
    }

    insert(tableName, data) {
        const table = this.getTable(tableName);
        const maxId = table.reduce((max, item) => (item.id > max ? item.id : max), 0);
        const now = new Date().toISOString();
        const newRecord = {
            id: maxId + 1,
            ...data,
            created_at: data.created_at || now,
            updated_at: now
        };
        table.push(newRecord);
        this.saveLocalStore();

        // Async sync to PostgreSQL if connected
        if (this.isPg && this.pgPool) {
            this.insertToPostgres(tableName, newRecord).catch(e => {
                console.warn(`[DB PG Insert Error (${tableName})]:`, e.message);
            });
        }

        return newRecord;
    }

    async insertToPostgres(tableName, record) {
        const keys = Object.keys(record);
        const columns = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => {
            const val = record[k];
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
        });

        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        await this.pgPool.query(query, values);
    }

    update(tableName, id, updates) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => String(item.id) === String(id));
        if (index === -1) return null;

        const updated = {
            ...table[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        table[index] = updated;
        this.saveLocalStore();

        // Async sync to PostgreSQL if connected
        if (this.isPg && this.pgPool) {
            this.updateToPostgres(tableName, id, updates).catch(e => {
                console.warn(`[DB PG Update Error (${tableName})]:`, e.message);
            });
        }

        return updated;
    }

    async updateToPostgres(tableName, id, updates) {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;

        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const values = keys.map(k => {
            const val = updates[k];
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
        });
        values.push(id);

        const query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length}`;
        await this.pgPool.query(query, values);
    }

    delete(tableName, id) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => String(item.id) === String(id));
        if (index === -1) return false;

        table.splice(index, 1);
        this.saveLocalStore();

        // Async sync to PostgreSQL if connected
        if (this.isPg && this.pgPool) {
            this.pgPool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]).catch(e => {
                console.warn(`[DB PG Delete Error (${tableName})]:`, e.message);
            });
        }

        return true;
    }

    findOrCreateSource(data) {
        if (!data || !data.name) return null;
        const cleanName = data.name.trim();
        const sources = this.find('sources');
        const existing = sources.find(s => (s.name || '').trim().toLowerCase() === cleanName.toLowerCase());
        if (existing) {
            return existing;
        }
        return this.insert('sources', {
            name: cleanName,
            type: data.type || 'JOURNAL',
            publisher: data.publisher || cleanName,
            year: data.year ? Number(data.year) : new Date().getFullYear(),
            url: data.url || null,
            is_trusted: data.is_trusted !== undefined ? data.is_trusted : true
        });
    }

    resetKnowledgeStore(mode = 'DEFAULT', adminUser = 'Super Administrator') {
        const now = new Date().toISOString();
        if (mode === 'CLEAR_ALL') {
            const prevCount = (this.memoryStore.knowledge || []).length;
            this.memoryStore.knowledge = [];
            this.memoryStore.knowledge_candidates = [];
            this.insert('validation_logs', {
                candidate_id: null,
                knowledge_id: null,
                admin_user: adminUser,
                action: 'DATABASE_RESET_CLEARED',
                previous_status: `TOTAL_${prevCount}`,
                new_status: 'EMPTY',
                notes: 'Superadmin mereset & mengosongkan seluruh Knowledge Base dan Candidates.'
            });
            this.saveLocalStore();

            if (this.isPg && this.pgPool) {
                this.pgPool.query('DELETE FROM knowledge; DELETE FROM knowledge_candidates;').catch(() => {});
            }

            return { mode: 'CLEAR_ALL', count: 0, message: 'Seluruh data knowledge base berhasil dikosongkan.' };
        } else {
            // Reset to DEFAULT medical baseline
            this.seedInitialData();
            this.insert('validation_logs', {
                candidate_id: null,
                knowledge_id: null,
                admin_user: adminUser,
                action: 'DATABASE_RESET_DEFAULT',
                previous_status: 'CUSTOM',
                new_status: 'DEFAULT_BASELINE',
                notes: 'Superadmin mereset Knowledge Base kembali ke pedoman klinis standar diagnosis rawat jalan & gawat darurat.'
            });
            this.saveLocalStore();

            if (this.isPg && this.pgPool) {
                this.syncAllToPostgreSQL().catch(() => {});
            }

            return { mode: 'DEFAULT', count: this.memoryStore.knowledge.length, message: 'Knowledge Base berhasil direset ke standar pedoman klinis awal.' };
        }
    }
}

module.exports = new DatabaseService();
