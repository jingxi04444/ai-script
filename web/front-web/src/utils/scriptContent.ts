const explicitTitlePattern = /^(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:脚本)?标题\s*[:：]\s*(.*?)(?:\*\*|__)?\s*$/i;
const headingTitlePattern = /^#{1,6}\s+(.+?)\s*$/;

const cleanTitle = (value: string) => value
  .replace(/^(?:\*\*|__)|(?:\*\*|__)$/g, '')
  .replace(/^[《“"']+|[》”"']+$/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const findTitleLine = (content?: string) => {
  const lines = (content || '').split(/\r?\n/);
  const firstTableLineIndex = lines.findIndex((line) => line.trim().startsWith('|'));
  const searchLimit = firstTableLineIndex >= 0 ? firstTableLineIndex : Math.min(lines.length, 6);

  for (let index = 0; index < searchLimit; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('```')) continue;
    const explicitMatch = line.match(explicitTitlePattern);
    if (explicitMatch) return { index, title: cleanTitle(explicitMatch[1]) };
    const headingMatch = line.match(headingTitlePattern);
    if (headingMatch) return { index, title: cleanTitle(headingMatch[1]) };
  }
  return undefined;
};

/**
 * Extracts the creative title stored before the first Markdown table.
 * The script asset name is accepted only as a compatibility fallback for old scripts.
 */
export const extractScriptContentTitle = (content?: string, fallback = '') => {
  const match = findTitleLine(content);
  if (match?.title) return match.title;
  return cleanTitle(fallback);
};

export const withoutScriptContentTitle = (content?: string) => {
  const lines = (content || '').split(/\r?\n/);
  const match = findTitleLine(content);
  if (match) lines.splice(match.index, 1);
  return lines.join('\n').trim();
};

/** Ensures copied legacy content also has the same visible title line as the preview. */
export const withScriptContentTitle = (content?: string, fallback = '') => {
  const body = withoutScriptContentTitle(content);
  const title = extractScriptContentTitle(content, fallback);
  return title ? `标题：${title}${body ? `\n\n${body}` : ''}` : body;
};

/** Replaces the visible title while keeping the script body untouched. */
export const replaceScriptContentTitle = (content: string | undefined, title: string) => {
  const body = withoutScriptContentTitle(content);
  const normalizedTitle = cleanTitle(title);
  return normalizedTitle ? `标题：${normalizedTitle}${body ? `\n\n${body}` : ''}` : body;
};
