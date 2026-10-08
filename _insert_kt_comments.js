const fs = require("fs");
const path = require("path");

const py = fs.readFileSync(path.join(__dirname, "_insert_kt_comments.py"), "utf8");
const start = py.indexOf("EDITS = {");
const end = py.indexOf("\ndef apply");
if (start < 0 || end < 0) throw new Error("EDITS block not found");
let body = py.slice(start + "EDITS = ".length, end).trim();
body = body.replace(/^\("/gm, '["');
body = body.replace(/\]\),/g, "]],");
fs.writeFileSync(path.join(__dirname, "_edits_debug.js"), body);
const EDITS = eval("(" + body + ")");

const ROOT = path.join(__dirname, "mobile", "app", "src", "main", "java");

function apply(file, edits) {
  const raw = fs.readFileSync(file);
  const newline = raw.includes(Buffer.from("\r\n")) ? "\r\n" : "\n";
  const text = raw.toString("utf8");
  const ended = text.endsWith("\n");
  const lines = text.split(/\r?\n/);
  if (ended) lines.pop();
  const original = lines.slice();
  const inserts = new Map();
  for (const [exact, comments] of edits) {
    const idxs = [];
    lines.forEach((line, i) => {
      if (line === exact) idxs.push(i);
    });
    if (idxs.length !== 1) {
      throw new Error(`${file}: expected 1 match for ${JSON.stringify(exact)}, found ${idxs.length}`);
    }
    if (inserts.has(idxs[0])) throw new Error(`${file}: two inserts at ${idxs[0] + 1}`);
    for (const comment of comments) {
      if (!comment.trimStart().startsWith("//")) throw new Error("non-comment: " + comment);
    }
    const already = comments.every((comment, offset) => lines[idxs[0] - comments.length + offset] === comment);
    if (already) continue;
    inserts.set(idxs[0], comments);
  }
  const indexes = [...inserts.keys()].sort((a, b) => b - a);
  for (const index of indexes) {
    lines.splice(index, 0, ...inserts.get(index));
  }
  let cursor = 0;
  for (const line of lines) {
    if (cursor < original.length && line === original[cursor]) cursor += 1;
    else if (!line.trimStart().startsWith("//")) throw new Error(`${file}: unexpected new line ${JSON.stringify(line)}`);
  }
  if (cursor !== original.length) throw new Error(`${file}: lost original lines`);
  let next = lines.join(newline);
  if (ended) next += newline;
  fs.writeFileSync(file, next);
  return lines.length - original.length;
}

const files = [];
let total = 0;
for (const [rel, edits] of Object.entries(EDITS)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error("missing " + file);
  const added = apply(file, edits);
  total += added;
  files.push(`${String(added).padStart(3)} ${rel}`);
}
console.log(`files ${files.length} comment_lines ${total}`);
for (const line of files) console.log(line);
