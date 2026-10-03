import { Fragment } from "react";
import { Box, Typography } from "@mui/material";

/**
 * A trait or action description. The source text uses a little markdown (**bold**, *italic*, "- " lists), which is
 * all this understands.
 */
export default function Description({ text }) {
  const blocks = toBlocks(text ?? "");
  return (
    <Box sx={{ "& ul": { m: 0, pl: 3 } }}>
      {blocks.map((block, index) =>
        block.list ? (
          <ul key={index}>
            {block.list.map((item, position) => (
              <li key={position}>
                <Typography component="span">{inline(item)}</Typography>
              </li>
            ))}
          </ul>
        ) : (
          <Typography key={index} sx={{ mb: 0.5 }}>
            {inline(block.text)}
          </Typography>
        ),
      )}
    </Box>
  );
}

/** Lines into paragraphs and bullet lists: [{text}, {list: [...]}] */
export function toBlocks(text) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.list) {
        last.list.push(bullet[1]);
      } else {
        blocks.push({ list: [bullet[1]] });
      }
    } else if (line.trim()) {
      blocks.push({ text: line.trim() });
    }
  }
  return blocks;
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
