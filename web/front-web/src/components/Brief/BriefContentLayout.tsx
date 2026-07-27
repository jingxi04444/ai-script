import type { Brief } from '../../types/brief';
import './brief-content-layout.css';

type RichBriefField = 'audience' | 'features' | 'mainPoints' | 'secondaryPoints';

interface BriefContentLayoutProps {
  brief: Brief;
  className?: string;
}

const escapeHtml = (value?: string) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

const sanitizeHtml = (html: string) => {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['DIV', 'P', 'BR', 'STRONG', 'B', 'SPAN', 'FONT', 'H2', 'H3', 'UL', 'OL', 'LI']);
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

const readRichFields = (brief: Brief): Partial<Record<RichBriefField, string>> => {
  if (!brief.richContent) return {};
  try {
    const parsed = JSON.parse(brief.richContent) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Partial<Record<RichBriefField, string>>
      : {};
  } catch {
    return {};
  }
};

const RichValue = ({ html, fallback }: { html?: string; fallback?: string }) => (
  <div
    className="brief-content-rich-value"
    dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || escapeHtml(fallback) || '—') }}
  />
);

const BriefContentLayout = ({ brief, className = '' }: BriefContentLayoutProps) => {
  const richFields = readRichFields(brief);

  return (
    <div className={`brief-content-layout ${className}`.trim()}>
      <section className="brief-content-overview">
        <div className="brief-content-small-fields">
          <article>
            <span>产品价格</span>
            <p>{brief.price || '—'}</p>
          </article>
          <article>
            <span>产品 slogan</span>
            <p>{brief.slogan || '—'}</p>
          </article>
        </div>
        <article className="brief-content-audience">
          <span>目标人群</span>
          <RichValue html={richFields.audience} fallback={brief.targetAudience} />
        </article>
      </section>

      <section className="brief-content-selling-grid">
        <article>
          <span>产品特色卖点</span>
          <RichValue html={richFields.features} fallback={brief.targetScene} />
        </article>
        <article>
          <span>产品主要卖点</span>
          <RichValue html={richFields.mainPoints} fallback={brief.primarySellingPoint} />
        </article>
        <article>
          <span>产品次要卖点</span>
          <RichValue html={richFields.secondaryPoints} fallback={brief.otherRequirements} />
        </article>
      </section>
    </div>
  );
};

export default BriefContentLayout;
