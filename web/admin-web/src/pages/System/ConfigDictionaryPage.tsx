import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  RefreshCcw,
  Save,
  Search,
} from 'lucide-react';
import { systemApi, type ConfigDictionaryItem } from '../../api/system';
import { PageHeader } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './config-dictionary-page.css';

type ConfigDraft = Pick<
  ConfigDictionaryItem,
  'configKey' | 'configName' | 'configValue' | 'valueType' | 'description' | 'status'
>;

const valueTypeOptions: Array<{ value: ConfigDictionaryItem['valueType']; label: string }> = [
  { value: 'string', label: '单行文本' },
  { value: 'text', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '开关' },
  { value: 'json', label: 'JSON' },
  { value: 'image', label: '图片地址' },
];

const findItem = (items: ConfigDictionaryItem[], configKey: string): ConfigDictionaryItem | undefined => {
  for (const item of items) {
    if (item.configKey === configKey) return item;
    const child = findItem(item.children || [], configKey);
    if (child) return child;
  }
  return undefined;
};

const firstEditableItem = (items: ConfigDictionaryItem[]): ConfigDictionaryItem | undefined => {
  for (const item of items) {
    if (item.nodeType === 'item') return item;
    const child = firstEditableItem(item.children || []);
    if (child) return child;
  }
  return undefined;
};

const toDraft = (item: ConfigDictionaryItem): ConfigDraft => ({
  configKey: item.configKey,
  configName: item.configName,
  configValue: item.configValue || '',
  valueType: item.valueType || 'string',
  description: item.description || '',
  status: item.status ?? 1,
});

interface DictionaryTreeNodeProps {
  item: ConfigDictionaryItem;
  depth: number;
  selectedKey: string;
  keyword: string;
  expandedKeys: Set<string>;
  onSelect: (item: ConfigDictionaryItem) => void;
  onToggle: (key: string) => void;
}

const DictionaryTreeNode = ({
  item,
  depth,
  selectedKey,
  keyword,
  expandedKeys,
  onSelect,
  onToggle,
}: DictionaryTreeNodeProps) => {
  const children = item.children || [];
  const isGroup = item.nodeType === 'group';
  const expanded = expandedKeys.has(item.configKey);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const ownMatched = !normalizedKeyword
    || item.configName.toLowerCase().includes(normalizedKeyword)
    || item.configKey.toLowerCase().includes(normalizedKeyword);
  const matchedChildren = children.filter((child) => {
    const text = `${child.configName} ${child.configKey}`.toLowerCase();
    return !normalizedKeyword || text.includes(normalizedKeyword) || child.nodeType === 'group';
  });

  if (!ownMatched && !matchedChildren.length) return null;

  return (
    <div className="dictionary-tree-node">
      <button
        className={`dictionary-tree-row ${selectedKey === item.configKey ? 'active' : ''}`}
        type="button"
        data-depth={depth}
        onClick={() => {
          if (isGroup) onToggle(item.configKey);
          else onSelect(item);
        }}
      >
        <span className="dictionary-tree-indent" aria-hidden="true">
          {Array.from({ length: depth }).map((_, index) => <i key={index} />)}
        </span>
        {isGroup ? (
          <span className="dictionary-tree-toggle">
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        ) : <span className="dictionary-tree-toggle placeholder" />}
        <span className="dictionary-tree-icon">
          {isGroup
            ? expanded ? <FolderOpen size={17} /> : <Folder size={17} />
            : <FileCode2 size={16} />}
        </span>
        <span className="dictionary-tree-copy">
          <strong>{item.configName}</strong>
          <small>{item.configKey}</small>
        </span>
      </button>

      {isGroup && expanded ? matchedChildren.map((child) => (
        <DictionaryTreeNode
          key={child.configKey}
          item={child}
          depth={depth + 1}
          selectedKey={selectedKey}
          keyword={keyword}
          expandedKeys={expandedKeys}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      )) : null}
    </div>
  );
};

