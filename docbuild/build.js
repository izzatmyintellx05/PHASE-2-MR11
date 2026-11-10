// Builds one Word file per markdown source in ./src into ../MFE_Client_Documents.
// Each source starts with a front-matter block (title, file, readers); the body uses
// headings (## / ### / ####), paragraphs, bullet, numbered and task lists, pipe tables,
// fenced code, images (![Figure N: caption](file.png)) and **bold**, `code` and [links](url).
//
// House style, the same in every document: all text black, Calibri (code in Consolas),
// bold headings, tables with a light grey header row, captions "Figure N: ..." in italics,
// screenshots collected in Appendix A, and the same cover, document control page and footer.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, LevelFormat,
  Header, Footer, PageNumber, PageBreak, TableOfContents, ImageRun, VerticalAlign,
} = require('docx');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, '..', 'MFE_Client_Documents');
const CONTENT_WIDTH = 9026; // A4 width 11906 minus 1-inch margins
const BLACK = '000000';
const RULE = '808080'; // table borders and lines (not text)
const HEADER_FILL = 'E7E6E6';
const FONT = 'Calibri';
const CODE_FONT = 'Consolas';
const DATE = '21 October 2026';
const VERSION = '1.0';
const STATUS = 'Draft for client review';

const run = (text, opts = {}) => new TextRun({ text, color: BLACK, ...opts });

// ---------- inline text: **bold**, `code`, [text](url) ----------
function inline(text, base = {}) {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(run(text.slice(last, m.index), base));
    if (m[2]) runs.push(...inline(m[2], { ...base, bold: true }));
    else if (m[4]) runs.push(run(m[4], { ...base, font: CODE_FONT, size: (base.size || 21) - 2 }));
    else if (m[6]) {
      runs.push(new ExternalHyperlink({ link: m[7], children: [run(m[6], { ...base, underline: {} })] }));
    }
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(run(text.slice(last), base));
  return runs;
}

