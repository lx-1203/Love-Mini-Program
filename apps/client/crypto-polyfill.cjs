/**
 * Node 16 兼容性 polyfill：Vite 5.x 内部依赖 globalThis.crypto.getRandomValues，
 * 但 Node 16 的 globalThis 上不存在 crypto 对象。
 * 此文件在 vite 启动前由 --import 或 require 注入，补齐缺失的 API。
 */
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = {};
}
if (typeof globalThis.crypto.getRandomValues !== "function") {
  globalThis.crypto.getRandomValues = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
}
