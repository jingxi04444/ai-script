import { FileImageOutlined } from '@ant-design/icons';
import { scenePresets } from './scenePlanning';
import type { PlannedScene, SceneSetting } from './scenePlanning';

interface SceneNoticeTableProps {
  scenes: PlannedScene[];
  onSceneChange: (index: number, patch: Partial<SceneSetting>) => void;
  onAiImageCountChange: (assetKey: string, count: number) => void;
  onRowNoteChange: (assetKey: string, note: string) => void;
}

const SceneNoticeTable = ({ scenes, onSceneChange, onAiImageCountChange, onRowNoteChange }: SceneNoticeTableProps) => (
  <div className="scene-planner-table-scroll" role="region" aria-label="一个产品一个场景的通告表" tabIndex={0}>
    <table className="scene-planner-table">
      <thead><tr>
        <th scope="col">片场号 / 场景</th>
        <th scope="col">场景规划贴图</th>
        <th scope="col">产品 Brief</th>
        <th scope="col">产品型号</th>
        <th scope="col">关联脚本</th>
        <th scope="col">AI 生图数量</th>
        <th scope="col">复用参考</th>
        <th scope="col">备注</th>
      </tr></thead>
      <tbody>{scenes.flatMap((scene, sceneIndex) => scene.assignments.map(assignment => {
        const preset = scenePresets.find(item => item.imageUrl === scene.imageUrl);
        return <tr key={assignment.productAssetKey}>
          <th scope="row" className="scene-planner-scene-cell">
            <span className="scene-planner-scene-number">{String(scene.number).padStart(2, '0')} 号场景</span>
            <input aria-label={`${assignment.productName}所在的第 ${scene.number} 场名称`} value={scene.name} onChange={event => onSceneChange(sceneIndex, { name: event.target.value })} />
            <small>同场设置同步到其它产品行</small>
          </th>
          <td className="scene-planner-image-cell">
            <div className="scene-planner-scene-thumb">{scene.imageUrl ? <img src={scene.imageUrl} alt={`${scene.name}场景参考`} /> : <FileImageOutlined />}</div>
            <select aria-label={`${assignment.productName}所在的第 ${scene.number} 场参考图`} value={preset?.imageUrl || 'custom'} onChange={event => { const selected = scenePresets.find(item => item.imageUrl === event.target.value); if (selected) onSceneChange(sceneIndex, selected); }}>
              {scenePresets.map(item => <option key={item.imageUrl} value={item.imageUrl}>{item.name}</option>)}
              {!preset && <option value="custom">自定义场景图</option>}
            </select>
            {!preset && <input aria-label={`第 ${scene.number} 场自定义图片地址`} placeholder="粘贴图片 URL" value={scene.imageUrl} onChange={event => onSceneChange(sceneIndex, { imageUrl: event.target.value })} />}
          </td>
          <td><strong className="scene-planner-product-name">{assignment.productName}</strong><small className="scene-planner-product-source">{assignment.briefId ? '项目 Brief' : assignment.modelId === 'unlinked-scripts' ? '未关联 Brief' : '临时产品'}</small></td>
          <td><span className="scene-planner-model-name">{assignment.modelName}</span></td>
          <td className="scene-planner-count-cell">{assignment.count}<small>条</small></td>
          <td className="scene-planner-ai-cell"><label><input type="number" min="0" max="10000" aria-label={`${scene.name}、${assignment.productName}的 AI 生图张数`} value={assignment.aiImageCount} onChange={event => onAiImageCountChange(assignment.productAssetKey, Math.min(10000, Math.max(0, Number(event.target.value) || 0)))} /><small>张待生成</small></label></td>
          <td><span className="scene-planner-asset-chip">同场空镜 · {scene.blankAssetKey}</span><span className="scene-planner-asset-chip">产品参考 · {assignment.productAssetKey}</span></td>
          <td className="scene-planner-note-cell"><textarea aria-label={`${assignment.productName}所在的第 ${scene.number} 场备注`} placeholder="机位、道具、光线…" value={assignment.note} onChange={event => onRowNoteChange(assignment.productAssetKey, event.target.value)} /></td>
        </tr>;
      }))}</tbody>
      <tfoot><tr><th scope="row" colSpan={5}>合计 · {scenes.reduce((sum, scene) => sum + scene.assignments.length, 0)} 个场景 × 产品组合</th><td colSpan={3}>{scenes.reduce((sum, scene) => sum + scene.assignments.reduce((rowSum, row) => rowSum + row.aiImageCount, 0), 0)} 张 AI 图片待生成</td></tr></tfoot>
    </table>
  </div>
);

export default SceneNoticeTable;