// ---------- tables ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: border, bottom: border, left: border, right: border };

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function columnWidths(rows) {
  const n = rows[0].length;
  const weight = Array.from({ length: n }, (_, i) => {
    const w = Math.max(...rows.map((r) => Math.min((r[i] || '').replace(/[*`]/g, '').length, 60)), 4);
    // A column that is blank below its header is for people to write in: give it room
    const blank = rows.length > 1 && rows.slice(1).every((r) => !(r[i] || '').trim());
    return blank ? Math.max(w, 16) : w;
  });
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => Math.max(Math.round((w / total) * CONTENT_WIDTH), 900));
  const diff = CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0);
  widths[widths.indexOf(Math.max(...widths))] += diff;
  return widths;
}

function table(rows) {
  const widths = columnWidths(rows);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, r) =>
      new TableRow({
        tableHeader: r === 0,
        cantSplit: true,
        children: widths.map((w, c) =>
          new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders,
            verticalAlign: VerticalAlign.TOP,
            shading: r === 0 ? { fill: HEADER_FILL, type: ShadingType.CLEAR, color: 'auto' } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: inline(cells[c] || '', { size: 18, bold: r === 0 ? true : undefined }),
            })],
          })
        ),
      })
    ),
  });
}

// ---------- images ----------
const FIGURE = /^(Figure \d+): (.*)$/;

// An image and its caption; screenshots get a thin frame so their white backgrounds don't
// merge with the page
function imageBlock(src, caption) {
  const buf = fs.readFileSync(path.join(__dirname, src));
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const isShot = src.startsWith('shots/');
  const frame = { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 1 };
  // Rendered diagrams are drawn at twice their size: show them at most at their own size,
  // and no wider or taller than the page allows
  const maxWidth = isShot ? 590 : 600;
  const natural = src.startsWith('diagrams/') ? [w / 2, h / 2] : [maxWidth, (maxWidth * h) / w];
  const scale = Math.min(1, maxWidth / natural[0], 800 / natural[1]);
  const width = Math.round(natural[0] * scale);
  const height = Math.round(natural[1] * scale);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      border: isShot ? { top: frame, bottom: frame, left: frame, right: frame } : undefined,
      children: [new ImageRun({ type: 'png', data: buf, transformation: { width, height }, altText: { title: caption, description: caption, name: caption } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [run(caption, { italics: true, size: 18 })],
    }),
  ];
}

// Appendix A: every screenshot the text points to, with a list of figures first
function screenshotAppendix() {
  if (figures.length === 0) return [];
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run('Appendix A: Screenshots')] }),
    new Paragraph({
      spacing: { after: 120 },
      children: inline('These screenshots were taken from version 1.0 running with the sample workbooks, so the projects and figures in them are examples rather than live data.'),
    }),
    table([
      ['Figure', 'What it shows', 'Mentioned in'],
      ...figures.map((f) => {
        const fig = FIGURE.exec(f.caption);
        return [fig ? fig[1] : '', fig ? fig[2] : f.caption, f.section];
      }),
    ]),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    ...figures.flatMap((f) => imageBlock(f.src, f.caption)),
  ];
}

// ---------- body ----------
let listInstance = 0;
let figures = [];
let section = '';

function body(md) {
  const out = [];
  const lines = md.split(/\r?\n/);
  let i = 0;
  let orderedInstance = null;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; orderedInstance = null; continue; }

    if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      code.forEach((c, k) => out.push(new Paragraph({
        shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
        spacing: { before: k === 0 ? 80 : 0, after: k === code.length - 1 ? 160 : 0 },
        indent: { left: 120, right: 120 },
        children: [run(c || ' ', { font: CODE_FONT, size: 17 })],
      })));
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*:?-{3,}/.test(lines[i])) rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(table(rows));
      out.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }));
      continue;
    }

    const img = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line);
    if (img) {
      if (img[2].startsWith('shots/')) {
        // Screenshots go to Appendix A; the text keeps a pointer to the figure
        figures.push({ caption: img[1], src: img[2], section });
        const fig = FIGURE.exec(img[1]);
        out.push(new Paragraph({
          spacing: { after: 120 },
          children: [run(fig ? `See ${fig[1]} in Appendix A: ${fig[2]}.` : `See Appendix A: ${img[1]}.`, { italics: true })],
        }));
      } else {
        out.push(...imageBlock(img[2], img[1]));
      }
      i++;
      continue;
    }

    let m;
    if ((m = /^(#{2,4})\s+(.*)$/.exec(line))) {
      const level = m[1].length === 2 ? HeadingLevel.HEADING_1 : m[1].length === 3 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      if (m[1].length === 2) section = m[2].replace(/[*`]/g, '');
      // The body starts on a fresh page after the contents, and so does each appendix
      out.push(new Paragraph({ heading: level, pageBreakBefore: out.length === 0 || /^Appendix\b/.test(m[2]), children: inline(m[2]) }));
      i++;
      continue;
    }
    if ((m = /^(\s*)- \[( |x)\] (.*)$/.exec(line))) {
      out.push(new Paragraph({
        indent: { left: 360, hanging: 360 },
        spacing: { after: 60 },
        children: [run(m[2] === 'x' ? '☑  ' : '☐  ', { size: 21 }), ...inline(m[3])],
      }));
      i++;
      continue;
    }
    if ((m = /^(\s*)[-*] (.*)$/.exec(line))) {
      out.push(new Paragraph({
        numbering: { reference: 'bullets', level: m[1].length >= 2 ? 1 : 0 },
        spacing: { after: 60 },
        children: inline(m[2]),
      }));
      i++;
      continue;
    }
    if ((m = /^(\s*)\d+\. (.*)$/.exec(line))) {
      if (m[1].length >= 2) {
        out.push(new Paragraph({ numbering: { reference: 'bullets', level: 1 }, spacing: { after: 60 }, children: inline(m[2]) }));
      } else {
        if (orderedInstance === null) orderedInstance = ++listInstance;
        out.push(new Paragraph({
          numbering: { reference: 'numbers', level: 0, instance: orderedInstance },
          spacing: { after: 60 },
          children: inline(m[2]),
        }));
      }
      i++;
      continue;
    }
    orderedInstance = null;
    out.push(new Paragraph({ spacing: { after: 120 }, children: inline(line.trim()) }));
    i++;
  }
  return out;
}

// ---------- cover and document control ----------
function cover(meta) {
  const p = (text, opts = {}, para = {}) => new Paragraph({ ...para, children: [run(text, opts)] });
  return [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    p('MFE FORMWORK MR11 SYSTEM', { size: 24, bold: true, characterSpacing: 40 }),
    new Paragraph({
      spacing: { before: 120, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLACK, space: 8 } },
      children: [run(meta.title, { size: 56, bold: true })],
    }),
    p(`Version ${VERSION}`, { size: 26 }, { spacing: { after: 1600 } }),
    p('Prepared for', { size: 20 }),
    p('MFE Formwork', { size: 26, bold: true }, { spacing: { after: 240 } }),
    p('Prepared by', { size: 20 }),
    p('MyIntellX project team', { size: 26, bold: true }, { spacing: { after: 240 } }),
    p('Date', { size: 20 }),
    p(DATE, { size: 26, bold: true }, { spacing: { after: 240 } }),
    p('Status', { size: 20 }),
    p(STATUS, { size: 26, bold: true }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// Front-matter headings look like headings but stay out of the table of contents
const label = (text, size) =>
  new Paragraph({ spacing: { before: 240, after: 120 }, keepNext: true, children: [run(text, { size, bold: true })] });

function control(meta) {
  return [
    label('Document control', 30),
    table([
      ['Item', 'Detail'],
      ['Document', meta.title],
      ['System', `MFE Formwork MR11 System, version ${VERSION}`],
      ['Document version', VERSION],
      ['Date', DATE],
      ['Status', STATUS],
      ['Based on', 'Repository izzatmyintellx05/MFE, branch main, commit 0cc8c36'],
      ['Prepared for', 'MFE Formwork'],
      ['Prepared by', 'MyIntellX project team'],
      ['Intended readers', meta.readers],
      ['Classification', 'Confidential, for client and vendor use only'],
    ]),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    label('Revision history', 25),
    table([
      ['Version', 'Date', 'Description', 'Author'],
      [VERSION, DATE, 'First issue for client review', 'MyIntellX project team'],
      ['', '', '', ''],
    ]),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    label('Contents', 25),
    new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
}

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  const meta = {};
  fm[1].split(/\r?\n/).forEach((l) => {
    const k = l.indexOf(':');
    meta[l.slice(0, k).trim()] = l.slice(k + 1).trim();
  });
  return { meta, md: raw.slice(fm[0].length) };
}

const heading = (id, name, size, before, after, outlineLevel) => ({
  id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
  run: { size, bold: true, color: BLACK, font: FONT },
  paragraph: { spacing: { before, after }, outlineLevel, keepNext: true },
});

async function build(file) {
  const { meta, md } = parse(file);
  figures = [];
  section = '';
  const content = body(md);
  const footerRun = (text) => run(text, { size: 16 });
  const doc = new Document({
    creator: 'MyIntellX project team',
    title: `MFE MR11 System: ${meta.title}`,
    description: meta.title,
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: BLACK }, paragraph: { spacing: { line: 276 } } } },
      paragraphStyles: [
        heading('Heading1', 'Heading 1', 30, 360, 140, 0),
        heading('Heading2', 'Heading 2', 25, 240, 100, 1),
        heading('Heading3', 'Heading 3', 22, 200, 80, 2),
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { color: BLACK } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } }, run: { color: BLACK } } },
        ] },
        { reference: 'numbers', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { color: BLACK } } },
        ] },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        titlePage: true,
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
          children: [footerRun(`MFE MR11 System | ${meta.title}`)],
        })] }),
        first: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            footerRun(`Confidential | Version ${VERSION} | Page `),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: BLACK }),
            footerRun(' of '),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: BLACK }),
          ],
        })] }),
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
      },
      children: [...cover(meta), ...control(meta), ...content, ...screenshotAppendix()],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  const target = path.join(OUT, meta.file);
  fs.writeFileSync(target, buf);
  console.log(`${meta.file}  ${(buf.length / 1024).toFixed(1)} KB`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.md')).sort()) {
    if (!only || only.some((p) => f.startsWith(p))) await build(path.join(SRC, f));
  }
})().catch((e) => { console.error(e); process.exit(1); });
