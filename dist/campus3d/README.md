# 校园 3D 场景

从主界面「校园 3D 数字孪生」打开，或访问 `/campus3d/`。页面提供建筑、负荷、光伏与潮流示意视图、时间轴、楼栋详情及 GLB 导出。三维场景使用独立的示例日，主调度页负责运行当前选定配置。

建筑轮廓和道路来自 [OpenStreetMap](https://www.openstreetmap.org/copyright)（ODbL，© OpenStreetMap contributors）。楼栋使用通用编号，24 小时合成负荷按面积分配。光伏曲线为天气驱动模拟，所有线路为示意。

三维渲染使用 [Three.js r160](https://github.com/mrdoob/three.js/tree/r160)，见 [MIT 许可证](vendor/LICENSE-three.txt)。
