
// 根据 id 获取页面中的按钮元素，保存到常量 button 中
const button = document.getElementById("helloBtn");
// 根据 id 获取用于显示提示文字的段落元素，保存到常量 message 中
const message = document.getElementById("message");

// 给按钮绑定 click（点击）事件监听器
button.addEventListener("click", () => {
  // 点击后把提示文字写入 message 段落，显示给用户
  message.textContent = "恭喜！你的 JavaScript 已经运行成功。";
});
