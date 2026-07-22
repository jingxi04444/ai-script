# ui-front-web

前台生产应用 `apps/front-web` 的 UI 映射原型项目。

用途：

- 用静态数据复刻当前前台页面结构。
- 方便后续先在 `ui/ui-front-web` 调整视觉、布局、交互，再迁移到生产应用。
- 不连接真实后端，不承载业务逻辑。

运行：

```bash
cd ui/ui-front-web
npm install
npm run dev
```

覆盖页面：

- 项目首页
- 9 步视频脚本工作台
- 产品 Brief 表单
- Brief / 版本管理弹窗
- 导入卖点表格弹窗
- 灵感模板库
- 分镜、素材、生成、配音、预览、数据面板
