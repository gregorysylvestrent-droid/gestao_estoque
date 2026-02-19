/**
 * LogiWMS Skill Manager - Sistema Inteligente de Otimização de Skills
 * 
 * Funcionalidades:
 * 1. Catalogar Skills (.agent/skills)
 * 2. Match de Skills baseado em query (NLP básico + Histórico)
 * 3. Registro de Feedback (Aprendizado Contínuo)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const ROOT_DIR = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT_DIR, '.agent', 'skills');
const DATA_DIR = path.join(ROOT_DIR, '.agent', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'skills_catalog.json');
const METRICS_FILE = path.join(DATA_DIR, 'skills_metrics.json');

// Stopwords básicos (PT-BR + EN) para limpeza de query
const STOP_WORDS = new Set([
    'a', 'o', 'e', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'que', 'os', 'as', 'dos', 'das',
    'the', 'and', 'or', 'of', 'to', 'in', 'a', 'an', 'is', 'for', 'with', 'not', 'that',
    'criar', 'fazer', 'gerar', 'adicionar', 'implementar', 'como', 'usar', 'create', 'make', 'add'
]);

// Utilitários
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
const readFile = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const saveFile = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- Módulo de Catálogo ---

function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    
    const yaml = match[1];
    const metadata = {};
    
    yaml.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join(':').trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            metadata[key] = value;
        }
    });
    return metadata;
}

function scanSkills() {
    console.log('🔍 Escaneando diretório de skills:', SKILLS_DIR);
    if (!fs.existsSync(SKILLS_DIR)) {
        console.error('❌ Diretório de skills não encontrado!');
        return {};
    }

    const skills = {};
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const skillPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
            if (fs.existsSync(skillPath)) {
                const content = fs.readFileSync(skillPath, 'utf8');
                const metadata = parseFrontmatter(content);
                
                if (metadata && metadata.name) {
                    skills[metadata.name] = {
                        path: skillPath,
                        description: metadata.description || '',
                        content_preview: content.slice(0, 500) // Para indexação futura
                    };
                }
            }
        }
    }
    
    saveFile(CATALOG_FILE, skills);
    console.log(`✅ Catálogo atualizado com ${Object.keys(skills).length} skills.`);
    return skills;
}

// --- Módulo de Matching e Ranking ---

function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function calculateScore(queryTokens, skill, metrics) {
    const skillText = (skill.name + ' ' + skill.description).toLowerCase();
    const skillTokens = new Set(tokenize(skillText));
    
    // 1. Pontuação Base: Overlap de palavras-chave
    let matchCount = 0;
    queryTokens.forEach(token => {
        if (skillTokens.has(token)) matchCount++;
        // Boost parcial para substrings (ex: "auth" matches "authentication")
        else if ([...skillTokens].some(st => st.includes(token))) matchCount += 0.5;
    });

    const baseScore = matchCount / (queryTokens.length || 1);

    // 2. Pontuação de Aprendizado (Métricas)
    // Formula: Score * (1 + (SuccessRate * UsageWeight))
    const skillMetrics = metrics[skill.name] || { uses: 0, successes: 0 };
    const successRate = skillMetrics.uses > 0 ? (skillMetrics.successes / skillMetrics.uses) : 0.5; // Start neutral
    const boost = 1 + (successRate * 0.5) + (Math.log10(skillMetrics.uses + 1) * 0.1);

    return baseScore * boost;
}

function findBestSkills(query) {
    const catalog = readFile(CATALOG_FILE);
    const metrics = readFile(METRICS_FILE);
    const queryTokens = tokenize(query);

    const ranked = Object.keys(catalog).map(key => {
        const skill = { ...catalog[key], name: key };
        const score = calculateScore(queryTokens, skill, metrics);
        return { name: key, description: skill.description, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    return ranked.slice(0, 3); // Top 3
}

// --- Módulo de Feedback ---

function registerFeedback(skillName, success) {
    const metrics = readFile(METRICS_FILE);
    if (!metrics[skillName]) metrics[skillName] = { uses: 0, successes: 0 };
    
    metrics[skillName].uses += 1;
    if (success) metrics[skillName].successes += 1;
    
    saveFile(METRICS_FILE, metrics);
    console.log(`📈 Feedback registrado para ${skillName}: ${success ? 'Sucesso' : 'Falha'}`);
}

// --- CLI ---

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

ensureDir(DATA_DIR);

switch (command) {
    case 'scan':
        scanSkills();
        break;
    case 'match':
        if (!arg1) {
            console.log('Uso: node skill_manager.js match "sua query aqui"');
        } else {
            const results = findBestSkills(arg1);
            console.log(JSON.stringify(results, null, 2));
        }
        break;
    case 'feedback':
        if (!arg1) {
            console.log('Uso: node skill_manager.js feedback <skill_name> <true/false>');
        } else {
            registerFeedback(arg1, arg2 === 'true');
        }
        break;
    default:
        console.log(`
🤖 LogiWMS Skill Manager
------------------------
Comandos disponíveis:
  scan                  - Atualiza o catálogo de skills
  match "query"         - Encontra as melhores skills para a query
  feedback <name> <bool> - Registra sucesso/falha de uma skill
        `);
}
