import { useEffect, useRef, useState } from 'react';
import './rich-text-field.css';

interface RichTextFieldProps {
  className: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  onChange: (html: string, plainText: string) => void;
}

interface SelectionBookmark {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

const getNodePath = (root: Node, target: Node) => {
  const path: number[] = [];
  let current: Node | null = target;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current) as number);
    current = parent;
  }
  return current === root ? path : null;
};

const resolveNodePath = (root: Node, path: number[]) => {
  let current: Node | undefined = root;
  for (const index of path) {
    current = current.childNodes[index];
    if (!current) return null;
  }
  return current;
};

const sanitizeRichHtml = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['DIV', 'P', 'BR', 'STRONG', 'B', 'SPAN', 'FONT']);
  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isFontAttribute = element.tagName === 'FONT' && ['color', 'size'].includes(attribute.name);
      const isSafeStyle = attribute.name === 'style'
        && /^(?:\s*(?:color|font-size|font-weight)\s*:\s*[^;]+;?\s*)+$/i.test(attribute.value);
      if (!isFontAttribute && !isSafeStyle) element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const htmlToPlainText = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = sanitizeRichHtml(html);
  return (container.innerText || container.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
};

const RichTextField = ({
  className,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: RichTextFieldProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<SelectionBookmark | null>(null);
  const [characterCount, setCharacterCount] = useState(() => htmlToPlainText(value).length);
  const [activeColor, setActiveColor] = useState('#7eea73');
  const [activeFontSize, setActiveFontSize] = useState('3');
  const [boldActive, setBoldActive] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sanitizedValue = sanitizeRichHtml(value);
    setCharacterCount(htmlToPlainText(sanitizedValue).length);
    if (document.activeElement === editor || editor.innerHTML === sanitizedValue) return;
    editor.innerHTML = sanitizedValue;
  }, [value]);

  const rememberSelection = (preserveExpandedSelection = false) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const previousBookmark = selectionRef.current;
    const previousSelectionExpanded = previousBookmark
      && (
        previousBookmark.startOffset !== previousBookmark.endOffset
        || previousBookmark.startPath.join('.') !== previousBookmark.endPath.join('.')
      );
    if (range.collapsed && preserveExpandedSelection && previousSelectionExpanded) return;
    const startPath = getNodePath(editor, range.startContainer);
    const endPath = getNodePath(editor, range.endContainer);
    if (!startPath || !endPath) return;
    selectionRef.current = {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    };
  };

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sanitizedHtml = sanitizeRichHtml(editor.innerHTML);
    const plainText = htmlToPlainText(sanitizedHtml);
    setCharacterCount(plainText.length);
    onChange(sanitizedHtml, plainText);
    window.requestAnimationFrame(() => setCanUndo(document.queryCommandEnabled('undo')));
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus();
    const selection = window.getSelection();
    const bookmark = selectionRef.current;
    if (!selection || !bookmark) return selection;

    const range = document.createRange();
    const startNode = resolveNodePath(editor, bookmark.startPath);
    const endNode = resolveNodePath(editor, bookmark.endPath);
    if (startNode && endNode) {
      const startLimit = startNode.nodeType === Node.TEXT_NODE
        ? startNode.textContent?.length || 0
        : startNode.childNodes.length;
      const endLimit = endNode.nodeType === Node.TEXT_NODE
        ? endNode.textContent?.length || 0
        : endNode.childNodes.length;
      range.setStart(startNode, Math.min(bookmark.startOffset, startLimit));
      range.setEnd(endNode, Math.min(bookmark.endOffset, endLimit));
      selection.removeAllRanges();
      selection.addRange(range);
      return selection;
    }

    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  };

  const applyFormat = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, commandValue);
    rememberSelection();
    emitChange();
  };

  const toggleBold = () => {
    restoreSelection();
    const next = !document.queryCommandState('bold');
    applyFormat('bold');
    setBoldActive(next);
  };

  const handleUndo = () => {
    restoreSelection();
    document.execCommand('undo');
    rememberSelection();
    emitChange();
  };

  const clearFormat = () => {
    setBoldActive(false);
    setActiveColor('#7eea73');
    setActiveFontSize('3');
    applyFormat('removeFormat');
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selectedLength = window.getSelection()?.toString().length || 0;
    const availableLength = Math.max(0, maxLength - characterCount + selectedLength);
    const pastedText = event.clipboardData.getData('text/plain').slice(0, availableLength);
    document.execCommand('insertText', false, pastedText);
    emitChange();
  };

  return (
    <section className={`${className} rich-text-field`}>
      <span>{label}</span>
      <div
        className="selling-rich-toolbar"
        aria-label={`${label}文字格式`}
        onMouseDown={() => rememberSelection(true)}
      >
        <button type="button" className="undo-format" title="撤回上一步编辑（Ctrl+Z）" disabled={!canUndo} onMouseDown={(event) => event.preventDefault()} onClick={handleUndo}>
          <span aria-hidden="true">↶</span> 撤回
        </button>
        <button type="button" title="加粗" className={boldActive ? 'active' : ''} aria-pressed={boldActive} onMouseDown={(event) => event.preventDefault()} onClick={toggleBold}>
          <strong>B</strong>
        </button>
        <span className="rich-color-control">
          <button
            type="button"
            title="应用当前文字颜色"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              applyFormat('foreColor', activeColor);
            }}
          >
            颜色
          </button>
          <label title="选择文字颜色" aria-label="选择文字颜色">
            <input
              type="color"
              value={activeColor}
              onInput={(event) => {
                const color = event.currentTarget.value;
                setActiveColor(color);
                applyFormat('foreColor', color);
              }}
            />
          </label>
        </span>
        <span className="rich-font-size-control">
          <button
            type="button"
            title="应用当前字号"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              applyFormat('fontSize', activeFontSize);
            }}
          >
            字号
          </button>
          <label title="选择字号">
            <select
              aria-label="选择字号"
              value={activeFontSize}
              onChange={(event) => {
                const fontSize = event.target.value;
                setActiveFontSize(fontSize);
                applyFormat('fontSize', fontSize);
              }}
            >
              <option value="2">小号</option>
              <option value="3">正文</option>
              <option value="4">大号</option>
              <option value="5">标题</option>
            </select>
          </label>
        </span>
        <button type="button" className="clear-format" onMouseDown={(event) => event.preventDefault()} onClick={clearFormat}>
          清除格式
        </button>
      </div>
      <div
        ref={editorRef}
        className="selling-rich-editor"
        contentEditable
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        data-placeholder={placeholder}
        data-empty={characterCount === 0}
        suppressContentEditableWarning
        onInput={emitChange}
        onMouseUp={() => rememberSelection()}
        onKeyUp={() => rememberSelection()}
        onBlur={emitChange}
        onPaste={handlePaste}
        onBeforeInput={(event) => {
          if (characterCount >= maxLength && !window.getSelection()?.toString() && event.nativeEvent.inputType.startsWith('insert')) {
            event.preventDefault();
            return;
          }
        }}
      />
      <em>{characterCount}/{maxLength}</em>
    </section>
  );
};

export default RichTextField;
