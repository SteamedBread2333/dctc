# Promotional Posts for dctc

## English Version (for Twitter, Reddit, dev.to, etc.)

**Title:** 🚀 Run TSX scripts instantly with `dctc` - The fastest way to execute TypeScript & React files

**Content:**

Hey fellow devs! 👋

I built a tool called **dctc** (Dynamic Compile TSX Command) to solve a simple problem: running `.tsx` or `.ts` files directly without setting up a complex build environment (webpack, vite, etc.) every time.

It's perfect for when you want to use React components to generate static HTML (like for email templates!) or just quickly test some TypeScript code.

**✨ Key Features:**
- ⚡ **Blazing Fast:** Uses `esbuild` by default for instant execution.
- 🔌 **Pluggable Compilers:** Supports `swc`, `rollup`, and `rolldown` if you need them.
- ⚛️ **React Ready:** First-class support for compiling and running TSX.
- 📦 **Zero Config:** Just install and run.

**🛠 Usage:**

```bash
npm install -g dctc
dctc my-script.tsx
```

**💡 Use Case: Generating Email Templates**
Write your email layout as a React component, then write a simple script to render it to HTML string and save it. No Next.js or heavy frameworks required for simple tasks.

**🔗 Check it out on GitHub:**
https://github.com/SteamedBread2333/dynamic-compile-tsx-commond

I'd love to hear your feedback! If you find it useful, a ⭐️ would mean a lot!

---

## Chinese Version (for V2EX, Juejin, Zhihu, Twitter)

**Title:** 🚀 `dctc`: 可能是运行 TSX 脚本最快的工具，一行命令搞定服务端渲染

**Content:**

大家好！👋

我想分享一个我开发的开源工具 **dctc** (Dynamic Compile TSX Command)。

**🤔 痛点：**
有时候我们只想写一个简单的脚本来处理任务，或者想用 React 组件来生成一些静态 HTML（比如编写邮件模版）。但是，配置一个完整的 TypeScript + React 环境太麻烦了。`ts-node` 有时候又太慢或者对 ESM/TSX 支持不够顺滑。

**💡 解决方案：**
`dctc` 允许你直接在终端动态编译并执行 `.ts` 和 `.tsx` 文件。

**✨ 核心亮点：**
- ⚡ **速度极快**：默认使用 `esbuild` 进行编译，几乎零等待。
- 🛠 **多编译器支持**：除了 esbuild，还支持 `swc`, `rollup`, `rolldown`，你可以自由选择。
- ⚛️ **完美支持 TSX**：非常适合在 Node.js 环境中运行 React 组件逻辑（例如 `renderToString`）。

**💻 使用示例：**

```bash
npm install -g dctc

# 直接运行你的 TSX 脚本
dctc generate-html.tsx
```

**场景举例：**
比如你需要开发一个邮件模版，用 HTML 手写太痛苦且难以维护。你可以用 React 组件来写模版，然后用 `dctc` 运行一个脚本把它渲染成 HTML 文件。

**🔗 GitHub 地址：**
https://github.com/SteamedBread2333/dynamic-compile-tsx-commond

欢迎大家试用和提 Issue！如果觉得好用，求一个 ⭐️ Star 支持！
