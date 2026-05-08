# ld_algorithm

树形节点布局算法库，自动计算树状结构中每个节点的 x/y 坐标。

## 安装

```bash
npm install ld_algorithm
```

## 使用

```typescript
import { BaseData, type INodeData } from "ld_algorithm";

class MyLayout extends BaseData {
  constructor() {
    super("root"); // 传入根节点 id
    this.addRight({ id: "a", w: 80, h: 40, x: 0, y: 0 }, "root", "right");
    this.addRight({ id: "b", w: 80, h: 40, x: 0, y: 0 }, "a", "bottom");
    this.calculateNodePosition();
    console.log(this.getData());
  }
}
```

## API

| 方法                                   | 说明                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `constructor(rootId)`                  | 初始化，传入根节点 id                                       |
| `addRight(node, attachId, direction?)` | 在 attachId 节点的指定方向插入新节点                        |
| `del(id, delChildren?)`                | 删除节点，`delChildren=true` 递归删除子节点，否则子节点上移 |
| `calculateNodePosition()`              | 计算所有节点的 x/y 坐标                                     |
| `getData(readonly?)`                   | 获取节点数据，默认返回浅拷贝                                |

### `addRight` direction 说明

| direction         | 行为                                                 |
| ----------------- | ---------------------------------------------------- |
| `"right"`（默认） | 插入为 attachNode 的子节点，原有子节点转移到新节点下 |
| `"left"`          | 插入在 attachNode 与其父节点之间                     |
| `"top"`           | 作为 attachNode 的前置兄弟节点插入                   |
| `"bottom"`        | 作为 attachNode 的后置兄弟节点插入                   |

> 根节点不支持 `left` / `top` / `bottom` 方向。

## 默认间距

水平 / 垂直间距均为 `50px`。
