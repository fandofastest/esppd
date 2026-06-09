function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxLength: number) {
  const trimmed = text.trimEnd();
  if (!trimmed) {
    return [""];
  }

  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      continue;
    }

    current = next;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function normalizeLines(lines: string[], maxLength: number) {
  return lines.flatMap((line) => wrapLine(line, maxLength));
}

export function createSimplePdfBuffer(title: string, lines: string[]) {
  const normalizedLines = normalizeLines([title, "", ...lines], 92);
  const linesPerPage = 44;
  const pages: string[][] = [];

  for (let index = 0; index < normalizedLines.length; index += linesPerPage) {
    pages.push(normalizedLines.slice(index, index + linesPerPage));
  }

  if (!pages.length) {
    pages.push([""]);
  }

  const objects: string[] = [];
  const fontObjectId = 3;
  const pageObjectIds: number[] = [];

  for (const [pageIndex, pageLines] of pages.entries()) {
    const pageObjectId = 4 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);

    const commands = [
      "BT",
      "/F1 11 Tf",
      "14 TL",
      "50 790 Td",
      ...pageLines.flatMap((line, index) =>
        index === 0 ? [`(${escapePdfText(line)}) Tj`] : ["T*", `(${escapePdfText(line)}) Tj`],
      ),
      "ET",
    ].join("\n");

    objects[pageObjectId - 1] =
      `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj\n`;
    objects[contentObjectId - 1] =
      `${contentObjectId} 0 obj\n<< /Length ${Buffer.byteLength(commands, "utf8")} >>\nstream\n${commands}\nendstream\nendobj\n`;
  }

  objects[0] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[1] = `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] >>\nendobj\n`;
  objects[2] = "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const header = "%PDF-1.4\n";
  const body = objects.join("");
  const offsets: number[] = [0];
  let cursor = Buffer.byteLength(header, "utf8");

  for (const object of objects) {
    offsets.push(cursor);
    cursor += Buffer.byteLength(object, "utf8");
  }

  const xrefStart = cursor;
  const xrefRows = offsets.map((offset, index) =>
    index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `,
  );
  const xref = `xref\n0 ${offsets.length}\n${xrefRows.join("\n")}\n`;
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(`${header}${body}${xref}${trailer}`, "utf8");
}
