/// <reference types="vite/client" />
/// <reference types="@dcloudio/types" />

/**
 * Vite 环境变量类型声明。
 *
 * 显式声明后，业务代码可直接通过 `import.meta.env.XXX` 访问，
 * Vite 在构建时会把这些引用静态替换为 `.env` 文件中的字面量。
 */
interface ImportMetaEnv {
  /** API 模式：real | mock */
  readonly VITE_API_MODE?: string;
  /** API 基础地址 */
  readonly VITE_API_BASE_URL?: string;
  /** 应用版本号 */
  readonly VITE_APP_VERSION?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

/**
 * uni-app 小程序 `<switch>` 组件属性。
 *
 * vue-tsc 用 Vue 的内置元素表解析模板标签，该表把 switch 收录为同名 SVG 标签
 * （NativeElements.switch: SVGAttributes），其 onChange 形参被窄化为 DOM Event，与小程序
 * 事件载荷 `{ detail: { value } }` 无公共属性，于是所有 `<switch @change>` 都误报 TS2345
 * （运行时由 uni-app 编译器正常处理，纯类型解析缺口）。这里覆盖该标签的属性类型，
 * 让 `<switch>` 按 uni-app 组件参与检查；其余小程序标签本就通过索引签名落到 any，不受影响。
 */
interface UniAppSwitchProps {
  /** 开关是否打开 */
  checked?: boolean;
  /** 开关开启时的颜色 */
  color?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /**
   * 载荷由小程序运行时注入，实际结构是 `{ detail: { value } }`，与 DOM Event 不同。
   * 刻意不做窄化：现存 11 处 `<switch @change>` 处理函数按 DOM `Event` 标注形参，
   * 一旦收窄成 MP 载荷形态，全部调用点在 vue-tsc 下互相不兼容（实测 typecheck 红）。
   * 这是有意的类型逃生口，`@typescript-eslint/no-explicit-any` 在其余文件保持启用。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (payload: any) => void;
}

declare module "vue/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      // 与 vue/jsx-runtime 原声明保持一致的兜底索引签名（覆盖后不能丢，否则 view/text 等标签全报错）。
      // 索引签名必须是 any：改成 unknown/Record 会让每个小程序标签的属性检查失去弹性，
      // view/text/image 一类标签全线报错。本行是有意的类型逃生口，规则在其余文件保持启用。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [name: string]: any;
      switch: UniAppSwitchProps;
    }
  }
}