const ConfigDictionaryPage = () => {
  const { notify } = useAdminShell();
  const [tree, setTree] = useState<ConfigDictionaryItem[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedItem = useMemo(
    () => selectedKey ? findItem(tree, selectedKey) : undefined,
    [selectedKey, tree],
  );

  const load = async (preferredKey?: string) => {
    setLoading(true);
    try {
      const result = await systemApi.getConfigDictionary();
      setTree(result);
      const allGroups = new Set<string>();
      const collectGroups = (items: ConfigDictionaryItem[]) => items.forEach((item) => {
        if (item.nodeType === 'group') allGroups.add(item.configKey);
        collectGroups(item.children || []);
      });
      collectGroups(result);
      setExpandedKeys(allGroups);

      const preferred = preferredKey ? findItem(result, preferredKey) : undefined;
      const nextSelected = preferred?.nodeType === 'item'
        ? preferred
        : firstEditableItem(result);
      if (nextSelected) {
        setSelectedKey(nextSelected.configKey);
        setDraft(toDraft(nextSelected));
      } else {
        setSelectedKey('');
        setDraft(null);
      }
    } catch {
      notify('配置字典加载失败，请确认已执行字典表迁移 SQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedItem?.nodeType === 'item') {
      setDraft(toDraft(selectedItem));
    }
  }, [selectedItem]);

  const selectItem = (item: ConfigDictionaryItem) => {
    setSelectedKey(item.configKey);
    setDraft(toDraft(item));
  };

  const toggleGroup = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!draft || !selectedItem) return;
    if (!draft.configName.trim() || !draft.configKey.trim()) {
      notify('配置名称和 Key 不能为空');
      return;
    }
    if (draft.valueType === 'json' && draft.configValue?.trim()) {
      try {
        JSON.parse(draft.configValue);
      } catch {
        notify('Value 不是合法 JSON，请检查后再保存');
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await systemApi.updateConfigDictionaryItem(selectedItem.configKey, {
        ...draft,
        configKey: draft.configKey.trim(),
        configName: draft.configName.trim(),
      });
      notify('配置项已保存');
      await load(updated.configKey);
    } catch {
      notify('配置项保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack config-dictionary-page">
      <PageHeader
        title="配置字典"
        description="按模块树管理系统配置。每个配置项独立保存，不再通过一行固定字段维护。"
        actions={(
          <button className="toolbar-btn" type="button" onClick={() => void load(selectedKey)}>
            <RefreshCcw size={16} />{loading ? '加载中' : '刷新'}
          </button>
        )}
      />

      <section className="dictionary-workspace">
        <aside className="dictionary-tree-panel">
          <div className="dictionary-panel-head">
            <div>
              <strong>配置结构</strong>
              <span>{tree.length} 个配置模块</span>
            </div>
          </div>
          <label className="dictionary-search">
            <Search size={16} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索名称或 Key"
            />
          </label>
          <div className="dictionary-tree">
            {tree.map((item) => (
              <DictionaryTreeNode
                key={item.configKey}
                item={item}
                depth={0}
                selectedKey={selectedKey}
                keyword={keyword}
                expandedKeys={expandedKeys}
                onSelect={selectItem}
                onToggle={toggleGroup}
              />
            ))}
            {!loading && !tree.length ? <div className="dictionary-empty">暂无配置，请先执行迁移 SQL。</div> : null}
          </div>
        </aside>

        <div className="dictionary-editor-panel">
          {draft && selectedItem ? (
            <>
              <div className="dictionary-editor-head">
                <div>
                  <span>配置项</span>
                  <h3>{draft.configName || '未命名配置'}</h3>
                  <p>修改后会影响使用这个 Key 的业务页面。</p>
                </div>
                <button className="toolbar-btn primary" type="button" onClick={() => void save()} disabled={saving}>
                  <Save size={16} />{saving ? '保存中' : '保存配置'}
                </button>
              </div>

              <div className="dictionary-form-grid">
                <label className="dictionary-field">
                  <span>配置名称</span>
                  <input
                    value={draft.configName}
                    onChange={(event) => setDraft({ ...draft, configName: event.target.value })}
                    placeholder="例如：首页品牌图标"
                  />
                </label>
                <label className="dictionary-field">
                  <span>配置 Key</span>
                  <input
                    value={draft.configKey}
                    onChange={(event) => setDraft({ ...draft, configKey: event.target.value })}
                    placeholder="visual.home.logo"
                  />
                  <small>只能使用字母、数字、点、横线和下划线；修改后需同步使用方。</small>
                </label>
                <label className="dictionary-field">
                  <span>值类型</span>
                  <select
                    value={draft.valueType}
                    onChange={(event) => setDraft({
                      ...draft,
                      valueType: event.target.value as ConfigDictionaryItem['valueType'],
                    })}
                  >
                    {valueTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="dictionary-field">
                  <span>状态</span>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: Number(event.target.value) })}
                  >
                    <option value={1}>启用</option>
                    <option value={0}>停用</option>
                  </select>
                </label>
                <label className="dictionary-field dictionary-field-wide">
                  <span>Value</span>
                  <textarea
                    className={draft.valueType === 'json' ? 'is-code' : ''}
                    value={draft.configValue || ''}
                    onChange={(event) => setDraft({ ...draft, configValue: event.target.value })}
                    placeholder="输入配置值"
                    spellCheck={false}
                  />
                  <small>{draft.valueType === 'json' ? '保存前会自动校验 JSON 格式。' : '清空并保存会把该配置设置为空值，不会删除配置项。'}</small>
                </label>
                <label className="dictionary-field dictionary-field-wide">
                  <span>配置说明</span>
                  <textarea
                    className="dictionary-description"
                    value={draft.description || ''}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    placeholder="说明这个配置会影响哪些页面或功能"
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="dictionary-editor-empty">
              <FileCode2 size={32} />
              <strong>请选择一个配置项</strong>
              <span>分组用于组织结构，点击具体配置项后在这里编辑。</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ConfigDictionaryPage;
