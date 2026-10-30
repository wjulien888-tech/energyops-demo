# 团队协作说明

## 获取和提交代码

仓库由 `wjulien888-tech` 账号管理。私有仓库成员需先接受邀请；请使用各自的 GitHub 账号，无需共享账号密码。

```bash
git clone https://github.com/wjulien888-tech/energyops-demo.git
cd energyops-demo
git switch -c feature/forecast-api
```

分支可按任务命名，如 `feature/forecast-api`、`feature/carbon-data`、`feature/dispatch-api`、`feature/fault-api`。

提交前运行：

```bash
npm test
npm run check
git add <本次修改的文件>
git commit -m "接入预测模块数据适配"
git push -u origin feature/forecast-api
```

在 GitHub 发起 Pull Request，说明改动、验证方法、数据来源与限制。建议由相关模块负责人和集成人复核后合并。

## 模块修改位置

| 模块 | 当前实现与后续接入位置 |
| --- | --- |
| 预测 | `engine.js` 的 `dataset` 生成合成序列；`business-ui.js` 的 `forecast` 展示预测；正式输出先转换成统一序列 |
| 碳因子与设备 | `engine.js` 的 `dataset`、`business-ui.js` 的 `parameters/saveAssets`；设备参数变更后更新版本并使旧结果失效 |
| 调度 | `engine.js` 的 `calculate/plans/verify`，`app.js` 的 `runPlan/replan`；正式求解接口需要异步状态和结果适配 |
| 电网与恢复 | `app.js` 的 `topology/injectFault/diagnose/feedback/replan`；当前均为示意或预设案例 |
| 页面与集成 | `business-ui.js`、`style.css`、`app.js` 的工作流与导出 |

`business-ui.js` 覆盖了 `app.js` 部分同名界面函数，修改当前页面时优先定位此文件。不要通过改变脚本顺序解决问题。

## 接口协作

每个模块至少提交：一份输入样例、一份输出样例、字段与单位说明、测试依据。正式接口地址和协议由团队统一确认，本文档不代表已有后端。

建议将请求封装到未来的 `dist/api.js` 或独立适配层，再由工作流调用，不要将请求散落在 HTML 拼接函数中。接口失败时保留失败状态，不悄悄退回模拟数据。

合成样例可放入 `examples/`。真实数据、账号、密钥、模型权重和现场原始文件不要直接提交；需要的模型文件由各自后端管理。

## 现有站点

GitHub仓库和Sites站点暂未配置自动同步。合并代码后需另外执行部署。成员不能仅凭GitHub写权限修改Sites访问权限或发布配置。
