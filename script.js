
/* 获取网页元素 */
const themeBtn = document.querySelector("#themeToggle");
const helloBtn = document.querySelector("#helloBtn");
const message = document.querySelector("#message");

/* 更新深色模式按钮 */
function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");

  themeBtn.textContent = isDark ? "浅色模式" : "深色模式";
  themeBtn.setAttribute("aria-pressed", String(isDark));
}

/* 恢复之前保存的主题 */
if (localStorage.getItem("siteTheme") === "dark") {
  document.body.classList.add("dark");
}

updateThemeButton();

/* 点击按钮切换主题 */
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem(
    "siteTheme",
    isDark ? "dark" : "light"
  );

  updateThemeButton();
});

/* 点击互动按钮 */
helloBtn.addEventListener("click", () => {
  message.textContent =
    "恭喜！你已经成功实现了 JavaScript 页面交互。";
});

/* 自动显示当前年份 */
document.querySelector("#year").textContent =
  new Date().getFullYear();
