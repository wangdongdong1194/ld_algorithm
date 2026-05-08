export interface IBaseData {
  id: string; // 节点的唯一标识
  w: number; // 节点的实际宽度
  children: string[]; // 孩子节点的id列表
  parentId: string | null; // 父节点的id，根节点为null
  x: number; // 节点的x坐标

  h: number;
  /**
   * 节点的子树宽度和自身高度最大值，初始值为0
   * sh = max(子树高度, h)，其中子树高度 = sum(所有子节点的sh) + (子节点数量 - 1) * 垂直间距
   * 计算sh时需要递归计算子节点的sh值
   * 这个值用于计算节点的y坐标，确保节点之间有足够的垂直间距
   * 根节点位置固定，y值为sh的起始值
   * 子节点的y值 = 父节点的y值 + 上一个兄弟节点的sh值 + 垂直间距
   */
  sh: number;
  y: number;
}
export type PartialBaseData = Omit<IBaseData, "children" | "parentId" | "sh">;
export type AttachDirection = "left" | "right" | "top" | "bottom";
export type AlignType = "top" | "center";
export interface INodeData {
  [id: string]: IBaseData;
}

export abstract class BaseData {
  private _data: INodeData = {};
  private _rootId: string;
  private VERTICAL_SPACING: number = 50; // 垂直间距
  private HORIZONTAL_SPACING: number = 50; // 水平间距
  private VERTICAL_ALIGN: AlignType = "top"; // 垂直对齐方式å

  /**
   * 创建布局实例，并初始化根节点（w=100, h=50, x=0, y=0）。
   * @param rootId 根节点的唯一标识
   */
  constructor(rootId: string) {
    this._rootId = rootId;
    this.initRootNode();
  }
  private initRootNode() {
    this._data[this._rootId] = {
      id: this._rootId,
      w: 100,
      h: 50,
      children: [],
      parentId: null,
      sh: 0,
      x: 0,
      y: 0,
    };
  }
  // 层级
  private calLevel(
    level: number,
    nodeId: string,
    levelMap: Map<number, string[]>,
  ) {
    if (!this._data[nodeId]) {
      return;
    }
    if (!levelMap.has(level)) {
      levelMap.set(level, []);
    }
    const children = this._data[nodeId].children;
    levelMap.get(level)!.push(nodeId);
    for (const childId of children) {
      this.calLevel(level + 1, childId, levelMap);
    }
  }
  // 计算每层的x坐标
  private calNodePosX(currentX: number) {
    // 计算层级
    const levelMap = new Map<number, string[]>();
    this.calLevel(0, this._rootId, levelMap);

    for (const [_, nodeIds] of levelMap.entries()) {
      for (const nodeId of nodeIds) {
        if (this._data[nodeId]) {
          this._data[nodeId].x = currentX;
        }
      }
      // 计算当前层级的最大宽度
      const maxWidth = nodeIds.reduce(
        (max, id) => Math.max(max, (this._data[id] && this._data[id].w) || 0),
        0,
      );
      currentX += maxWidth + this.HORIZONTAL_SPACING; // 更新x坐标，添加水平间距
    }
  }
  private calNodePosY(currentY: number) {
    this.calNodeSh(this._rootId); // 先计算每个节点的sh值
    const rootNode = this._data[this._rootId];
    const startY =
      this.VERTICAL_ALIGN === "center" && rootNode
        ? currentY - (rootNode.sh - rootNode.h) / 2
        : currentY;
    this.calNodeY(this._rootId, startY); // 然后计算每个节点的y坐标，根节点y固定
  }
  private calNodeY(nodeId: string, currentY: number) {
    if (!this._data[nodeId]) {
      return;
    }
    const node = this._data[nodeId];
    // center 模式下节点在分配的 sh 空间内居中；top 模式下贴顶对齐
    if (this.VERTICAL_ALIGN === "center") {
      node.y = currentY + (node.sh - node.h) / 2;
    } else {
      node.y = currentY;
    }
    let childY = currentY; // 子节点的起始y坐标
    if (this.VERTICAL_ALIGN === "center" && node.children.length > 0) {
      const totalChildrenSh = node.children.reduce(
        (sum, id) => sum + ((this._data[id] && this._data[id].sh) || 0),
        0,
      );
      const totalSpacing = (node.children.length - 1) * this.VERTICAL_SPACING;
      childY += (node.sh - totalChildrenSh - totalSpacing) / 2; // 子节点群体整体居中偏移
    }
    for (const childId of node.children) {
      this.calNodeY(childId, childY); // 递归设置子节点的y坐标
      childY += (this._data[childId] && this._data[childId].sh) || 0; // 更新下一个子节点的y坐标，添加当前子节点的sh值
      childY += this.VERTICAL_SPACING; // 添加垂直间距
    }
  }
  private calNodeSh(nodeId: string): number {
    if (!this._data[nodeId]) {
      return 0;
    }
    const node = this._data[nodeId];
    if (node.children.length === 0) {
      node.sh = node.h; // 叶子节点的sh值等于自身高度
      return node.sh;
    }
    let childrenShSum = 0;
    for (const childId of node.children) {
      childrenShSum += this.calNodeSh(childId);
    }
    const verticalSpacingTotal =
      (node.children.length - 1) * this.VERTICAL_SPACING; // 子节点之间的总垂直间距
    node.sh = Math.max(node.h, childrenShSum + verticalSpacingTotal); // sh值为自身高度和子树高度加间距的最大值
    return node.sh;
  }
  private initSh() {
    for (const key in this._data) {
      if (this._data[key]) {
        this._data[key].sh = 0;
      }
    }
  }

