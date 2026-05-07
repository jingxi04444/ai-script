# ai-script
AI 爆款短视频脚本生成与复刻平台。

## 生产前端

前台用户端：

```bash
cd apps/front-web
npm install
npm run dev
```

后台管理端：

```bash
cd apps/admin-web
npm install
npm run dev
```

两个生产前端当前都通过 `src/app/mock.js` 模拟后端接口。

## 设计参考

`ui/ui-front-web/` 和 `ui/ui-admin-web/` 是现有 UI 原型参考，不再作为生产业务前端继续扩展。
