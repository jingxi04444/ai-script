import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { AudioOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { generationApi } from '../../../api/generation';
import type { DubbingAsset, ExportJob, TimelineConfig, VideoSegment } from '../../../types/generation';
import { formatDateTime } from '../../../utils/format';
import './production-panel.css';

interface ProductionPanelProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
}

const ProductionPanel = ({ projectId, ensureProjectId }: ProductionPanelProps) => {
  const [prompt, setPrompt] = useState('根据当前分镜生成商业短视频镜头，突出产品卖点和真实使用场景。');
  const [dubbingText, setDubbingText] = useState('');
  const [resolution, setResolution] = useState('1080x1920');
  const [transitionEffect, setTransitionEffect] = useState('smooth-cut');
  const [timeline, setTimeline] = useState<TimelineConfig | null>(null);
  const [video, setVideo] = useState<VideoSegment | null>(null);
  const [dubbing, setDubbing] = useState<DubbingAsset | null>(null);
  const [exports, setExports] = useState<ExportJob[]>([]);

  const loadProduction = useCallback(async () => {
    if (!projectId) return;
    try {
      const [timelineConfig, exportPage] = await Promise.all([
        generationApi.getTimeline(projectId).catch(() => null),
        generationApi.exports({ projectId, page: 1, pageSize: 8 }),
      ]);
      setTimeline(timelineConfig);
      if (timelineConfig?.resolution) setResolution(timelineConfig.resolution);
      if (timelineConfig?.transitionEffect) setTransitionEffect(timelineConfig.transitionEffect);
      setExports(exportPage.list || []);
    } catch {
      message.error('视频生产数据加载失败');
    }
  }, [projectId]);

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  const generateVideo = async () => {
    const currentProjectId = await ensureProjectId();
    try {
      const result = await generationApi.generateVideo({
        projectId: currentProjectId,
        prompt,
        durationSeconds: 15,
        tagsJson: JSON.stringify({ source: 'front-web', step: 'video' }),
      });
      setVideo(result);
      message.success('视频生成任务已创建');
    } catch {
      message.error('视频生成任务创建失败');
    }
  };

  const createDubbing = async () => {
    if (!dubbingText.trim()) return message.warning('请输入配音文案');
    const currentProjectId = await ensureProjectId();
    try {
      const result = await generationApi.createDubbing({
        projectId: currentProjectId,
        text: dubbingText,
        mode: 'narration',
        voice: 'default',
        speed: 'normal',
        tone: 'commercial',
        volume: 'medium',
        lipPrecision: 'standard',
      });
      setDubbing(result);
      message.success('配音任务已创建');
    } catch {
      message.error('配音任务创建失败');
    }
  };

  const saveTimeline = async () => {
    const currentProjectId = await ensureProjectId();
    try {
      const saved = await generationApi.saveTimeline({
        projectId: currentProjectId,
        selectedClip: video?.id || timeline?.selectedClip,
        transitionEffect,
        resolution,
        configJson: JSON.stringify({ dubbingId: dubbing?.id, updatedFrom: 'front-web' }),
      });
      setTimeline(saved);
      message.success('时间线已保存');
    } catch {
      message.error('时间线保存失败');
    }
  };

  return (
    <section className="production-panel">
      <header className="workspace-panel-head">
        <div>
          <h2>分镜视频</h2>
          <p>创建视频、配音和时间线配置，任务会进入后端异步生产链路。</p>
        </div>
        <button onClick={loadProduction}><ReloadOutlined />刷新</button>
      </header>

      <div className="production-grid">
        <section className="production-card">
          <h3>视频生成</h3>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="镜头生成提示词" />
          <button onClick={generateVideo}><PlayCircleOutlined />生成视频镜头</button>
          {video && (
            <div className="result-strip">
              <strong>镜头任务</strong>
              <span>{video.status || 'created'}</span>
              <small>{video.taskId || video.id}</small>
            </div>
          )}
        </section>

        <section className="production-card">
          <h3>配音生成</h3>
          <textarea value={dubbingText} onChange={(event) => setDubbingText(event.target.value)} placeholder="输入需要生成配音的口播文案" />
          <button onClick={createDubbing}><AudioOutlined />生成配音</button>
          {dubbing && (
            <div className="result-strip">
              <strong>配音任务</strong>
              <span>{dubbing.status || 'created'}</span>
              <small>{dubbing.taskId || dubbing.id}</small>
            </div>
          )}
        </section>

        <section className="production-card">
          <h3>时间线配置</h3>
          <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
            <option value="1080x1920">1080x1920</option>
            <option value="1920x1080">1920x1080</option>
            <option value="720x1280">720x1280</option>
          </select>
          <select value={transitionEffect} onChange={(event) => setTransitionEffect(event.target.value)}>
            <option value="smooth-cut">顺滑转场</option>
            <option value="quick-cut">快切</option>
            <option value="fade">淡入淡出</option>
          </select>
          <button onClick={saveTimeline}><SaveOutlined />保存时间线</button>
          <div className="result-strip">
            <strong>当前时间线</strong>
            <span>{timeline?.updatedAt ? formatDateTime(timeline.updatedAt) : '未保存'}</span>
            <small>{timeline?.selectedClip || video?.id || '暂无镜头'}</small>
          </div>
        </section>

        <section className="production-card production-history">
          <h3>导出记录</h3>
          {exports.map((item) => (
            <article key={item.id}>
              <strong>{item.fileName || item.exportType || '导出任务'}</strong>
              <span>{item.status || 'created'}</span>
            </article>
          ))}
          {!exports.length && <p className="empty-hint">暂无导出记录</p>}
        </section>
      </div>
    </section>
  );
};

export default ProductionPanel;
