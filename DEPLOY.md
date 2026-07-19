# 部署到雲端 (Render 免費方案)

## 步驟 1：註冊 Render
去 https://dashboard.render.com/register 用 Google 帳號註冊（不用信用卡）

## 步驟 2：建立服務
1. 點 **「New +」** → **「Web Service」**
2. 點 **「Build and deploy from a Git repository」** → 連結你的 GitHub
   - 如果沒有 GitHub：點 **「Upload File」** 直接上傳這個專案資料夾
3. 填寫：

   | 欄位 | 填入 |
   |------|------|
   | **Name** | `daily-dashboard` |
   | **Runtime** | `Node` |
   | **Region** | 選離你最近的（Singapore 或 Hong Kong）|
   | **Build Command** | `npm install && cd frontend && npx vite build` |
   | **Start Command** | `cd backend && node src/index.js` |
   | **Plan** | **Free** |

4. 點 **「Advanced」** → **「Add Environment Variable」** 加入以下變數：

   ```
   GOOGLE_CLIENT_ID = (填入你的 Google OAuth Client ID)
   GOOGLE_CLIENT_SECRET = (填入你的 Google OAuth Client Secret)
   MICROSOFT_CLIENT_ID = (填入你的 Microsoft Client ID 或留空)
   MICROSOFT_CLIENT_SECRET = (填入你的 Microsoft Client Secret 或留空)
   SMTP_USER = yabon@ctcn.edu.tw
   SMTP_PASS = (填入你的 Gmail 應用程式密碼)
   SESSION_SECRET = (隨便打一串英數字)
   ```

5. 點 **「Create Web Service」**

等待 2-5 分鐘，部署完成後 Render 會給你一個網址，例如 `https://daily-dashboard.onrender.com`

## 步驟 3：設定 Google OAuth
1. 打開 https://console.cloud.google.com/apis/credentials
2. 找到你之前建立的那個 OAuth 2.0 憑證
3. 在 **「已授權的重新導向 URI」** 新增：
   ```
   https://你的網址.onrender.com/api/auth/google/callback
   ```
   (把「你的網址」改成 Render 給你的網址)

## 完成！
之後每天 7:00 系統就會自動寄信到 yabon.tw@gmail.com 給你。

## 防止伺服器休眠（免費方案需要）
Render 免費方案會在 15 分鐘沒人連線時休眠。
去 https://cron-job.org 註冊一個免費帳號，設定每 10 分鐘打一次你的網址即可保持喚醒。