  /**
   * 计算所有节点的 x/y 坐标。
   * 先重置 sh，再按层级计算 x，最后递归计算 y。
   * 每次节点结构或尺寸变更后需重新调用。
   */
  calculateNodePosition() {
    this.initSh(); // 初始化sh值

    const currentX = (this._data && this._data[this._rootId]?.x) || 0; // 根节点的x坐标作为起始点
    const currentY = (this._data && this._data[this._rootId]?.y) || 0; // 根节点的y坐标作为起始点

    this.calNodePosX(currentX);
    this.calNodePosY(currentY);
  }
  /**
   * 获取所有节点数据。
   * @param readonly 为 true（默认）时返回浅拷贝，为 false 时返回原始引用（修改会直接影响内部数据）
   */
  getData(readonly: boolean = true) {
    return readonly ? { ...this._data } : this._data;
  }
  /**
   * 删除指定节点。
   * @param id 要删除的节点 id
   * @param delChildren 为 true 时递归删除所有子节点；为 false（默认）时子节点上移到被删节点的父节点下
   */
  del(id: string, delChildren: boolean = false) {
    if (!this._data[id]) {
      return;
    }
    const parentId = this._data[id].parentId;
    if (parentId && this._data[parentId]) {
      this._data[parentId].children = this._data[parentId].children.filter(
        (childId) => childId !== id,
      );
    }
    if (delChildren) {
      const children = this._data[id].children;
      for (const childId of children) {
        this.del(childId, true);
      }
    } else {
      const children = this._data[id].children;
      let insertIndex =
        (parentId &&
          this._data[parentId] &&
          this._data[parentId].children.indexOf(id)) ||
        0;
      if (parentId && this._data[parentId]) {
        for (const childId of children) {
          if (this._data[childId]) {
            this._data[childId].parentId = parentId;
          }
          this._data[parentId].children.splice(insertIndex, 0, childId);
          insertIndex++; // 更新插入索引，确保子节点按顺序插入
        }
      }
    }
    delete this._data[id];
  }
  /**
   * 在指定节点的某个方向插入新节点。
   * - `right`（默认）：新节点成为 attachNode 的子节点，原有子节点全部转移到新节点下。
   * - `left`：新节点插入在 attachNode 与其父节点之间。
   * - `top`：新节点作为 attachNode 的前置兄弟节点插入。
   * - `bottom`：新节点作为 attachNode 的后置兄弟节点插入。
   *
   * 根节点不支持 `left` / `top` / `bottom` 方向。
   * @param node 新节点数据（无需填写 children / parentId / sh）
   * @param attachId 依附节点的 id
   * @param direction 插入方向，默认为 `"right"`
   */
  addRight(
    node: PartialBaseData,
    attachId: string,
    direction: AttachDirection = "right",
  ) {
    if (this._data[node.id]) {
      return;
    }
    const attachNode = this._data[attachId];
    if (!attachNode) {
      return;
    }
    const newNode: IBaseData = {
      ...node,
      children: [],
      parentId: "",
      sh: 0,
    };
    // 处理连接关系，包括原父子节点和新节点
    if (direction === "right") {
      // 新节点
      newNode.parentId = attachId;
      const children = [...attachNode.children];
      for (const childId of children) {
        if (this._data[childId]) {
          this._data[childId].parentId = newNode.id;
        }
      }
      newNode.children = children;
      attachNode.children = [newNode.id];
    } else if (direction === "left") {
      // 不能向根节点的左侧添加节点，因为根节点没有父节点
      if (!attachNode.parentId) {
        return;
      }
      // 新节点
      newNode.parentId = attachNode.parentId;
      newNode.children = [attachId];
      // 父节点
      const parentNode = this._data[attachNode.parentId];
      if (parentNode) {
        parentNode.children = parentNode.children.map((childId) =>
          childId === attachId ? newNode.id : childId,
        );
      }
      // 依附节点
      attachNode.parentId = newNode.id;
    } else if (direction === "top" || direction === "bottom") {
      // up/down：作为 attachNode 的兄弟节点插入（前/后）
      // 根节点没有父节点，无法插入兄弟
      if (!attachNode.parentId) {
        return;
      }
      const parentNode = this._data[attachNode.parentId];
      if (!parentNode) {
        return;
      }
      // 新节点的父节点与 attachNode 相同
      newNode.parentId = attachNode.parentId;
      newNode.children = [];
      // 在父节点 children 中 attachId 的前/后插入新节点
      const index = parentNode.children.indexOf(attachId);
      if (index === -1) {
        parentNode.children.push(newNode.id);
      } else if (direction === "top") {
        parentNode.children.splice(index, 0, newNode.id);
      } else {
        parentNode.children.splice(index + 1, 0, newNode.id);
      }
    }

    this._data[node.id] = newNode;
  }
  /**
   * 设置指定节点的宽度。
   * @param id 节点 id
   * @param w 新的宽度值
   */
  setDataWidth(id: string, w: number) {
    if (this._data[id]) {
      this._data[id].w = w;
    }
  }
  /**
   * 设置指定节点的高度。
   * @param id 节点 id
   * @param h 新的高度值
   */
  setDataHeight(id: string, h: number) {
    if (this._data[id]) {
      this._data[id].h = h;
    }
  }
  /**
   * 设置兄弟节点之间的垂直间距，默认 50。
   * @param spacing 垂直间距值（px）
   */
  setVerticalSpacing(spacing: number) {
    this.VERTICAL_SPACING = spacing;
  }
  /**
   * 设置相邻层级之间的水平间距，默认 50。
   * @param spacing 水平间距值（px）
   */
  setHorizontalSpacing(spacing: number) {
    this.HORIZONTAL_SPACING = spacing;
  }
  /**
   * 设置节点的垂直对齐方式。
   * @param align 对齐方式，可选值为 "top" 或 "center"
   */
  setVerticalAlign(align: AlignType) {
    this.VERTICAL_ALIGN = align;
  }
}
