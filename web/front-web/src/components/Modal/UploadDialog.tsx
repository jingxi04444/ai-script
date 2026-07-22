import { CloseOutlined, DownloadOutlined, FileExcelOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useState } from 'react';
import { briefApi } from '../../api/brief';
import type { Brief } from '../../types/brief';
import './modal-dialogs.css';

interface UploadDialogProps {
  ensureProjectId: () => Promise<string>;
  onClose: () => void;
  onImported?: (briefs: Brief[]) => void;
}

const UploadDialog = ({ ensureProjectId, onClose, onImported }: UploadDialogProps) => {
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (file?: File) => {
    if (!file) return;
    const isSupported = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isSupported) {
      message.warning('仅支持 xlsx、xls、csv 格式');
      return;
    }
    setFileName(file.name);
    setFile(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      await briefApi.downloadImportTemplate();
      message.success('模板下载已开始');
    } catch {
      message.error('模板下载失败');
    }
  };

  const handleImport = async () => {
    if (!file) {
      message.warning('请先选择卖点文件');
      return;
    }
    setImporting(true);
    try {
      const projectId = await ensureProjectId();
      const importedBriefs = await briefApi.import(file, projectId);
      message.success(`已导入 ${importedBriefs.length} 条卖点数据`);
      onImported?.(importedBriefs);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <section className="modal-card upload-modal">
        <header className="modal-head">
          <div>
            <span>File Upload</span>
            <h2 id="upload-title">导入卖点表格</h2>
          </div>
          <button type="button" aria-label="关闭" className="modal-close-button" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>

        <p className="modal-copy">
          选择包含产品型号、价格、产品 slogan、特色卖点、主卖点、辅助卖点、目标人群、目标场景的 xlsx/csv 文件。
        </p>

        <div className="template-callout">
          <div className="template-callout-main">
            <strong>卖点导入模板</strong>
            <span className="template-info-tooltip" aria-label="产品名称相同会新增版本，不存在则新建产品 v1.0。">
              <InfoCircleOutlined />
              <i>产品名称相同会新增版本，不存在则新建产品 v1.0。</i>
            </span>
          </div>
          <button type="button" onClick={handleDownloadTemplate}><DownloadOutlined />下载模板</button>
        </div>

        <label className={fileName ? 'file-drop has-file' : 'file-drop'}>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e.target.files?.[0])} />
          <strong><FileExcelOutlined />{fileName || '点击选择文件'}</strong>
          <span>{fileName ? '已选择文件，确认后将导入卖点数据' : '支持格式：.xlsx, .xls, .csv'}</span>
        </label>

        <footer className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" disabled={!fileName || importing} onClick={handleImport}>{importing ? '导入中...' : '确认导入'}</button>
        </footer>
      </section>
    </div>
  );
};

export default UploadDialog;
