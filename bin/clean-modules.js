#! /usr/bin/env node
const fs = require('fs');
const path = require('path');

const getDays = () => {
  const i = process.argv.indexOf('-d');
  if (i == -1) return 30;
  const days = process.argv[i + 1];
  const d = Number(days);
  if (isNaN(d)) {
    console.log('Invalid days input:', days);
    process.exit(1);
  }
  return d;
}

const MS_DAY = 86400000;
const days = getDays();
const threshold = Date.now() - MS_DAY * days;

const CALC_SIZE = process.argv.includes('-c');

console.log(`\nThreshold of ${days} days`);
console.log(`Calculate modules size ${CALC_SIZE}\n`);


const getDirectorieSize = source => {
  const files = fs.readdirSync(source, { withFileTypes: true });
  
  const dirs = files.filter(f => f.isDirectory());
  const dirSize = files.filter(f => !f.isDirectory()).map(f => fs.statSync(path.join(source, f.name)).size).reduce((a, b) => a + b, 0);

  const result = dirs.map(f => getDirectorieSize(path.join(source, f.name)));

  return [dirSize, ...result].reduce((a, b) => a + b);
}

const scanDirectories = source => {
  const files = fs.readdirSync(source, { withFileTypes: true });

  const packageLocks = files.filter(f => f.name == "package-lock.json");

  const oldPackageLocks = packageLocks.reduce((arr, f) => {
    const p = path.join(source, f.name);
    const stats = fs.statSync(p);
    if (threshold < stats.mtimeMs) return arr;

    const nodeModulesPath = path.join(source, 'node_modules');
    const hasNodeModules = fs.existsSync(nodeModulesPath);
    if (!hasNodeModules) return arr;

    const size = CALC_SIZE && hasNodeModules ? getDirectorieSize(nodeModulesPath) : 0;

    return [...arr, { hasNodeModules, source, mtime: stats.mtimeMs, mb: size / (1024 * 1024) }];
  }, [])

  const dirs = files.filter(f => f.isDirectory() && f.name != 'node_modules').map(f => path.join(source, f.name));

  const result = dirs.map(scanDirectories);
  
  return [oldPackageLocks, result].flat(Infinity);
}

const sizeToColor = (mb) => {
  if (mb == 0) return '\x1b[30m';
  if (mb < 50) return '\x1b[32m';
  if (mb < 100) return '\x1b[33m';
  if (mb < 300) return '\x1b[31m';
  return '\x1b[41m';
}

const sizeWrap = (mb) => {
  return sizeToColor(mb) + mb.toFixed(2) + ' MB\x1b[0m';
}

const sliceLength = process.cwd().length + 1;
const result = scanDirectories(process.cwd());
console.log(result.map(e => ` \x1b[32m${e.source.slice(sliceLength)}\x1b[0m, \x1b[34m[${new Date(e.mtime).toDateString()}]\x1b[0m${CALC_SIZE ? ` - ${sizeWrap(e.mb)}` : ''}`).join('\n'))
console.log('\nNode modules folders: ' + result.length + '\n');
if (CALC_SIZE) console.log('Size:', sizeWrap(result.reduce((mb, e) => mb + e.mb, 0)), '\n');

if (result.length == 0) process.exit();

const deleteNodeModules = () => {
  
  result.forEach((e, i) => {
    try {
      const p = path.join(e.source, 'node_modules')
      console.log(`\x1b[31m(${i + 1}/${result.length}) Deleting ${p.slice(sliceLength)}...\x1b[0m`);
      fs.rmdirSync(p, { recursive: true });
    } catch(err) {
      console.log(err);
    }
  })

  process.exit();
}

if (process.argv.includes('-y')) deleteNodeModules();

process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
  if (data.toString().trim().toLowerCase() === "y") return deleteNodeModules();
  process.exit();
});

console.log("Delete all node modules? (y/N)?");