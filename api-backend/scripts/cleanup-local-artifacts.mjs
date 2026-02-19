import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dataDir = path.join(backendDir, 'data');
const backupDir = path.join(backendDir, 'data-backups');
const reportsDir = path.join(backendDir, 'reports');

const LIMITS = {
  'movements.json': 5000,
  'audit_logs.json': 10000,
  'notifications.json': 2000,
};

const safeReadArray = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const trimFile = (fileName, maxRows) => {
  const filePath = path.join(dataDir, fileName);
  const rows = safeReadArray(filePath);
  if (rows.length <= maxRows) {
    return { file: fileName, before: rows.length, after: rows.length, changed: false };
  }

  const trimmed = rows.slice(-maxRows);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2));
  return { file: fileName, before: rows.length, after: trimmed.length, changed: true };
};

const removeDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) return false;
  fs.rmSync(dirPath, { recursive: true, force: true });
  return true;
};

const trimmedFiles = Object.entries(LIMITS).map(([fileName, maxRows]) => trimFile(fileName, maxRows));
const removedBackups = removeDirectory(backupDir);
const removedReports = removeDirectory(reportsDir);

const summary = {
  cleaned_at: new Date().toISOString(),
  removed: {
    data_backups: removedBackups,
    reports: removedReports,
  },
  trimmed: trimmedFiles,
};

console.log(JSON.stringify(summary, null, 2));
