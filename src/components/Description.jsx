import { Fragment } from "react";
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

/**
 * A trait, action or item description. The source text uses a little markdown (**bold**, *italic*, "# headings", "- "
 * lists and "| tables |"), which is all this understands.
 */
export default function Description({ text }) {
  const blocks = toBlocks(text ?? "");
  return (
    <Box sx={{ "& ul": { m: 0, pl: 3 } }}>
      {blocks.map((block, index) => {
        if (block.list) {
          return (
            <ul key={index}>
              {block.list.map((item, position) => (
                <li key={position}>
                  <Typography component="span">{inline(item)}</Typography>
                </li>
              ))}
            </ul>
          );
        }
        if (block.table) {
          return <DescriptionTable key={index} table={block.table} />;
        }
        if (block.heading) {
          return (
            <Typography key={index} component="h3" sx={{ fontWeight: "bold", mt: 1.5, mb: 0.5 }}>
              {inline(block.heading)}
            </Typography>
          );
        }
        return (
          <Typography key={index} sx={{ mb: 0.5 }}>
            {inline(block.text)}
          </Typography>
        );
      })}
    </Box>
  );
}

function DescriptionTable({ table }) {
  return (
    <Box sx={{ overflowX: "auto", my: 1 }}>
      <Table size="small" sx={{ width: "auto", minWidth: 240 }}>
        {table.head && (
          <TableHead>
            <TableRow>
              {table.head.map((cell, column) => (
                <TableCell key={column} sx={{ fontWeight: "bold" }}>
                  {inline(cell)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {table.rows.map((row, position) => (
            <TableRow key={position}>
              {row.map((cell, column) => (
                <TableCell key={column}>{inline(cell)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/**
 * Lines into paragraphs, headings, bullet lists and tables: [{text}, {heading}, {list: [...]}, {table: {head, rows}}].
 * A heading is a line starting with "#" (any number of them). A table is a run of
 * lines starting with "|"; a row of dashes under the first line makes that line the head. The final "|" can be
 * left off, and short rows are filled out to the widest.
 */
export function toBlocks(text) {
  const blocks = [];
  let tableRows = null;
  for (const line of text.split("\n")) {
    if (/^\s*\|/.test(line)) {
      if (!tableRows) {
        tableRows = [];
        blocks.push({ tableRows });
      }
      tableRows.push(cellsOf(line));
      continue;
    }
    tableRows = null;
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*\S)\s*$/);
    const last = blocks[blocks.length - 1];
    if (heading) {
      blocks.push({ heading: heading[1] });
    } else if (bullet) {
      if (last?.list) {
        last.list.push(bullet[1]);
      } else {
        blocks.push({ list: [bullet[1]] });
      }
    } else if (line.trim()) {
      blocks.push({ text: line.trim() });
    }
  }
  return blocks.map((block) => (block.tableRows ? { table: toTable(block.tableRows) } : block));
}

/** "| a | b |" → ["a", "b"] */
function cellsOf(line) {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim());
}

function toTable(rows) {
  const hasHead = rows.length >= 2 && rows[1].every((cell) => /^:?-+:?$/.test(cell));
  const body = hasHead ? rows.slice(2) : rows;
  const width = Math.max(...rows.map((row) => row.length));
  const fill = (row) => [...row, ...Array(width - row.length).fill("")];
  return { head: hasHead ? fill(rows[0]) : null, rows: body.map(fill) };
}

/** "a **b** *c*" → text with <strong> and <em> */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
